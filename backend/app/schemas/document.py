from datetime import datetime

from pydantic import Field

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


class LegalDocumentUpdate(ApiModel):
    content: str = Field(min_length=1, max_length=50_000)
    title: str | None = Field(default=None, min_length=1, max_length=200)
