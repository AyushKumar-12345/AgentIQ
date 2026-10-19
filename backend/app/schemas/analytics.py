"""Pydantic schemas for Safe SQL Analytics."""

from typing import List, Any, Optional, Dict
from pydantic import BaseModel, Field


class SQLQueryRequest(BaseModel):
    sql_query: Optional[str] = Field(None, description="Read-only SQL query to execute")
    preset_query: Optional[str] = Field(None, description="Predefined parameterized query identifier")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parameters for preset query")


class SQLQueryResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_time_ms: int
    executed_sql: str


class PresetQueryInfo(BaseModel):
    id: str
    name: str
    description: str
    allowed_params: List[str]

