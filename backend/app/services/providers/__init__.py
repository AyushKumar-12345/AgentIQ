"""Provider factory functions."""

from app.config import settings
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider
from app.services.providers.mock_provider import MockLLMProvider, MockEmbeddingProvider
from app.services.providers.openai_provider import OpenAIProvider
from app.services.providers.gemini_provider import GeminiProvider


def get_llm_provider() -> BaseLLMProvider:
    """Returns the configured LLM provider instance."""
    provider_type = settings.LLM_PROVIDER.lower()
    if provider_type == "openai":
        return OpenAIProvider()
    elif provider_type == "gemini":
        return GeminiProvider()
    elif provider_type == "mock":
        return MockLLMProvider()
    else:
        raise ValueError(f"Unsupported LLM provider: {provider_type}")


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Returns the configured embedding provider instance."""
    provider_type = settings.EMBEDDING_PROVIDER.lower()
    if provider_type == "openai":
        return OpenAIProvider()
    elif provider_type == "gemini":
        return GeminiProvider()
    elif provider_type == "mock":
        return MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
    else:
        raise ValueError(f"Unsupported embedding provider: {provider_type}")
