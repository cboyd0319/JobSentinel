"""Job management endpoints."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import select

from jsa.db import Job, get_session_context

router = APIRouter()


class JobCreate(BaseModel):
    """Job creation request."""

    title: str = Field(..., min_length=1, max_length=500)
    company: str = Field(..., min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)
    url: str = Field(..., min_length=1, max_length=2000)
    description: str = Field(default="", max_length=50000)
    source: str = Field(default="manual", max_length=50)
    score: float = Field(default=0.0, ge=0.0, le=100.0)
    remote: bool = Field(default=False)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", max_length=3)


class JobResponse(BaseModel):
    """Job response model."""

    id: int
    title: str
    company: str
    location: str
    url: str
    description: str
    source: str
    score: float
    remote: bool
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str


class JobListResponse(BaseModel):
    """Job list response with pagination."""

    jobs: list[JobResponse]
    total: int
    page: int
    per_page: int
    pages: int


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Results per page"),
    source: str | None = Query(None, description="Filter by job source"),
    min_score: float | None = Query(None, ge=0.0, le=100.0, description="Minimum score"),
    remote: bool | None = Query(None, description="Filter by remote jobs"),
) -> JobListResponse:
    """
    List jobs with pagination and filtering.

    Supports filtering by source, minimum score, and remote status.
    """
    with get_session_context() as session:
        statement = select(Job)

        # Apply filters
        if source:
            statement = statement.where(Job.source == source)
        if min_score is not None:
            statement = statement.where(Job.score >= min_score)
        if remote is not None:
            statement = statement.where(Job.remote == remote)

        # Count total
        count_statement = statement
        total = len(session.exec(count_statement).all())

        # Apply pagination
        statement = statement.limit(per_page).offset((page - 1) * per_page)
        jobs = session.exec(statement).all()

        return JobListResponse(
            jobs=[
                JobResponse(
                    id=job.id,
                    title=job.title,
                    company=job.company,
                    location=job.location,
                    url=job.url,
                    description=job.description,
                    source=job.source,
                    score=job.score,
                    remote=job.remote,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    currency=job.currency,
                )
                for job in jobs
            ],
            total=total,
            page=page,
            per_page=per_page,
            pages=(total + per_page - 1) // per_page if total > 0 else 0,
        )


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: int) -> JobResponse:
    """Get a single job by ID."""
    with get_session_context() as session:
        job = session.get(Job, job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        return JobResponse(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            url=job.url,
            description=job.description,
            source=job.source,
            score=job.score,
            remote=job.remote,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            currency=job.currency,
        )


@router.post("/jobs", response_model=JobResponse, status_code=201)
async def create_job(job_data: JobCreate) -> JobResponse:
    """
    Create a new job entry.

    Useful for browser extension and manual job tracking.
    """
    try:
        with get_session_context() as session:
            job = Job(
                title=job_data.title,
                company=job_data.company,
                location=job_data.location,
                url=job_data.url,
                description=job_data.description,
                source=job_data.source,
                score=job_data.score,
                remote=job_data.remote,
                salary_min=job_data.salary_min,
                salary_max=job_data.salary_max,
                currency=job_data.currency,
            )

            session.add(job)
            session.commit()
            session.refresh(job)

            return JobResponse(
                id=job.id,
                title=job.title,
                company=job.company,
                location=job.location,
                url=job.url,
                description=job.description,
                source=job.source,
                score=job.score,
                remote=job.remote,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                currency=job.currency,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: int) -> None:
    """Delete a job by ID."""
    with get_session_context() as session:
        job = session.get(Job, job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        session.delete(job)
        session.commit()
