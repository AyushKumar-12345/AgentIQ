"""Pytest configuration and global fixtures for AgentIQ."""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set testing environment variables before importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ANALYTICS_DATABASE_URL"] = "sqlite://"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from app.main import create_app
from app.db.session import get_db, get_analytics_db, Base
# Ensure all models are imported so their tables are in Base.metadata
import app.models  # noqa


@pytest.fixture(scope="session")
def test_engine():
    """Provides a shared in-memory SQLite engine with StaticPool for thread safety."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def TestingSessionLocal(test_engine):
    """Session factory bound to the shared test engine."""
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session(TestingSessionLocal):
    """Provides a clean transactional session for an individual test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def client(test_engine, TestingSessionLocal):
    """FastAPI TestClient fixture with dependency overrides for database sessions."""
    app = create_app()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_analytics_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def make_sample_pdf():
    """Fixture providing a function that generates valid in-memory PDF bytes with text."""
    def _generator(text: str = "AgentIQ enterprise documentation and metrics.") -> bytes:
        obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        stream_data = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET\n".encode("latin-1")
        obj4 = f"4 0 obj\n<< /Length {len(stream_data)} >>\nstream\n".encode("latin-1") + stream_data + b"endstream\nendobj\n"
        obj5 = b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        obj3 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        header = b"%PDF-1.4\n"
        pos1 = len(header)
        pos2 = pos1 + len(obj1)
        pos3 = pos2 + len(obj2)
        pos4 = pos3 + len(obj3)
        pos5 = pos4 + len(obj4)
        xref_pos = pos5 + len(obj5)
        xref = f"xref\n0 6\n0000000000 65535 f \n{pos1:010d} 00000 n \n{pos2:010d} 00000 n \n{pos3:010d} 00000 n \n{pos4:010d} 00000 n \n{pos5:010d} 00000 n \n".encode("latin-1")
        trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1")
        return header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer

    return _generator

