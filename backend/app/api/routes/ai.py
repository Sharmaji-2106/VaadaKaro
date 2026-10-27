import json
import time

from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import AI, AIUser
from app.api.routes.authorities import match_authorities
from app.core.rate_limit import limiter
from app.models import Complaint, LegalDocument
from app.schemas.authority import LetterDraftWithAuthorities
from app.schemas.document import LegalDocumentOut, LegalDocumentsResponse
from app.services.ai import tasks
from app.services.ai.schemas import (
    AnalyzeRequest,
    ComplaintAnalysis,
    DraftLetterRequest,
    LegalDocumentsRequest,
)
from app.services.audit import log_action

router = APIRouter(prefix="/ai", tags=["ai"])

# AI calls cost quota, so they are limited per client on top of the provider's own limits.
AI_LIMIT = "10/minute"


@router.post("/analyze", response_model=ComplaintAnalysis)
@limiter.limit(AI_LIMIT)
async def analyze(request: Request, body: AnalyzeRequest, user: AIUser, ai: AI) -> ComplaintAnalysis:
    return await tasks.analyze_complaint(ai, body)


@router.post("/draft-letter", response_model=LetterDraftWithAuthorities)
@limiter.limit(AI_LIMIT)
async def draft_letter(
    request: Request, body: DraftLetterRequest, user: AIUser, ai: AI
) -> LetterDraftWithAuthorities:
    if body.citizen_name is None:
        body.citizen_name = user.name
    started = time.monotonic()
    draft = await tasks.draft_letter(ai, body)
    # Inputs for the success metrics (time to draft, fact-check pass rate, languages); no letter text.
    await log_action(
        user_id=user.id,
        action="LETTER_DRAFTED",
        entity="AI_DRAFT",
        entity_id=user.id,
        metadata={
            "seconds": round(time.monotonic() - started, 1),
            "factCheckPassed": draft.fact_check.passed,
            "inputLanguage": draft.detected_language.value,
            "outputLanguage": body.output_language.value,
            "department": draft.department_group.value,
        },
    )
    # Where to send it comes from the maintained directory, with sources, not from the model.
    authorities = await match_authorities(draft.department_group.value, location=body.location)
    return LetterDraftWithAuthorities(**draft.model_dump(), authorities=authorities)


@router.post("/legal-documents", response_model=LegalDocumentsResponse)
@limiter.limit(AI_LIMIT)
async def legal_documents(
    request: Request, body: LegalDocumentsRequest, user: AIUser, ai: AI
) -> LegalDocumentsResponse:
    if body.complaint_id and not await Complaint.find_one(
        Complaint.id == body.complaint_id, Complaint.citizen_id == user.id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    result = await tasks.generate_legal_documents(ai, body)
    analysis_json = json.dumps(
        {
            "recommendedAction": result.analysis.recommended_action,
            "missingEvidence": result.analysis.missing_evidence,
        }
    )
    docs = [
        LegalDocument(
            user_id=user.id,
            complaint_id=body.complaint_id,
            title=d.title,
            content=d.content,
            type=d.type,
            category=result.analysis.category,
            risk_level=result.analysis.risk_level.value,
            analysis=analysis_json,
        )
        for d in result.documents
    ]
    await LegalDocument.insert_many(docs)
    await log_action(
        user_id=user.id,
        action="LEGAL_DOCUMENTS_GENERATED",
        entity="LEGAL_DOCUMENT",
        entity_id=docs[0].id,
        metadata={"count": len(docs), "complaintId": body.complaint_id},
    )
    return LegalDocumentsResponse(
        analysis=result.analysis, documents=[LegalDocumentOut.model_validate(d) for d in docs]
    )
