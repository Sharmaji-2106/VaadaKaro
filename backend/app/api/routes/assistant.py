from fastapi import APIRouter, Request

from app.api.deps import AI, CurrentUser, OptionalUser
from app.api.routes.ai import AI_LIMIT
from app.core.rate_limit import limiter
from app.models import AILegalHistory
from app.schemas.legal import ChatHistoryOut, LegalAdviceRequest, LegalAdviceResponse
from app.services.ai import tasks

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/legal-advice", response_model=LegalAdviceResponse)
@limiter.limit(AI_LIMIT)
async def legal_advice(request: Request, body: LegalAdviceRequest, user: OptionalUser, ai: AI) -> LegalAdviceResponse:
    """Open to guests; signed-in users get the conversation saved to their history."""
    answer = await tasks.legal_advice(ai, body.query, body.constitution_mode)
    if user is not None:
        await AILegalHistory(
            user_id=user.id,
            query=body.query,
            response=answer,
            legal_category="CONSTITUTIONAL" if body.constitution_mode else "GENERAL_GUIDANCE",
        ).insert()
    return LegalAdviceResponse(response=answer)


@router.get("/history", response_model=list[ChatHistoryOut])
async def history(user: CurrentUser) -> list[AILegalHistory]:
    return (
        await AILegalHistory.find(AILegalHistory.user_id == user.id)
        .sort(-AILegalHistory.created_at)
        .limit(20)
        .to_list()
    )
