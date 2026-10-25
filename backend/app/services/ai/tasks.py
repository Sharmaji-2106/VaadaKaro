import re
from functools import lru_cache

from app.core.config import get_settings
from app.services.ai import prompts
from app.services.ai.provider import AIService, UnconfiguredProvider
from app.services.ai.schemas import (
    AnalyzeRequest,
    ComplaintAnalysis,
    DraftLetterRequest,
    FactCheck,
    LegalDocumentsRequest,
    LegalDocumentsResult,
    LetterDraft,
    LetterDraftResponse,
)

DISCLAIMER = (
    "This draft was generated with AI assistance. Check every fact, date and the recipient department "
    "before using it. It is not legal advice and has not been submitted to any authority."
)

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_NUMBER = re.compile(r"\d[\d,./:-]*\d|\d")


@lru_cache
def get_ai_service() -> AIService:
    s = get_settings()
    if s.gemini_api_key:
        from app.services.ai.gemini import GeminiProvider

        provider = GeminiProvider(s.gemini_api_key)
    else:
        provider = UnconfiguredProvider()
    return AIService(provider, s.ai_primary_model, s.ai_fallback_model, s.ai_timeout_seconds)


def check_facts(source: str, draft: str) -> FactCheck:
    """Every number in the citizen's text (dates, amounts, pincodes, ids) should survive into the draft."""
    src = source.translate(_DEVANAGARI_DIGITS)
    out = draft.translate(_DEVANAGARI_DIGITS)
    missing = sorted({n.strip(",.") for n in _NUMBER.findall(src) if n.strip(",.") not in out})
    return FactCheck(missing_facts=missing, passed=not missing)


async def analyze_complaint(ai: AIService, req: AnalyzeRequest) -> ComplaintAnalysis:
    return await ai.run(
        "COMPLAINT_ANALYSIS",
        system=prompts.SAFETY_RULES,
        prompt=prompts.analyze_prompt(req.title, req.description, req.department, req.category),
        schema=ComplaintAnalysis,
    )


async def draft_letter(ai: AIService, req: DraftLetterRequest) -> LetterDraftResponse:
    draft = await ai.run(
        "LETTER_DRAFT",
        system=prompts.SAFETY_RULES,
        prompt=prompts.draft_letter_prompt(
            req.description, req.output_language.value, req.location, req.citizen_name
        ),
        schema=LetterDraft,
    )
    return LetterDraftResponse(
        **draft.model_dump(),
        fact_check=check_facts(req.description, f"{draft.subject}\n{draft.body}"),
        disclaimer=DISCLAIMER,
    )


async def generate_legal_documents(ai: AIService, req: LegalDocumentsRequest) -> LegalDocumentsResult:
    return await ai.run(
        "DOCUMENT_GENERATION",
        system=prompts.SAFETY_RULES,
        prompt=prompts.legal_documents_prompt(req.issue, req.description, req.category),
        schema=LegalDocumentsResult,
    )


async def legal_advice(ai: AIService, question: str, constitution_mode: bool) -> str:
    # Imported here to avoid a cycle: schemas.legal imports app.models.
    from app.schemas.legal import LegalAdviceResult

    result = await ai.run(
        "LEGAL_ASSISTANT",
        system=prompts.SAFETY_RULES,
        prompt=prompts.legal_advice_prompt(question, constitution_mode),
        schema=LegalAdviceResult,
    )
    return result.answer
