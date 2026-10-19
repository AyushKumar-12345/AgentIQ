from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db, get_analytics_db
from app.services.rag_service import RAGService
from app.agent.runner import run_agent
from app.models.chat import ChatSession
from app.schemas.chat import (
    RAGQueryRequest,
    RAGQueryResponse,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])


class AgentQueryRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User instruction or question for the agent")
    session_id: Optional[str] = Field(None, description="Optional chat session ID")


class AgentQueryResponse(BaseModel):
    session_id: str
    response: str
    steps_taken: int
    tool_activity: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    latency_ms: int


@router.post(
    "/agent",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Agentic Workflow Query (LangGraph)",
    description="Invokes the bounded LangGraph agent to dynamically search documents, query business SQL analytics, and synthesize reports.",
)
def query_agent(
    request: AgentQueryRequest,
    db: Session = Depends(get_db),
    analytics_db: Session = Depends(get_analytics_db),
) -> AgentQueryResponse:
    result = run_agent(
        db=db,
        analytics_db=analytics_db,
        user_query=request.message,
        session_id=request.session_id,
    )
    return AgentQueryResponse(
        session_id=result["session_id"],
        response=result["response"],
        steps_taken=result["steps_taken"],
        tool_activity=result["tool_activity"],
        citations=result["citations"],
        latency_ms=result["latency_ms"],
    )


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Knowledge Base (Grounded RAG)",
    description="Vector search across indexed document chunks with grounded LLM answer generation and citations.",
)
def query_knowledge_base(
    request: RAGQueryRequest,
    db: Session = Depends(get_db),
) -> RAGQueryResponse:
    return RAGService.query_rag(db=db, request=request)


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponse],
    summary="List Chat Sessions",
    description="Lists previous chat conversation sessions.",
)
def list_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> List[ChatSessionResponse]:
    sessions = db.execute(
        select(ChatSession).order_by(ChatSession.updated_at.desc()).offset(skip).limit(limit)
    ).scalars().all()
    return [ChatSessionResponse.model_validate(s) for s in sessions]


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Get Chat Session History",
    description="Retrieves a complete chat session with messages and citations.",
)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
) -> ChatSessionResponse:
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session {session_id} not found.",
        )
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[ChatMessageResponse.model_validate(m) for m in session.messages],
    )


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Delete Chat Session",
    description="Deletes a chat session and all associated messages.",
)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
) -> MessageResponse:
    session = db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session {session_id} not found.",
        )
    db.delete(session)
    db.commit()
    return MessageResponse(message=f"Session {session_id} deleted successfully.")
