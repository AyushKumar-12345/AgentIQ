"""Grounded Retrieval-Augmented Generation (RAG) Service."""

import math
import time
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.logging import logger
from app.models.document import Document, DocumentChunk
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    RAGQueryRequest,
    RAGQueryResponse,
    Citation,
)
from app.services.providers import get_embedding_provider, get_llm_provider


class RAGService:
    """Orchestrates grounded document retrieval, context assembly, LLM synthesis, and citations."""

    SYSTEM_PROMPT = """You are AgentIQ, an enterprise AI assistant for corporate knowledge retrieval.

STRICT INSTRUCTIONS:
1. Answer the user's question relying EXCLUSIVELY on the provided <context> below.
2. For every factual claim, append the citation tag: [Doc: <filename>, Page: <page_number>].
3. If the provided <context> does not contain sufficient facts to answer the question, state:
   "The provided documents do not contain sufficient evidence to answer this question."
4. DO NOT extrapolate, speculate, or introduce external knowledge outside the provided <context>.
5. Never invent or hallucinate document names, page numbers, or statistics.
"""

    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Calculates cosine similarity between two float vectors."""
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a, b in zip(vec_a, vec_b)))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return max(-1.0, min(1.0, dot_product / (norm_a * norm_b)))

    @classmethod
    def retrieve_chunks(
        cls,
        db: Session,
        query_vector: List[float],
        top_k: int = 4,
        similarity_threshold: float = 0.65,
        document_ids: Optional[List[str]] = None,
    ) -> List[Tuple[DocumentChunk, float]]:
        """Retrieves top_k document chunks exceeding similarity_threshold."""
        dialect_name = db.bind.dialect.name if db.bind else "sqlite"

        if dialect_name == "postgresql":
            # Native pgvector cosine distance: score = 1 - (embedding <=> query_vector)
            # cosine_distance is 0 for identical vectors, 2 for opposite
            query = select(DocumentChunk).join(Document)
            query = query.where(Document.status == "INDEXED")
            if document_ids:
                query = query.where(DocumentChunk.document_id.in_(document_ids))
            
            # Use pgvector distance ordering
            distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
            query = query.order_by(distance_expr).limit(top_k * 2)
            results = db.execute(query).scalars().all()

            scored_chunks: List[Tuple[DocumentChunk, float]] = []
            for chunk in results:
                if chunk.embedding is not None:
                    # In pgvector, cosine_distance = 1 - cosine_similarity
                    # Compute exact similarity
                    sim = cls._cosine_similarity(query_vector, list(chunk.embedding))
                    if sim >= similarity_threshold:
                        scored_chunks.append((chunk, sim))

            # Sort descending by similarity
            scored_chunks.sort(key=lambda x: x[1], reverse=True)
            return scored_chunks[:top_k]

        else:
            # Python-based similarity calculation for SQLite / testing mode
            query = select(DocumentChunk).join(Document)
            query = query.where(Document.status == "INDEXED")
            if document_ids:
                query = query.where(DocumentChunk.document_id.in_(document_ids))

            all_chunks = db.execute(query).scalars().all()
            scored_chunks: List[Tuple[DocumentChunk, float]] = []

            for chunk in all_chunks:
                if chunk.embedding is not None:
                    sim = cls._cosine_similarity(query_vector, chunk.embedding)
                    if sim >= similarity_threshold:
                        scored_chunks.append((chunk, sim))

            scored_chunks.sort(key=lambda x: x[1], reverse=True)
            return scored_chunks[:top_k]

    @classmethod
    def query_rag(cls, db: Session, request: RAGQueryRequest) -> RAGQueryResponse:
        """Executes the complete RAG query lifecycle."""
        start_time = time.perf_counter()

        # 1. Embed user question
        embedding_provider = get_embedding_provider()
        query_vector = embedding_provider.embed_text(request.question)

        # 2. Retrieve relevant chunks
        scored_chunks = cls.retrieve_chunks(
            db=db,
            query_vector=query_vector,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            document_ids=request.document_ids,
        )

        # 3. Establish or retrieve session
        session_id = request.session_id
        if session_id:
            session = db.get(ChatSession, session_id)
            if not session:
                session = ChatSession(id=session_id, title=request.question[:50])
                db.add(session)
        else:
            session = ChatSession(title=request.question[:50])
            db.add(session)
            db.flush()
            session_id = str(session.id)

        # 4. Check for sufficiency / empty retrieval
        if not scored_chunks:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            refusal_answer = "The provided documents do not contain sufficient evidence to answer this question."

            user_msg = ChatMessage(session_id=session_id, role="user", content=request.question)
            assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=refusal_answer, citations=[])
            db.add_all([user_msg, assistant_msg])
            db.commit()

            return RAGQueryResponse(
                question=request.question,
                answer=refusal_answer,
                evidence_sufficient=False,
                citations=[],
                retrieved_chunks_count=0,
                latency_ms=latency_ms,
                session_id=session_id,
            )

        # 5. Construct Bounded Context
        context_blocks: List[str] = []
        citations: List[Citation] = []

        for chunk, score in scored_chunks:
            filename = chunk.metadata_json.get("filename", "unknown.pdf")
            page_num = chunk.page_number
            snippet = chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content

            citation_obj = Citation(
                chunk_id=str(chunk.id),
                document_id=str(chunk.document_id),
                filename=filename,
                page_number=page_num,
                chunk_index=chunk.chunk_index,
                similarity_score=round(score, 4),
                content_snippet=snippet,
            )
            citations.append(citation_obj)

            context_blocks.append(
                f"[Context Document: {filename} | Page: {page_num} | Chunk ID: {chunk.id}]\n{chunk.content}"
            )

        formatted_context = "\n\n".join(context_blocks)
        user_prompt = f"<context>\n{formatted_context}\n</context>\n\nQUESTION: {request.question}"

        # 6. Generate Answer via LLM
        llm_provider = get_llm_provider()
        answer = llm_provider.generate(
            prompt=user_prompt,
            system_prompt=cls.SYSTEM_PROMPT,
            temperature=0.0,
        )

        # 7. Verify Sufficiency based on response content
        is_sufficient = "not contain sufficient evidence" not in answer.lower()
        if not is_sufficient:
            citations = []

        # 8. Record User and Assistant messages in session
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.question,
        )
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            citations=[c.model_dump() for c in citations],
        )
        db.add_all([user_msg, assistant_msg])
        db.commit()

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        logger.info(
            f"RAG query completed in {latency_ms}ms (chunks: {len(scored_chunks)}, sufficient: {is_sufficient})"
        )

        return RAGQueryResponse(
            question=request.question,
            answer=answer,
            evidence_sufficient=is_sufficient,
            citations=citations,
            retrieved_chunks_count=len(scored_chunks),
            latency_ms=latency_ms,
            session_id=session_id,
        )
