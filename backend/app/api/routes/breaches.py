"""Personal-data breach handling for admins.

- DPDP Act, 2023 s.8(6) and the DPDP Rules, 2025: intimate each affected person and the Data
  Protection Board without delay; the Board gets a detailed report within 72 hours.
- CERT-In directions under IT Act s.70B(6) (28 April 2022): report cyber incidents to CERT-In
  within 6 hours of noticing them.

This records the breach and notifies affected people in the app. The reports to CERT-In and the
Board are filed outside VaadaKaro; the admin records when they were sent.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import Field, model_validator

from app.api.deps import Admin
from app.core.config import get_settings
from app.models import BreachNotice, User
from app.schemas.base import ApiModel
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(prefix="/admin/breach-notices", tags=["admin"])

CERT_IN_HOURS = 6
BOARD_HOURS = 72


class BreachCreate(ApiModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=4000)
    likely_consequences: str = Field(min_length=10, max_length=2000)
    mitigation: str = Field(min_length=10, max_length=2000)
    occurred_at: datetime | None = None
    detected_at: datetime
    all_users: bool = False
    affected_emails: list[str] = Field(default_factory=list, max_length=10_000)

    @model_validator(mode="after")
    def someone_affected(self):
        if not self.all_users and not self.affected_emails:
            raise ValueError("Choose everyone, or list the affected accounts' emails")
        return self


class BreachReported(ApiModel):
    cert_in_reported_at: datetime | None = None
    board_reported_at: datetime | None = None


class BreachOut(ApiModel):
    id: str
    title: str
    description: str
    likely_consequences: str
    mitigation: str
    occurred_at: datetime | None
    detected_at: datetime
    all_users: bool
    notified_count: int
    cert_in_reported_at: datetime | None
    board_reported_at: datetime | None
    cert_in_due_at: datetime
    board_due_at: datetime
    created_at: datetime


def _out(b: BreachNotice) -> BreachOut:
    return BreachOut.model_validate(
        {
            **b.model_dump(),
            "cert_in_due_at": b.detected_at + timedelta(hours=CERT_IN_HOURS),
            "board_due_at": b.detected_at + timedelta(hours=BOARD_HOURS),
        }
    )


@router.get("", response_model=list[BreachOut])
async def list_breaches(admin: Admin) -> list[BreachOut]:
    return [_out(b) for b in await BreachNotice.find_all().sort(-BreachNotice.created_at).to_list()]


@router.post("", response_model=BreachOut, status_code=status.HTTP_201_CREATED)
async def report_breach(body: BreachCreate, admin: Admin) -> BreachOut:
    if body.all_users:
        users = await User.find_all().to_list()
    else:
        emails = list({e.strip().lower() for e in body.affected_emails if e.strip()})
        users = await User.find({"email": {"$in": emails}}).to_list()

    notice = await BreachNotice(
        title=body.title,
        description=body.description,
        likely_consequences=body.likely_consequences,
        mitigation=body.mitigation,
        occurred_at=body.occurred_at.replace(tzinfo=None) if body.occurred_at else None,
        detected_at=body.detected_at.replace(tzinfo=None),
        all_users=body.all_users,
        affected_user_ids=[] if body.all_users else [u.id for u in users],
        reported_by=admin.id,
    ).insert()

    contact = get_settings().grievance_officer_email
    # What the DPDP Rules ask the intimation to cover: what happened, likely consequences, what
    # we are doing, what the person can do, and whom to contact.
    message = (
        f"{body.description}\n\nPossible consequences for you: {body.likely_consequences}\n\n"
        f"What we are doing and what you can do: {body.mitigation}\n\nQuestions: {contact}"
    )
    for user in users:
        await notify(
            user_id=user.id,
            type="DATA_BREACH",
            title=f"Data security incident: {body.title}",
            message=message,
            action_url="/grievance",
        )
    notice.notified_count = len(users)
    await notice.save()
    await log_action(
        user_id=admin.id,
        action="BREACH_NOTIFIED",
        entity="BREACH",
        entity_id=notice.id,
        metadata={"notified": len(users), "allUsers": body.all_users},
    )
    return _out(notice)


@router.patch("/{notice_id}", response_model=BreachOut)
async def mark_reported(notice_id: str, body: BreachReported, admin: Admin) -> BreachOut:
    notice = await BreachNotice.get(notice_id)
    if notice is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Breach notice not found")
    if body.cert_in_reported_at:
        notice.cert_in_reported_at = body.cert_in_reported_at.replace(tzinfo=None)
    if body.board_reported_at:
        notice.board_reported_at = body.board_reported_at.replace(tzinfo=None)
    await notice.save()
    await log_action(user_id=admin.id, action="BREACH_REPORT_RECORDED", entity="BREACH", entity_id=notice.id)
    return _out(notice)
