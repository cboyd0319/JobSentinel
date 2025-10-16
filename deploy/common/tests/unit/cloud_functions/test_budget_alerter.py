"""Comprehensive tests for cloud.common.functions.budget_alerter module.

Tests the budget alert Cloud Function that pauses the scheduler when budget exceeds threshold.
Follows PyTest Architect Agent specifications for comprehensive, maintainable tests.
"""

from __future__ import annotations

import base64
import json
from unittest.mock import MagicMock, patch

import pytest


# Import the module under test
# Note: We need to set up the path so cloud functions can be imported
import sys
from pathlib import Path

# Path from test file: deploy/common/tests/unit/cloud_functions/test_budget_alerter.py
# Navigate up 5 levels to deploy/, then to deploy/cloud/common/functions
CLOUD_COMMON_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "cloud" / "common"
sys.path.insert(0, str(CLOUD_COMMON_DIR / "functions"))

from budget_alerter import _pause_scheduler_job, budget_alert_handler


class TestBudgetAlertHandler:
    """Test the budget_alert_handler entry point."""

    def test_budget_alert_handler_exceeds_budget_triggers_pause(self, mocker, capsys):
        """Budget alert handler should pause scheduler when cost exceeds budget."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": 100, "budgetAmount": 90}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-123")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_called_once()
        captured = capsys.readouterr()
        assert "Processing budget alert event: test-event-123" in captured.out
        assert "Cost=100" in captured.out
        assert "Budget=90" in captured.out
        assert "Cost has exceeded budget" in captured.out

    def test_budget_alert_handler_within_budget_no_pause(self, mocker, capsys):
        """Budget alert handler should not pause when cost is within budget."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": 50, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-456")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_not_called()
        captured = capsys.readouterr()
        assert "Cost is within budget. No action taken." in captured.out

    def test_budget_alert_handler_equal_budget_triggers_pause(self, mocker, capsys):
        """Budget alert handler should pause when cost equals budget (boundary)."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": 100, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-789")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_called_once()

    @pytest.mark.parametrize(
        "cost,budget,should_pause",
        [
            (0, 100, False),  # Zero cost
            (100, 100, True),  # Equal
            (101, 100, True),  # Slightly over
            (200, 100, True),  # Double budget
            (99.99, 100, False),  # Just under
        ],
        ids=["zero_cost", "equal_budget", "slightly_over", "double_budget", "just_under"],
    )
    def test_budget_alert_handler_cost_thresholds(
        self, mocker, capsys, cost, budget, should_pause
    ):
        """Test various cost/budget threshold scenarios."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": cost, "budgetAmount": budget}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-threshold")

        # Act
        budget_alert_handler(event, context)

        # Assert
        if should_pause:
            mock_pause.assert_called_once()
        else:
            mock_pause.assert_not_called()

    def test_budget_alert_handler_missing_cost_amount_uses_default(self, mocker, capsys):
        """Handler should use default 0 for missing costAmount."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"budgetAmount": 100}  # Missing costAmount
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-missing-cost")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_not_called()  # 0 < 100
        captured = capsys.readouterr()
        assert "Cost=0" in captured.out

    def test_budget_alert_handler_missing_budget_amount_uses_default(self, mocker, capsys):
        """Handler should use default 0 for missing budgetAmount."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": 50}  # Missing budgetAmount
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-missing-budget")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_called_once()  # 50 >= 0
        captured = capsys.readouterr()
        assert "Budget=0" in captured.out

    def test_budget_alert_handler_missing_data_key_handles_gracefully(self, capsys):
        """Handler should handle missing 'data' key gracefully."""
        # Arrange
        event = {}  # No 'data' key
        context = MagicMock(event_id="test-no-data")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing expected key" in captured.out or "An unexpected error" in captured.out

    def test_budget_alert_handler_invalid_json_handles_gracefully(self, capsys):
        """Handler should handle invalid JSON gracefully."""
        # Arrange
        encoded_data = base64.b64encode(b"not valid json").decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-invalid-json")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "An unexpected error occurred" in captured.out

    def test_budget_alert_handler_invalid_base64_handles_gracefully(self, capsys):
        """Handler should handle invalid base64 encoding gracefully."""
        # Arrange
        event = {"data": "not-valid-base64!!!"}
        context = MagicMock(event_id="test-invalid-base64")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "An unexpected error occurred" in captured.out


class TestPauseSchedulerJob:
    """Test the _pause_scheduler_job internal function."""

    def test_pause_scheduler_job_success(self, mocker, monkeypatch, capsys):
        """Successfully pause scheduler job with all env vars set."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")

        mock_client = MagicMock()
        mocker.patch("budget_alerter.scheduler_v1.CloudSchedulerClient", return_value=mock_client)

        # Act
        _pause_scheduler_job()

        # Assert
        mock_client.pause_job.assert_called_once_with(
            name="projects/test-project/locations/us-central1/jobs/test-job"
        )
        captured = capsys.readouterr()
        assert "Successfully paused scheduler job" in captured.out

    def test_pause_scheduler_job_missing_project_id(self, monkeypatch, capsys):
        """Should handle missing GCP_PROJECT env var."""
        # Arrange
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")
        # GCP_PROJECT is not set

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_missing_location(self, monkeypatch, capsys):
        """Should handle missing SCHEDULER_LOCATION env var."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")
        # SCHEDULER_LOCATION is not set

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_missing_job_id(self, monkeypatch, capsys):
        """Should handle missing SCHEDULER_JOB_ID env var."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        # SCHEDULER_JOB_ID is not set

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_all_missing(self, capsys):
        """Should handle all env vars missing."""
        # Arrange - no env vars set

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error: Missing required environment variables" in captured.out

    def test_pause_scheduler_job_scheduler_api_error(self, mocker, monkeypatch, capsys):
        """Should handle Cloud Scheduler API errors gracefully."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")

        mock_client = MagicMock()
        mock_client.pause_job.side_effect = Exception("API Error: Permission denied")
        mocker.patch("budget_alerter.scheduler_v1.CloudSchedulerClient", return_value=mock_client)

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error pausing scheduler job" in captured.out
        assert "API Error: Permission denied" in captured.out

    def test_pause_scheduler_job_constructs_correct_job_name(self, mocker, monkeypatch):
        """Verify correct GCP job name format is constructed."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "my-project-123")
        monkeypatch.setenv("SCHEDULER_LOCATION", "europe-west1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "my-scheduled-job")

        mock_client = MagicMock()
        mocker.patch("budget_alerter.scheduler_v1.CloudSchedulerClient", return_value=mock_client)

        # Act
        _pause_scheduler_job()

        # Assert
        expected_name = "projects/my-project-123/locations/europe-west1/jobs/my-scheduled-job"
        mock_client.pause_job.assert_called_once_with(name=expected_name)


class TestIntegration:
    """Integration tests for the full budget alert flow."""

    def test_full_flow_budget_exceeded_pauses_job(self, mocker, monkeypatch, capsys):
        """Full integration: budget alert exceeding budget should pause scheduler."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "integration-test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "integration-job")

        mock_client = MagicMock()
        mocker.patch("budget_alerter.scheduler_v1.CloudSchedulerClient", return_value=mock_client)

        event_data = {"costAmount": 150, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="integration-test")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_client.pause_job.assert_called_once()
        captured = capsys.readouterr()
        assert "Cost has exceeded budget" in captured.out
        assert "Successfully paused scheduler job" in captured.out
