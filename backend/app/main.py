import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import (
    admin,
    ai,
    assistant,
    auth,
    complaints,
    documents,
    health,
    lawyers,
    notifications,
    officer,
    replies,
    uploads,
)
from app.core.config import get_settings
from app.core.database import close_db, connect_in_background, wait_ready
from app.core.rate_limit import limiter
from app.services.ai.provider import AIUnavailableError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Connecting to Atlas can take ~30s; don't hold up startup (requests wait in db_ready).
    connect_in_background()
    yield
    await close_db()


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    version="0.1.0",
    # Interactive docs only outside production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(AIUnavailableError)
async def ai_unavailable(_: Request, exc: AIUnavailableError) -> JSONResponse:
    logging.getLogger("app.ai").error("AI unavailable: %s (cause: %r)", exc, exc.__cause__)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "AI service temporarily unavailable. Please try again in a few moments."},
    )


# Listed first, so it runs before route dependencies such as CurrentUser that query the database.
api = APIRouter(prefix="/api/v1", dependencies=[Depends(wait_ready)])
for module in (
    auth,
    complaints,
    replies,
    officer,
    ai,
    assistant,
    documents,
    uploads,
    notifications,
    lawyers,
    admin,
):
    api.include_router(module.router)

app.include_router(health.router)
app.include_router(api)
