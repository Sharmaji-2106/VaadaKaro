from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, contains
from app.api.routes.bookings import LAWYER_BOOKINGS_URL
from app.models import Booking, LawyerProfile, User, UserRole
from app.schemas.legal import BookingCreate, BookingOut, LawyerOut
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(prefix="/lawyers", tags=["lawyers"])


async def _listed_profile(lawyer_id: str) -> LawyerProfile:
    """A profile is public only while its owner still holds the lawyer role."""
    lawyer = await LawyerProfile.get(lawyer_id)
    owner = await User.get(lawyer.user_id) if lawyer else None
    if lawyer is None or owner is None or owner.role != UserRole.LAWYER:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lawyer not found")
    return lawyer


async def _with_users(profiles: list[LawyerProfile]) -> list[LawyerOut]:
    users = await User.find({"_id": {"$in": [p.user_id for p in profiles]}}).to_list() if profiles else []
    by_id = {u.id: u.model_dump() for u in users}
    return [
        LawyerOut.model_validate({**p.model_dump(), "user": by_id.get(p.user_id) or {"name": None}})
        for p in profiles
    ]


@router.get("", response_model=list[LawyerOut])
async def list_lawyers(
    location: Annotated[str | None, Query(max_length=100)] = None,
    specialization: Annotated[str | None, Query(max_length=60)] = None,
    max_fees: Annotated[int | None, Query(alias="maxFees", ge=0)] = None,
    language: Annotated[str | None, Query(max_length=40)] = None,
    is_available: Annotated[bool | None, Query(alias="isAvailable")] = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> list[LawyerOut]:
    lawyer_users = await User.find({"role": UserRole.LAWYER.value}).to_list()
    filters: dict = {"user_id": {"$in": [u.id for u in lawyer_users]}}
    if location:
        filters["location"] = contains(location)
    if max_fees is not None:
        filters["fees"] = {"$lte": max_fees}
    if is_available is not None:
        filters["is_available"] = is_available
    # Matching a scalar against an array field tests membership.
    if specialization and specialization != "All":
        filters["specialization"] = specialization
    if language and language != "Any":
        filters["languages"] = language
    if search:
        named = [u.id for u in lawyer_users if search.lower() in (u.name or "").lower()]
        filters["$or"] = [{"user_id": {"$in": named}}, {"bio": contains(search)}]

    profiles = await LawyerProfile.find(filters).to_list()
    # Neutral order (verified first, then by name), never by rating or popularity: ranking
    # advocates would be soliciting work for them (BCI Rules, Part VI, Ch. II, r.36).
    listed = await _with_users(profiles)
    return sorted(listed, key=lambda l: (not l.is_verified, (l.user.name or "").lower()))


@router.get("/{lawyer_id}", response_model=LawyerOut)
async def get_lawyer(lawyer_id: str) -> LawyerOut:
    return (await _with_users([await _listed_profile(lawyer_id)]))[0]


@router.post("/{lawyer_id}/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def book(lawyer_id: str, body: BookingCreate, user: CurrentUser) -> Booking:
    lawyer = await _listed_profile(lawyer_id)
    if lawyer.user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot book a consultation with yourself")
    if not lawyer.is_available:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lawyer is not taking bookings right now")

    booking = await Booking(
        citizen_id=user.id,
        lawyer_id=lawyer.user_id,
        date=body.date.replace(tzinfo=None),
        time_slot=body.time_slot,
        description=body.description,
        is_offline=body.is_offline,
    ).insert()
    await log_action(user_id=user.id, action="BOOKING_CREATED", entity="BOOKING", entity_id=booking.id)
    await notify(
        user_id=lawyer.user_id,
        type="BOOKING_REQUESTED",
        title="New consultation request",
        message=f"{user.name or 'A citizen'} asked for a consultation on {booking.date:%d %b %Y} ({booking.time_slot}).",
        action_url=LAWYER_BOOKINGS_URL,
    )
    return booking
