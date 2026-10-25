"""MongoDB documents (Beanie ODM).

Ids are string cuid-style values (not ObjectIds) so ids and URLs keep the same shape as
before. Complaint updates and attachments are embedded in the complaint document; other
relations are stored as user-id references.
"""

import enum
from datetime import datetime
from typing import Annotated

from beanie import Document, Indexed, Insert, Replace, Save, SaveChanges, before_event
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.core.ids import new_id, new_tracking_id, utcnow


class UserRole(enum.StrEnum):
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"
    LAWYER = "LAWYER"
    ADMIN = "ADMIN"


class ComplaintStatus(enum.StrEnum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    INFO_REQUESTED = "INFO_REQUESTED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class PriorityLevel(enum.StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class BookingStatus(enum.StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class _Base(Document):
    id: str = Field(default_factory=new_id)
    created_at: datetime = Field(default_factory=utcnow)


class _Timestamped(_Base):
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Insert, Replace, Save, SaveChanges)
    def _touch(self) -> None:
        self.updated_at = utcnow()


class User(_Timestamped):
    name: str | None = None
    email: Annotated[str, Indexed(unique=True)]
    email_verified: datetime | None = None
    phone: str | None = None
    image: str | None = None
    password: str | None = None
    role: UserRole = UserRole.CITIZEN
    location: str | None = None
    department: str | None = None
    is_verified: bool = False

    class Settings:
        name = "users"
        indexes = [IndexModel([("role", ASCENDING), ("department", ASCENDING)])]


class UserSettings(Document):
    id: str = Field(default_factory=new_id)
    user_id: Annotated[str, Indexed(unique=True)]
    email_enabled: bool = True
    push_enabled: bool = True
    legal_updates_enabled: bool = True

    class Settings:
        name = "user_settings"


class ComplaintUpdate(BaseModel):
    """Embedded in Complaint.updates, newest first."""

    id: str = Field(default_factory=new_id)
    status: ComplaintStatus
    remarks: str
    updated_by: str
    created_at: datetime = Field(default_factory=utcnow)


class Attachment(BaseModel):
    """Embedded in Complaint.attachments."""

    id: str = Field(default_factory=new_id)
    # Either a full URL (legacy Cloudinary uploads) or an R2 object key.
    url: str
    filename: str
    mime_type: str | None = None
    file_size: int | None = None
    created_at: datetime = Field(default_factory=utcnow)


class Complaint(_Timestamped):
    tracking_id: Annotated[str, Indexed(unique=True)] = Field(default_factory=new_tracking_id)
    title: str
    description: str
    status: ComplaintStatus = ComplaintStatus.SUBMITTED
    priority: PriorityLevel = PriorityLevel.MEDIUM
    category: str
    department: str
    location: str | None = None
    pincode: str | None = None
    citizen_id: str
    assigned_officer_id: str | None = None
    assigned_authority: str | None = None
    internal_notes: str | None = None
    updates: list[ComplaintUpdate] = Field(default_factory=list)
    attachments: list[Attachment] = Field(default_factory=list)

    def add_update(self, status: "ComplaintStatus", remarks: str, updated_by: str) -> None:
        self.updates.insert(0, ComplaintUpdate(status=status, remarks=remarks, updated_by=updated_by))

    class Settings:
        name = "complaints"
        indexes = [
            IndexModel([("citizen_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("department", ASCENDING), ("created_at", DESCENDING)]),
        ]


class AuditLog(_Base):
    user_id: str | None = None
    action: str
    entity: str
    entity_id: Annotated[str, Indexed()]
    metadata_json: str | None = None

    class Settings:
        name = "audit_logs"
        indexes = [IndexModel([("created_at", DESCENDING)])]


class Notification(_Base):
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool = False
    complaint_id: str | None = None
    action_url: str | None = None

    class Settings:
        name = "notifications"
        indexes = [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)])]


class LegalDocument(_Timestamped):
    user_id: Annotated[str, Indexed()]
    complaint_id: str | None = None
    title: str
    content: str
    type: str
    category: str | None = None
    risk_level: str | None = None
    analysis: str | None = None

    class Settings:
        name = "legal_documents"


class AILegalHistory(_Base):
    user_id: Annotated[str, Indexed()]
    query: str
    response: str
    legal_category: str | None = None

    class Settings:
        name = "ai_legal_history"


class LawyerProfile(_Base):
    user_id: Annotated[str, Indexed(unique=True)]
    bar_number: str
    specialization: list[str] = Field(default_factory=list)
    location: str
    pincode: str
    fees: int  # per consultation in INR
    experience: int  # years
    is_available: bool = True
    is_verified: bool = False
    languages: list[str] = Field(default_factory=list)
    bio: str | None = None
    rating: float = 0

    class Settings:
        name = "lawyer_profiles"


class Booking(_Base):
    citizen_id: Annotated[str, Indexed()]
    # References the lawyer's User id, not the LawyerProfile id.
    lawyer_id: Annotated[str, Indexed()]
    date: datetime
    time_slot: str
    description: str
    status: BookingStatus = BookingStatus.PENDING
    is_offline: bool = False

    class Settings:
        name = "bookings"


DOCUMENT_MODELS = [
    User,
    UserSettings,
    Complaint,
    AuditLog,
    Notification,
    LegalDocument,
    AILegalHistory,
    LawyerProfile,
    Booking,
]
