"""OpenAI LLM and Embedding Provider using httpx."""

from typing import List, Optional
import httpx
from app.config import settings
from app.core.exceptions import AgentIQException
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider


class OpenAIProvider(BaseLLMProvider, BaseEmbeddingProvider):
    """OpenAI API Provider for Chat and Embeddings."""

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise AgentIQException("OPENAI_API_KEY is not configured in environment.")
        self.api_key = settings.OPENAI_API_KEY
        self.chat_model = settings.OPENAI_CHAT_MODEL
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
        self._dim = settings.EMBEDDING_DIMENSION
        self.base_url = "https://api.openai.com/v1"
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
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.chat_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            raise AgentIQException(f"OpenAI API call failed: {str(e)}")

    def embed_text(self, text: str) -> List[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.embedding_model,
            "input": texts,
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(f"{self.base_url}/embeddings", headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return [item["embedding"] for item in data["data"]]
        except Exception as e:
            raise AgentIQException(f"OpenAI Embedding API call failed: {str(e)}")

