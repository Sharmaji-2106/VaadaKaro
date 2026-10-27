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


class SubmissionStatus(enum.StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"  # the citizen says they sent it
    RESPONDED = "RESPONDED"  # the citizen says the authority replied


class _Base(Document):
    id: str = Field(default_factory=new_id)
    created_at: datetime = Field(default_factory=utcnow)


class _Timestamped(_Base):
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Insert, Replace, Save, SaveChanges)
    def _touch(self) -> None:
        self.updated_at = utcnow()


class Nominee(BaseModel):
    """Embedded in User.nominee."""

    name: str
    relation: str
    email: str | None = None
    phone: str | None = None
    added_at: datetime = Field(default_factory=utcnow)


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
    # DPDP Act s.9: no verifiable parental-consent flow exists, so accounts are for adults only.
    adult_confirmed_at: datetime | None = None
    # Separate, withdrawable consent to send the person's text to the AI provider (Google Gemini).
    # None means never asked (accounts made before consent was recorded): treated as not given.
    ai_consent: bool | None = None
    # Version of the privacy notice the person last agreed to; None for accounts made before
    # notices were recorded. They are shown the current notice once (DPDP Act s.5(2)).
    notice_version: str | None = None
    # DPDP Act s.14: someone who may exercise these rights if the person dies or becomes incapacitated.
    nominee: Nominee | None = None

    class Settings:
        name = "users"
        indexes = [IndexModel([("role", ASCENDING), ("department", ASCENDING)])]


class ConsentPurpose(enum.StrEnum):
    ACCOUNT = "ACCOUNT"  # account, complaints and the services the person asks for
    AI_PROCESSING = "AI_PROCESSING"  # sending their text to the AI provider


class ConsentRecord(_Base):
    """Append-only proof of consent (DPDP Act s.6(10): the Data Fiduciary must be able to show it)."""

    user_id: Annotated[str, Indexed()]
    purpose: ConsentPurpose
    granted: bool  # False records a withdrawal
    notice_version: str

    class Settings:
        name = "consent_records"


class RequestType(enum.StrEnum):
    ACCESS = "ACCESS"  # DPDP s.11
    CORRECTION = "CORRECTION"  # DPDP s.12
    ERASURE = "ERASURE"  # DPDP s.12
    NOMINATION = "NOMINATION"  # DPDP s.14
    PRIVACY_GRIEVANCE = "PRIVACY_GRIEVANCE"  # DPDP s.13
    CONTENT_COMPLAINT = "CONTENT_COMPLAINT"  # IT Rules 2021 r.3(2)
    OTHER = "OTHER"


class RequestStatus(enum.StrEnum):
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class GrievanceRequest(_Timestamped):
    """A rights request or grievance to the Grievance Officer, on a 15-day clock."""

    reference: Annotated[str, Indexed(unique=True)]
    user_id: str | None = None  # None when sent by someone without an account
    name: str
    email: str
    type: RequestType
    details: str
    status: RequestStatus = RequestStatus.ACKNOWLEDGED
    due_at: datetime
    response: str | None = None
    resolved_at: datetime | None = None
    handled_by: str | None = None

    class Settings:
        name = "grievance_requests"
        indexes = [IndexModel([("status", ASCENDING), ("due_at", ASCENDING)])]


class BreachNotice(_Base):
    """A personal-data breach and the intimation sent to affected people (DPDP Act s.8(6))."""

    title: str
    description: str
    likely_consequences: str
    mitigation: str
    occurred_at: datetime | None = None
    detected_at: datetime
    affected_user_ids: list[str] = Field(default_factory=list)
    all_users: bool = False
    notified_count: int = 0
    reported_by: str
    # Filled in by the admin once the reports to the authorities have gone out.
    cert_in_reported_at: datetime | None = None
    board_reported_at: datetime | None = None

    class Settings:
        name = "breach_notices"


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
    # What the citizen tells us happened after they downloaded it. VaadaKaro never submits a letter
    # itself, so these are the citizen's own record, never a confirmation from the authority.
    submission_status: SubmissionStatus = SubmissionStatus.DRAFT
    submitted_to: str | None = None
    submission_reference: str | None = None
    submitted_on: datetime | None = None
    response_note: str | None = None
    responded_on: datetime | None = None

    class Settings:
        name = "legal_documents"


class Authority(_Timestamped):
    """A verified entry in the authority directory: where a kind of complaint is officially sent.

    The AI only suggests a department; these entries are what we show as the place to submit,
    each with the source it was checked against and when.
    """

    name: str
    department: str  # one of the frontend's DEPARTMENTS
    categories: list[str] = Field(default_factory=list)  # empty: every category of the department
    # Jurisdiction: no state means nationwide; a state without a district means the whole state.
    state: str | None = None
    district: str | None = None
    how_to_submit: str
    submission_url: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    source_url: str
    last_verified_at: datetime | None = None  # None: entered but not yet checked against the source
    verified_by: str | None = None
    is_active: bool = True

    class Settings:
        name = "authorities"
        indexes = [IndexModel([("department", ASCENDING), ("state", ASCENDING), ("district", ASCENDING)])]


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
    # Kept for old documents only and never shown: Bar Council of India Rules (Part VI, Ch. II,
    # r.36) forbid advocates from soliciting work, and ratings or rankings amount to that.
    rating: float = 0
    # What r.36 lets an advocate publish, and what an admin checks before verifying.
    state_bar_council: str | None = None
    enrolment_year: int | None = None

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
    # Shown to the citizen: why the lawyer declined, or what to bring to the consultation.
    lawyer_note: str | None = None

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
    Authority,
    ConsentRecord,
    GrievanceRequest,
    BreachNotice,
]
