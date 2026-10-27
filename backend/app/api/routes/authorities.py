"""Verified authority directory: where a complaint is officially submitted, with its source.

Public lookup under /authorities; admins maintain entries under /admin/authorities.
"""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Admin
from app.core.ids import utcnow
from app.models import Authority
from app.schemas.authority import AuthorityCreate, AuthorityMatch, AuthorityOut, AuthorityUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/authorities", tags=["authorities"])
admin_router = APIRouter(prefix="/admin/authorities", tags=["admin"])

# Entries older than this are shown with a "check before sending" warning.
RECHECK_AFTER = timedelta(days=180)
_SCOPE_RANK = {"DISTRICT": 0, "STATE": 1, "NATIONAL": 2}


def _same(a: str | None, b: str | None) -> bool:
    return bool(a and b) and a.strip().lower() == b.strip().lower()


def _mentions(text: str, name: str | None) -> bool:
    return bool(name) and name.lower() in text


def _scope(a: Authority, state: str | None, district: str | None, location: str) -> str | None:
    """How an entry applies to the given place, or None if it is for somewhere else."""
    if a.state is None:
        return "NATIONAL"
    state_ok = _same(a.state, state) or _mentions(location, a.state)
    if not state_ok:
        return None
    if a.district is None:
        return "STATE"
    return "DISTRICT" if _same(a.district, district) or _mentions(location, a.district) else None


def needs_recheck(a: Authority) -> bool:
    return a.last_verified_at is None or utcnow() - a.last_verified_at > RECHECK_AFTER


@router.get("", response_model=list[AuthorityMatch])
async def find_authorities(
    department: Annotated[str | None, Query(max_length=120)] = None,
    category: Annotated[str | None, Query(max_length=120)] = None,
    state: Annotated[str | None, Query(max_length=60)] = None,
    district: Annotated[str | None, Query(max_length=80)] = None,
    # Free-text address, e.g. from the letter drafter; state and district names are matched inside it.
    location: Annotated[str | None, Query(max_length=300)] = None,
) -> list[AuthorityMatch]:
    return await match_authorities(department, category, state, district, location)


async def match_authorities(
    department: str | None,
    category: str | None = None,
    state: str | None = None,
    district: str | None = None,
    location: str | None = None,
) -> list[AuthorityMatch]:
    filters: dict = {"is_active": True}
    if department:
        filters["department"] = department
    entries = await Authority.find(filters).to_list()

    place = (location or "").lower()
    matches: list[AuthorityMatch] = []
    for a in entries:
        if category and a.categories and category not in a.categories:
            continue
        scope = _scope(a, state, district, place)
        if scope is None:
            continue
        matches.append(
            AuthorityMatch.model_validate({**a.model_dump(), "scope": scope, "needs_recheck": needs_recheck(a)})
        )
    # Most local first, then recently verified entries before ones that need a recheck.
    matches.sort(key=lambda m: (_SCOPE_RANK[m.scope], m.needs_recheck, m.name))
    return matches


@admin_router.get("", response_model=list[AuthorityOut])
async def list_all(admin: Admin) -> list[Authority]:
    return await Authority.find_all().sort(+Authority.department, +Authority.name).to_list()


@admin_router.post("", response_model=AuthorityOut, status_code=status.HTTP_201_CREATED)
async def create(body: AuthorityCreate, admin: Admin) -> Authority:
    data = body.model_dump(exclude={"verified_now"})
    authority = Authority(**data)
    if body.verified_now:
        authority.last_verified_at, authority.verified_by = utcnow(), admin.id
    await authority.insert()
    await log_action(user_id=admin.id, action="AUTHORITY_CREATED", entity="AUTHORITY", entity_id=authority.id)
    return authority


@admin_router.put("/{authority_id}", response_model=AuthorityOut)
async def update(authority_id: str, body: AuthorityUpdate, admin: Admin) -> Authority:
    authority = await Authority.get(authority_id)
    if authority is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Authority not found")
    for field, value in body.model_dump(exclude={"verified_now"}).items():
        setattr(authority, field, value)
    if body.verified_now:
        authority.last_verified_at, authority.verified_by = utcnow(), admin.id
    await authority.save()
    await log_action(
        user_id=admin.id,
        action="AUTHORITY_VERIFIED" if body.verified_now else "AUTHORITY_UPDATED",
        entity="AUTHORITY",
        entity_id=authority.id,
        metadata={"active": authority.is_active},
    )
    return authority
