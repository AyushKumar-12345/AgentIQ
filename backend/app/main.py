"""AgentIQ FastAPI Application Entrypoint."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logging import setup_logging, logger
from app.core.exceptions import AgentIQException
from app.api.v1.api_router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Verified upload storage at: {settings.UPLOAD_DIR}")
    
    yield
    
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


def create_app() -> FastAPI:
    """Factory function for FastAPI application initialization."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="AgentIQ — Agentic Enterprise Knowledge Assistant API",
        openapi_url="/api/v1/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global Domain Exception Handler
    @app.exception_handler(AgentIQException)
    async def agentiq_exception_handler(request: Request, exc: AgentIQException):
        logger.error(f"AgentIQ Exception on {request.url.path}: {exc.message} | Details: {exc.details}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
            },
        )

    # Mount API routers
    app.include_router(api_router, prefix="/api/v1")

    # Root redirect / ping
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.ENVIRONMENT == "development",
    )
