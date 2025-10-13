"""Application tracker endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import select

from jsa.db import get_session_context
from jsa.tracker.models import JobStatus, TrackedJob

router = APIRouter()


class ApplicationCreate(BaseModel):
    """Application creation request."""

    job_id: int = Field(..., gt=0)
    status: JobStatus = Field(default=JobStatus.BOOKMARKED)
    notes: str = Field(default="", max_length=10000)
    priority: int = Field(default=3, ge=0, le=5)
    applied_at: datetime | None = None
    interview_at: datetime | None = None


class ApplicationUpdate(BaseModel):
    """Application update request."""

    status: JobStatus | None = None
    notes: str | None = Field(None, max_length=10000)
    priority: int | None = Field(None, ge=0, le=5)
    applied_at: datetime | None = None
    interview_at: datetime | None = None


class ApplicationResponse(BaseModel):
    """Application response model."""

    id: int
    job_id: int
    status: JobStatus
    notes: str
    priority: int
    applied_at: datetime | None
    interview_at: datetime | None
    added_at: datetime
    updated_at: datetime


@router.get("/tracker/applications", response_model=list[ApplicationResponse])
async def list_applications(
    status: JobStatus | None = Query(None, description="Filter by status"),  # noqa: B008
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),  # noqa: B008
) -> list[ApplicationResponse]:
    """List job applications with optional status filter."""
    with get_session_context() as session:
        statement = select(TrackedJob)

        if status:
            statement = statement.where(TrackedJob.status == status)

        statement = statement.limit(limit)
        applications = session.exec(statement).all()

        return [
            ApplicationResponse(
                id=app.id,
                job_id=app.job_id,
                status=app.status,
                notes=app.notes,
                priority=app.priority,
                applied_at=app.applied_at,
                interview_at=app.interview_at,
                added_at=app.added_at,
                updated_at=app.updated_at,
            )
            for app in applications
        ]


@router.get("/tracker/applications/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: int) -> ApplicationResponse:
    """Get a single application by ID."""
    with get_session_context() as session:
        app = session.get(TrackedJob, app_id)

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        return ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            status=app.status,
            notes=app.notes,
            priority=app.priority,
            applied_at=app.applied_at,
            interview_at=app.interview_at,
            added_at=app.added_at,
            updated_at=app.updated_at,
        )


@router.post("/tracker/applications", response_model=ApplicationResponse, status_code=201)
async def create_application(app_data: ApplicationCreate) -> ApplicationResponse:
    """Create a new application entry."""
    try:
        with get_session_context() as session:
            application = TrackedJob(
                job_id=app_data.job_id,
                status=app_data.status,
                notes=app_data.notes,
                priority=app_data.priority,
                applied_at=app_data.applied_at,
                interview_at=app_data.interview_at,
            )

            session.add(application)
            session.commit()
            session.refresh(application)

            return ApplicationResponse(
                id=application.id,
                job_id=application.job_id,
                status=application.status,
                notes=application.notes,
                priority=application.priority,
                applied_at=application.applied_at,
                interview_at=application.interview_at,
                added_at=application.added_at,
                updated_at=application.updated_at,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")


@router.patch("/tracker/applications/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: int, app_data: ApplicationUpdate) -> ApplicationResponse:
    """Update an existing application."""
    with get_session_context() as session:
        app = session.get(TrackedJob, app_id)

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        # Update fields
        if app_data.status is not None:
            app.status = app_data.status
        if app_data.notes is not None:
            app.notes = app_data.notes
        if app_data.priority is not None:
            app.priority = app_data.priority
        if app_data.applied_at is not None:
            app.applied_at = app_data.applied_at
        if app_data.interview_at is not None:
            app.interview_at = app_data.interview_at

        app.updated_at = datetime.now()

        session.add(app)
        session.commit()
        session.refresh(app)

        return ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            status=app.status,
            notes=app.notes,
            priority=app.priority,
            applied_at=app.applied_at,
            interview_at=app.interview_at,
            added_at=app.added_at,
            updated_at=app.updated_at,
        )


@router.delete("/tracker/applications/{app_id}", status_code=204)
async def delete_application(app_id: int):
    """Delete an application by ID."""
    with get_session_context() as session:
        app = session.get(TrackedJob, app_id)

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        session.delete(app)
        session.commit()
