"""A citizen's own lawyer consultations."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser
from app.models import Booking, BookingStatus, User
from app.schemas.legal import CitizenBookingOut, PersonContact
from app.services.audit import log_action
from app.services.notifications import notify

router = APIRouter(prefix="/bookings", tags=["bookings"])

LAWYER_BOOKINGS_URL = "/dashboard/lawyer/bookings"
CITIZEN_BOOKINGS_URL = "/dashboard/bookings"

# Contact details are shared with the other party only while the consultation is on.
_SHARES_CONTACT = {BookingStatus.CONFIRMED, BookingStatus.COMPLETED}


async def people_by_id(ids: set[str]) -> dict[str, User]:
    users = await User.find({"_id": {"$in": list(ids)}}).to_list() if ids else []
    return {u.id: u for u in users}


def contact(person: User | None, user_id: str, booking: Booking) -> PersonContact:
    if person is None:
        return PersonContact(id=user_id, name=None)
    shared = booking.status in _SHARES_CONTACT
    return PersonContact(
        id=person.id,
        name=person.name,
        email=person.email if shared else None,
        phone=person.phone if shared else None,
    )


@router.get("", response_model=list[CitizenBookingOut])
async def my_bookings(user: CurrentUser) -> list[CitizenBookingOut]:
    bookings = await Booking.find(Booking.citizen_id == user.id).sort(-Booking.date).to_list()
    lawyers = await people_by_id({b.lawyer_id for b in bookings})
    return [
        CitizenBookingOut.model_validate(
            {**b.model_dump(), "lawyer": contact(lawyers.get(b.lawyer_id), b.lawyer_id, b)}
        )
        for b in bookings
    ]


@router.post("/{booking_id}/cancel", response_model=CitizenBookingOut)
async def cancel(booking_id: str, user: CurrentUser) -> CitizenBookingOut:
    booking = await Booking.get(booking_id)
    if booking is None or booking.citizen_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.status not in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
        raise HTTPException(status.HTTP_409_CONFLICT, f"A {booking.status.value.lower()} booking cannot be cancelled")

    booking.status = BookingStatus.CANCELLED
    await booking.save()
    await log_action(user_id=user.id, action="BOOKING_CANCELLED_BY_CITIZEN", entity="BOOKING", entity_id=booking.id)
    await notify(
        user_id=booking.lawyer_id,
        type="BOOKING_CANCELLED",
        title="Consultation cancelled",
        message=f"{user.name or 'A citizen'} cancelled the consultation on {booking.date:%d %b %Y} ({booking.time_slot}).",
        action_url=LAWYER_BOOKINGS_URL,
    )
    lawyer = await User.get(booking.lawyer_id)
    return CitizenBookingOut.model_validate({**booking.model_dump(), "lawyer": contact(lawyer, booking.lawyer_id, booking)})
