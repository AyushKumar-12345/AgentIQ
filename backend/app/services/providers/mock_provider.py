"""Deterministic, fully offline Mock Provider for testing and local development."""

import math
import re
from typing import List, Optional
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """Generates deterministic, unit-normalized float embeddings."""

    def __init__(self, dimension: int = 1536):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    def _generate_vector(self, text: str) -> List[float]:
        vec = [0.0] * self._dim
        words = re.findall(r"\w+", text.lower())
        if not words:
            return vec

        for w in words:
            # Full word token hash
            idx = abs(hash(w)) % self._dim
            vec[idx] += 1.0
            # Stem / prefix token hash (length 4) for morphological variation
            if len(w) > 4:
                prefix_idx = abs(hash(w[:4])) % self._dim
                vec[prefix_idx] += 1.5

        # Normalize to unit length (L2 norm = 1.0)
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def embed_text(self, text: str) -> List[float]:
        return self._generate_vector(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_vector(t) for t in texts]


class MockLLMProvider(BaseLLMProvider):
    """Generates grounded responses with citations from supplied context."""

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> str:
        prompt_lower = prompt.lower()

        # Check for empty context or insufficient evidence indicators
        if "no relevant document chunks found" in prompt_lower or "<context>\n</context>" in prompt:
            return "The provided documents do not contain sufficient evidence to answer this question."

        # Extract citation references from the prompt if present
        # Format in prompt: [Context Document: {filename} | Page: {page} | Chunk ID: {id}]
        citation_matches = re.findall(
            r"\[Context Document:\s*([^\|]+?)\s*\|\s*Page:\s*(\d+)\s*\|\s*Chunk ID:\s*([^\]]+?)\]",
            prompt,
        )

        if citation_matches:
            doc_name, page, _ = citation_matches[0]
            doc_name = doc_name.strip()
            page = page.strip()
            
            # Grounded synthesis response
            return (
                f"Based on the provided documentation, the requested information indicates verified enterprise metrics "
                f"and operational details [Doc: {doc_name}, Page: {page}]."
            )

        return "Based on the available evidence, the records confirm the requested business information."
