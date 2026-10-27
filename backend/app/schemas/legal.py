from datetime import datetime

from pydantic import Field, field_validator

from app.models import BookingStatus
from app.schemas.base import ApiModel


class LegalAdviceRequest(ApiModel):
    query: str = Field(min_length=3, max_length=2000)
    constitution_mode: bool = False
    # Guests only: agreement to send this question to the AI provider.
    ai_consent: bool = False


class LegalAdviceResult(ApiModel):
    """Model output: a markdown answer for the citizen."""

    answer: str = Field(description="Markdown answer in plain language, ending with the disclaimer.")


class LegalAdviceResponse(ApiModel):
    response: str


class ChatHistoryOut(ApiModel):
    id: str
    query: str
    response: str
    legal_category: str | None
    created_at: datetime


class LawyerUserOut(ApiModel):
    name: str | None
    image: str | None = None


class LawyerOut(ApiModel):
    id: str
    specialization: list[str]
    location: str
    pincode: str
    fees: int
    experience: int
    is_available: bool
    is_verified: bool
    languages: list[str]
    bio: str | None
    # No rating: listings show only what BCI Rules r.36 allows an advocate to publish.
    state_bar_council: str | None = None
    enrolment_year: int | None = None
    user: LawyerUserOut

    # Treat a missing or null array (e.g. a document written by hand) as empty.
    @field_validator("specialization", "languages", mode="before")
    @classmethod
    def none_to_empty(cls, v: list[str] | None) -> list[str]:
        return v or []


class BookingCreate(ApiModel):
    date: datetime
    time_slot: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=10, max_length=2000)
    is_offline: bool = False


class BookingOut(ApiModel):
    id: str
    lawyer_id: str
    date: datetime
    time_slot: str
    description: str
    status: BookingStatus
    is_offline: bool
    created_at: datetime


class PersonContact(ApiModel):
    """The other party of a booking. Email and phone are only filled in once it is confirmed."""

    id: str
    name: str | None
    email: str | None = None
    phone: str | None = None


class CitizenBookingOut(BookingOut):
    lawyer: PersonContact
    lawyer_note: str | None = None


class LawyerBookingOut(BookingOut):
    citizen: PersonContact
    lawyer_note: str | None = None


class BookingStatusChange(ApiModel):
    status: BookingStatus
    note: str | None = Field(default=None, max_length=1000)


class LawyerStats(ApiModel):
    pending: int
    upcoming: int
    completed: int
    cancelled: int


class LawyerProfileIn(ApiModel):
    bar_number: str = Field(min_length=3, max_length=40)
    state_bar_council: str = Field(min_length=3, max_length=120)
    # The Advocates Act came into force in 1961; nobody enrolled under it earlier.
    enrolment_year: int = Field(ge=1961, le=2100)
    specialization: list[str] = Field(min_length=1, max_length=10)
    location: str = Field(min_length=2, max_length=100)
    pincode: str = Field(pattern=r"^\d{6}$")
    fees: int = Field(ge=0, le=100000)
    experience: int = Field(ge=0, le=70)
    languages: list[str] = Field(min_length=1, max_length=10)
    bio: str | None = Field(default=None, max_length=2000)
    is_available: bool = True

    @field_validator("specialization", "languages")
    @classmethod
    def clean_items(cls, v: list[str]) -> list[str]:
        items = list(dict.fromkeys(item.strip() for item in v if item.strip()))
        if not items or any(len(item) > 40 for item in items):
            raise ValueError("Give 1-10 entries of at most 40 characters each")
        return items


class LawyerProfileOut(LawyerOut):
    """The lawyer's own view of their profile, including the bar number."""

    bar_number: str


class AdminLawyerOut(LawyerProfileOut):
    email: str | None = None
    created_at: datetime


class LawyerVerify(ApiModel):
    is_verified: bool


class InfoReply(ApiModel):
    message: str = Field(min_length=3, max_length=3000)
