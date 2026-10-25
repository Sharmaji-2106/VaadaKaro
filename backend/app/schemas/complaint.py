from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models import ComplaintStatus, PriorityLevel
from app.schemas.base import ApiModel


class AttachmentIn(ApiModel):
    # Object key returned by POST /uploads/presign.
    key: str = Field(max_length=512)
    filename: str = Field(max_length=255)
    mime_type: str | None = None
    file_size: int = Field(gt=0)


class ComplaintCreate(ApiModel):
    """Mirrors complaintSchema in src/lib/validation.ts."""

    title: str = Field(min_length=10, max_length=150)
    description: str = Field(min_length=30, max_length=3000)
    department: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=120)
    priority: PriorityLevel = PriorityLevel.MEDIUM
    address: str = Field(min_length=1, max_length=300)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")
    declaration: Literal[True]
    ai_disclaimer: Literal[True]
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=10)
    confirm_duplicate: bool = False


class ComplaintCreated(ApiModel):
    id: str
    tracking_id: str
    department: str


class AttachmentOut(ApiModel):
    id: str
    url: str
    filename: str
    mime_type: str | None
    file_size: int | None
    created_at: datetime


class ComplaintUpdateOut(ApiModel):
    status: ComplaintStatus
    remarks: str
    updated_by: str | None = None
    created_at: datetime


class PersonOut(ApiModel):
    id: str
    name: str | None
    email: str
    phone: str | None = None


class ComplaintSummary(ApiModel):
    id: str
    tracking_id: str
    title: str
    status: ComplaintStatus
    priority: PriorityLevel
    category: str
    department: str
    created_at: datetime
    updated_at: datetime


class ComplaintDetail(ComplaintSummary):
    description: str
    location: str | None
    pincode: str | None
    assigned_authority: str | None
    updates: list[ComplaintUpdateOut]
    attachments: list[AttachmentOut]


class OfficerComplaintDetail(ComplaintDetail):
    internal_notes: str | None
    citizen: PersonOut
    assigned_officer: PersonOut | None


class OfficerComplaintRow(ComplaintSummary):
    citizen: PersonOut


class PublicComplaintView(ApiModel):
    """What anyone holding a tracking id may see: no description, location or files."""

    tracking_id: str
    title: str
    status: ComplaintStatus
    category: str
    department: str
    created_at: datetime
    updates: list[ComplaintUpdateOut]
    is_public_view: bool = True


class StatusChange(ApiModel):
    status: ComplaintStatus
    remarks: str = Field(min_length=3, max_length=2000)
    internal_notes: str | None = Field(default=None, max_length=5000)


class AssignOfficer(ApiModel):
    officer_id: str


class OfficerOut(ApiModel):
    id: str
    name: str | None
    email: str
    department: str | None


class OfficerStats(ApiModel):
    total: int
    pending: int
    under_review: int
    in_progress: int
    resolved: int
    resolved_today: int


class Page[T](ApiModel):
    items: list[T]
    total: int
    page: int
    pages: int
