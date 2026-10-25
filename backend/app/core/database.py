import asyncio
import logging

from beanie import init_beanie
from fastapi import HTTPException, status
from pymongo import AsyncMongoClient

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncMongoClient | None = None
_index_task: asyncio.Task | None = None


async def init_db(
    url: str | None = None, db_name: str | None = None, *, indexes_in_background: bool = False
) -> AsyncMongoClient:
    """Connect and register the Beanie models. The database name comes from the URL path.

    Checking every index against Atlas takes about a minute, so the API server does it in the
    background after startup; scripts and tests wait for it.
    """
    global _client, _index_task
    from app.models import DOCUMENT_MODELS

    client = AsyncMongoClient(url or get_settings().mongodb_url, tz_aware=False)
    database = client[db_name] if db_name else client.get_default_database(default="vaadakaro")
    await init_beanie(database=database, document_models=DOCUMENT_MODELS, skip_indexes=indexes_in_background)
    _client = client
    if indexes_in_background:
        _index_task = asyncio.create_task(_ensure_indexes(database, DOCUMENT_MODELS))
    return client


async def _ensure_indexes(database, models) -> None:
    try:
        await init_beanie(database=database, document_models=models)
        logger.info("MongoDB indexes are up to date")
    except Exception:
        logger.exception("Creating MongoDB indexes failed")


_connect_task: asyncio.Task | None = None


async def _connect_with_retry() -> None:
    delay = 2.0
    while True:
        try:
            await init_db(indexes_in_background=True)
            logger.info("Connected to MongoDB")
            return
        except Exception as e:  # noqa: BLE001
            logger.warning("MongoDB connection failed (%s); retrying in %.0fs", type(e).__name__, delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, 30)


def connect_in_background() -> None:
    """For the API server: start listening at once and connect meanwhile (see wait_ready)."""
    global _connect_task
    _connect_task = asyncio.create_task(_connect_with_retry())


async def wait_ready() -> None:
    """Holds a request until the background connection is up, for at most READY_TIMEOUT seconds."""
    if _connect_task is None or _connect_task.done():
        return
    try:
        await asyncio.wait_for(asyncio.shield(_connect_task), READY_TIMEOUT)
    except TimeoutError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Database is unavailable. Please try again shortly.")


READY_TIMEOUT = 45


async def close_db() -> None:
    global _client, _index_task, _connect_task
    if _connect_task is not None and not _connect_task.done():
        _connect_task.cancel()
    _connect_task = None
    if _index_task is not None:
        _index_task.cancel()
        _index_task = None
    if _client is not None:
        await _client.close()
        _client = None


def is_connecting() -> bool:
    return _connect_task is not None and not _connect_task.done()


async def ping() -> bool:
    if _client is None:
        return False
    await _client.admin.command("ping")
    return True
