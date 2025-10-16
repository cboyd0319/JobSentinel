"""Comprehensive tests for budget alerter Cloud Function.

Tests budget alert event handling and scheduler job pausing.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

import base64
import json
from unittest.mock import MagicMock, patch

import pytest

# Import module under test
from functions import budget_alerter


class TestBudgetAlertHandler:
    """Test budget alert event handler."""

    def test_budget_alert_handler_pauses_on_exceeded_budget(self, mocker, capsys):
        """Should pause scheduler when cost exceeds budget."""
        # Arrange
        cost_amount = 100.0
        budget_amount = 90.0
        
        alert_data = {
            "costAmount": cost_amount,
            "budgetAmount": budget_amount
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-123")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        mock_pause.assert_called_once()
        
        captured = capsys.readouterr()
        assert "Processing budget alert event: test-event-123" in captured.out
        assert f"Budget alert details: Cost={cost_amount}, Budget={budget_amount}" in captured.out
        assert "Cost has exceeded budget. Pausing scheduler job." in captured.out

    def test_budget_alert_handler_no_action_within_budget(self, mocker, capsys):
        """Should not pause scheduler when cost is within budget."""
        # Arrange
        cost_amount = 50.0
        budget_amount = 100.0
        
        alert_data = {
            "costAmount": cost_amount,
            "budgetAmount": budget_amount
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-456")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        mock_pause.assert_not_called()
        
        captured = capsys.readouterr()
        assert "Cost is within budget. No action taken." in captured.out

    def test_budget_alert_handler_pauses_on_equal_budget(self, mocker, capsys):
        """Should pause scheduler when cost equals budget."""
        # Arrange
        cost_amount = 100.0
        budget_amount = 100.0
        
        alert_data = {
            "costAmount": cost_amount,
            "budgetAmount": budget_amount
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-789")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        mock_pause.assert_called_once()

    def test_budget_alert_handler_handles_missing_data_key(self, capsys):
        """Should handle gracefully when 'data' key is missing."""
        # Arrange
        event = {}  # Missing 'data' key
        context = MagicMock(event_id="test-event-error")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing expected key" in captured.out

    def test_budget_alert_handler_handles_malformed_json(self, capsys):
        """Should handle gracefully when JSON is malformed."""
        # Arrange
        malformed_json = "not valid json {"
        encoded_data = base64.b64encode(malformed_json.encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-malformed")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        captured = capsys.readouterr()
        assert "An unexpected error occurred" in captured.out

    def test_budget_alert_handler_handles_missing_cost_amount(self, mocker, capsys):
        """Should handle gracefully when costAmount is missing."""
        # Arrange
        alert_data = {
            "budgetAmount": 100.0
            # Missing costAmount
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-missing")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        # Should use default value of 0 for missing costAmount
        mock_pause.assert_not_called()  # 0 < 100, so no pause
        
        captured = capsys.readouterr()
        assert "Cost=0" in captured.out

    def test_budget_alert_handler_handles_missing_budget_amount(self, mocker, capsys):
        """Should handle gracefully when budgetAmount is missing."""
        # Arrange
        alert_data = {
            "costAmount": 50.0
            # Missing budgetAmount
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-missing-budget")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        # Should use default value of 0 for missing budgetAmount
        mock_pause.assert_called_once()  # 50 >= 0, so pause
        
        captured = capsys.readouterr()
        assert "Budget=0" in captured.out

    @pytest.mark.parametrize(
        "cost,budget,should_pause",
        [
            (0, 100, False),
            (50, 100, False),
            (99, 100, False),
            (100, 100, True),
            (101, 100, True),
            (200, 100, True),
        ],
        ids=["zero-cost", "half-budget", "just-under", "equal", "just-over", "double"]
    )
    def test_budget_alert_handler_threshold_logic(
        self, cost, budget, should_pause, mocker, capsys
    ):
        """Should apply correct threshold logic for various cost/budget scenarios."""
        # Arrange
        alert_data = {
            "costAmount": cost,
            "budgetAmount": budget
        }
        
        encoded_data = base64.b64encode(json.dumps(alert_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id=f"test-{cost}-{budget}")
        
        mock_pause = mocker.patch("functions.budget_alerter._pause_scheduler_job")
        
        # Act
        budget_alerter.budget_alert_handler(event, context)
        
        # Assert
        if should_pause:
            mock_pause.assert_called_once()
        else:
            mock_pause.assert_not_called()


class TestPauseSchedulerJob:
    """Test scheduler job pausing functionality."""

    def test_pause_scheduler_job_success(self, mocker, monkeypatch, capsys):
        """Should successfully pause scheduler job with correct parameters."""
        # Arrange
        project_id = "test-project-123"
        location = "us-central1"
        job_id = "job-scraper-schedule"
        
        monkeypatch.setenv("GCP_PROJECT", project_id)
        monkeypatch.setenv("SCHEDULER_LOCATION", location)
        monkeypatch.setenv("SCHEDULER_JOB_ID", job_id)
        
        mock_client = MagicMock()
        mock_client.pause_job = MagicMock()
        
        mocker.patch(
            "functions.budget_alerter.scheduler_v1.CloudSchedulerClient",
            return_value=mock_client
        )
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        expected_job_name = f"projects/{project_id}/locations/{location}/jobs/{job_id}"
        mock_client.pause_job.assert_called_once_with(name=expected_job_name)
        
        captured = capsys.readouterr()
        assert f"Successfully paused scheduler job: {expected_job_name}" in captured.out

    def test_pause_scheduler_job_missing_env_vars(self, monkeypatch, capsys):
        """Should handle missing environment variables gracefully."""
        # Arrange - no env vars set
        monkeypatch.delenv("GCP_PROJECT", raising=False)
        monkeypatch.delenv("SCHEDULER_LOCATION", raising=False)
        monkeypatch.delenv("SCHEDULER_JOB_ID", raising=False)
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables for scheduler job." in captured.out

    def test_pause_scheduler_job_missing_project_id(self, monkeypatch, capsys):
        """Should handle missing GCP_PROJECT environment variable."""
        # Arrange
        monkeypatch.delenv("GCP_PROJECT", raising=False)
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "job-id")
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_missing_location(self, monkeypatch, capsys):
        """Should handle missing SCHEDULER_LOCATION environment variable."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.delenv("SCHEDULER_LOCATION", raising=False)
        monkeypatch.setenv("SCHEDULER_JOB_ID", "job-id")
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_missing_job_id(self, monkeypatch, capsys):
        """Should handle missing SCHEDULER_JOB_ID environment variable."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.delenv("SCHEDULER_JOB_ID", raising=False)
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_handles_api_error(self, mocker, monkeypatch, capsys):
        """Should handle API errors gracefully."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "job-id")
        
        mock_client = MagicMock()
        mock_client.pause_job.side_effect = Exception("API Error: Permission denied")
        
        mocker.patch(
            "functions.budget_alerter.scheduler_v1.CloudSchedulerClient",
            return_value=mock_client
        )
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        captured = capsys.readouterr()
        assert "Error pausing scheduler job: API Error: Permission denied" in captured.out

    def test_pause_scheduler_job_constructs_correct_job_name(self, mocker, monkeypatch, capsys):
        """Should construct job name in correct GCP resource format."""
        # Arrange
        project_id = "my-gcp-project"
        location = "europe-west1"
        job_id = "custom-job-name"
        
        monkeypatch.setenv("GCP_PROJECT", project_id)
        monkeypatch.setenv("SCHEDULER_LOCATION", location)
        monkeypatch.setenv("SCHEDULER_JOB_ID", job_id)
        
        mock_client = MagicMock()
        
        mocker.patch(
            "functions.budget_alerter.scheduler_v1.CloudSchedulerClient",
            return_value=mock_client
        )
        
        # Act
        budget_alerter._pause_scheduler_job()
        
        # Assert
        call_args = mock_client.pause_job.call_args
        job_name = call_args[1]["name"]
        
        # Verify format: projects/{project}/locations/{location}/jobs/{job}
        assert job_name.startswith("projects/")
        assert f"/{project_id}/locations/" in job_name
        assert f"/{location}/jobs/" in job_name
        assert job_name.endswith(f"/{job_id}")
