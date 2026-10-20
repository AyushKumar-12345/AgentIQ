"""Unit tests for AI providers, error handling, and factory logic."""

import pytest
from app.config import settings
from app.core.exceptions import AgentIQException
from app.services.providers import get_llm_provider, get_embedding_provider
from app.services.providers.mock_provider import MockLLMProvider, MockEmbeddingProvider
from app.services.providers.openai_provider import OpenAIProvider
from app.services.providers.gemini_provider import GeminiProvider


def test_mock_embedding_provider_generation():
    """Verifies that the mock embedding provider outputs unit-normalized vectors of expected dimension."""
    provider = MockEmbeddingProvider(dimension=1536)
    vec = provider.embed_text("enterprise revenue analysis")
    assert len(vec) == 1536
    # Check L2 unit normalization: sum of squares should approximate 1.0
    norm = sum(x * x for x in vec)
    assert pytest.approx(norm, rel=1e-3) == 1.0


def test_mock_embedding_batch():
    """Verifies batch embedding generation."""
    provider = MockEmbeddingProvider(dimension=768)
    texts = ["financial metrics", "quarterly target", "data governance"]
    vectors = provider.embed_batch(texts)
    assert len(vectors) == 3
    assert all(len(v) == 768 for v in vectors)


def test_mock_llm_grounded_response():
    """Verifies that mock LLM extracts citations from context prompt."""
    provider = MockLLMProvider()
    prompt = "QUESTION: What is the goal?\n<context>[Context Document: strategic_plan.pdf | Page: 3 | Chunk ID: c1]\nRevenue targets.</context>"
    response = provider.generate(prompt)
    assert "[Doc: strategic_plan.pdf, Page: 3]" in response


def test_mock_llm_insufficient_evidence():
    """Verifies that mock LLM refuses ungrounded questions without evidence."""
    provider = MockLLMProvider()
    prompt = "QUESTION: Tell me about aliens.\n<context>\n</context>"
    response = provider.generate(prompt)
    assert "sufficient evidence" in response.lower()


def test_openai_provider_missing_key_error(monkeypatch):
    """Verifies that OpenAIProvider raises a descriptive AgentIQException when API key is missing."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    with pytest.raises(AgentIQException) as exc_info:
        OpenAIProvider()
    assert "OpenAI API key is missing" in str(exc_info.value)


def test_gemini_provider_missing_key_error(monkeypatch):
    """Verifies that GeminiProvider raises a descriptive AgentIQException when API key is missing."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    with pytest.raises(AgentIQException) as exc_info:
        GeminiProvider()
    assert "Google Gemini API key is missing" in str(exc_info.value)


def test_provider_factory_mock(monkeypatch):
    """Verifies provider factory returns mock provider instances in test/dev environment."""
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")
    monkeypatch.setattr(settings, "EMBEDDING_PROVIDER", "mock")

    llm = get_llm_provider()
    embedding = get_embedding_provider()

    assert isinstance(llm, MockLLMProvider)
    assert isinstance(embedding, MockEmbeddingProvider)


def test_provider_factory_invalid(monkeypatch):
    """Verifies that requesting an unsupported provider raises a ValueError."""
    monkeypatch.setattr(settings, "LLM_PROVIDER", "unsupported_llm_xyz")
    with pytest.raises(ValueError):
        get_llm_provider()


def test_mock_llm_sql_synthesis():
    """Verifies mock LLM synthesizes SQL database results."""
    provider = MockLLMProvider()
    prompt = "QUESTION: Show revenue\n<database_results>\nColumns: ['region', 'rev']\nRows: [['EMEA', 50000]]\n</database_results>"
    res = provider.generate(prompt)
    assert "Database analytics records indicate:" in res
    assert "region: EMEA" in res
    assert "rev: 50000" in res


def test_mock_llm_hybrid_synthesis():
    """Verifies mock LLM synthesizes both documents and database results."""
    provider = MockLLMProvider()
    prompt = (
        "QUESTION: Compare target\n"
        "<document_context>\n[Doc: target.pdf | Page: 1]\nSoftware target is 100k.\n</document_context>\n\n"
        "<database_results>\nColumns: ['product', 'sales']\nRows: [['Enterprise Suite', 95000]]\n</database_results>"
    )
    res = provider.generate(prompt)
    assert "[Doc: target.pdf, Page: 1]" in res
    assert "Database analytics records indicate:" in res

