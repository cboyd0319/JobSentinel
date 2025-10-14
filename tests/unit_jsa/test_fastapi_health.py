"""Tests for FastAPI health endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from jsa.fastapi_app.app import create_app
from jsa.fastapi_app.routers.health import ComponentStatus, HealthResponse


@pytest.fixture
def client() -> TestClient:
    """Create test client."""
    app = create_app()
    return TestClient(app)


@pytest.fixture
def mock_db_stats():
    """Mock database statistics."""
    return {
        "total_jobs": 150,
        "high_score_jobs": 25,
        "recent_jobs_24h": 10,
    }


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_check_success(self, client: TestClient, mock_db_stats: dict):
        """Test health check with healthy system."""
        with patch("jsa.fastapi_app.routers.health.get_stats_sync", return_value=mock_db_stats):
            response = client.get("/api/v1/health")

            assert response.status_code == 200
            data = response.json()

            # Check top-level fields
            assert data["status"] == "healthy"
            assert data["version"] == "0.6.0"
            assert "timestamp" in data

            # Check database stats
            assert data["total_jobs"] == 150
            assert data["high_score_jobs"] == 25
            assert data["recent_jobs_24h"] == 10

            # Check components
            assert len(data["components"]) == 2

            # Database component
            db_component = next(c for c in data["components"] if c["name"] == "database")
            assert db_component["status"] == "healthy"
            assert "accessible" in db_component["message"].lower()

            # Filesystem component
            fs_component = next(c for c in data["components"] if c["name"] == "filesystem")
            assert fs_component["status"] in ["healthy", "degraded"]

    def test_health_check_database_error(self, client: TestClient):
        """Test health check when database is unavailable."""
        with patch(
            "jsa.fastapi_app.routers.health.get_stats_sync",
            side_effect=Exception("Database connection failed"),
        ):
            response = client.get("/api/v1/health")

            assert response.status_code == 200  # Health endpoint should always return 200
            data = response.json()

            assert data["status"] == "unhealthy"
            assert data["total_jobs"] == 0
            assert data["high_score_jobs"] == 0
            assert data["recent_jobs_24h"] == 0

            # Check database component
            db_component = next(c for c in data["components"] if c["name"] == "database")
            assert db_component["status"] == "unhealthy"
            assert "error" in db_component["message"].lower()

    def test_health_check_filesystem_not_writable(self, client: TestClient, mock_db_stats: dict):
        """Test health check when filesystem is not writable."""
        with (
            patch("jsa.fastapi_app.routers.health.get_stats_sync", return_value=mock_db_stats),
            patch("os.access", return_value=False),
        ):
            response = client.get("/api/v1/health")

            assert response.status_code == 200
            data = response.json()

            # Should be degraded, not unhealthy
            assert data["status"] == "degraded"

            # Filesystem component should be degraded
            fs_component = next(c for c in data["components"] if c["name"] == "filesystem")
            assert fs_component["status"] == "degraded"

    def test_health_check_response_model(self):
        """Test HealthResponse model validation."""
        response = HealthResponse(
            status="healthy",
            timestamp=datetime.now(UTC),
            version="0.6.0",
            total_jobs=100,
            high_score_jobs=20,
            recent_jobs_24h=5,
            components=[
                ComponentStatus(name="database", status="healthy", message="OK"),
                ComponentStatus(name="filesystem", status="healthy", message="OK"),
            ],
        )

        assert response.status == "healthy"
        assert response.version == "0.6.0"
        assert response.total_jobs == 100
        assert len(response.components) == 2


class TestPingEndpoint:
    """Tests for /ping endpoint."""

    def test_ping_success(self, client: TestClient):
        """Test ping endpoint returns pong."""
        response = client.get("/api/v1/ping")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pong"

    def test_ping_no_database_required(self, client: TestClient):
        """Test ping works even if database is down."""
        # Ping should not touch database at all
        response = client.get("/api/v1/ping")

        assert response.status_code == 200
        assert response.json() == {"status": "pong"}


class TestComponentStatus:
    """Tests for ComponentStatus model."""

    def test_component_status_all_fields(self):
        """Test ComponentStatus with all fields."""
        component = ComponentStatus(
            name="database",
            status="healthy",
            message="Database is accessible",
        )

        assert component.name == "database"
        assert component.status == "healthy"
        assert component.message == "Database is accessible"

    def test_component_status_optional_message(self):
        """Test ComponentStatus with optional message."""
        component = ComponentStatus(name="cache", status="healthy")

        assert component.name == "cache"
        assert component.status == "healthy"
        assert component.message is None

    def test_component_status_serialization(self):
        """Test ComponentStatus JSON serialization."""
        component = ComponentStatus(
            name="database",
            status="degraded",
            message="High latency",
        )

        data = component.model_dump()
        assert data == {
            "name": "database",
            "status": "degraded",
            "message": "High latency",
        }
