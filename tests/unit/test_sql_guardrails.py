"""Unit tests for AST SQL parsing and security guardrails."""

import pytest
from app.services.sql_tool_service import SQLToolService
from app.core.exceptions import SQLSecurityViolationError


def test_allowed_select_query():
    """Verifies that legitimate read-only queries on approved tables pass validation."""
    query = "SELECT c.name, c.region FROM customers c WHERE c.region = 'North America'"
    sanitized = SQLToolService.validate_and_sanitize_sql(query)
    assert "customers" in sanitized.lower()
    assert "limit 50" in sanitized.lower()


def test_reject_drop_table():
    """Verifies immediate rejection of DROP TABLE statements."""
    query = "DROP TABLE customers"
    with pytest.raises(SQLSecurityViolationError, match="Only read-only SELECT queries are allowed"):
        SQLToolService.validate_and_sanitize_sql(query)


def test_reject_update_statement():
    """Verifies rejection of UPDATE statements."""
    query = "UPDATE customers SET name = 'Compromised' WHERE id = 1"
    with pytest.raises(SQLSecurityViolationError, match="Only read-only SELECT queries are allowed"):
        SQLToolService.validate_and_sanitize_sql(query)


def test_reject_insert_statement():
    """Verifies rejection of INSERT statements."""
    query = "INSERT INTO customers (name, email, region) VALUES ('Attacker', 'hacked@hack.com', 'APAC')"
    with pytest.raises(SQLSecurityViolationError, match="Only read-only SELECT queries are allowed"):
        SQLToolService.validate_and_sanitize_sql(query)


def test_reject_delete_statement():
    """Verifies rejection of DELETE statements."""
    query = "DELETE FROM orders WHERE id = 1"
    with pytest.raises(SQLSecurityViolationError, match="Only read-only SELECT queries are allowed"):
        SQLToolService.validate_and_sanitize_sql(query)


def test_reject_chained_multiple_statements():
    """Verifies rejection of multiple chained SQL statements."""
    query = "SELECT * FROM customers; DROP TABLE orders"
    with pytest.raises(SQLSecurityViolationError, match="Chained or multiple SQL statements are strictly prohibited"):
        SQLToolService.validate_and_sanitize_sql(query)


def test_reject_unauthorized_table_access():
    """Verifies rejection of queries attempting to read application tables or system catalogs."""
    # Attempting to read documents
    with pytest.raises(SQLSecurityViolationError, match="Unauthorized table access"):
        SQLToolService.validate_and_sanitize_sql("SELECT * FROM documents")

    # Attempting to read chat_messages
    with pytest.raises(SQLSecurityViolationError, match="Unauthorized table access"):
        SQLToolService.validate_and_sanitize_sql("SELECT * FROM chat_messages")


def test_reject_prohibited_function_execution():
    """Verifies rejection of blacklisted functions like pg_sleep or dblink."""
    with pytest.raises(SQLSecurityViolationError, match="Prohibited function execution"):
        SQLToolService.validate_and_sanitize_sql("SELECT pg_sleep(10)")


def test_enforce_limit_clamping():
    """Verifies that queries without a LIMIT get clamped to 50, and excessive limits are reduced."""
    q1 = "SELECT * FROM products"
    sanitized1 = SQLToolService.validate_and_sanitize_sql(q1)
    assert "limit 50" in sanitized1.lower()

    q2 = "SELECT * FROM products LIMIT 5000"
    sanitized2 = SQLToolService.validate_and_sanitize_sql(q2)
    assert "limit 50" in sanitized2.lower()

