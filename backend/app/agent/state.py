"""AgentState definition for LangGraph orchestration."""

from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    """Represents the mutable state throughout the LangGraph agent workflow."""
    user_query: str
    session_id: Optional[str]
    current_step: int
    max_steps: int
    
    # Tool Execution Audit Trail
    tool_activity: List[Dict[str, Any]]
    
    # Retrieved knowledge & data
    context_snippets: List[str]
    citations: List[Dict[str, Any]]
    sql_results: Optional[Dict[str, Any]]
    
    # Route tracking
    needs_doc_search: bool
    needs_sql_analytics: bool
    
    # Output
    final_answer: Optional[str]
    error_message: Optional[str]

