"""Pydantic schemas for document ingestion and management."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    page_number: int
    content: str
    char_count: int
    metadata_json: Optional[Dict[str, Any]] = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_hash: str
    file_size_bytes: int
    mime_type: str
    total_pages: int
    total_chunks: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    total: int
    items: List[DocumentResponse]


class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    file_hash: str
    file_size_bytes: int
    status: str
    message: str
