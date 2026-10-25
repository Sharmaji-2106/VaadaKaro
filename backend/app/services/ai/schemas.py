from enum import StrEnum

from pydantic import Field

from app.schemas.base import ApiModel


class Language(StrEnum):
    ENGLISH = "en"
    HINDI = "hi"
    MARATHI = "mr"


class Level(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ---- requests -------------------------------------------------------------


class AnalyzeRequest(ApiModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=10, max_length=3000)
    department: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)


class DraftLetterRequest(ApiModel):
    # Free text in any supported language, typed or from voice input.
    description: str = Field(min_length=10, max_length=3000)
    input_language: Language | None = None
    output_language: Language = Language.ENGLISH
    location: str | None = Field(default=None, max_length=300)
    citizen_name: str | None = Field(default=None, max_length=100)


class LegalDocumentsRequest(ApiModel):
    issue: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=3000)
    category: str | None = Field(default=None, max_length=120)
    complaint_id: str | None = None


# ---- model outputs (also used as Gemini response schemas) -----------------


class ComplaintAnalysis(ApiModel):
    reliability_score: int = Field(ge=0, le=100)
    reliability_level: Level
    feedback: str
    suggested_category: str
    suggested_department: str
    missing_details: list[str]


class LetterDraft(ApiModel):
    detected_language: Language
    english_summary: str
    category: str
    suggested_department: str
    authority_note: str = Field(
        description="Why this department is suggested and what the citizen should verify about jurisdiction."
    )
    subject: str
    body: str
    missing_information: list[str]
    placeholders: list[str] = Field(description="Placeholders such as [Your Name] used in the body.")
    assumptions: list[str] = Field(description="Anything stated in the letter that the citizen did not say.")


class FactCheck(ApiModel):
    """Numbers/dates from the citizen's text that do not appear in the draft."""

    missing_facts: list[str]
    passed: bool


class LetterDraftResponse(LetterDraft):
    fact_check: FactCheck
    ai_generated: bool = True
    disclaimer: str


class GeneratedDocument(ApiModel):
    type: str = Field(
        description="One of FORMAL_COMPLAINT, GOVERNMENT_EMAIL, CONSUMER_DRAFT, POLICE_DRAFT, RTI_DRAFT, LEGAL_SUMMARY"
    )
    title: str
    content: str


class LegalAnalysis(ApiModel):
    risk_level: Level
    recommended_action: str
    category: str
    missing_evidence: list[str]


class LegalDocumentsResult(ApiModel):
    analysis: LegalAnalysis
    documents: list[GeneratedDocument] = Field(min_length=1, max_length=6)
