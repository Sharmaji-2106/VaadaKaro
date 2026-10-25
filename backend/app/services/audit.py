import json
import logging
from typing import Any

from app.models import AuditLog

logger = logging.getLogger(__name__)


async def log_action(
    *,
    user_id: str | None,
    action: str,
    entity: str,
    entity_id: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Writes an audit entry. Call it after the change it records has been saved."""
    await AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        metadata_json=json.dumps(metadata) if metadata else None,
    ).insert()
    logger.info("audit action=%s entity=%s id=%s user=%s", action, entity, entity_id, user_id)
