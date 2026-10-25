import logging

from pymongo.errors import DuplicateKeyError

from app.models import Notification, UserSettings

logger = logging.getLogger(__name__)


async def get_or_create_settings(user_id: str) -> UserSettings:
    settings = await UserSettings.find_one(UserSettings.user_id == user_id)
    if settings is None:
        try:
            settings = await UserSettings(user_id=user_id).insert()
        except DuplicateKeyError:  # created by a concurrent request
            settings = await UserSettings.find_one(UserSettings.user_id == user_id)
    return settings


async def notify(
    *,
    user_id: str,
    type: str,
    title: str,
    message: str,
    complaint_id: str | None = None,
    action_url: str | None = None,
) -> None:
    """In-app notification, respecting the user's settings. Email delivery is not wired up yet."""
    settings = await get_or_create_settings(user_id)
    if settings.push_enabled:
        await Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            complaint_id=complaint_id,
            action_url=action_url,
        ).insert()
    if settings.email_enabled:
        logger.info("email (not sent, no provider configured) user=%s subject=%r", user_id, title)


def track_url(tracking_id: str) -> str:
    return f"/track-complaint?id={tracking_id}"


def short_ref(tracking_id: str) -> str:
    return tracking_id.rsplit("-", 1)[-1]
