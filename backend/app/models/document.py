"""SQLAlchemy models for Document and DocumentChunk."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.types import CompatibleVector
from app.config import settings


def get_utc_now():
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, unique=True, index=True)
    file_size_bytes = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False, default="application/pdf")
    total_pages = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    char_count = Column(Integer, nullable=False)
    embedding = Column(CompatibleVector(dim=settings.EMBEDDING_DIMENSION), nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("idx_doc_chunk_page", "document_id", "page_number"),
    )
