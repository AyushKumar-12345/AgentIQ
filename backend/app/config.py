"""Application Configuration Module.

Uses Pydantic BaseSettings for strict environment variable validation and type coercion.
"""

from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General App Config
    PROJECT_NAME: str = "AgentIQ"
    VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "dev_secret_key_for_testing_agentiq_minimum_32_characters_long"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Server Binding
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./agentiq_dev.db"
    ANALYTICS_DATABASE_URL: str = "sqlite:///./agentiq_dev.db"

    # AI Model Provider
    LLM_PROVIDER: Literal["mock", "openai", "gemini"] = "mock"
    EMBEDDING_PROVIDER: Literal["mock", "openai", "gemini"] = "mock"

    # OpenAI Settings
    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # Gemini Settings
    GEMINI_API_KEY: str = ""
    GEMINI_CHAT_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/text-embedding-004"

    # Document Ingestion & Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100

    # RAG Retrieval Defaults
    DEFAULT_TOP_K: int = 4
    DEFAULT_SIMILARITY_THRESHOLD: float = 0.45

    # LangGraph Agent Constraints
    AGENT_MAX_STEPS: int = 4
    AGENT_TIMEOUT_SECONDS: int = 15
    SQL_QUERY_TIMEOUT_MS: int = 3000
    SQL_MAX_ROWS: int = 50

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
