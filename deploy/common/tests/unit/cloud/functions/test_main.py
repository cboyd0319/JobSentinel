"""
Comprehensive unit tests for cloud.functions.main module.

Tests cover:
- Budget alert handler happy path
- Budget alert handler edge cases
- Budget alert handler error paths
- Scheduler job pausing logic
- Environment variable validation
- Base64 decoding and JSON parsing
- Exception handling

Following Pytest Architect patterns:
- AAA (Arrange-Act-Assert) structure
- Parametrized tests for input matrices
- Deterministic mocking (no external dependencies)
- Clear test names with scenario_expected pattern
"""

import base64
import json
from unittest.mock import MagicMock, Mock, patch

import pytest

# Import the module under test
from cloud.functions.main import _pause_scheduler_job, budget_alert_handler


class TestBudgetAlertHandler:
    """Test suite for budget_alert_handler function."""

    @pytest.mark.parametrize(
        "cost_amount,budget_amount,should_pause",
        [
            (100, 100, True),  # cost equals budget - should pause
            (101, 100, True),  # cost exceeds budget - should pause
            (99, 100, False),  # cost below budget - no action
            (0, 0, True),  # edge: both zero - should pause
            (1000000, 100, True),  # edge: large cost - should pause
        ],
        ids=["cost_equals_budget", "cost_exceeds", "cost_below", "both_zero", "large_cost"],
    )
    def test_budget_alert_handler_cost_thresholds(
        self, cost_amount, budget_amount, should_pause, capsys
    ):
        """Test budget alert handler with various cost/budget combinations."""
        # Arrange
        message_data = {"costAmount": cost_amount, "budgetAmount": budget_amount}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-123")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert
        if should_pause:
            mock_pause.assert_called_once()
        else:
            mock_pause.assert_not_called()

        captured = capsys.readouterr()
        assert f"Cost={cost_amount}" in captured.out
        assert f"Budget={budget_amount}" in captured.out

    def test_budget_alert_handler_valid_event_within_budget(self, capsys):
        """Test handler with valid event where cost is within budget."""
        # Arrange
        message_data = {"costAmount": 50, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-456")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_not_called()
        captured = capsys.readouterr()
        assert "Cost is within budget" in captured.out
        assert "No action taken" in captured.out

    def test_budget_alert_handler_valid_event_exceeds_budget(self, capsys):
        """Test handler with valid event where cost exceeds budget."""
        # Arrange
        message_data = {"costAmount": 150, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-789")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_called_once()
        captured = capsys.readouterr()
        assert "Cost has exceeded budget" in captured.out
        assert "Pausing scheduler job" in captured.out

    def test_budget_alert_handler_missing_data_key(self, capsys):
        """Test handler gracefully handles missing 'data' key in event."""
        # Arrange
        event = {}  # Missing 'data' key
        context = Mock(event_id="test-event-error")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "Missing expected key" in captured.out or "KeyError" in captured.out

    def test_budget_alert_handler_invalid_base64(self, capsys):
        """Test handler handles invalid base64 encoding gracefully."""
        # Arrange
        event = {"data": "not-valid-base64!!!"}
        context = Mock(event_id="test-event-bad-base64")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "An unexpected error occurred" in captured.out

    def test_budget_alert_handler_invalid_json(self, capsys):
        """Test handler handles invalid JSON gracefully."""
        # Arrange
        invalid_json = "not valid json"
        encoded_data = base64.b64encode(invalid_json.encode("utf-8")).decode("utf-8")
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-bad-json")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "An unexpected error occurred" in captured.out

    def test_budget_alert_handler_missing_cost_amount(self, capsys):
        """Test handler uses default value when costAmount is missing."""
        # Arrange
        message_data = {"budgetAmount": 100}  # Missing costAmount
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-no-cost")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert - costAmount defaults to 0, which is below budget
        mock_pause.assert_not_called()
        captured = capsys.readouterr()
        assert "Cost=0" in captured.out

    def test_budget_alert_handler_missing_budget_amount(self, capsys):
        """Test handler uses default value when budgetAmount is missing."""
        # Arrange
        message_data = {"costAmount": 50}  # Missing budgetAmount
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-event-no-budget")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert - budgetAmount defaults to 0, cost exceeds, should pause
        mock_pause.assert_called_once()
        captured = capsys.readouterr()
        assert "Budget=0" in captured.out

    def test_budget_alert_handler_logs_event_id(self, capsys):
        """Test handler logs the event ID from context."""
        # Arrange
        message_data = {"costAmount": 50, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="unique-event-id-999")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job"):
            budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "unique-event-id-999" in captured.out

    @pytest.mark.parametrize(
        "cost,budget",
        [
            (-1, 100),  # negative cost
            (100, -1),  # negative budget
            (-10, -20),  # both negative
        ],
        ids=["negative_cost", "negative_budget", "both_negative"],
    )
    def test_budget_alert_handler_negative_values(self, cost, budget, capsys):
        """Test handler with negative cost or budget values."""
        # Arrange
        message_data = {"costAmount": cost, "budgetAmount": budget}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="test-negative")

        # Act
        with patch("cloud.functions.main._pause_scheduler_job") as mock_pause:
            budget_alert_handler(event, context)

        # Assert - function should still execute without crashing
        captured = capsys.readouterr()
        assert f"Cost={cost}" in captured.out
        assert f"Budget={budget}" in captured.out


class TestPauseSchedulerJob:
    """Test suite for _pause_scheduler_job helper function."""

    def test_pause_scheduler_job_success(self, monkeypatch, capsys):
        """Test successfully pausing a scheduler job with all required env vars."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")

        mock_client = MagicMock()
        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            _pause_scheduler_job()

        # Assert
        mock_client.pause_job.assert_called_once_with(
            name="projects/test-project/locations/us-central1/jobs/test-job"
        )
        captured = capsys.readouterr()
        assert "Successfully paused scheduler job" in captured.out

    @pytest.mark.parametrize(
        "missing_var,env_vars",
        [
            ("GCP_PROJECT", {"SCHEDULER_LOCATION": "us-central1", "SCHEDULER_JOB_ID": "job"}),
            ("SCHEDULER_LOCATION", {"GCP_PROJECT": "project", "SCHEDULER_JOB_ID": "job"}),
            ("SCHEDULER_JOB_ID", {"GCP_PROJECT": "project", "SCHEDULER_LOCATION": "location"}),
            ("ALL", {}),
        ],
        ids=["no_project", "no_location", "no_job_id", "no_env_vars"],
    )
    def test_pause_scheduler_job_missing_env_vars(
        self, missing_var, env_vars, monkeypatch, capsys
    ):
        """Test _pause_scheduler_job when environment variables are missing."""
        # Arrange
        for key, value in env_vars.items():
            monkeypatch.setenv(key, value)

        # Act
        _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Missing required environment variables" in captured.out

    def test_pause_scheduler_job_empty_env_vars(self, monkeypatch, capsys):
        """Test _pause_scheduler_job with empty string environment variables."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "")
        monkeypatch.setenv("SCHEDULER_LOCATION", "")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "")

        # Act
        _pause_scheduler_job()

        # Assert - empty strings should be treated as missing
        captured = capsys.readouterr()
        assert "Missing required environment variables" in captured.out

    def test_pause_scheduler_job_client_exception(self, monkeypatch, capsys):
        """Test _pause_scheduler_job handles exceptions from CloudSchedulerClient."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "test-job")

        mock_client = MagicMock()
        mock_client.pause_job.side_effect = Exception("API Error: Permission denied")

        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            _pause_scheduler_job()

        # Assert
        captured = capsys.readouterr()
        assert "Error pausing scheduler job" in captured.out
        assert "Permission denied" in captured.out

    def test_pause_scheduler_job_constructs_correct_job_name(self, monkeypatch, capsys):
        """Test that _pause_scheduler_job constructs the correct GCP job name format."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "my-project-123")
        monkeypatch.setenv("SCHEDULER_LOCATION", "europe-west1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "my-scheduler-job")

        mock_client = MagicMock()
        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            _pause_scheduler_job()

        # Assert - verify exact GCP resource name format
        expected_name = "projects/my-project-123/locations/europe-west1/jobs/my-scheduler-job"
        mock_client.pause_job.assert_called_once_with(name=expected_name)

    def test_pause_scheduler_job_special_characters_in_env_vars(self, monkeypatch, capsys):
        """Test _pause_scheduler_job with special characters in environment variables."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "project-with-dashes")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "job_with_underscores")

        mock_client = MagicMock()
        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            _pause_scheduler_job()

        # Assert
        expected_name = (
            "projects/project-with-dashes/locations/us-central1/jobs/job_with_underscores"
        )
        mock_client.pause_job.assert_called_once_with(name=expected_name)
        captured = capsys.readouterr()
        assert "Successfully paused" in captured.out


class TestIntegrationScenarios:
    """Integration-style tests covering end-to-end scenarios."""

    def test_full_budget_alert_flow_exceeds_with_pause(self, monkeypatch, capsys):
        """Test complete flow: budget exceeded -> scheduler paused."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "budget-job")

        message_data = {"costAmount": 200, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="integration-test-1")

        mock_client = MagicMock()
        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            budget_alert_handler(event, context)

        # Assert
        mock_client.pause_job.assert_called_once()
        captured = capsys.readouterr()
        assert "Cost has exceeded budget" in captured.out
        assert "Successfully paused scheduler job" in captured.out

    def test_full_budget_alert_flow_within_budget_no_pause(self, monkeypatch, capsys):
        """Test complete flow: budget not exceeded -> no action taken."""
        # Arrange
        monkeypatch.setenv("GCP_PROJECT", "test-project")
        monkeypatch.setenv("SCHEDULER_LOCATION", "us-central1")
        monkeypatch.setenv("SCHEDULER_JOB_ID", "budget-job")

        message_data = {"costAmount": 50, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="integration-test-2")

        mock_client = MagicMock()
        with patch("cloud.functions.main.scheduler_v1.CloudSchedulerClient") as mock_cls:
            mock_cls.return_value = mock_client

            # Act
            budget_alert_handler(event, context)

        # Assert
        mock_client.pause_job.assert_not_called()
        captured = capsys.readouterr()
        assert "Cost is within budget" in captured.out
        assert "No action taken" in captured.out

    def test_budget_alert_missing_env_vars_fails_gracefully(self, capsys):
        """Test that handler fails gracefully when env vars missing during pause."""
        # Arrange - no environment variables set
        message_data = {"costAmount": 200, "budgetAmount": 100}
        encoded_data = base64.b64encode(json.dumps(message_data).encode("utf-8")).decode(
            "utf-8"
        )
        event = {"data": encoded_data}
        context = Mock(event_id="integration-test-3")

        # Act
        budget_alert_handler(event, context)

        # Assert
        captured = capsys.readouterr()
        assert "Cost has exceeded budget" in captured.out
        assert "Missing required environment variables" in captured.out
