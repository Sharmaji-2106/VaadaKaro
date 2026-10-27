from datetime import datetime

from pydantic import Field

from app.models import SubmissionStatus
from app.schemas.base import ApiModel
from app.services.ai.schemas import LegalAnalysis


class LegalDocumentOut(ApiModel):
    id: str
    complaint_id: str | None
    title: str
    content: str
    type: str
    category: str | None
    risk_level: str | None
    analysis: str | None
    submission_status: SubmissionStatus = SubmissionStatus.DRAFT
    submitted_to: str | None = None
    submission_reference: str | None = None
    submitted_on: datetime | None = None
    response_note: str | None = None
    responded_on: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LegalDocumentsResponse(ApiModel):
    analysis: LegalAnalysis
    documents: list[LegalDocumentOut]


class LegalDocumentCreate(ApiModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50_000)
    type: str = Field(default="FORMAL_COMPLAINT", pattern=r"^[A-Z_]{3,40}$")
    category: str | None = Field(default=None, max_length=120)
    # Whether the citizen changed the AI draft before saving; feeds the draft-correction metric.
    edited_from_ai: bool | None = None


class SubmissionRecord(ApiModel):
    """The citizen's own record of sending the letter and of any reply."""

    status: SubmissionStatus
    submitted_to: str | None = Field(default=None, max_length=200)
    submission_reference: str | None = Field(default=None, max_length=120)
    submitted_on: datetime | None = None
    response_note: str | None = Field(default=None, max_length=2000)
    responded_on: datetime | None = None


class LegalDocumentUpdate(ApiModel):
    content: str = Field(min_length=1, max_length=50_000)
    title: str | None = Field(default=None, min_length=1, max_length=200)
