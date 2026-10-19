"""Validated Document Search Tool for LangGraph Agent."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.rag_service import RAGService
from app.services.providers import get_embedding_provider


class DocSearchToolInput(BaseModel):
    query: str = Field(..., min_length=1, description="Keywords or conceptual phrase to search in documents")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of document chunks to retrieve")
    document_ids: Optional[List[str]] = Field(None, description="Optional document ID filters")


def execute_doc_search(db: Session, tool_input: DocSearchToolInput) -> Dict[str, Any]:
    """Executes validated document search against vector store."""
    try:
        embedding_provider = get_embedding_provider()
        query_vector = embedding_provider.embed_text(tool_input.query)

        scored_chunks = RAGService.retrieve_chunks(
            db=db,
            query_vector=query_vector,
            top_k=tool_input.top_k,
            similarity_threshold=0.45,
            document_ids=tool_input.document_ids,
        )

        snippets: List[str] = []
        citations: List[Dict[str, Any]] = []

        for chunk, score in scored_chunks:
            filename = chunk.metadata_json.get("filename", "unknown.pdf")
            page_num = chunk.page_number
            citations.append({
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "filename": filename,
                "page_number": page_num,
                "similarity_score": round(score, 4),
                "content_snippet": chunk.content[:200],
            })
            snippets.append(
                f"[Doc: {filename} | Page: {page_num}]\n{chunk.content}"
            )

        return {
            "success": True,
            "found_count": len(scored_chunks),
            "snippets": snippets,
            "citations": citations,
            "summary": f"Retrieved {len(scored_chunks)} relevant passage(s) from documents." if scored_chunks else "No relevant document passages found.",
        }

    except Exception as exc:
        return {
            "success": False,
            "found_count": 0,
            "snippets": [],
            "citations": [],
            "error": str(exc),
            "summary": f"Document search failed: {str(exc)}",
        }

