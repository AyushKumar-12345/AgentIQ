"""Validated Safe SQL Analytics Tool for LangGraph Agent."""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.services.sql_tool_service import SQLToolService
from app.schemas.analytics import SQLQueryRequest


class SQLAnalyticsToolInput(BaseModel):
    sql_query: Optional[str] = Field(None, description="Custom read-only SQL query on approved tables")
    preset_query: Optional[str] = Field(None, description="Preset query name (e.g. revenue_by_region, top_selling_products)")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parameters for query")


def execute_sql_analytics(db: Session, tool_input: SQLAnalyticsToolInput) -> Dict[str, Any]:
    """Executes safe SQL analytics against the business database."""
    try:
        request = SQLQueryRequest(
            sql_query=tool_input.sql_query,
            preset_query=tool_input.preset_query,
            params=tool_input.params,
        )
        res = SQLToolService.execute_query(db=db, request=request)

        # Build human-readable summary for synthesizer
        summary_rows = []
        for r in res.rows[:5]:
            summary_rows.append(str(dict(zip(res.columns, r))))

        return {
            "success": True,
            "columns": res.columns,
            "rows": res.rows,
            "row_count": res.row_count,
            "executed_sql": res.executed_sql,
            "summary": f"Executed query returned {res.row_count} row(s). Sample: {'; '.join(summary_rows)}",
        }

    except Exception as exc:
        return {
            "success": False,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "error": str(exc),
            "summary": f"SQL tool rejected or failed: {str(exc)}",
        }
