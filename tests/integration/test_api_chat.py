"""Integration tests for RAG query and Chat API endpoints."""

import io
from fastapi import status


def test_rag_query_grounded_answer(client, make_sample_pdf):
    """Verifies that relevant questions yield grounded answers with valid citations."""
    pdf_bytes = make_sample_pdf("Cloud migration increased gross margins by 22 percent in fiscal year 2026.")
    files = {"file": ("cloud_margins.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/documents/upload", files=files)
    assert upload_res.status_code == status.HTTP_201_CREATED

    query_payload = {
        "question": "How much did cloud migration increase gross margins?",
        "top_k": 3,
        "similarity_threshold": 0.5,
    }
    chat_res = client.post("/api/v1/chat/query", json=query_payload)
    assert chat_res.status_code == status.HTTP_200_OK
    data = chat_res.json()
    assert data["evidence_sufficient"] is True
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["filename"] == "cloud_margins.pdf"
    assert data["citations"][0]["page_number"] == 1
    assert "Doc: cloud_margins.pdf" in data["answer"]


def test_rag_query_insufficient_evidence(client):
    """Verifies that queries with no relevant context indicate insufficient evidence."""
    query_payload = {
        "question": "What is the average surface temperature on Mars during winter?",
        "top_k": 3,
        "similarity_threshold": 0.99,  # Impossibly high threshold to guarantee empty retrieval
    }
    chat_res = client.post("/api/v1/chat/query", json=query_payload)
    assert chat_res.status_code == status.HTTP_200_OK
    data = chat_res.json()
    assert data["evidence_sufficient"] is False
    assert len(data["citations"]) == 0
    assert "not contain sufficient evidence" in data["answer"].lower()


def test_chat_session_lifecycle(client, make_sample_pdf):
    """Verifies session persistence and retrieval of previous conversation history."""
    pdf_bytes = make_sample_pdf("Executive leadership announced expansion into APAC markets.")
    files = {"file": ("expansion.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    client.post("/api/v1/documents/upload", files=files)

    query_payload = {
        "question": "Which regional market did leadership announce expansion into?",
        "similarity_threshold": 0.5,
    }
    chat_res = client.post("/api/v1/chat/query", json=query_payload)
    assert chat_res.status_code == status.HTTP_200_OK
    session_id = chat_res.json()["session_id"]
    assert session_id is not None

    # Get session history
    session_res = client.get(f"/api/v1/chat/sessions/{session_id}")
    assert session_res.status_code == status.HTTP_200_OK
    history = session_res.json()
    assert history["id"] == session_id
    assert len(history["messages"]) == 2  # user + assistant

    # Delete session
    del_res = client.delete(f"/api/v1/chat/sessions/{session_id}")
    assert del_res.status_code == status.HTTP_200_OK


def test_agent_session_persistence_with_tool_activity(client, db_session):
    """Verifies that an agent session preserves tool_activity in past conversation messages."""
    agent_res = client.post("/api/v1/chat/agent", json={"message": "What is our customer sales revenue by region?"})
    assert agent_res.status_code == status.HTTP_200_OK
    session_id = agent_res.json()["session_id"]

    session_res = client.get(f"/api/v1/chat/sessions/{session_id}")
    assert session_res.status_code == status.HTTP_200_OK
    history = session_res.json()
    assert len(history["messages"]) == 2
    assistant_msg = history["messages"][1]
    assert assistant_msg["role"] == "assistant"
    assert assistant_msg["tool_activity"] is not None
    assert len(assistant_msg["tool_activity"]) >= 1
    assert assistant_msg["tool_activity"][0]["tool_name"] == "safe_sql_analytics"


