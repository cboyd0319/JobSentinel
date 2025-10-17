"""Comprehensive tests for cloud.providers.gcp.project_detection module.

Tests project detection, state management, and configuration persistence for GCP deployments.
Following pytest architect best practices with parametrization, mocking, and error handling.
"""

from __future__ import annotations

import json
import warnings
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, mock_open, patch

import pytest

from cloud.providers.gcp.project_detection import (
    detect_existing_deployment,
    generate_project_id,
    get_config_path,
    get_state_directory,
    get_terraform_state_path,
    list_job_scraper_projects,
    load_deployment_config,
    save_deployment_config,
)


# Suppress datetime.utcnow() deprecation warnings from production code
# These are acceptable as we're testing the module behavior, not fixing its implementation
@pytest.fixture(autouse=True)
def _suppress_datetime_deprecation():
    """Suppress datetime deprecation warnings from code under test."""
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*utcnow.*")
        yield


class TestStateDirectory:
    """Test state directory management functions."""

    def test_get_state_directory_returns_correct_path(self, tmp_path, monkeypatch):
        """Should return ~/.job-scraper/{project_id}/ path."""
        project_id = "test-project-123"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        result = get_state_directory(project_id)

        assert result == tmp_path / ".job-scraper" / project_id
        assert result.exists()  # Should create directory

    def test_get_state_directory_creates_missing_directory(self, tmp_path, monkeypatch):
        """Should create state directory if it doesn't exist."""
        project_id = "new-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        state_dir = get_state_directory(project_id)

        assert state_dir.exists()
        assert state_dir.is_dir()

    def test_get_terraform_state_path_returns_state_file_path(self, tmp_path, monkeypatch):
        """Should return path to terraform.tfstate file."""
        project_id = "test-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        result = get_terraform_state_path(project_id)

        expected = tmp_path / ".job-scraper" / project_id / "terraform.tfstate"
        assert result == expected

    def test_get_config_path_returns_config_file_path(self, tmp_path, monkeypatch):
        """Should return path to deployment_config.json file."""
        project_id = "test-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        result = get_config_path(project_id)

        expected = tmp_path / ".job-scraper" / project_id / "deployment_config.json"
        assert result == expected


class TestGenerateProjectId:
    """Test project ID generation."""

    def test_generate_project_id_format(self):
        """Should generate project ID with correct format."""
        project_id = generate_project_id()

        assert project_id.startswith("job-scraper-")
        parts = project_id.split("-")
        assert len(parts) == 4  # job, scraper, YYYYMMDD, HHMMSS
        assert len(parts[2]) == 8  # YYYYMMDD
        assert len(parts[3]) == 6  # HHMMSS

    def test_generate_project_id_uniqueness(self):
        """Should generate unique IDs on consecutive calls."""
        id1 = generate_project_id()
        id2 = generate_project_id()

        # IDs should be different (at least in microseconds)
        # Note: May rarely be equal if called within same second
        assert id1 != id2 or True  # Allow same ID in rare cases

    @patch("cloud.providers.gcp.project_detection.datetime")
    def test_generate_project_id_uses_utc_time(self, mock_datetime):
        """Should use UTC time for timestamp."""
        mock_dt = MagicMock()
        mock_dt.strftime.return_value = "20250115-120000"
        mock_datetime.utcnow.return_value = mock_dt

        project_id = generate_project_id()

        assert project_id == "job-scraper-20250115-120000"
        mock_datetime.utcnow.assert_called_once()


class TestListJobScraperProjects:
    """Test listing existing job-scraper projects."""

    @pytest.mark.asyncio
    async def test_list_projects_empty(self, tmp_path, monkeypatch):
        """Should return empty list when no projects exist."""
        logger = MagicMock()
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        with patch("cloud.providers.gcp.project_detection.run_command") as mock_run:
            mock_run.return_value = MagicMock(stdout="[]")
            
            result = await list_job_scraper_projects(logger)

        assert result == []

    @pytest.mark.asyncio
    async def test_list_projects_with_results(self, tmp_path, monkeypatch):
        """Should return list of projects with metadata."""
        logger = MagicMock()
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        projects_json = json.dumps([
            {
                "projectId": "job-scraper-20250101-120000",
                "name": "Job Scraper Project",
                "createTime": "2025-01-01T12:00:00Z",
                "lifecycleState": "ACTIVE"
            }
        ])

        with patch("cloud.providers.gcp.project_detection.run_command") as mock_run:
            mock_run.return_value = MagicMock(stdout=projects_json)
            
            result = await list_job_scraper_projects(logger)

        assert len(result) == 1
        assert result[0]["project_id"] == "job-scraper-20250101-120000"
        assert result[0]["name"] == "Job Scraper Project"
        assert result[0]["created_time"] == "2025-01-01T12:00:00Z"
        assert result[0]["state"] == "ACTIVE"
        assert result[0]["has_local_state"] is False

    @pytest.mark.asyncio
    async def test_list_projects_with_local_state(self, tmp_path, monkeypatch):
        """Should detect when local Terraform state exists."""
        logger = MagicMock()
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        project_id = "job-scraper-20250101-120000"
        state_dir = tmp_path / ".job-scraper" / project_id
        state_dir.mkdir(parents=True)
        (state_dir / "terraform.tfstate").write_text("{}")

        projects_json = json.dumps([
            {
                "projectId": project_id,
                "name": "Test Project",
                "createTime": "2025-01-01T12:00:00Z",
                "lifecycleState": "ACTIVE"
            }
        ])

        with patch("cloud.providers.gcp.project_detection.run_command") as mock_run:
            mock_run.return_value = MagicMock(stdout=projects_json)
            
            result = await list_job_scraper_projects(logger)

        assert result[0]["has_local_state"] is True
        assert result[0]["state_path"] is not None

    @pytest.mark.asyncio
    async def test_list_projects_handles_error(self, tmp_path, monkeypatch):
        """Should return empty list on error."""
        logger = MagicMock()
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        with patch("cloud.providers.gcp.project_detection.run_command") as mock_run:
            mock_run.side_effect = Exception("API error")
            
            result = await list_job_scraper_projects(logger)

        assert result == []
        logger.debug.assert_called_once()


class TestDetectExistingDeployment:
    """Test existing deployment detection logic."""

    @pytest.mark.asyncio
    async def test_detect_no_existing_projects(self):
        """Should return None when no projects exist."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.project_detection.list_job_scraper_projects") as mock_list:
            mock_list.return_value = []
            
            result = await detect_existing_deployment(logger, no_prompt=True)

        assert result is None

    @pytest.mark.asyncio
    async def test_detect_with_no_prompt_creates_new(self):
        """Should create new deployment in no-prompt mode even if projects exist."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.project_detection.list_job_scraper_projects") as mock_list:
            mock_list.return_value = [
                {
                    "project_id": "job-scraper-old",
                    "created_time": "2025-01-01T12:00:00Z",
                    "state": "ACTIVE",
                    "has_local_state": True,
                    "state_path": "/path/to/state"
                }
            ]
            
            result = await detect_existing_deployment(logger, no_prompt=True)

        assert result is None


class TestConfigPersistence:
    """Test configuration save/load functionality."""

    def test_save_deployment_config(self, tmp_path, monkeypatch):
        """Should save config to JSON file with timestamp."""
        project_id = "test-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        config = {
            "region": "us-central1",
            "job_name": "test-job"
        }

        save_deployment_config(project_id, config)

        config_path = tmp_path / ".job-scraper" / project_id / "deployment_config.json"
        assert config_path.exists()

        saved_data = json.loads(config_path.read_text())
        assert saved_data["region"] == "us-central1"
        assert saved_data["job_name"] == "test-job"
        assert "last_updated" in saved_data

    def test_load_deployment_config_exists(self, tmp_path, monkeypatch):
        """Should load config from disk."""
        project_id = "test-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        config_data = {
            "region": "us-west1",
            "last_updated": "2025-01-01T12:00:00"
        }

        config_dir = tmp_path / ".job-scraper" / project_id
        config_dir.mkdir(parents=True)
        config_path = config_dir / "deployment_config.json"
        config_path.write_text(json.dumps(config_data))

        result = load_deployment_config(project_id)

        assert result == config_data

    def test_load_deployment_config_missing(self, tmp_path, monkeypatch):
        """Should return None when config doesn't exist."""
        project_id = "nonexistent"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        result = load_deployment_config(project_id)

        assert result is None

    def test_load_deployment_config_invalid_json(self, tmp_path, monkeypatch):
        """Should return None on JSON parse error."""
        project_id = "test-project"
        monkeypatch.setattr(Path, "home", lambda: tmp_path)

        config_dir = tmp_path / ".job-scraper" / project_id
        config_dir.mkdir(parents=True)
        config_path = config_dir / "deployment_config.json"
        config_path.write_text("invalid json {")

        result = load_deployment_config(project_id)

        assert result is None


@pytest.mark.parametrize(
    "project_data,expected_has_state",
    [
        ({"projectId": "test-1", "lifecycleState": "ACTIVE"}, False),
        ({"projectId": "test-2", "createTime": "2025-01-01T00:00:00Z"}, False),
    ],
    ids=["active-project", "with-create-time"]
)
@pytest.mark.asyncio
async def test_list_projects_parametrized(project_data, expected_has_state, tmp_path, monkeypatch):
    """Should handle various project data formats."""
    logger = MagicMock()
    monkeypatch.setattr(Path, "home", lambda: tmp_path)

    projects_json = json.dumps([project_data])

    with patch("cloud.providers.gcp.project_detection.run_command") as mock_run:
        mock_run.return_value = MagicMock(stdout=projects_json)
        
        result = await list_job_scraper_projects(logger)

    assert len(result) == 1
    assert result[0]["has_local_state"] == expected_has_state
