import math
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Officer, can_access_department, contains
from app.core.ids import utcnow
from app.models import Complaint, ComplaintStatus, PriorityLevel, User, UserRole
from app.schemas.complaint import (
    AssignOfficer,
    OfficerComplaintDetail,
    OfficerComplaintRow,
    OfficerOut,
    OfficerStats,
    Page,
    StatusChange,
)
from app.services import storage
from app.services.audit import log_action
from app.services.notifications import notify, short_ref, track_url

router = APIRouter(prefix="/officer", tags=["officer"])


def _scope(user: User, department: str | None = None) -> dict | None:
    """Filter limiting officers to their department. Returns None if they may see nothing."""
    if user.role == UserRole.ADMIN:
        return {"department": department} if department else {}
    if not user.department:
        return None
    return {"department": user.department}


async def _people(ids: set[str]) -> dict[str, dict]:
    users = await User.find({"_id": {"$in": list(ids)}}).to_list() if ids else []
    return {u.id: u.model_dump() for u in users}


def _person(people: dict[str, dict], user_id: str) -> dict:
    # Placeholder for an account that has since been removed.
    return people.get(user_id) or {"id": user_id, "name": None, "email": ""}


async def _load_for_officer(user: User, complaint_id: str) -> Complaint:
    complaint = await Complaint.get(complaint_id)
    # 404 rather than 403 so officers can't probe other departments' complaint ids.
    if complaint is None or not can_access_department(user, complaint.department):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return complaint


@router.get("/stats", response_model=OfficerStats)
async def stats(user: Officer) -> OfficerStats:
    scope = _scope(user)
    if scope is None:
        return OfficerStats(total=0, pending=0, under_review=0, in_progress=0, resolved=0, resolved_today=0)

    grouped = await Complaint.find(scope).aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}]).to_list()
    counts = {row["_id"]: row["n"] for row in grouped}
    start_of_day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = await Complaint.find(
        scope, Complaint.status == ComplaintStatus.RESOLVED, Complaint.updated_at >= start_of_day
    ).count()
    return OfficerStats(
        total=sum(counts.values()),
        pending=counts.get(ComplaintStatus.SUBMITTED, 0),
        under_review=counts.get(ComplaintStatus.UNDER_REVIEW, 0),
        in_progress=counts.get(ComplaintStatus.IN_PROGRESS, 0),
        resolved=counts.get(ComplaintStatus.RESOLVED, 0),
        resolved_today=resolved_today,
    )


@router.get("/complaints", response_model=Page[OfficerComplaintRow])
async def list_complaints(
    user: Officer,
    status_: Annotated[ComplaintStatus | None, Query(alias="status")] = None,
    # Repeat the parameter to match any of several priorities (?priority=URGENT&priority=HIGH).
    priority: Annotated[list[PriorityLevel] | None, Query()] = None,
    open_only: Annotated[bool, Query(alias="open")] = False,
    department: str | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
    scope = _scope(user, department)
    if scope is None:
        return Page(items=[], total=0, page=1, pages=1)

    filters = dict(scope)
    if status_:
        filters["status"] = status_.value
    elif open_only:
        filters["status"] = {"$nin": [ComplaintStatus.RESOLVED.value, ComplaintStatus.REJECTED.value]}
    if priority:
        filters["priority"] = {"$in": [p.value for p in priority]}
    if search:
        filters["$or"] = [{"tracking_id": contains(search)}, {"title": contains(search)}]

    total = await Complaint.find(filters).count()
    rows = await Complaint.find(filters).sort(-Complaint.created_at).skip((page - 1) * limit).limit(limit).to_list()
    people = await _people({c.citizen_id for c in rows})
    return Page(
        items=[
            OfficerComplaintRow.model_validate({**c.model_dump(), "citizen": _person(people, c.citizen_id)})
            for c in rows
        ],
        total=total,
        page=page,
        pages=max(1, math.ceil(total / limit)),
    )


@router.get("/officers", response_model=list[OfficerOut])
async def list_officers(user: Officer, department: str | None = None) -> list[User]:
    """Officers a complaint can be assigned to: your own department, or any department for admins."""
    if user.role != UserRole.ADMIN:
        department = user.department
        if not department:
            return []
    filters: dict = {"role": UserRole.OFFICER.value}
    if department:
        filters["department"] = department
    return await User.find(filters).sort(+User.name).to_list()


@router.get("/complaints/{complaint_id}", response_model=OfficerComplaintDetail)
async def complaint_detail(complaint_id: str, user: Officer) -> OfficerComplaintDetail:
    complaint = await _load_for_officer(user, complaint_id)
    officer_id = complaint.assigned_officer_id
    people = await _people({complaint.citizen_id} | ({officer_id} if officer_id else set()))
    detail = OfficerComplaintDetail.model_validate(
        {
            **complaint.model_dump(),
            "citizen": _person(people, complaint.citizen_id),
            "assigned_officer": _person(people, officer_id) if officer_id else None,
        }
    )
    for att in detail.attachments:
        att.url = storage.download_url(att.url)
    return detail


@router.patch("/complaints/{complaint_id}/status", status_code=status.HTTP_204_NO_CONTENT)
async def change_status(complaint_id: str, body: StatusChange, user: Officer) -> None:
    complaint = await _load_for_officer(user, complaint_id)
    previous = complaint.status
    complaint.status = body.status
    if body.internal_notes is not None:
        complaint.internal_notes = body.internal_notes
    complaint.add_update(body.status, body.remarks, user.name or "Officer")
    await complaint.save()

    await log_action(
        user_id=user.id,
        action="COMPLAINT_STATUS_CHANGED",
        entity="COMPLAINT",
        entity_id=complaint.id,
        metadata={"from": previous.value, "to": body.status.value},
    )
    label = body.status.value.replace("_", " ").title()
    await notify(
        user_id=complaint.citizen_id,
        complaint_id=complaint.id,
        type=body.status.value,
        title=f"Complaint {label}",
        message=f"Your complaint #{short_ref(complaint.tracking_id)} is now {label}. Remarks: {body.remarks}",
        action_url=track_url(complaint.tracking_id),
    )


@router.post("/complaints/{complaint_id}/assign", status_code=status.HTTP_204_NO_CONTENT)
async def assign(complaint_id: str, body: AssignOfficer, user: Officer) -> None:
    complaint = await _load_for_officer(user, complaint_id)

    officer = await User.get(body.officer_id)
    if officer is None or officer.role != UserRole.OFFICER or officer.department != complaint.department:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Assignee must be an officer of this department")

    complaint.assigned_officer_id = officer.id
    if complaint.status == ComplaintStatus.SUBMITTED:
        complaint.status = ComplaintStatus.UNDER_REVIEW
    complaint.add_update(complaint.status, "Complaint has been assigned to an officer.", user.name or "Officer")
    await complaint.save()

    await log_action(
        user_id=user.id,
        action="COMPLAINT_ASSIGNED",
        entity="COMPLAINT",
        entity_id=complaint.id,
        metadata={"officerId": officer.id},
    )
    await notify(
        user_id=complaint.citizen_id,
        complaint_id=complaint.id,
        type="OFFICER_ASSIGNED",
        title="Officer assigned",
        message=f"An officer has been assigned to your complaint #{short_ref(complaint.tracking_id)}.",
        action_url=track_url(complaint.tracking_id),
    )
