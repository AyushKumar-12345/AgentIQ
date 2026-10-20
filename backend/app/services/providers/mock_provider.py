"""Deterministic, fully offline Mock Provider for testing and local development."""

import ast
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
        if (
            "no relevant document chunks found" in prompt_lower
            or "<context>\n</context>" in prompt
            or "<context></context>" in prompt
        ):
            return "The provided documents do not contain sufficient evidence to answer this question."

        # Extract Question if present
        question_match = re.search(r"QUESTION:\s*(.*?)(?=\n<|\Z)", prompt, re.DOTALL | re.IGNORECASE)
        question_words = set(re.findall(r"\w{3,}", question_match.group(1).lower())) if question_match else set()

        # Extract document sections
        # Matches either [Context Document: {name} | Page: {page} ...] or [Doc: {name} | Page: {page}]
        doc_pattern = re.compile(
            r"\[(?:Context Document|Doc):\s*([^\|\]]+?)\s*\|\s*Page:\s*(\d+).*?\]\s*\n+([\s\S]*?)(?=(?:\[(?:Context Document|Doc):|</context>|</document_context>|<database_results>|$))",
            re.MULTILINE,
        )

        doc_blocks = doc_pattern.findall(prompt)
        doc_summaries = []

        for doc_name, page_str, content in doc_blocks:
            doc_name = doc_name.strip()
            page = page_str.strip()
            clean_content = content.strip()

            if not clean_content:
                continue

            # Pick the most informative sentence matching the question, or first sentence
            sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_content) if len(s.strip()) > 10]
            best_sentence = None
            best_score = -1

            for s in sentences:
                s_words = set(re.findall(r"\w{3,}", s.lower()))
                overlap = len(s_words & question_words)
                has_numbers = bool(re.search(r"\d+", s))
                score = overlap * 2 + (1 if has_numbers else 0)
                if score > best_score:
                    best_score = score
                    best_sentence = s

            evidence_text = best_sentence if best_sentence else (sentences[0] if sentences else clean_content[:200])
            doc_summaries.append(
                f"Based on the provided documentation, {evidence_text} [Doc: {doc_name}, Page: {page}]."
            )

        # Extract Database Results if present
        db_summary = None
        db_match = re.search(
            r"<database_results>\s*Columns:\s*(\[.*?\])\s*Rows:\s*(\[.*?\])\s*</database_results>",
            prompt,
            re.DOTALL,
        )
        if db_match:
            try:
                cols = ast.literal_eval(db_match.group(1))
                rows = ast.literal_eval(db_match.group(2))
                if rows:
                    row_lines = []
                    for row in rows[:5]:
                        pairs = [f"{c}: {v}" for c, v in zip(cols, row)]
                        row_lines.append("- " + ", ".join(pairs))
                    db_summary = "Database analytics records indicate:\n" + "\n".join(row_lines)
            except Exception:
                db_summary = "Database analytics returned relevant business metrics matching the query."

        # Combine synthesis
        if doc_summaries and db_summary:
            return "\n\n".join(doc_summaries) + "\n\n" + db_summary
        elif doc_summaries:
            return "\n\n".join(doc_summaries)
        elif db_summary:
            return db_summary

        if "<database_results>" in prompt and not db_summary:
            return "Database query completed with no matching records found."

        return "The provided documents do not contain sufficient evidence to answer this question."

