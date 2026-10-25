from datetime import timedelta

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import CurrentUser, OptionalUser, can_access_department
from app.core.config import get_settings
from app.core.ids import new_tracking_id, utcnow
from app.models import Attachment, Complaint, ComplaintStatus, User
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintCreated,
    ComplaintDetail,
    ComplaintSummary,
    PublicComplaintView,
)
from app.services import pdf, storage
from app.services.audit import log_action
from app.services.notifications import notify, short_ref, track_url

router = APIRouter(prefix="/complaints", tags=["complaints"])


def can_view_full(user: User | None, complaint: Complaint) -> bool:
    if user is None:
        return False
    return user.id == complaint.citizen_id or can_access_department(user, complaint.department)


def to_detail(complaint: Complaint) -> ComplaintDetail:
    detail = ComplaintDetail.model_validate(complaint)
    for att in detail.attachments:
        att.url = storage.download_url(att.url)
    return detail


@router.post("", response_model=ComplaintCreated, status_code=status.HTTP_201_CREATED)
async def create_complaint(body: ComplaintCreate, user: CurrentUser) -> ComplaintCreated:
    settings = get_settings()

    for att in body.attachments:
        # Only files this user uploaded through /uploads/presign may be attached.
        if not att.key.startswith(storage.user_prefix(user.id)):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid attachment: {att.filename}")
        if att.file_size > settings.upload_max_bytes:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "File size must be less than 10MB")

    if not body.confirm_duplicate:
        since = utcnow() - timedelta(minutes=settings.duplicate_window_minutes)
        duplicate = await Complaint.find_one(
            Complaint.citizen_id == user.id,
            Complaint.title == body.title,
            Complaint.department == body.department,
            Complaint.created_at >= since,
        )
        if duplicate:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                {"message": "Looks like you recently submitted a similar complaint.", "isDuplicate": True},
            )

    complaint = Complaint(
        tracking_id=new_tracking_id(),
        title=body.title,
        description=body.description,
        department=body.department,
        category=body.category,
        priority=body.priority,
        location=f"{body.address}, {body.city}, {body.state}",
        pincode=body.pincode,
        citizen_id=user.id,
        attachments=[
            Attachment(url=a.key, filename=a.filename, mime_type=a.mime_type, file_size=a.file_size)
            for a in body.attachments
        ],
    )
    complaint.add_update(ComplaintStatus.SUBMITTED, "Complaint registered on VaadaKaro.", "SYSTEM")
    await complaint.insert()

    await log_action(
        user_id=user.id,
        action="COMPLAINT_CREATED",
        entity="COMPLAINT",
        entity_id=complaint.id,
        metadata={"trackingId": complaint.tracking_id},
    )
    await notify(
        user_id=user.id,
        complaint_id=complaint.id,
        type="COMPLAINT_SUBMITTED",
        title="Complaint registered",
        message=f"Your complaint #{short_ref(complaint.tracking_id)} has been registered on VaadaKaro.",
        action_url=track_url(complaint.tracking_id),
    )
    return ComplaintCreated(id=complaint.id, tracking_id=complaint.tracking_id, department=complaint.department)


@router.get("", response_model=list[ComplaintSummary])
async def my_complaints(user: CurrentUser) -> list[Complaint]:
    return await Complaint.find(Complaint.citizen_id == user.id).sort(-Complaint.created_at).to_list()


@router.get("/track/{tracking_id}", response_model=ComplaintDetail | PublicComplaintView)
async def track(tracking_id: str, user: OptionalUser):
    complaint = await Complaint.find_one(Complaint.tracking_id == tracking_id)
    if complaint is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid Tracking ID")
    if can_view_full(user, complaint):
        return to_detail(complaint)
    view = PublicComplaintView.model_validate(complaint)
    for u in view.updates:
        u.updated_by = None  # officer names stay private
    return view


@router.get("/{complaint_id}", response_model=ComplaintDetail)
async def get_complaint(complaint_id: str, user: CurrentUser) -> ComplaintDetail:
    complaint = await Complaint.get(complaint_id)
    if complaint is None or not can_view_full(user, complaint):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    return to_detail(complaint)


@router.get("/{complaint_id}/pdf", response_class=Response)
async def complaint_pdf(complaint_id: str, user: CurrentUser) -> Response:
    complaint = await Complaint.get(complaint_id)
    if complaint is None or not can_view_full(user, complaint):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")

    # PDF rendering is CPU-bound; keep it off the event loop.
    data = await run_in_threadpool(
        pdf.render_document,
        complaint.title,
        complaint.description,
        meta=[
            ("Tracking ID", complaint.tracking_id),
            ("Department", complaint.department),
            ("Category", complaint.category),
            ("Location", f"{complaint.location or '-'} {complaint.pincode or ''}".strip()),
            ("Registered on", complaint.created_at.strftime("%d %b %Y")),
            ("Status", complaint.status.value.replace("_", " ").title()),
        ],
    )
    return Response(
        data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{complaint.tracking_id}.pdf"'},
    )
