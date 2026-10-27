"""The lawyer's own portal: their public profile and the consultations booked with them."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import Lawyer
from app.api.routes.bookings import CITIZEN_BOOKINGS_URL, contact, people_by_id
from app.core.ids import utcnow
from app.models import Booking, BookingStatus, LawyerProfile, User
from app.schemas.legal import BookingStatusChange, LawyerBookingOut, LawyerProfileIn, LawyerProfileOut, LawyerStats
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(prefix="/lawyer", tags=["lawyer portal"])

# Which status a lawyer may move a booking to from its current one.
_TRANSITIONS = {
    BookingStatus.PENDING: {BookingStatus.CONFIRMED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {BookingStatus.COMPLETED, BookingStatus.CANCELLED},
}

_MESSAGES = {
    BookingStatus.CONFIRMED: ("BOOKING_CONFIRMED", "Consultation confirmed", "confirmed"),
    BookingStatus.CANCELLED: ("BOOKING_CANCELLED", "Consultation declined", "declined"),
    BookingStatus.COMPLETED: ("BOOKING_COMPLETED", "Consultation completed", "marked as completed"),
}


def _start_of_today():
    return utcnow().replace(hour=0, minute=0, second=0, microsecond=0)


def _profile_out(profile: LawyerProfile, user: User) -> LawyerProfileOut:
    return LawyerProfileOut.model_validate({**profile.model_dump(), "user": user.model_dump()})


async def _with_citizens(bookings: list[Booking]) -> list[LawyerBookingOut]:
    citizens = await people_by_id({b.citizen_id for b in bookings})
    return [
        LawyerBookingOut.model_validate(
            {**b.model_dump(), "citizen": contact(citizens.get(b.citizen_id), b.citizen_id, b)}
        )
        for b in bookings
    ]


@router.get("/profile", response_model=LawyerProfileOut)
async def get_profile(user: Lawyer) -> LawyerProfileOut:
    profile = await LawyerProfile.find_one(LawyerProfile.user_id == user.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You have not created your lawyer profile yet")
    return _profile_out(profile, user)


@router.put("/profile", response_model=LawyerProfileOut)
async def save_profile(body: LawyerProfileIn, user: Lawyer) -> LawyerProfileOut:
    """Creates or replaces the profile. Verification and rating are not the lawyer's to set."""
    profile = await LawyerProfile.find_one(LawyerProfile.user_id == user.id)
    created = profile is None
    if profile is None:
        profile = LawyerProfile(user_id=user.id, **body.model_dump())
    else:
        # A verified bar number that changes has to be checked again.
        if profile.bar_number != body.bar_number:
            profile.is_verified = False
        for field, value in body.model_dump().items():
            setattr(profile, field, value)
    await profile.save()
    await log_action(
        user_id=user.id,
        action="LAWYER_PROFILE_CREATED" if created else "LAWYER_PROFILE_UPDATED",
        entity="LAWYER_PROFILE",
        entity_id=profile.id,
    )
    return _profile_out(profile, user)


@router.get("/stats", response_model=LawyerStats)
async def stats(user: Lawyer) -> LawyerStats:
    grouped = await Booking.find(Booking.lawyer_id == user.id).aggregate(
        [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    ).to_list()
    counts = {row["_id"]: row["n"] for row in grouped}
    upcoming = await Booking.find(
        Booking.lawyer_id == user.id, Booking.status == BookingStatus.CONFIRMED, Booking.date >= _start_of_today()
    ).count()
    return LawyerStats(
        pending=counts.get(BookingStatus.PENDING, 0),
        upcoming=upcoming,
        completed=counts.get(BookingStatus.COMPLETED, 0),
        cancelled=counts.get(BookingStatus.CANCELLED, 0),
    )


@router.get("/bookings", response_model=list[LawyerBookingOut])
async def list_bookings(
    user: Lawyer,
    status_: Annotated[BookingStatus | None, Query(alias="status")] = None,
    upcoming: bool = False,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[LawyerBookingOut]:
    filters: dict = {"lawyer_id": user.id}
    if status_:
        filters["status"] = status_.value
    if upcoming:
        filters["date"] = {"$gte": _start_of_today()}
    # Open requests read soonest first; history reads newest first.
    soonest_first = upcoming or status_ in (BookingStatus.PENDING, BookingStatus.CONFIRMED)
    order = +Booking.date if soonest_first else -Booking.date
    bookings = await Booking.find(filters).sort(order).limit(limit).to_list()
    return await _with_citizens(bookings)


@router.patch("/bookings/{booking_id}", response_model=LawyerBookingOut)
async def change_booking_status(booking_id: str, body: BookingStatusChange, user: Lawyer) -> LawyerBookingOut:
    booking = await Booking.get(booking_id)
    if booking is None or booking.lawyer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if body.status not in _TRANSITIONS.get(booking.status, set()):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A {booking.status.value.lower()} booking cannot be marked {body.status.value.lower()}",
        )

    previous = booking.status
    booking.status = body.status
    if body.note is not None:
        booking.lawyer_note = body.note.strip() or None
    await booking.save()
    await log_action(
        user_id=user.id,
        action="BOOKING_STATUS_CHANGED",
        entity="BOOKING",
        entity_id=booking.id,
        metadata={"from": previous.value, "to": body.status.value},
    )

    type_, title, verb = _MESSAGES[body.status]
    if body.status == BookingStatus.CANCELLED and previous == BookingStatus.CONFIRMED:
        title, verb = "Consultation cancelled", "cancelled"
    message = f"{user.name or 'Your lawyer'} {verb} your consultation on {booking.date:%d %b %Y} ({booking.time_slot})."
    if booking.lawyer_note:
        message += f" Note: {booking.lawyer_note}"
    await notify(user_id=booking.citizen_id, type=type_, title=title, message=message, action_url=CITIZEN_BOOKINGS_URL)
    return (await _with_citizens([booking]))[0]
