from datetime import datetime

from pydantic import Field, field_validator

from app.models import BookingStatus
from app.schemas.base import ApiModel


class LegalAdviceRequest(ApiModel):
    query: str = Field(min_length=3, max_length=2000)
    constitution_mode: bool = False


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
    rating: float
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


class InfoReply(ApiModel):
    message: str = Field(min_length=3, max_length=3000)
