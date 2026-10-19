"""Tests for API health check and root endpoints."""

from fastapi import status


def test_root_endpoint(client):
    """Verifies that the root endpoint returns project information."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "AgentIQ"
    assert "version" in data
    assert data["health"] == "/api/v1/health"


def test_health_check_endpoint(client):
    """Verifies that the health check endpoint reports service status and provider details."""
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "database" in data
    assert "details" in data
    assert data["details"]["llm_provider"] == "mock"
    assert data["details"]["is_mock"] is True
    assert "active_model" in data["details"]


