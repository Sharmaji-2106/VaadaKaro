from fastapi import APIRouter

from app.core import database
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    try:
        database_ok = await database.ping()
    except Exception:  # noqa: BLE001
        database_ok = False
    database_status = "ok" if database_ok else "connecting" if database.is_connecting() else "unavailable"
    return {
        "status": "ok" if database_ok else "degraded",
        "database": database_status,
        "ai": "configured" if settings.gemini_api_key else "not_configured",
        "uploads": "configured" if settings.uploads_enabled else "not_configured",
    }
