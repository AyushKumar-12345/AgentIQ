"""OpenAI LLM and Embedding Provider using httpx."""

from typing import List, Optional
import httpx
from app.config import settings
from app.core.exceptions import AgentIQException
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider


class OpenAIProvider(BaseLLMProvider, BaseEmbeddingProvider):
    """OpenAI API Provider for Chat and Embeddings."""

    def __init__(self):
        if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
            raise AgentIQException(
                "OpenAI API key is missing. Set OPENAI_API_KEY in your .env file, or set LLM_PROVIDER=mock for offline development."
            )
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
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in (401, 403):
                raise AgentIQException(
                    f"OpenAI Authentication failed ({status_code}): Invalid or inactive API key. "
                    "Please check OPENAI_API_KEY in your .env file."
                ) from exc
            elif status_code == 429:
                raise AgentIQException(
                    f"OpenAI Quota/Rate Limit exceeded ({status_code}): Check your OpenAI account balance or limits."
                ) from exc
            elif status_code >= 500:
                raise AgentIQException(
                    f"OpenAI service error ({status_code}): The OpenAI service is temporarily unavailable."
                ) from exc
            else:
                try:
                    err_msg = exc.response.json().get("error", {}).get("message", exc.response.text)
                except Exception:
                    err_msg = exc.response.text
                raise AgentIQException(f"OpenAI API error ({status_code}): {err_msg}") from exc
        except httpx.TimeoutException as exc:
            raise AgentIQException(f"OpenAI request timed out after {self.timeout}s.") from exc
        except httpx.RequestError as exc:
            raise AgentIQException(f"OpenAI network connection failed: {str(exc)}") from exc
        except Exception as e:
            raise AgentIQException(f"OpenAI API call failed: {str(e)}") from e

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
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in (401, 403):
                raise AgentIQException(
                    f"OpenAI Authentication failed ({status_code}): Invalid or inactive API key. "
                    "Please check OPENAI_API_KEY in your .env file."
                ) from exc
            elif status_code == 429:
                raise AgentIQException(
                    f"OpenAI Quota/Rate Limit exceeded ({status_code}): Check your OpenAI account balance or limits."
                ) from exc
            else:
                raise AgentIQException(f"OpenAI Embedding API error ({status_code}): {exc.response.text}") from exc
        except httpx.TimeoutException as exc:
            raise AgentIQException(f"OpenAI embedding request timed out after {self.timeout}s.") from exc
        except httpx.RequestError as exc:
            raise AgentIQException(f"OpenAI network connection failed: {str(exc)}") from exc
        except Exception as e:
            raise AgentIQException(f"OpenAI Embedding API call failed: {str(e)}") from e

