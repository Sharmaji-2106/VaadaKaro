"""The signed-in user's own data: download a copy of it, or delete the account.

Retention on deletion (also shown on the settings page):
- Removed: profile, settings, notifications, saved documents, assistant history, uploaded files,
  a lawyer's public profile, and complaints no officer has acted on yet (still SUBMITTED).
- Kept without the person: complaints a department has already acted on stay in that department's
  records, with the location, PIN code and attachments removed and no link to the account.
- Bookings: open ones are cancelled and the other party told; the citizen's description is removed.
- Audit log entries and consent records are kept (ids only) as the security record and proof of
  consent; requests to the Grievance Officer are kept without the name and email.
"""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool
from pydantic import EmailStr, Field

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.security import verify_password
from app.models import (
    AILegalHistory,
    Booking,
    BookingStatus,
    Complaint,
    ComplaintStatus,
    ConsentPurpose,
    ConsentRecord,
    GrievanceRequest,
    LawyerProfile,
    LegalDocument,
    Nominee,
    Notification,
    User,
    UserRole,
    UserSettings,
)
from app.schemas.base import ApiModel
from app.services import storage
from app.services.audit import log_action
from app.services.consent import record_consent
from app.services.notifications import notify

router = APIRouter(prefix="/account", tags=["account"])

DELETED_USER = "deleted-user"
_OPEN_BOOKINGS = [BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value]


class DeleteAccount(ApiModel):
    password: str = Field(max_length=128)


class ConsentChange(ApiModel):
    granted: bool


class ConsentRecordOut(ApiModel):
    purpose: ConsentPurpose
    granted: bool
    notice_version: str
    created_at: datetime


class NomineeIn(ApiModel):
    name: str = Field(min_length=2, max_length=100)
    relation: str = Field(min_length=2, max_length=60)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9 -]{7,20}$")


class NomineeOut(NomineeIn):
    email: str | None = None
    added_at: datetime


class PrivacyStatus(ApiModel):
    notice_version: str
    current_notice_version: str
    ai_consent: bool
    adult_confirmed: bool
    nominee: NomineeOut | None
    history: list[ConsentRecordOut]


async def _privacy_status(user: User) -> PrivacyStatus:
    history = await ConsentRecord.find(ConsentRecord.user_id == user.id).sort(-ConsentRecord.created_at).to_list()
    current = get_settings().privacy_notice_version
    return PrivacyStatus(
        notice_version=history[0].notice_version if history else "none",
        current_notice_version=current,
        ai_consent=bool(user.ai_consent),
        adult_confirmed=user.adult_confirmed_at is not None,
        nominee=NomineeOut.model_validate(user.nominee.model_dump()) if user.nominee else None,
        history=[ConsentRecordOut.model_validate(r) for r in history],
    )


@router.get("/privacy", response_model=PrivacyStatus)
async def privacy_status(user: CurrentUser) -> PrivacyStatus:
    return await _privacy_status(user)


@router.put("/consents/ai", response_model=PrivacyStatus)
async def set_ai_consent(body: ConsentChange, user: CurrentUser) -> PrivacyStatus:
    """Withdrawing is as easy as giving (DPDP Act s.6(4)); it stops new AI processing at once.

    On withdrawal the legal-assistant history, which was kept only for that purpose, is erased
    (s.8(7)). Documents the person chose to save are their own records and stay until they delete them.
    """
    user.ai_consent = body.granted
    await user.save()
    await record_consent(user, ConsentPurpose.AI_PROCESSING, body.granted)
    if not body.granted:
        erased = await AILegalHistory.find(AILegalHistory.user_id == user.id).count()
        await AILegalHistory.find(AILegalHistory.user_id == user.id).delete()
        await log_action(
            user_id=user.id,
            action="AI_HISTORY_ERASED",
            entity="USER",
            entity_id=user.id,
            metadata={"items": erased},
        )
    return await _privacy_status(user)


@router.post("/notice/acknowledge", response_model=PrivacyStatus)
async def acknowledge_notice(user: CurrentUser) -> PrivacyStatus:
    """The person has seen the current privacy notice. For accounts made before it (DPDP Act s.5(2))
    this records the notice and their continued consent to running the account."""
    await record_consent(user, ConsentPurpose.ACCOUNT, True)
    return await _privacy_status(user)


@router.put("/nominee", response_model=PrivacyStatus)
async def set_nominee(body: NomineeIn, user: CurrentUser) -> PrivacyStatus:
    if not body.email and not body.phone:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Give the nominee's email or phone number")
    user.nominee = Nominee(**body.model_dump())
    await user.save()
    await log_action(user_id=user.id, action="NOMINEE_SET", entity="USER", entity_id=user.id)
    return await _privacy_status(user)


@router.delete("/nominee", response_model=PrivacyStatus)
async def remove_nominee(user: CurrentUser) -> PrivacyStatus:
    user.nominee = None
    await user.save()
    await log_action(user_id=user.id, action="NOMINEE_REMOVED", entity="USER", entity_id=user.id)
    return await _privacy_status(user)


def _dump(docs) -> list[dict]:
    return [d.model_dump(mode="json", exclude={"revision_id"}) for d in docs]


@router.get("/export")
async def export_data(user: CurrentUser) -> Response:
    """Everything stored about the user, as one JSON file."""
    data = {
        "exportedAt": datetime.now(UTC).isoformat(),
        "account": user.model_dump(mode="json", exclude={"password", "revision_id"}),
        "settings": _dump(await UserSettings.find(UserSettings.user_id == user.id).to_list()),
        "complaints": _dump(await Complaint.find(Complaint.citizen_id == user.id).to_list()),
        "documents": _dump(await LegalDocument.find(LegalDocument.user_id == user.id).to_list()),
        "assistantHistory": _dump(await AILegalHistory.find(AILegalHistory.user_id == user.id).to_list()),
        "bookingsMade": _dump(await Booking.find(Booking.citizen_id == user.id).to_list()),
        "bookingsReceived": _dump(await Booking.find(Booking.lawyer_id == user.id).to_list()),
        "lawyerProfile": _dump(await LawyerProfile.find(LawyerProfile.user_id == user.id).to_list()),
        "notifications": _dump(await Notification.find(Notification.user_id == user.id).to_list()),
        "consents": _dump(await ConsentRecord.find(ConsentRecord.user_id == user.id).to_list()),
        "requestsToGrievanceOfficer": _dump(await GrievanceRequest.find(GrievanceRequest.user_id == user.id).to_list()),
    }
    await log_action(user_id=user.id, action="DATA_EXPORTED", entity="USER", entity_id=user.id)
    return Response(
        json.dumps(data, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="vaadakaro-my-data.json"'},
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(body: DeleteAccount, user: CurrentUser) -> None:
    if user.role in (UserRole.ADMIN, UserRole.OFFICER):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Staff accounts are closed by an administrator. Ask one to change your role to citizen first.",
        )
    if not verify_password(body.password, user.password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Password is incorrect")

    # Complaints: drop those nobody has picked up, keep the rest for the department without the person.
    await Complaint.find(Complaint.citizen_id == user.id, Complaint.status == ComplaintStatus.SUBMITTED).delete()
    await Complaint.find(Complaint.citizen_id == user.id).update(
        {"$set": {"citizen_id": DELETED_USER, "location": None, "pincode": None, "attachments": []}}
    )

    # Bookings in either direction: cancel open ones and tell the other side.
    for booking in await Booking.find({"citizen_id": user.id, "status": {"$in": _OPEN_BOOKINGS}}).to_list():
        await notify(
            user_id=booking.lawyer_id,
            type="BOOKING_CANCELLED",
            title="Consultation cancelled",
            message=f"A citizen closed their account, so the consultation on {booking.date:%d %b %Y} is cancelled.",
            action_url="/dashboard/lawyer/bookings",
        )
    for booking in await Booking.find({"lawyer_id": user.id, "status": {"$in": _OPEN_BOOKINGS}}).to_list():
        await notify(
            user_id=booking.citizen_id,
            type="BOOKING_CANCELLED",
            title="Consultation cancelled",
            message=f"The lawyer is no longer on VaadaKaro, so the consultation on {booking.date:%d %b %Y} is cancelled.",
            action_url="/dashboard/bookings",
        )
    for field in ("citizen_id", "lawyer_id"):
        await Booking.find({field: user.id, "status": {"$in": _OPEN_BOOKINGS}}).update(
            {"$set": {"status": BookingStatus.CANCELLED.value}}
        )
    await Booking.find(Booking.citizen_id == user.id).update(
        {"$set": {"citizen_id": DELETED_USER, "description": "Removed at the citizen's request."}}
    )

    await LawyerProfile.find(LawyerProfile.user_id == user.id).delete()
    await LegalDocument.find(LegalDocument.user_id == user.id).delete()
    await AILegalHistory.find(AILegalHistory.user_id == user.id).delete()
    await Notification.find(Notification.user_id == user.id).delete()
    await UserSettings.find(UserSettings.user_id == user.id).delete()
    # Requests to the Grievance Officer stay as the record that they were handled, without the person.
    await GrievanceRequest.find(GrievanceRequest.user_id == user.id).update(
        {"$set": {"user_id": DELETED_USER, "name": "Deleted user", "email": ""}}
    )
    # Consent records hold only ids and are kept, like the audit log, as proof of what was agreed.
    files = await run_in_threadpool(storage.delete_user_files, user.id)
    await user.delete()
    await log_action(
        user_id=None, action="ACCOUNT_DELETED", entity="USER", entity_id=user.id, metadata={"files": files}
    )
