"""Database session management with SQLAlchemy 2.x."""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings
from app.core.logging import logger

# Helper to normalize PostgreSQL URLs to use psycopg v3 driver if not explicitly specified
def _normalize_db_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


db_url = _normalize_db_url(settings.DATABASE_URL)
analytics_url = _normalize_db_url(settings.ANALYTICS_DATABASE_URL)

# Construct database engines
# Check if running SQLite for dev/test or PostgreSQL for production
is_sqlite = db_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Analytics engine for read-only SQL tool
analytics_connect_args = {"check_same_thread": False} if analytics_url.startswith("sqlite") else {}
analytics_engine = create_engine(
    analytics_url,
    connect_args=analytics_connect_args,
    pool_pre_ping=True,
)

AnalyticsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=analytics_engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a standard application database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_analytics_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a restricted analytics database session."""
    db = AnalyticsSessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> bool:
    """Verifies that the database connection is live."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return False

