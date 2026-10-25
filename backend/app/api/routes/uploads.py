from fastapi import APIRouter, HTTPException, Request, status

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.schemas.misc import PresignRequest, PresignResponse
from app.services import storage

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presign", response_model=PresignResponse)
@limiter.limit("30/minute")
async def presign(request: Request, body: PresignRequest, user: CurrentUser) -> PresignResponse:
    settings = get_settings()
    if not settings.uploads_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "File uploads are not configured")
    if body.content_type not in storage.ALLOWED_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only JPEG, PNG, WebP images and PDF files are allowed")
    if body.size > settings.upload_max_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File size must be less than 10MB")

    key = storage.make_key(user.id, body.filename, body.content_type)
    url, headers = storage.presign_upload(key, body.content_type, body.size)
    return PresignResponse(key=key, upload_url=url, headers=headers, expires_in=settings.upload_url_expiry_seconds)
