from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.models import UserRole
from app.schemas.base import ApiModel


class SignupRequest(ApiModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # The role is never accepted from the client; every signup is a CITIZEN.
    # Consent to the privacy notice for running the account (DPDP Act s.6).
    consent: Literal[True]
    # DPDP Act s.9 needs verifiable parental consent for under-18s; there is no such flow, so
    # signup is for adults only.
    adult: Literal[True]
    # Separate and optional, so using the service never depends on agreeing to AI processing.
    ai_consent: bool = False

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def lower(cls, v: str) -> str:
        return v.lower()


class UserOut(ApiModel):
    id: str
    name: str | None
    email: str
    phone: str | None = None
    role: UserRole
    department: str | None = None
    location: str | None = None
    ai_consent: bool | None = None


class MeOut(UserOut):
    # The current privacy notice hasn't been shown to this person yet.
    needs_notice: bool = False


class TokenResponse(ApiModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
