from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser
from app.models import Notification
from app.schemas.misc import NotificationOut, NotificationSettings, NotificationSettingsUpdate
from app.services.notifications import get_or_create_settings

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(user: CurrentUser) -> list[Notification]:
    return (
        await Notification.find(Notification.user_id == user.id).sort(-Notification.created_at).limit(50).to_list()
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(notification_id: str, user: CurrentUser) -> None:
    result = await Notification.find({"_id": notification_id, "user_id": user.id}).update({"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(user: CurrentUser) -> None:
    await Notification.find({"user_id": user.id, "is_read": False}).update({"$set": {"is_read": True}})


@router.get("/settings/notifications", response_model=NotificationSettings)
async def get_settings_(user: CurrentUser):
    return await get_or_create_settings(user.id)


@router.patch("/settings/notifications", response_model=NotificationSettings)
async def update_settings(body: NotificationSettingsUpdate, user: CurrentUser):
    settings = await get_or_create_settings(user.id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    await settings.save()
    return settings
