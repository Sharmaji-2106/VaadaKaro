"""Consent under the DPDP Act, 2023: recorded per purpose, against the notice version shown."""

from app.core.config import get_settings
from app.models import ConsentPurpose, ConsentRecord, User
from app.services.audit import log_action

# Prefix of the 403 detail, so the frontend can offer the consent switch instead of an error.
AI_CONSENT_REQUIRED = "AI consent required"


def needs_notice(user: User) -> bool:
    """True until the person has seen the current version of the privacy notice."""
    return user.notice_version != get_settings().privacy_notice_version


async def record_consent(user: User, purpose: ConsentPurpose, granted: bool) -> ConsentRecord:
    version = get_settings().privacy_notice_version
    record = await ConsentRecord(user_id=user.id, purpose=purpose, granted=granted, notice_version=version).insert()
    if purpose == ConsentPurpose.ACCOUNT and granted and user.notice_version != version:
        user.notice_version = version
        await user.save()
    await log_action(
        user_id=user.id,
        action="CONSENT_GIVEN" if granted else "CONSENT_WITHDRAWN",
        entity="CONSENT",
        entity_id=record.id,
        metadata={"purpose": purpose.value},
    )
    return record
