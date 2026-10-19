"""Unit tests for recursive character chunking."""

import pytest
from app.services.chunker import RecursiveCharacterChunker


def test_chunker_empty_text():
    chunker = RecursiveCharacterChunker(chunk_size=500, chunk_overlap=100)
    assert chunker.split_text("") == []
    assert chunker.split_text("   \n\n  ") == []


def test_chunker_short_text():
    chunker = RecursiveCharacterChunker(chunk_size=500, chunk_overlap=100)
    text = "AgentIQ is an enterprise AI assistant."
    chunks = chunker.split_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunker_recursive_splitting_and_overlap():
    chunker = RecursiveCharacterChunker(chunk_size=100, chunk_overlap=20)
    text = (
        "Artificial intelligence and large language models are transforming enterprise operations. "
        "Retrieval-Augmented Generation connects vector search with generative models. "
        "LangGraph provides stateful, multi-actor orchestration with bounded deterministic controls. "
        "PostgreSQL and pgvector store dense embeddings alongside relational tables."
    )
    chunks = chunker.split_text(text)
    assert len(chunks) > 1
    # Verify every chunk obeys the chunk size bound
    for chunk in chunks:
        assert len(chunk) <= 150  # Allows slight tolerance for whitespace boundary merging


def test_chunker_invalid_overlap():
    with pytest.raises(ValueError, match="chunk_overlap must be strictly less than chunk_size"):
        RecursiveCharacterChunker(chunk_size=100, chunk_overlap=100)

