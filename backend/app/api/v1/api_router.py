"""API Router v1 aggregator."""

from fastapi import APIRouter
from app.api.v1.endpoints import health, documents, chat, analytics

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(analytics.router)
