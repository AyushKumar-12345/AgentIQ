"""Security tests verifying defense against SQL injection attacks."""

from fastapi import status
from app.db.seed_business_data import seed_business_data


def test_sql_injection_union_attack_rejected(client, db_session):
    """Verifies that UNION attacks attempting to access unauthorized tables are blocked."""
    seed_business_data(db_session)

    # Attempting to union with documents table
    attack_payload = {
        "sql_query": "SELECT id, name FROM customers UNION SELECT id, filename FROM documents"
    }
    res = client.post("/api/v1/analytics/query", json=attack_payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    data = res.json()
    assert data["error"] == "SQLSecurityViolationError"
    assert "Prohibited statement type" in data["message"] or "Unauthorized table access" in data["message"]


def test_sql_injection_comment_truncation_rejected(client, db_session):
    """Verifies that malicious query chaining with comment truncation is blocked."""
    seed_business_data(db_session)

    # Malicious query trying to terminate and drop
    attack_payload = {
        "sql_query": "SELECT * FROM customers; DROP TABLE orders; --"
    }
    res = client.post("/api/v1/analytics/query", json=attack_payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    data = res.json()
    assert data["error"] == "SQLSecurityViolationError"
    assert "Chained or multiple SQL statements are strictly prohibited" in data["message"]


def test_sql_destructive_mutation_rejected(client, db_session):
    """Verifies that destructive mutations like DELETE or UPDATE are blocked."""
    seed_business_data(db_session)

    attack_payload = {
        "sql_query": "DELETE FROM orders WHERE total_amount > 0"
    }
    res = client.post("/api/v1/analytics/query", json=attack_payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    data = res.json()
    assert data["error"] == "SQLSecurityViolationError"
    assert "Only read-only SELECT queries are allowed" in data["message"]


def test_valid_preset_query_passes(client, db_session):
    """Verifies that safe predefined queries execute without issues."""
    seed_business_data(db_session)

    payload = {"preset_query": "revenue_by_region"}
    res = client.post("/api/v1/analytics/query", json=payload)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "columns" in data
    assert "rows" in data
    assert data["row_count"] > 0
