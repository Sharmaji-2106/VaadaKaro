import asyncio
import logging
import time
from typing import Protocol

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """Raised when every configured model failed; routes turn this into a 503."""


class LLMProvider(Protocol):
    async def generate_json[T: BaseModel](
        self, *, model: str, system: str, prompt: str, schema: type[T]
    ) -> T: ...


class AIService:
    """Runs a task on the primary model, then the fallback, with a timeout on each."""

    def __init__(self, provider: LLMProvider, primary: str, fallback: str | None, timeout: float):
        self.provider = provider
        self.models = [m for m in (primary, fallback) if m]
        self.timeout = timeout

    async def run[T: BaseModel](self, task: str, *, system: str, prompt: str, schema: type[T]) -> T:
        last_error: Exception | None = None
        for model in self.models:
            started = time.perf_counter()
            try:
                result = await asyncio.wait_for(
                    self.provider.generate_json(model=model, system=system, prompt=prompt, schema=schema),
                    timeout=self.timeout,
                )
            # Timeouts, provider errors and schema-invalid output all fall through to the next model.
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("ai task=%s model=%s failed: %s", task, model, exc)
                continue
            logger.info("ai task=%s model=%s ok in %.0fms", task, model, (time.perf_counter() - started) * 1000)
            return result
        raise AIUnavailableError(f"All models failed for {task}") from last_error


class UnconfiguredProvider:
    async def generate_json(self, **_):
        raise AIUnavailableError("GEMINI_API_KEY is not configured")
