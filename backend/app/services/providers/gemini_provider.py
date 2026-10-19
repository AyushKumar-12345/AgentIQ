"""Google Gemini LLM and Embedding Provider using REST API."""

from typing import List, Optional
import httpx
from app.config import settings
from app.core.exceptions import AgentIQException
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider


class GeminiProvider(BaseLLMProvider, BaseEmbeddingProvider):
    """Google Gemini Provider using standard REST endpoints."""

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise AgentIQException("GEMINI_API_KEY is not configured in environment.")
        self.api_key = settings.GEMINI_API_KEY
        self.chat_model = settings.GEMINI_CHAT_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self._dim = 768  # Standard Gemini embedding-004 dimension
        self.timeout = 30.0

    @property
    def dimension(self) -> int:
        return self._dim

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1000,
    ) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.chat_model}:generateContent?key={self.api_key}"
        
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTION: {system_prompt}"}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            raise AgentIQException(f"Gemini API call failed: {str(e)}")

    def embed_text(self, text: str) -> List[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/{self.embedding_model}:batchEmbedContents?key={self.api_key}"
        requests = [{"model": self.embedding_model, "content": {"parts": [{"text": t}]}} for t in texts]

        payload = {"requests": requests}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return [entry["values"] for entry in data["embeddings"]]
        except Exception as e:
            raise AgentIQException(f"Gemini Embedding API call failed: {str(e)}")

