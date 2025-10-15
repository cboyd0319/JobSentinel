"""
Tests for tracker API endpoints.
"""

import pytest
from flask import Flask
from sqlmodel import Session, create_engine

from jsa.db import override_database_url_for_testing
from jsa.tracker.models import JobStatus
from jsa.tracker.service import TrackerService
from jsa.web.app import create_app
from jsa.web.blueprints.api.auth import create_api_key


@pytest.fixture
def app():
    """Create test Flask app."""
    # Use in-memory database for testing
    override_database_url_for_testing("sqlite+aiosqlite:///:memory:")

    app = create_app()
    app.config["TESTING"] = True

    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def api_key(app):
    """Create test API key."""
    from jsa.db import get_session_context

    with get_session_context() as session:
        key = create_api_key(session, "Test Key")
        return key.key


def test_list_tracked_jobs_requires_auth(client):
    """Test that API requires authentication."""
    response = client.get("/api/v1/tracker/jobs")

    assert response.status_code == 401
    data = response.get_json()
    assert "API key required" in data["error"]


def test_list_tracked_jobs_empty(client, api_key):
    """Test listing tracked jobs when empty."""
    response = client.get("/api/v1/tracker/jobs", headers={"X-API-Key": api_key})

    assert response.status_code == 200
    data = response.get_json()
    assert "jobs" in data
    assert isinstance(data["jobs"], list)


def test_add_tracked_job(client, api_key):
    """Test adding job to tracker via API."""
    response = client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 1, "status": "bookmarked", "priority": 4, "notes": "Great fit"},
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["job_id"] == 1
    assert data["status"] == "bookmarked"
    assert data["priority"] == 4


def test_add_tracked_job_missing_job_id(client, api_key):
    """Test adding job without job_id."""
    response = client.post(
        "/api/v1/tracker/jobs", json={"status": "bookmarked"}, headers={"X-API-Key": api_key}
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "job_id is required" in data["error"]


def test_add_tracked_job_invalid_status(client, api_key):
    """Test adding job with invalid status."""
    response = client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 1, "status": "invalid_status"},
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid status" in data["error"]


def test_update_tracked_job_status(client, api_key):
    """Test updating job status via API."""
    # First add a job
    add_response = client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 1, "status": "bookmarked"},
        headers={"X-API-Key": api_key},
    )
    tracked_job_id = add_response.get_json()["id"]

    # Update status
    response = client.patch(
        f"/api/v1/tracker/jobs/{tracked_job_id}/status",
        json={"status": "applied"},
        headers={"X-API-Key": api_key},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "applied"


def test_filter_by_status(client, api_key):
    """Test filtering tracked jobs by status."""
    # Add multiple jobs
    client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 1, "status": "bookmarked"},
        headers={"X-API-Key": api_key},
    )
    client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 2, "status": "applied"},
        headers={"X-API-Key": api_key},
    )
    client.post(
        "/api/v1/tracker/jobs",
        json={"job_id": 3, "status": "applied"},
        headers={"X-API-Key": api_key},
    )

    # Filter by applied status
    response = client.get("/api/v1/tracker/jobs?status=applied", headers={"X-API-Key": api_key})

    assert response.status_code == 200
    data = response.get_json()
    assert len(data["jobs"]) == 2
    assert all(j["status"] == "applied" for j in data["jobs"])
