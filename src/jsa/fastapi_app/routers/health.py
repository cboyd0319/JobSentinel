"""Health check endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from jsa.db import get_stats_sync

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    timestamp: datetime
    total_jobs: int
    high_score_jobs: int
    recent_jobs_24h: int


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns system health status and database statistics.
    """
    try:
        stats = get_stats_sync()
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now(timezone.utc),
            total_jobs=stats.get("total_jobs", 0),
            high_score_jobs=stats.get("high_score_jobs", 0),
            recent_jobs_24h=stats.get("recent_jobs_24h", 0),
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            timestamp=datetime.now(timezone.utc),
            total_jobs=0,
            high_score_jobs=0,
            recent_jobs_24h=0,
        )


@router.get("/ping")
async def ping() -> dict[str, str]:
    """Simple ping endpoint."""
    return {"status": "pong"}
