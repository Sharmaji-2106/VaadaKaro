import re

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.models import LegalDocument, User
from app.schemas.document import LegalDocumentCreate, LegalDocumentOut, LegalDocumentUpdate
from app.services import pdf

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
    return await LegalDocument(
        user_id=user.id, title=body.title, content=body.content, type=body.type, category=body.category
    ).insert()


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
    filename = re.sub(r"[^A-Za-z0-9_-]+", "-", doc.title)[:60].strip("-") or "document"
    return Response(
        data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'}
    )
