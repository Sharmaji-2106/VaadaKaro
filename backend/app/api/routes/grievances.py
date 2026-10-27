"""Grievance Officer: rights requests and grievances, on a published clock.

IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, rule 3(2): acknowledge a
complaint within 24 hours and dispose of it within 15 days. Acknowledgement here is immediate.
The same queue takes Data Principal requests under the DPDP Act, 2023 (access s.11, correction and
erasure s.12, grievance s.13, nomination s.14), answered on the same 15-day clock, which is well
inside what the DPDP Rules allow.
"""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import EmailStr, Field, field_validator

from app.api.deps import Admin, CurrentUser, OptionalUser
from app.core.config import get_settings
from app.core.ids import utcnow
from app.core.rate_limit import limiter
from app.models import GrievanceRequest, RequestStatus, RequestType
from app.schemas.base import ApiModel
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(tags=["grievance officer"])

ACKNOWLEDGE_WITHIN_HOURS = 24
_OPEN = [RequestStatus.ACKNOWLEDGED.value, RequestStatus.IN_PROGRESS.value]


class GrievanceOfficer(ApiModel):
    name: str | None
    email: str
    address: str | None
    acknowledge_within_hours: int
    resolve_within_days: int


class GrievanceCreate(ApiModel):
    # Ignored for signed-in users, whose account details are used.
    name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    type: RequestType
    details: str = Field(min_length=10, max_length=4000)

    @field_validator("email")
    @classmethod
    def lower(cls, v: str | None) -> str | None:
        return v.lower() if v else v


class GrievanceOut(ApiModel):
    id: str
    reference: str
    type: RequestType
    details: str
    status: RequestStatus
    due_at: datetime
    response: str | None
    resolved_at: datetime | None
    created_at: datetime


class AdminGrievanceOut(GrievanceOut):
    name: str
    email: str
    user_id: str | None
    overdue: bool


class GrievanceUpdate(ApiModel):
    status: RequestStatus
    response: str | None = Field(default=None, max_length=4000)


def _reference() -> str:
    return f"GRV-{utcnow():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


def _admin_out(g: GrievanceRequest) -> AdminGrievanceOut:
    overdue = g.status.value in _OPEN and g.due_at < utcnow()
    return AdminGrievanceOut.model_validate({**g.model_dump(), "overdue": overdue})


@router.get("/grievance-officer", response_model=GrievanceOfficer)
async def grievance_officer() -> GrievanceOfficer:
    s = get_settings()
    return GrievanceOfficer(
        name=s.grievance_officer_name,
        email=s.grievance_officer_email,
        address=s.grievance_officer_address,
        acknowledge_within_hours=ACKNOWLEDGE_WITHIN_HOURS,
        resolve_within_days=s.grievance_resolution_days,
    )


@router.post("/grievances", response_model=GrievanceOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def create_grievance(request: Request, body: GrievanceCreate, user: OptionalUser) -> GrievanceRequest:
    if user is not None:
        name, email = user.name or user.email, user.email
    else:
        if not body.email or not (body.name or "").strip():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Give your name and email so we can reply")
        name, email = body.name.strip(), body.email

    grievance = await GrievanceRequest(
        reference=_reference(),
        user_id=user.id if user else None,
        name=name,
        email=email,
        type=body.type,
        details=body.details.strip(),
        due_at=utcnow() + timedelta(days=get_settings().grievance_resolution_days),
    ).insert()
    await log_action(
        user_id=user.id if user else None,
        action="GRIEVANCE_RECEIVED",
        entity="GRIEVANCE",
        entity_id=grievance.id,
        metadata={"type": body.type.value},
    )
    if user is not None:
        await notify(
            user_id=user.id,
            type="GRIEVANCE_ACKNOWLEDGED",
            title=f"Request {grievance.reference} received",
            message=f"The Grievance Officer will respond by {grievance.due_at:%d %b %Y}.",
            action_url="/grievance",
        )
    return grievance


@router.get("/grievances", response_model=list[GrievanceOut])
async def my_grievances(user: CurrentUser) -> list[GrievanceRequest]:
    return await GrievanceRequest.find(GrievanceRequest.user_id == user.id).sort(-GrievanceRequest.created_at).to_list()


@router.get("/grievances/track/{reference}", response_model=GrievanceOut)
@limiter.limit("20/hour")
async def track_grievance(
    request: Request, reference: str, email: Annotated[EmailStr, Query()]
) -> GrievanceRequest:
    """For people without an account: the reference plus the email it was sent from."""
    grievance = await GrievanceRequest.find_one(GrievanceRequest.reference == reference.upper())
    if grievance is None or grievance.email != email.lower():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No request with that reference and email")
    return grievance


@router.get("/admin/grievances", response_model=list[AdminGrievanceOut])
async def admin_list(
    admin: Admin,
    open_only: Annotated[bool, Query(alias="open")] = True,
) -> list[AdminGrievanceOut]:
    filters = {"status": {"$in": _OPEN}} if open_only else {}
    # Soonest deadline first, so overdue requests lead.
    rows = await GrievanceRequest.find(filters).sort(+GrievanceRequest.due_at).limit(500).to_list()
    return [_admin_out(g) for g in rows]


@router.patch("/admin/grievances/{grievance_id}", response_model=AdminGrievanceOut)
async def admin_update(grievance_id: str, body: GrievanceUpdate, admin: Admin) -> AdminGrievanceOut:
    grievance = await GrievanceRequest.get(grievance_id)
    if grievance is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    closing = body.status in (RequestStatus.RESOLVED, RequestStatus.REJECTED)
    if closing and not (body.response or "").strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Write the reply the person will receive")

    grievance.status = body.status
    if body.response is not None:
        grievance.response = body.response.strip() or None
    grievance.resolved_at = utcnow() if closing else None
    grievance.handled_by = admin.id
    await grievance.save()
    await log_action(
        user_id=admin.id,
        action=f"GRIEVANCE_{body.status.value}",
        entity="GRIEVANCE",
        entity_id=grievance.id,
    )
    if closing and grievance.user_id and grievance.user_id != "deleted-user":
        await notify(
            user_id=grievance.user_id,
            type="GRIEVANCE_RESOLVED" if body.status == RequestStatus.RESOLVED else "GRIEVANCE_REJECTED",
            title=f"Reply to request {grievance.reference}",
            message=grievance.response or "",
            action_url="/grievance",
        )
    return _admin_out(grievance)
