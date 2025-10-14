"""Health check endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from jsa.db import get_stats_sync

router = APIRouter()


class ComponentStatus(BaseModel):
    """Individual component health status."""

    name: str
    status: str  # healthy, degraded, unhealthy
    message: str | None = None


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str  # healthy, degraded, unhealthy
    timestamp: datetime
    version: str
    total_jobs: int
    high_score_jobs: int
    recent_jobs_24h: int
    components: list[ComponentStatus]


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns system health status and database statistics.
    Includes detailed component health for monitoring.
    """
    components = []
    overall_status = "healthy"

    # Check database
    try:
        stats = get_stats_sync()
        components.append(
            ComponentStatus(name="database", status="healthy", message="Database accessible")
        )
        db_stats = stats
    except Exception as e:
        components.append(
            ComponentStatus(name="database", status="unhealthy", message=f"Database error: {e}")
        )
        overall_status = "unhealthy"
        db_stats = {}

    # Check file system (data directory)
    try:
        import os
        from pathlib import Path

        data_dir = Path("data")
        if data_dir.exists() and os.access(data_dir, os.W_OK):
            components.append(
                ComponentStatus(
                    name="filesystem", status="healthy", message="Data directory writable"
                )
            )
        else:
            components.append(
                ComponentStatus(
                    name="filesystem", status="degraded", message="Data directory not writable"
                )
            )
            overall_status = "degraded" if overall_status == "healthy" else overall_status
    except Exception as e:
        components.append(
            ComponentStatus(
                name="filesystem", status="degraded", message=f"Filesystem check failed: {e}"
            )
        )
        overall_status = "degraded" if overall_status == "healthy" else overall_status

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(UTC),
        version="0.9.0",
        total_jobs=db_stats.get("total_jobs", 0),
        high_score_jobs=db_stats.get("high_score_jobs", 0),
        recent_jobs_24h=db_stats.get("recent_jobs_24h", 0),
        components=components,
    )


@router.get("/ping")
async def ping() -> dict[str, str]:
    """Simple ping endpoint."""
    return {"status": "pong"}
