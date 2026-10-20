"""Google Gemini LLM and Embedding Provider using REST API."""

from typing import List, Optional
import httpx
from app.config import settings
from app.core.exceptions import AgentIQException
from app.services.providers.base import BaseLLMProvider, BaseEmbeddingProvider


class GeminiProvider(BaseLLMProvider, BaseEmbeddingProvider):
    """Google Gemini Provider using standard REST endpoints."""

    def __init__(self):
        if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
            raise AgentIQException(
                "Google Gemini API key is missing. Set GEMINI_API_KEY in your .env file, or set LLM_PROVIDER=mock for offline development."
            )
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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.chat_model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        
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
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in (401, 403):
                raise AgentIQException(
                    f"Google Gemini Authentication failed ({status_code}): Invalid or inactive API key. "
                    "Please check GEMINI_API_KEY in your .env file."
                ) from exc
            elif status_code == 429:
                raise AgentIQException(
                    f"Google Gemini Quota/Rate Limit exceeded ({status_code}): Check your Google AI Studio quota."
                ) from exc
            elif status_code >= 500:
                raise AgentIQException(
                    f"Google Gemini service error ({status_code}): Service temporarily unavailable."
                ) from exc
            else:
                try:
                    err_msg = exc.response.json().get("error", {}).get("message", exc.response.text)
                except Exception:
                    err_msg = exc.response.text
                raise AgentIQException(f"Google Gemini API error ({status_code}): {err_msg}") from exc
        except httpx.TimeoutException as exc:
            raise AgentIQException(f"Google Gemini request timed out after {self.timeout}s.") from exc
        except httpx.RequestError as exc:
            raise AgentIQException(f"Google Gemini network connection failed: {str(exc)}") from exc
        except Exception as e:
            raise AgentIQException(f"Gemini API call failed: {str(e)}") from e

    def embed_text(self, text: str) -> List[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/{self.embedding_model}:batchEmbedContents"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        requests = [{"model": self.embedding_model, "content": {"parts": [{"text": t}]}} for t in texts]

        payload = {"requests": requests}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return [entry["values"] for entry in data["embeddings"]]
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in (401, 403):
                raise AgentIQException(
                    f"Google Gemini Authentication failed ({status_code}): Invalid API key for embeddings."
                ) from exc
            elif status_code == 429:
                raise AgentIQException(
                    f"Google Gemini Quota exceeded ({status_code}) for embeddings."
                ) from exc
            else:
                raise AgentIQException(f"Google Gemini Embedding API error ({status_code}): {exc.response.text}") from exc
        except httpx.TimeoutException as exc:
            raise AgentIQException(f"Google Gemini embedding request timed out after {self.timeout}s.") from exc
        except httpx.RequestError as exc:
            raise AgentIQException(f"Google Gemini network connection failed: {str(exc)}") from exc
        except Exception as e:
            raise AgentIQException(f"Gemini Embedding API call failed: {str(e)}") from e

