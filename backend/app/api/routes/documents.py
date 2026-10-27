import re

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.core.ids import utcnow
from app.models import LegalDocument, SubmissionStatus, User
from app.schemas.document import LegalDocumentCreate, LegalDocumentOut, LegalDocumentUpdate, SubmissionRecord
from app.services import pdf
from app.services.audit import log_action

router = APIRouter(prefix="/documents", tags=["documents"])


async def _own_document(user: User, doc_id: str) -> LegalDocument:
    doc = await LegalDocument.get(doc_id)
    if doc is None or doc.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return doc


@router.get("", response_model=list[LegalDocumentOut])
async def list_documents(user: CurrentUser) -> list[LegalDocument]:
    return await LegalDocument.find(LegalDocument.user_id == user.id).sort(-LegalDocument.created_at).to_list()


@router.post("", response_model=LegalDocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(body: LegalDocumentCreate, user: CurrentUser) -> LegalDocument:
    """Save a draft the user edited, e.g. a letter from /ai/draft-letter, so it can be exported as PDF."""
    doc = await LegalDocument(
        user_id=user.id, title=body.title, content=body.content, type=body.type, category=body.category
    ).insert()
    await log_action(
        user_id=user.id,
        action="DOCUMENT_SAVED",
        entity="LEGAL_DOCUMENT",
        entity_id=doc.id,
        metadata={"editedFromAi": body.edited_from_ai} if body.edited_from_ai is not None else None,
    )
    return doc


@router.get("/{doc_id}", response_model=LegalDocumentOut)
async def get_document(doc_id: str, user: CurrentUser) -> LegalDocument:
    return await _own_document(user, doc_id)


@router.patch("/{doc_id}", response_model=LegalDocumentOut)
async def update_document(doc_id: str, body: LegalDocumentUpdate, user: CurrentUser) -> LegalDocument:
    doc = await _own_document(user, doc_id)
    doc.content = body.content
    if body.title:
        doc.title = body.title
    await doc.save()
    await log_action(user_id=user.id, action="DOCUMENT_EDITED", entity="LEGAL_DOCUMENT", entity_id=doc.id)
    return doc


@router.put("/{doc_id}/submission", response_model=LegalDocumentOut)
async def record_submission(doc_id: str, body: SubmissionRecord, user: CurrentUser) -> LegalDocument:
    """The citizen records where they sent the letter, and later any reply. Back to DRAFT clears both."""
    doc = await _own_document(user, doc_id)
    if body.status != SubmissionStatus.DRAFT and not (body.submitted_to or "").strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Say which office you sent it to")
    if body.status == SubmissionStatus.RESPONDED and not (body.response_note or "").strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Describe the reply you received")

    doc.submission_status = body.status
    if body.status == SubmissionStatus.DRAFT:
        doc.submitted_to = doc.submission_reference = doc.submitted_on = None
        doc.response_note = doc.responded_on = None
    else:
        doc.submitted_to = body.submitted_to.strip()
        doc.submission_reference = (body.submission_reference or "").strip() or None
        doc.submitted_on = (body.submitted_on or utcnow()).replace(tzinfo=None)
        if body.status == SubmissionStatus.RESPONDED:
            doc.response_note = body.response_note.strip()
            doc.responded_on = (body.responded_on or utcnow()).replace(tzinfo=None)
        else:
            doc.response_note = doc.responded_on = None
    await doc.save()
    await log_action(
        user_id=user.id,
        action=f"DOCUMENT_{body.status.value}",
        entity="LEGAL_DOCUMENT",
        entity_id=doc.id,
    )
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, user: CurrentUser) -> None:
    doc = await _own_document(user, doc_id)
    await doc.delete()


@router.get("/{doc_id}/pdf", response_class=Response)
async def document_pdf(doc_id: str, user: CurrentUser) -> Response:
    doc = await _own_document(user, doc_id)
    data = await run_in_threadpool(
        pdf.render_document, doc.title, doc.content, [("Prepared on", doc.updated_at.strftime("%d %b %Y"))]
    )
    await log_action(user_id=user.id, action="DOCUMENT_EXPORTED", entity="LEGAL_DOCUMENT", entity_id=doc.id)
    filename = re.sub(r"[^A-Za-z0-9_-]+", "-", doc.title)[:60].strip("-") or "document"
    return Response(
        data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'}
    )
