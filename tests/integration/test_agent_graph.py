"""Integration tests for bounded LangGraph Agent workflow."""

import io
from fastapi import status
from app.db.seed_business_data import seed_business_data


def test_agent_doc_search_query(client, db_session, make_sample_pdf):
    """Verifies agent routes document question to doc search tool and returns citations."""
    pdf_bytes = make_sample_pdf("Enterprise AI policy dictates bi-annual algorithmic fairness audits.")
    files = {"file": ("ai_policy.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    client.post("/api/v1/documents/upload", files=files)

    agent_payload = {
        "message": "What does the enterprise AI policy document dictate regarding audits?",
    }
    res = client.post("/api/v1/chat/agent", json=agent_payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "response" in data
    assert data["steps_taken"] <= 4  # Bounded execution check
    tool_names = [t["tool_name"] for t in data["tool_activity"]]
    assert "document_search" in tool_names


def test_agent_sql_analytics_query(client, db_session):
    """Verifies agent routes business metric question to SQL analytics tool."""
    seed_business_data(db_session)

    agent_payload = {
        "message": "What is our customer sales revenue by region?",
    }
    res = client.post("/api/v1/chat/agent", json=agent_payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "response" in data
    assert data["steps_taken"] <= 4
    tool_names = [t["tool_name"] for t in data["tool_activity"]]
    assert "safe_sql_analytics" in tool_names


def test_agent_hybrid_query(client, db_session, make_sample_pdf):
    """Verifies agent executes both tools for a hybrid comparative query within bounding limits."""
    seed_business_data(db_session)
    pdf_bytes = make_sample_pdf("Strategic Q3 target: achieve $30000 in software revenue.")
    files = {"file": ("strategy.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    client.post("/api/v1/documents/upload", files=files)

    agent_payload = {
        "message": "Compare the software revenue target in our strategy document with our top selling product sales.",
    }
    res = client.post("/api/v1/chat/agent", json=agent_payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["steps_taken"] <= 4
    tool_names = [t["tool_name"] for t in data["tool_activity"]]
    assert "document_search" in tool_names
    assert "safe_sql_analytics" in tool_names

