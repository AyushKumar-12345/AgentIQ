"""Agent Execution Runner and session persistence."""

import time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.agent.graph import create_agent_graph
from app.agent.state import AgentState
from app.config import settings
from app.models.chat import ChatSession, ChatMessage
from app.core.logging import logger


def run_agent(
    db: Session,
    analytics_db: Session,
    user_query: str,
    session_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Runs the bounded LangGraph agent workflow and persists session history."""
    start_time = time.perf_counter()

    # 1. Establish or create session
    if session_id:
        session = db.get(ChatSession, session_id)
        if not session:
            session = ChatSession(id=session_id, title=user_query[:50])
            db.add(session)
    else:
        session = ChatSession(title=user_query[:50])
        db.add(session)
        db.flush()
        session_id = str(session.id)

    # 2. Build and run graph
    graph = create_agent_graph(db=db, analytics_db=analytics_db)

    initial_state: AgentState = {
        "user_query": user_query,
        "session_id": session_id,
        "current_step": 0,
        "max_steps": settings.AGENT_MAX_STEPS,
        "tool_activity": [],
        "context_snippets": [],
        "citations": [],
        "sql_results": None,
        "needs_doc_search": False,
        "needs_sql_analytics": False,
        "final_answer": None,
        "error_message": None,
    }

    final_state = graph.invoke(initial_state)

    answer = final_state.get("final_answer") or "Agent completed without generating an answer."
    tool_activity = final_state.get("tool_activity", [])
    citations = final_state.get("citations", [])

    # 3. Persist messages
    user_msg = ChatMessage(session_id=session_id, role="user", content=user_query)
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=answer,
        tool_calls=tool_activity,
        citations=citations,
    )
    db.add_all([user_msg, assistant_msg])
    db.commit()

    latency_ms = int((time.perf_counter() - start_time) * 1000)

    logger.info(
        f"Agent completed in {latency_ms}ms (steps: {final_state.get('current_step')}, tools: {len(tool_activity)})"
    )

    return {
        "session_id": session_id,
        "response": answer,
        "steps_taken": final_state.get("current_step", 0),
        "tool_activity": tool_activity,
        "citations": citations,
        "latency_ms": latency_ms,
    }
