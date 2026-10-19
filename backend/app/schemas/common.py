"""Common schemas for AgentIQ."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    version: str = Field(..., examples=["0.1.0"])
    environment: str = Field(..., examples=["development"])
    database: str = Field(..., examples=["connected"])
    details: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    message: str
    success: bool = True
