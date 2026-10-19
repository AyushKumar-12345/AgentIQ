"""LangGraph Bounded StateGraph Workflow for AgentIQ."""

from typing import Dict, Any
from langgraph.graph import StateGraph, START, END
from sqlalchemy.orm import Session

from app.agent.state import AgentState
from app.agent.tools.doc_search_tool import execute_doc_search, DocSearchToolInput
from app.agent.tools.sql_analytics_tool import execute_sql_analytics, SQLAnalyticsToolInput
from app.services.providers import get_llm_provider


def create_agent_graph(db: Session, analytics_db: Session):
    """Compiles the bounded LangGraph workflow with database sessions bound into node closures."""

    # Node 1: Intelligent Router
    def router_node(state: AgentState) -> Dict[str, Any]:
        query = state["user_query"].lower()
        step = state.get("current_step", 0) + 1

        # Semantic keywords for documents vs sql analytics
        doc_keywords = ["document", "pdf", "report", "policy", "strategy", "roadmap", "plan", "target", "guideline", "overview"]
        sql_keywords = ["revenue", "sales", "order", "product", "customer", "region", "top selling", "unit price", "amount", "sql", "database"]

        needs_doc = any(k in query for k in doc_keywords)
        needs_sql = any(k in query for k in sql_keywords)

        # Default to doc search if neither explicitly matched
        if not needs_doc and not needs_sql:
            needs_doc = True

        return {
            "current_step": step,
            "needs_doc_search": needs_doc,
            "needs_sql_analytics": needs_sql,
        }

    # Node 2: Document Search Tool Execution
    def doc_search_node(state: AgentState) -> Dict[str, Any]:
        step = state.get("current_step", 0) + 1
        tool_res = execute_doc_search(db, DocSearchToolInput(query=state["user_query"]))

        activity_record = {
            "step": step,
            "tool_name": "document_search",
            "input": {"query": state["user_query"]},
            "status": "SUCCESS" if tool_res["success"] else "FAILED",
            "result_summary": tool_res["summary"],
        }

        updated_activity = list(state.get("tool_activity", [])) + [activity_record]
        updated_snippets = list(state.get("context_snippets", [])) + tool_res["snippets"]
        updated_citations = list(state.get("citations", [])) + tool_res["citations"]

        return {
            "current_step": step,
            "needs_doc_search": False,
            "tool_activity": updated_activity,
            "context_snippets": updated_snippets,
            "citations": updated_citations,
        }

    # Node 3: Safe SQL Analytics Tool Execution
    def sql_analytics_node(state: AgentState) -> Dict[str, Any]:
        step = state.get("current_step", 0) + 1
        query = state["user_query"].lower()

        # Map natural language question to preset or parameterized SQL
        preset = None
        params: Dict[str, Any] = {}
        sql_query = None

        if "region" in query:
            preset = "revenue_by_region"
        elif "top" in query or "best selling" in query or "product" in query:
            preset = "top_selling_products"
            params = {"limit": 5}
        elif "recent" in query or "latest order" in query:
            preset = "recent_orders"
            params = {"limit": 5}
        elif "category" in query or "software" in query:
            preset = "products_by_category"
            params = {"category": "Software"}
        else:
            preset = "revenue_by_region"

        tool_res = execute_sql_analytics(
            analytics_db,
            SQLAnalyticsToolInput(preset_query=preset, sql_query=sql_query, params=params),
        )

        activity_record = {
            "step": step,
            "tool_name": "safe_sql_analytics",
            "input": {"preset_query": preset, "params": params},
            "status": "SUCCESS" if tool_res["success"] else "FAILED",
            "result_summary": tool_res["summary"],
        }

        updated_activity = list(state.get("tool_activity", [])) + [activity_record]

        return {
            "current_step": step,
            "needs_sql_analytics": False,
            "tool_activity": updated_activity,
            "sql_results": tool_res,
        }

    # Node 4: Synthesis & Grounded Citations
    def synthesizer_node(state: AgentState) -> Dict[str, Any]:
        step = state.get("current_step", 0) + 1

        context_text = "\n\n".join(state.get("context_snippets", []))
        sql_data = state.get("sql_results")

        system_prompt = (
            "You are AgentIQ, an enterprise intelligence assistant. Synthesize a comprehensive, "
            "clear answer to the user's question using the retrieved document context and database analytics below. "
            "Cite document sources as [Doc: <name>, Page: <page>] wherever relevant. Distinguish database findings from document text."
        )

        user_content = f"QUESTION: {state['user_query']}\n\n"
        if context_text:
            user_content += f"<document_context>\n{context_text}\n</document_context>\n\n"
        if sql_data and sql_data.get("rows"):
            user_content += f"<database_results>\nColumns: {sql_data.get('columns')}\nRows: {sql_data.get('rows')}\n</database_results>\n\n"

        if not context_text and (not sql_data or not sql_data.get("rows")):
            final_answer = "The provided enterprise documents and database do not contain sufficient evidence to answer this question."
        else:
            llm_provider = get_llm_provider()
            final_answer = llm_provider.generate(
                prompt=user_content,
                system_prompt=system_prompt,
                temperature=0.0,
            )

        return {
            "current_step": step,
            "final_answer": final_answer,
        }

    # Conditional Routing Logic
    def route_after_router(state: AgentState) -> str:
        if state.get("needs_doc_search"):
            return "doc_search"
        if state.get("needs_sql_analytics"):
            return "sql_analytics"
        return "synthesizer"

    def route_after_doc_search(state: AgentState) -> str:
        if state.get("current_step", 0) >= state.get("max_steps", 4):
            return "synthesizer"
        if state.get("needs_sql_analytics"):
            return "sql_analytics"
        return "synthesizer"

    def route_after_sql(state: AgentState) -> str:
        if state.get("current_step", 0) >= state.get("max_steps", 4):
            return "synthesizer"
        if state.get("needs_doc_search"):
            return "doc_search"
        return "synthesizer"

    # Assemble Graph
    builder = StateGraph(AgentState)

    builder.add_node("router", router_node)
    builder.add_node("doc_search", doc_search_node)
    builder.add_node("sql_analytics", sql_analytics_node)
    builder.add_node("synthesizer", synthesizer_node)

    builder.add_edge(START, "router")
    builder.add_conditional_edges(
        "router",
        route_after_router,
        {
            "doc_search": "doc_search",
            "sql_analytics": "sql_analytics",
            "synthesizer": "synthesizer",
        },
    )
    builder.add_conditional_edges(
        "doc_search",
        route_after_doc_search,
        {
            "sql_analytics": "sql_analytics",
            "synthesizer": "synthesizer",
        },
    )
    builder.add_conditional_edges(
        "sql_analytics",
        route_after_sql,
        {
            "doc_search": "doc_search",
            "synthesizer": "synthesizer",
        },
    )
    builder.add_edge("synthesizer", END)

    return builder.compile()

