"""Domain-specific exceptions and error definitions for AgentIQ."""

from typing import Any, Dict, Optional


class AgentIQException(Exception):
    """Base exception for all AgentIQ errors."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class DocumentProcessingError(AgentIQException):
    """Raised when PDF extraction or chunking fails."""
    pass


class InvalidFileError(AgentIQException):
    """Raised when an uploaded file fails validation (magic bytes, size)."""
    pass


class DuplicateDocumentError(AgentIQException):
    """Raised when a document with identical hash is already indexed."""
    def __init__(self, message: str, document_id: str):
        super().__init__(message, {"document_id": document_id})
        self.document_id = document_id


class SQLSecurityViolationError(AgentIQException):
    """Raised when a SQL query violates security guardrails."""
    pass


class AgentExecutionError(AgentIQException):
    """Raised when the LangGraph agent workflow fails or exceeds bounds."""
    pass

