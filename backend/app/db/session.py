"""Database session management with SQLAlchemy 2.x."""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings
from app.core.logging import logger

# Construct database engines
# Check if running SQLite for dev/test or PostgreSQL for production
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Analytics engine for read-only SQL tool
analytics_connect_args = {"check_same_thread": False} if settings.ANALYTICS_DATABASE_URL.startswith("sqlite") else {}
analytics_engine = create_engine(
    settings.ANALYTICS_DATABASE_URL,
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

