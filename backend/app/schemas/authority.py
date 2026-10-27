from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.core.departments import Department
from app.schemas.base import ApiModel
from app.services.ai.schemas import LetterDraftResponse

_URL = r"^https?://[^\s]+$"


class AuthorityFields(ApiModel):
    name: str = Field(min_length=3, max_length=200)
    department: Department
    categories: list[str] = Field(default_factory=list, max_length=20)
    state: str | None = Field(default=None, max_length=60)
    district: str | None = Field(default=None, max_length=80)
    how_to_submit: str = Field(min_length=10, max_length=2000)
    submission_url: str | None = Field(default=None, max_length=500, pattern=_URL)
    email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)
    source_url: str = Field(max_length=500, pattern=_URL)

    @field_validator("state", "district", "submission_url", "email", "phone", "address", mode="before")
    @classmethod
    def blank_to_none(cls, v: str | None) -> str | None:
        return v.strip() or None if isinstance(v, str) else v

    @field_validator("categories")
    @classmethod
    def clean(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(c.strip() for c in v if c.strip()))


class AuthorityCreate(AuthorityFields):
    # The admin confirms they checked the entry against source_url today.
    verified_now: bool = True


class AuthorityUpdate(AuthorityCreate):
    verified_now: bool = False
    is_active: bool = True


class AuthorityOut(ApiModel):
    # Plain types, not AuthorityFields: input rules must not make stored entries unreadable.
    id: str
    name: str
    department: str
    categories: list[str]
    state: str | None
    district: str | None
    how_to_submit: str
    submission_url: str | None
    email: str | None
    phone: str | None
    address: str | None
    source_url: str
    last_verified_at: datetime | None
    is_active: bool
    updated_at: datetime


class AuthorityMatch(AuthorityOut):
    """A directory entry that applies to the citizen's complaint, and how closely."""

    scope: Literal["DISTRICT", "STATE", "NATIONAL"]
    # Not checked against its source for a long time (or never): the citizen should double-check.
    needs_recheck: bool


class LetterDraftWithAuthorities(LetterDraftResponse):
    # Directory entries for the suggested department and the citizen's location, most local first.
    authorities: list[AuthorityMatch] = Field(default_factory=list)
