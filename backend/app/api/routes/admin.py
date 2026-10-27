import json
from collections import Counter
from datetime import datetime, timedelta
from statistics import median
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Admin, contains
from app.api.routes.authorities import needs_recheck
from app.core.ids import utcnow
from app.models import (
    AuditLog,
    Authority,
    Booking,
    BookingStatus,
    Complaint,
    ComplaintStatus,
    LawyerProfile,
    User,
    UserRole,
)
from app.schemas.auth import UserOut
from app.schemas.legal import AdminLawyerOut, LawyerVerify
from app.schemas.misc import (
    AuditLogOut,
    DepartmentReport,
    LanguageCount,
    MonthlyReport,
    PilotMetrics,
    RoleChange,
)
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(prefix="/admin", tags=["admin"])

_PENDING = {ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.INFO_REQUESTED}


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def audit_logs(
    admin: Admin,
    entity_id: Annotated[str | None, Query(alias="entityId")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[AuditLog]:
    filters = {"entity_id": entity_id} if entity_id else {}
    return await AuditLog.find(filters).sort(-AuditLog.created_at).limit(limit).to_list()


@router.get("/users", response_model=list[UserOut])
async def list_users(
    admin: Admin,
    search: Annotated[str | None, Query(max_length=100)] = None,
    role: UserRole | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[User]:
    filters: dict = {}
    if search:
        filters["$or"] = [{"email": contains(search)}, {"name": contains(search)}]
    if role:
        filters["role"] = role.value
    return await User.find(filters).sort(-User.created_at).limit(limit).to_list()


@router.get("/reports", response_model=MonthlyReport)
async def monthly_report(
    admin: Admin,
    year: Annotated[int, Query(ge=2020, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> MonthlyReport:
    """Complaints filed in the month, by department, with their current status."""
    start = datetime(year, month, 1)
    end = datetime(year + month // 12, month % 12 + 1, 1)

    rows = await Complaint.find(Complaint.created_at >= start, Complaint.created_at < end).aggregate(
        [{"$group": {"_id": {"department": "$department", "status": "$status"}, "n": {"$sum": 1}}}]
    ).to_list()
    officer_rows = await User.find({"role": UserRole.OFFICER.value, "department": {"$ne": None}}).aggregate(
        [{"$group": {"_id": "$department", "n": {"$sum": 1}}}]
    ).to_list()
    officers = {r["_id"]: r["n"] for r in officer_rows}

    by_dept: dict[str, DepartmentReport] = {}
    for row in rows:
        department, status_, count = row["_id"]["department"], row["_id"]["status"], row["n"]
        r = by_dept.setdefault(
            department,
            DepartmentReport(
                department=department,
                filed=0,
                pending=0,
                in_progress=0,
                resolved=0,
                rejected=0,
                officers=officers.get(department, 0),
            ),
        )
        r.filed += count
        if status_ in _PENDING:
            r.pending += count
        elif status_ == ComplaintStatus.IN_PROGRESS:
            r.in_progress += count
        elif status_ == ComplaintStatus.RESOLVED:
            r.resolved += count
        elif status_ == ComplaintStatus.REJECTED:
            r.rejected += count

    departments = sorted(by_dept.values(), key=lambda r: r.filed, reverse=True)
    return MonthlyReport(
        year=year,
        month=month,
        departments=departments,
        total_filed=sum(r.filed for r in departments),
        total_resolved=sum(r.resolved for r in departments),
    )


def _rate(part: int, whole: int) -> float | None:
    return round(part / whole, 3) if whole else None


@router.get("/metrics", response_model=PilotMetrics)
async def pilot_metrics(admin: Admin, days: Annotated[int, Query(ge=1, le=365)] = 30) -> PilotMetrics:
    since = utcnow() - timedelta(days=days)

    async def count(action: str, **meta: bool) -> int:
        filters: dict = {"action": action, "created_at": {"$gte": since}}
        for key, value in meta.items():
            filters.setdefault("$and", []).append({"metadata_json": {"$regex": f'"{key}": {str(value).lower()}'}})
        return await AuditLog.find(filters).count()

    drafted_logs = await AuditLog.find({"action": "LETTER_DRAFTED", "created_at": {"$gte": since}}).to_list()
    drafted = [json.loads(log.metadata_json or "{}") for log in drafted_logs]
    seconds = [d["seconds"] for d in drafted if isinstance(d.get("seconds"), int | float)]
    languages = Counter(d.get("inputLanguage") or "unknown" for d in drafted)

    saved_from_drafter = await count("DOCUMENT_SAVED", editedFromAi=True) + await count(
        "DOCUMENT_SAVED", editedFromAi=False
    )
    exported_ids = await AuditLog.distinct(
        "entity_id", {"action": "DOCUMENT_EXPORTED", "created_at": {"$gte": since}}
    )

    filed = await Complaint.find(Complaint.created_at >= since).to_list()
    resolution_days = []
    for c in filed:
        if c.status == ComplaintStatus.RESOLVED:
            resolved_at = next((u.created_at for u in c.updates if u.status == ComplaintStatus.RESOLVED), c.updated_at)
            resolution_days.append((resolved_at - c.created_at).total_seconds() / 86400)

    authorities = await Authority.find(Authority.is_active == True).to_list()  # noqa: E712

    return PilotMetrics(
        days=days,
        users_registered=await count("USER_REGISTERED"),
        letters_drafted=len(drafted),
        median_seconds_to_draft=round(median(seconds), 1) if seconds else None,
        fact_check_pass_rate=_rate(sum(1 for d in drafted if d.get("factCheckPassed")), len(drafted)),
        input_languages=[LanguageCount(language=k, count=v) for k, v in languages.most_common()],
        drafts_saved=await count("DOCUMENT_SAVED"),
        draft_completion_rate=_rate(saved_from_drafter, len(drafted)),
        draft_correction_rate=_rate(await count("DOCUMENT_SAVED", editedFromAi=True), saved_from_drafter),
        documents_exported=len(exported_ids),
        documents_marked_submitted=await count("DOCUMENT_SUBMITTED"),
        documents_with_response=await count("DOCUMENT_RESPONDED"),
        complaints_filed=len(filed),
        complaints_resolved=len(resolution_days),
        median_days_to_resolution=round(median(resolution_days), 1) if resolution_days else None,
        bookings_requested=await Booking.find(Booking.created_at >= since).count(),
        bookings_confirmed=await Booking.find(
            Booking.created_at >= since,
            {"status": {"$in": [BookingStatus.CONFIRMED.value, BookingStatus.COMPLETED.value]}},
        ).count(),
        authorities_listed=len(authorities),
        authorities_needing_recheck=sum(1 for a in authorities if needs_recheck(a)),
    )


def _admin_lawyer(profile: LawyerProfile, user: User | None) -> AdminLawyerOut:
    owner = user.model_dump() if user else {"name": None}
    return AdminLawyerOut.model_validate({**profile.model_dump(), "user": owner, "email": user.email if user else None})


@router.get("/lawyers", response_model=list[AdminLawyerOut])
async def list_lawyer_profiles(
    admin: Admin,
    verified: bool | None = None,
) -> list[AdminLawyerOut]:
    """Profiles of current lawyers; unverified ones first, as they are waiting on a bar-number check."""
    lawyer_users = await User.find({"role": UserRole.LAWYER.value}).to_list()
    by_id = {u.id: u for u in lawyer_users}
    filters: dict = {"user_id": {"$in": list(by_id)}}
    if verified is not None:
        filters["is_verified"] = verified
    profiles = await LawyerProfile.find(filters).sort(+LawyerProfile.is_verified, -LawyerProfile.created_at).to_list()
    return [_admin_lawyer(p, by_id.get(p.user_id)) for p in profiles]


@router.patch("/lawyers/{profile_id}/verify", response_model=AdminLawyerOut)
async def verify_lawyer(profile_id: str, body: LawyerVerify, admin: Admin) -> AdminLawyerOut:
    profile = await LawyerProfile.get(profile_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lawyer profile not found")
    profile.is_verified = body.is_verified
    await profile.save()
    await log_action(
        user_id=admin.id,
        action="LAWYER_VERIFIED" if body.is_verified else "LAWYER_UNVERIFIED",
        entity="LAWYER_PROFILE",
        entity_id=profile.id,
        metadata={"barNumber": profile.bar_number},
    )
    await notify(
        user_id=profile.user_id,
        type="LAWYER_VERIFIED" if body.is_verified else "LAWYER_UNVERIFIED",
        title="Profile verified" if body.is_verified else "Verification removed",
        message=(
            "Your bar registration was checked. Citizens now see a verified badge on your profile."
            if body.is_verified
            else "Your verified badge was removed. Check that your bar number is correct."
        ),
        action_url="/dashboard/lawyer/profile",
    )
    return _admin_lawyer(profile, await User.get(profile.user_id))


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def change_role(user_id: str, body: RoleChange, admin: Admin) -> User:
    user = await User.get(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id and body.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove your own admin role")
    if body.role == UserRole.OFFICER and not body.department:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Officers must be assigned a department")

    previous = user.role
    user.role = body.role
    user.department = body.department
    await user.save()
    await log_action(
        user_id=admin.id,
        action="USER_ROLE_CHANGED",
        entity="USER",
        entity_id=user.id,
        metadata={"from": previous.value, "to": body.role.value, "department": body.department},
    )
    return user
