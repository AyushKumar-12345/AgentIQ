"""Abstract Base Classes for LLM and Embedding Providers."""

from abc import ABC, abstractmethod
from typing import List, Optional


class BaseLLMProvider(ABC):
    """Abstract interface for large language model generation."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> str:
        """Generates a text completion given user prompt and optional system instructions."""
        pass


class BaseEmbeddingProvider(ABC):
    """Abstract interface for dense vector embeddings."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Vector dimensionality."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generates an embedding vector for a single string."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a batch of strings."""
        pass
