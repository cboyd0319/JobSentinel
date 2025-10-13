"""
Business logic for job tracker / CRM.

Handles CRUD operations, status transitions, and activity logging.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime
from io import StringIO
from typing import Optional

from sqlmodel import Session, select

from jsa.tracker.models import Activity, Contact, Document, JobStatus, TrackedJob


class TrackerService:
    """Service layer for job tracking operations."""

    def __init__(self, session: Session):
        """
        Initialize tracker service.

        Args:
            session: SQLModel database session
        """
        self.session = session

    def add_job(
        self,
        job_id: int,
        status: JobStatus = JobStatus.BOOKMARKED,
        priority: int = 3,
        notes: str = "",
    ) -> TrackedJob:
        """
        Add a job to the tracker.

        Args:
            job_id: ID of the job to track
            status: Initial status (default: BOOKMARKED)
            priority: Priority level 0-5 (default: 3)
            notes: Optional notes

        Returns:
            Created TrackedJob instance
        """
        tracked_job = TrackedJob(
            job_id=job_id,
            status=status,
            priority=priority,
            notes=notes,
        )

        self.session.add(tracked_job)
        self.session.commit()
        self.session.refresh(tracked_job)

        # Log activity
        self._add_activity(
            tracked_job.id,
            "job_added",
            f"Added to tracker with status '{status.value}'",
        )

        return tracked_job

    def update_status(
        self, tracked_job_id: int, new_status: JobStatus
    ) -> TrackedJob:
        """
        Update job status and log the change.

        Args:
            tracked_job_id: ID of the tracked job
            new_status: New status to set

        Returns:
            Updated TrackedJob instance

        Raises:
            ValueError: If tracked job not found
        """
        job = self.session.get(TrackedJob, tracked_job_id)
        if not job:
            raise ValueError(f"Tracked job {tracked_job_id} not found")

        old_status = job.status
        job.status = new_status
        job.updated_at = datetime.utcnow()

        # Update timestamp fields based on status
        if new_status == JobStatus.APPLIED and not job.applied_at:
            job.applied_at = datetime.utcnow()
        elif new_status == JobStatus.INTERVIEWING and not job.interview_at:
            job.interview_at = datetime.utcnow()

        self.session.commit()
        self.session.refresh(job)

        # Log activity
        self._add_activity(
            job.id,
            "status_changed",
            f"Status changed from '{old_status.value}' to '{new_status.value}'",
        )

        return job

    def update_priority(self, tracked_job_id: int, priority: int) -> TrackedJob:
        """
        Update job priority.

        Args:
            tracked_job_id: ID of the tracked job
            priority: New priority (0-5)

        Returns:
            Updated TrackedJob instance

        Raises:
            ValueError: If tracked job not found or invalid priority
        """
        if not 0 <= priority <= 5:
            raise ValueError("Priority must be between 0 and 5")

        job = self.session.get(TrackedJob, tracked_job_id)
        if not job:
            raise ValueError(f"Tracked job {tracked_job_id} not found")

        old_priority = job.priority
        job.priority = priority
        job.updated_at = datetime.utcnow()

        self.session.commit()
        self.session.refresh(job)

        # Log activity
        self._add_activity(
            job.id,
            "priority_changed",
            f"Priority changed from {old_priority} to {priority} stars",
        )

        return job

    def update_notes(self, tracked_job_id: int, notes: str) -> TrackedJob:
        """
        Update job notes.

        Args:
            tracked_job_id: ID of the tracked job
            notes: New notes content

        Returns:
            Updated TrackedJob instance

        Raises:
            ValueError: If tracked job not found
        """
        job = self.session.get(TrackedJob, tracked_job_id)
        if not job:
            raise ValueError(f"Tracked job {tracked_job_id} not found")

        job.notes = notes
        job.updated_at = datetime.utcnow()

        self.session.commit()
        self.session.refresh(job)

        return job

    def get_by_status(self, status: JobStatus) -> list[TrackedJob]:
        """
        Get all jobs with a specific status.

        Args:
            status: Status to filter by

        Returns:
            List of TrackedJob instances
        """
        statement = select(TrackedJob).where(TrackedJob.status == status)
        return list(self.session.exec(statement))

    def get_all(self) -> list[TrackedJob]:
        """
        Get all tracked jobs.

        Returns:
            List of all TrackedJob instances
        """
        statement = select(TrackedJob).order_by(TrackedJob.updated_at.desc())
        return list(self.session.exec(statement))

    def get_by_id(self, tracked_job_id: int) -> TrackedJob | None:
        """
        Get a tracked job by ID.

        Args:
            tracked_job_id: ID of the tracked job

        Returns:
            TrackedJob instance or None if not found
        """
        return self.session.get(TrackedJob, tracked_job_id)

    def add_contact(
        self,
        job_id: int,
        name: str,
        email: str | None = None,
        phone: str | None = None,
        role: str = "recruiter",
        linkedin_url: str | None = None,
        notes: str = "",
    ) -> Contact:
        """
        Add a contact to a tracked job.

        Args:
            job_id: ID of the tracked job
            name: Contact name
            email: Contact email
            phone: Contact phone
            role: Contact role (recruiter, hiring_manager, employee, other)
            linkedin_url: LinkedIn profile URL
            notes: Additional notes

        Returns:
            Created Contact instance
        """
        contact = Contact(
            job_id=job_id,
            name=name,
            email=email,
            phone=phone,
            role=role,
            linkedin_url=linkedin_url,
            notes=notes,
        )

        self.session.add(contact)
        self.session.commit()
        self.session.refresh(contact)

        # Log activity
        self._add_activity(
            job_id,
            "contact_added",
            f"Added contact: {name} ({role})",
        )

        return contact

    def add_document(
        self,
        job_id: int,
        filename: str,
        doc_type: str,
        file_path: str,
        file_size: int = 0,
    ) -> Document:
        """
        Add a document to a tracked job.

        Args:
            job_id: ID of the tracked job
            filename: Original filename
            doc_type: Document type (resume, cover_letter, offer, other)
            file_path: Path to stored file
            file_size: File size in bytes

        Returns:
            Created Document instance
        """
        document = Document(
            job_id=job_id,
            filename=filename,
            doc_type=doc_type,
            file_path=file_path,
            file_size=file_size,
        )

        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)

        # Log activity
        self._add_activity(
            job_id,
            "document_added",
            f"Added document: {filename} ({doc_type})",
        )

        return document

    def get_activities(self, job_id: int) -> list[Activity]:
        """
        Get activity timeline for a job.

        Args:
            job_id: ID of the tracked job

        Returns:
            List of Activity instances, newest first
        """
        statement = (
            select(Activity)
            .where(Activity.job_id == job_id)
            .order_by(Activity.created_at.desc())
        )
        return list(self.session.exec(statement))

    def _add_activity(
        self,
        job_id: int,
        activity_type: str,
        description: str,
        extra_data: str = "{}",
    ) -> Activity:
        """
        Internal method to log an activity.

        Args:
            job_id: ID of the tracked job
            activity_type: Type of activity
            description: Activity description
            extra_data: JSON metadata

        Returns:
            Created Activity instance
        """
        activity = Activity(
            job_id=job_id,
            activity_type=activity_type,
            description=description,
            extra_data=extra_data,
        )

        self.session.add(activity)
        self.session.commit()

        return activity

    def export_to_csv(self) -> str:
        """
        Export all tracked jobs to CSV format.

        Returns:
            CSV string with all tracked jobs
        """
        jobs = self.get_all()
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "ID",
            "Job ID",
            "Status",
            "Priority",
            "Notes",
            "Added At",
            "Updated At",
            "Applied At",
            "Interview At",
        ])

        # Data rows
        for job in jobs:
            writer.writerow([
                job.id,
                job.job_id,
                job.status.value,
                job.priority,
                job.notes,
                job.added_at.isoformat(),
                job.updated_at.isoformat(),
                job.applied_at.isoformat() if job.applied_at else "",
                job.interview_at.isoformat() if job.interview_at else "",
            ])

        return output.getvalue()

    def export_to_json(self) -> str:
        """
        Export all tracked jobs to JSON format.

        Returns:
            JSON string with all tracked jobs
        """
        jobs = self.get_all()
        data = []

        for job in jobs:
            data.append({
                "id": job.id,
                "job_id": job.job_id,
                "status": job.status.value,
                "priority": job.priority,
                "notes": job.notes,
                "added_at": job.added_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
                "applied_at": job.applied_at.isoformat() if job.applied_at else None,
                "interview_at": job.interview_at.isoformat() if job.interview_at else None,
            })

        return json.dumps(data, indent=2)
