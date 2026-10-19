"""Document Ingestion, Validation, Extraction, Chunking, and Indexing Service."""

import hashlib
import os
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.config import settings
from app.core.exceptions import (
    InvalidFileError,
    DuplicateDocumentError,
    DocumentProcessingError,
)
from app.core.logging import logger
from app.models.document import Document, DocumentChunk
from app.services.chunker import RecursiveCharacterChunker
from app.services.pdf_extractor import PDFExtractor
from app.services.providers import get_embedding_provider


class DocumentService:
    """Manages document lifecycle from upload to vector indexing."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitizes filename against path traversal and dangerous characters."""
        base = os.path.basename(filename)
        # Strip directory separators and keep clean name
        clean = "".join(c for c in base if c.isalnum() or c in ("-", "_", ".", " ")).strip()
        return clean or "document.pdf"

    @classmethod
    def upload_and_process_document(
        cls,
        db: Session,
        filename: str,
        file_bytes: bytes,
        mime_type: str = "application/pdf",
        allow_reindex: bool = False,
    ) -> Document:
        """Validates, deduplicates, stores, extracts, chunks, embeds, and indexes a PDF."""
        # 1. Size Validation
        file_size = len(file_bytes)
        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise InvalidFileError(
                f"File size ({file_size} bytes) exceeds maximum permitted size "
                f"({settings.MAX_UPLOAD_SIZE_BYTES} bytes)."
            )

        # 2. PDF Magic Signature Validation
        PDFExtractor.validate_pdf_signature(file_bytes)

        # 3. Filename Sanitization & SHA-256 Hash
        clean_filename = cls.sanitize_filename(filename)
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # 4. Duplicate Check
        existing_doc = db.execute(
            select(Document).where(Document.file_hash == file_hash)
        ).scalar_one_or_none()

        if existing_doc and existing_doc.status == "INDEXED" and not allow_reindex:
            raise DuplicateDocumentError(
                f"Duplicate upload detected: Document '{existing_doc.filename}' with identical hash is already indexed.",
                document_id=str(existing_doc.id),
            )

        # 5. Persist Physical File to Upload Storage
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(settings.UPLOAD_DIR, f"{file_hash}.pdf")
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # 6. Create or Reuse Document Record in 'PROCESSING' State
        if existing_doc:
            doc = existing_doc
            doc.filename = clean_filename
            doc.file_size_bytes = file_size
            doc.status = "PROCESSING"
            doc.error_message = None
            # Clear old chunks if any
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        else:
            doc = Document(
                filename=clean_filename,
                file_hash=file_hash,
                file_size_bytes=file_size,
                mime_type=mime_type,
                status="PROCESSING",
            )
            db.add(doc)

        db.commit()
        db.refresh(doc)

        # 7. Processing: Extraction, Chunking, Embeddings
        try:
            pages_data = PDFExtractor.extract_pages(file_bytes)
            chunker = RecursiveCharacterChunker(
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
            embedding_provider = get_embedding_provider()

            total_chunks = 0
            chunks_to_create: List[DocumentChunk] = []
            chunk_texts_for_batch: List[str] = []

            for page_num, page_text in pages_data:
                if not page_text:
                    continue

                page_chunks = chunker.split_text(page_text)
                for chunk_text in page_chunks:
                    chunk_texts_for_batch.append(chunk_text)
                    chunk_obj = DocumentChunk(
                        document_id=doc.id,
                        chunk_index=total_chunks,
                        page_number=page_num,
                        content=chunk_text,
                        char_count=len(chunk_text),
                        metadata_json={
                            "filename": clean_filename,
                            "page": page_num,
                            "chunk_index": total_chunks,
                        },
                    )
                    chunks_to_create.append(chunk_obj)
                    total_chunks += 1

            if not chunks_to_create:
                raise DocumentProcessingError(
                    "The PDF was parsed successfully, but no readable text could be extracted."
                )

            # Generate Embeddings (batch)
            embeddings = embedding_provider.embed_batch(chunk_texts_for_batch)
            for chunk_obj, emb in zip(chunks_to_create, embeddings):
                chunk_obj.embedding = emb

            # Save chunks and update document status to INDEXED
            db.bulk_save_objects(chunks_to_create)
            doc.total_pages = len(pages_data)
            doc.total_chunks = total_chunks
            doc.status = "INDEXED"
            doc.error_message = None
            db.commit()
            db.refresh(doc)
            logger.info(f"Successfully indexed document '{doc.filename}' ({total_chunks} chunks).")
            return doc

        except Exception as exc:
            db.rollback()
            doc.status = "FAILED"
            doc.error_message = str(exc)
            db.commit()
            logger.error(f"Document processing failed for '{clean_filename}': {str(exc)}")
            raise DocumentProcessingError(f"Failed to process document: {str(exc)}")

    @classmethod
    def get_document(cls, db: Session, document_id: str) -> Optional[Document]:
        return db.execute(
            select(Document).where(Document.id == document_id)
        ).scalar_one_or_none()

    @classmethod
    def list_documents(
        cls,
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[int, List[Document]]:
        query = select(Document)
        if status:
            query = query.where(Document.status == status.upper())

        total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
        documents = db.execute(
            query.order_by(Document.created_at.desc()).offset(skip).limit(limit)
        ).scalars().all()

        return total, list(documents)

    @classmethod
    def delete_document(cls, db: Session, document_id: str) -> bool:
        doc = cls.get_document(db, document_id)
        if not doc:
            return False

        file_path = os.path.join(settings.UPLOAD_DIR, f"{doc.file_hash}.pdf")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as err:
                logger.warning(f"Failed to delete physical file {file_path}: {err}")

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    def reindex_document(cls, db: Session, document_id: str) -> Document:
        doc = cls.get_document(db, document_id)
        if not doc:
            raise DocumentProcessingError(f"Document with ID {document_id} not found.")

        file_path = os.path.join(settings.UPLOAD_DIR, f"{doc.file_hash}.pdf")
        if not os.path.exists(file_path):
            raise DocumentProcessingError("Original PDF file no longer exists on disk.")

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        return cls.upload_and_process_document(
            db=db,
            filename=doc.filename,
            file_bytes=file_bytes,
            mime_type=doc.mime_type,
            allow_reindex=True,
        )
