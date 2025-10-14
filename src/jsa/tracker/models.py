"""
Data models for job tracking and CRM.

Supports Kanban-style workflow management with contacts, documents, and activity timeline.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class JobStatus(str, Enum):
    """Status stages for job applications."""

    BOOKMARKED = "bookmarked"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class TrackedJob(SQLModel, table=True):
    """
    Job in user's tracker.

    Links to existing jobs table and adds tracking metadata.
    """

    __tablename__ = "tracked_jobs"

    id: int | None = Field(default=None, primary_key=True)
    job_id: int = Field(index=True)  # References jobs.id but FK constraint optional for flexibility
    status: JobStatus = Field(default=JobStatus.BOOKMARKED, index=True)
    priority: int = Field(default=3, ge=0, le=5)  # 0-5 stars (0=none, 5=critical)
    notes: str = Field(default="")

    # Metadata
    added_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    applied_at: datetime | None = None
    interview_at: datetime | None = None


class Contact(SQLModel, table=True):
    """
    Contact person for a job (recruiter, hiring manager, employee).
    """

    __tablename__ = "contacts"

    id: int | None = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id", index=True)

    name: str
    email: str | None = None
    phone: str | None = None
    role: str = Field(default="recruiter")  # recruiter, hiring_manager, employee, other
    linkedin_url: str | None = None
    notes: str = Field(default="")

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Document(SQLModel, table=True):
    """
    Attached document for a job (resume, cover letter, offer letter).
    """

    __tablename__ = "documents"

    id: int | None = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id", index=True)

    filename: str
    doc_type: str  # resume, cover_letter, offer, other
    file_path: str  # Relative path in user's data directory
    file_size: int = Field(default=0)  # Size in bytes

    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Activity(SQLModel, table=True):
    """
    Timeline activity for a job (email sent, interview scheduled, etc).
    """

    __tablename__ = "activities"

    id: int | None = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="tracked_jobs.id", index=True)

    activity_type: str  # email_sent, interview_scheduled, offer_received, status_changed, etc.
    description: str
    extra_data: str = Field(default="{}")  # JSON metadata for extensibility

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
