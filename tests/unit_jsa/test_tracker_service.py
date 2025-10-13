"""
Tests for job tracker service.
"""

import pytest
from sqlmodel import Session, SQLModel, create_engine

from jsa.tracker.models import Activity, Contact, Document, JobStatus, TrackedJob
from jsa.tracker.service import TrackerService


@pytest.fixture
def session():
    """Create test database session."""
    engine = create_engine("sqlite:///:memory:")
    
    # Import all models to ensure tables are created
    # Note: This simulates having the Job model, we'll use job_id without FK for testing
    from jsa.tracker import models as tracker_models
    
    # Create tables
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session


def test_add_job(session):
    """Test adding job to tracker."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    
    assert tracked_job.id is not None
    assert tracked_job.status == JobStatus.BOOKMARKED
    assert tracked_job.job_id == 1
    assert tracked_job.priority == 3


def test_add_job_with_custom_status(session):
    """Test adding job with custom status."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(
        job_id=1,
        status=JobStatus.APPLIED,
        priority=5,
        notes="Great opportunity"
    )
    
    assert tracked_job.status == JobStatus.APPLIED
    assert tracked_job.priority == 5
    assert tracked_job.notes == "Great opportunity"


def test_update_status(session):
    """Test updating job status."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    updated = service.update_status(tracked_job.id, JobStatus.APPLIED)
    
    assert updated.status == JobStatus.APPLIED
    assert updated.applied_at is not None


def test_update_status_not_found(session):
    """Test updating status for non-existent job."""
    service = TrackerService(session)
    
    with pytest.raises(ValueError, match="not found"):
        service.update_status(999, JobStatus.APPLIED)


def test_update_priority(session):
    """Test updating job priority."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1, priority=3)
    updated = service.update_priority(tracked_job.id, 5)
    
    assert updated.priority == 5


def test_update_priority_invalid(session):
    """Test updating priority with invalid value."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    
    with pytest.raises(ValueError, match="between 0 and 5"):
        service.update_priority(tracked_job.id, 10)


def test_update_notes(session):
    """Test updating job notes."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    updated = service.update_notes(tracked_job.id, "New notes")
    
    assert updated.notes == "New notes"


def test_get_by_status(session):
    """Test filtering jobs by status."""
    service = TrackerService(session)
    
    service.add_job(job_id=1, status=JobStatus.BOOKMARKED)
    service.add_job(job_id=2, status=JobStatus.APPLIED)
    service.add_job(job_id=3, status=JobStatus.APPLIED)
    
    applied_jobs = service.get_by_status(JobStatus.APPLIED)
    
    assert len(applied_jobs) == 2
    assert all(j.status == JobStatus.APPLIED for j in applied_jobs)


def test_get_all(session):
    """Test getting all tracked jobs."""
    service = TrackerService(session)
    
    service.add_job(job_id=1)
    service.add_job(job_id=2)
    service.add_job(job_id=3)
    
    all_jobs = service.get_all()
    
    assert len(all_jobs) == 3


def test_get_by_id(session):
    """Test getting job by ID."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    retrieved = service.get_by_id(tracked_job.id)
    
    assert retrieved is not None
    assert retrieved.id == tracked_job.id
    assert retrieved.job_id == 1


def test_get_by_id_not_found(session):
    """Test getting non-existent job."""
    service = TrackerService(session)
    
    retrieved = service.get_by_id(999)
    
    assert retrieved is None


def test_add_contact(session):
    """Test adding contact to job."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    contact = service.add_contact(
        job_id=tracked_job.id,
        name="Jane Smith",
        email="jane@example.com",
        role="recruiter"
    )
    
    assert contact.id is not None
    assert contact.name == "Jane Smith"
    assert contact.email == "jane@example.com"
    assert contact.role == "recruiter"


def test_add_document(session):
    """Test adding document to job."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    document = service.add_document(
        job_id=tracked_job.id,
        filename="resume.pdf",
        doc_type="resume",
        file_path="/data/resume.pdf",
        file_size=12345
    )
    
    assert document.id is not None
    assert document.filename == "resume.pdf"
    assert document.doc_type == "resume"
    assert document.file_size == 12345


def test_get_activities(session):
    """Test getting activity timeline."""
    service = TrackerService(session)
    
    tracked_job = service.add_job(job_id=1)
    service.update_status(tracked_job.id, JobStatus.APPLIED)
    
    activities = service.get_activities(tracked_job.id)
    
    # Should have 2 activities: job_added and status_changed
    assert len(activities) >= 2
    assert any(a.activity_type == "job_added" for a in activities)
    assert any(a.activity_type == "status_changed" for a in activities)


def test_export_to_csv(session):
    """Test CSV export functionality."""
    service = TrackerService(session)
    
    service.add_job(job_id=1, status=JobStatus.BOOKMARKED, priority=4)
    service.add_job(job_id=2, status=JobStatus.APPLIED, priority=5)
    
    csv_data = service.export_to_csv()
    
    assert "ID,Job ID,Status,Priority" in csv_data
    assert "bookmarked" in csv_data
    assert "applied" in csv_data


def test_export_to_json(session):
    """Test JSON export functionality."""
    import json
    
    service = TrackerService(session)
    
    service.add_job(job_id=1, status=JobStatus.BOOKMARKED, priority=4)
    service.add_job(job_id=2, status=JobStatus.APPLIED, priority=5)
    
    json_data = service.export_to_json()
    data = json.loads(json_data)
    
    assert len(data) == 2
    # Check that we have both jobs (order may vary)
    job_ids = [item["job_id"] for item in data]
    assert 1 in job_ids
    assert 2 in job_ids
    statuses = [item["status"] for item in data]
    assert "bookmarked" in statuses
    assert "applied" in statuses
