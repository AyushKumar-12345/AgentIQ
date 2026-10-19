"""Document Management API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.document_service import DocumentService
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUploadResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and Index PDF Document",
    description="Validates PDF magic signature, computes SHA-256, chunks text, generates embeddings, and indexes into pgvector.",
)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    content = await file.read()
    doc = DocumentService.upload_and_process_document(
        db=db,
        filename=file.filename or "uploaded.pdf",
        file_bytes=content,
        mime_type=file.content_type or "application/pdf",
    )
    return DocumentUploadResponse(
        id=str(doc.id),
        filename=doc.filename,
        file_hash=doc.file_hash,
        file_size_bytes=doc.file_size_bytes,
        status=doc.status,
        message="Document uploaded and indexed successfully.",
    )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List Documents",
    description="Retrieves a paginated list of documents with metadata and processing status.",
)
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, PROCESSING, INDEXED, FAILED)"),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    total, items = DocumentService.list_documents(db=db, skip=skip, limit=limit, status=status)
    return DocumentListResponse(
        total=total,
        items=[DocumentResponse.model_validate(d) for d in items],
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get Document Details",
    description="Fetches detailed metadata, chunk counts, and indexing status for a document.",
)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentResponse:
    doc = DocumentService.get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} was not found.",
        )
    return DocumentResponse.model_validate(doc)


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Delete Document",
    description="Deletes a document, cascades deletion of all vector chunks, and removes physical storage.",
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> MessageResponse:
    success = DocumentService.delete_document(db, document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} was not found.",
        )
    return MessageResponse(message=f"Document {document_id} deleted successfully.")


@router.post(
    "/{document_id}/reindex",
    response_model=DocumentUploadResponse,
    summary="Reindex Document",
    description="Re-extracts text, re-chunks, and regenerates vector embeddings for an existing document.",
)
def reindex_document(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    doc = DocumentService.reindex_document(db, document_id)
    return DocumentUploadResponse(
        id=str(doc.id),
        filename=doc.filename,
        file_hash=doc.file_hash,
        file_size_bytes=doc.file_size_bytes,
        status=doc.status,
        message="Document re-indexed successfully.",
    )
