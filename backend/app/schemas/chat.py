"""Pydantic schemas for RAG retrieval, chat conversations, and citations."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, AliasChoices


class Citation(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    page_number: int
    chunk_index: int
    similarity_score: float
    content_snippet: str


class RAGQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question to answer against indexed documents")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of document IDs to restrict retrieval to")
    top_k: int = Field(default=4, ge=1, le=20, description="Maximum number of context chunks to retrieve")
    similarity_threshold: float = Field(default=0.45, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")
    session_id: Optional[str] = Field(None, description="Optional conversation session ID for persistence")


class RAGQueryResponse(BaseModel):
    question: str
    answer: str
    evidence_sufficient: bool
    citations: List[Citation]
    retrieved_chunks_count: int
    latency_ms: int
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    session_id: str
    role: str
    content: str
    citations: Optional[List[dict]] = None
    tool_activity: Optional[List[dict]] = Field(
        None, validation_alias=AliasChoices("tool_activity", "tool_calls")
    )
    created_at: datetime


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageResponse]] = None

