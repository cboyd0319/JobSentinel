"""
Job Tracker / CRM module for managing job applications.

Provides Kanban-style tracking of job applications through stages:
Bookmarked → Applied → Interviewing → Offer → Rejected/Withdrawn
"""

from jsa.tracker.models import Activity, Contact, Document, JobStatus, TrackedJob
from jsa.tracker.service import TrackerService

__all__ = [
    "TrackedJob",
    "JobStatus",
    "Contact",
    "Document",
    "Activity",
    "TrackerService",
]
