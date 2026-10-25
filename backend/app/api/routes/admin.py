from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Admin, contains
from app.models import AuditLog, Complaint, ComplaintStatus, User, UserRole
from app.schemas.auth import UserOut
from app.schemas.misc import AuditLogOut, DepartmentReport, MonthlyReport, RoleChange
from app.services.audit import log_action

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
