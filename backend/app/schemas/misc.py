from datetime import datetime

from pydantic import Field

from app.models import UserRole
from app.schemas.base import ApiModel


class NotificationOut(ApiModel):
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    complaint_id: str | None
    action_url: str | None
    created_at: datetime


class NotificationSettings(ApiModel):
    email_enabled: bool = True
    push_enabled: bool = True
    legal_updates_enabled: bool = True


class NotificationSettingsUpdate(ApiModel):
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    legal_updates_enabled: bool | None = None


class PresignRequest(ApiModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str
    size: int = Field(gt=0)


class PresignResponse(ApiModel):
    key: str
    upload_url: str
    method: str = "PUT"
    headers: dict[str, str]
    expires_in: int


class AuditLogOut(ApiModel):
    id: str
    user_id: str | None
    action: str
    entity: str
    entity_id: str
    metadata_json: str | None = Field(serialization_alias="metadata")
    created_at: datetime


class DepartmentReport(ApiModel):
    department: str
    filed: int
    pending: int
    in_progress: int
    resolved: int
    rejected: int
    officers: int


class MonthlyReport(ApiModel):
    year: int
    month: int
    departments: list[DepartmentReport]
    total_filed: int
    total_resolved: int


class RoleChange(ApiModel):
    role: UserRole
    department: str | None = Field(default=None, max_length=120)
