from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser
from app.models import Complaint, ComplaintStatus
from app.schemas.legal import InfoReply
from app.services.audit import log_action
from app.services.notifications import notify, short_ref

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("/{complaint_id}/reply", status_code=status.HTTP_204_NO_CONTENT)
async def reply_to_info_request(complaint_id: str, body: InfoReply, user: CurrentUser) -> None:
    """The citizen answers an officer's request for more information."""
    complaint = await Complaint.get(complaint_id)
    # Only the complaint's own citizen may reply; 404 so ids can't be probed.
    if complaint is None or complaint.citizen_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    if complaint.status != ComplaintStatus.INFO_REQUESTED:
        raise HTTPException(status.HTTP_409_CONFLICT, "No information has been requested for this complaint")

    complaint.status = ComplaintStatus.UNDER_REVIEW
    complaint.add_update(ComplaintStatus.UNDER_REVIEW, f"Citizen reply: {body.message}", user.name or "Citizen")
    await complaint.save()
    await log_action(user_id=user.id, action="CITIZEN_REPLIED", entity="COMPLAINT", entity_id=complaint.id)
    if complaint.assigned_officer_id:
        await notify(
            user_id=complaint.assigned_officer_id,
            complaint_id=complaint.id,
            type="INFO_REQUESTED",
            title="Citizen responded",
            message=f"The citizen replied to your information request on complaint #{short_ref(complaint.tracking_id)}.",
            action_url=f"/dashboard/officer/complaints/{complaint.id}",
        )
