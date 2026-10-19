"""Health check API endpoints."""

from fastapi import APIRouter, status
from app.config import settings
from app.schemas.common import HealthCheckResponse
from app.db.session import check_db_health

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Check",
    description="Returns service status, version, environment, and database connectivity.",
)
def get_health() -> HealthCheckResponse:
    db_healthy = check_db_health()
    db_status = "connected" if db_healthy else "disconnected"
    overall_status = "healthy" if db_healthy else "degraded"

    return HealthCheckResponse(
        status=overall_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        details={
            "llm_provider": settings.LLM_PROVIDER,
            "embedding_provider": settings.EMBEDDING_PROVIDER,
            "chunk_size": settings.CHUNK_SIZE,
            "chunk_overlap": settings.CHUNK_OVERLAP,
        },
    )

