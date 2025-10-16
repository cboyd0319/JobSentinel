"""Comprehensive tests for GCP budget management module.

Tests budget alert function deployment and configuration.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

# Import module under test
from providers.gcp import budget


class TestSetupBudgetAlerts:
    """Test budget alert function deployment."""

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_deploys_function_successfully(self, mocker, tmp_path):
        """Should deploy budget alert function with correct parameters."""
        # Arrange
        mock_logger = MagicMock()
        project_id = "test-project-123"
        region = "us-central1"
        scheduler_region = "us-central1"
        job_name = "job-scraper"
        
        # Create function source directory
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        # Mock successful deployment
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, project_id, region, tmp_path, scheduler_region, job_name
        )
        
        # Assert
        mock_run_command.assert_called_once()
        call_args = mock_run_command.call_args[0][0]
        
        assert call_args[0] == "gcloud"
        assert call_args[1] == "functions"
        assert call_args[2] == "deploy"
        assert call_args[3] == "job-scraper-budget-alerter"
        assert f"--project={project_id}" in call_args
        assert f"--region={region}" in call_args
        assert "--runtime=python312" in call_args
        assert "--entry-point=budget_alert_handler" in call_args
        assert "--trigger-topic=job-scraper-budget-alerts" in call_args
        assert "--gen2" in call_args
        
        mock_logger.info.assert_any_call("[OK] Budget alert function deployed")

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_sets_environment_variables(self, mocker, tmp_path):
        """Should set required environment variables for the function."""
        # Arrange
        mock_logger = MagicMock()
        project_id = "test-project-456"
        region = "europe-west1"
        scheduler_region = "europe-west1"
        job_name = "my-job"
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, project_id, region, tmp_path, scheduler_region, job_name
        )
        
        # Assert
        call_args = mock_run_command.call_args[0][0]
        env_vars_arg = [arg for arg in call_args if arg.startswith("--set-env-vars=")][0]
        
        assert f"GCP_PROJECT={project_id}" in env_vars_arg
        assert f"SCHEDULER_LOCATION={scheduler_region}" in env_vars_arg
        assert f"SCHEDULER_JOB_ID={job_name}-schedule" in env_vars_arg

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_uses_correct_source_directory(self, mocker, tmp_path):
        """Should use correct source directory for function code."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        call_args = mock_run_command.call_args[0][0]
        source_arg = [arg for arg in call_args if arg.startswith("--source=")][0]
        
        expected_path = str(function_dir)
        assert source_arg == f"--source={expected_path}"

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_handles_deployment_failure(self, mocker, tmp_path):
        """Should handle deployment failure gracefully with warnings."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        # Mock failed deployment
        mock_result = AsyncMock()
        mock_result.returncode = 1
        mock_result.stderr = "Permission denied"
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        mock_logger.warning.assert_called_once()
        warning_msg = mock_logger.warning.call_args[0][0]
        assert "Budget alert function deployment failed" in warning_msg
        assert "non-critical" in warning_msg
        assert "exit 1" in warning_msg
        
        mock_logger.debug.assert_called_once_with("Cloud Functions error: Permission denied")
        mock_logger.info.assert_any_call(
            "   • Budget alerts will not auto-pause the scheduler at 90% spend"
        )

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_logs_failure_without_stderr(self, mocker, tmp_path):
        """Should handle deployment failure even when stderr is empty."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        # Mock failed deployment with empty stderr
        mock_result = AsyncMock()
        mock_result.returncode = 2
        mock_result.stderr = ""
        
        mocker.patch("providers.gcp.budget.run_command", return_value=mock_result)
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        mock_logger.warning.assert_called_once()
        # debug should not be called when stderr is empty
        assert not any(
            "Cloud Functions error" in str(call)
            for call in mock_logger.debug.call_args_list
        )

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_passes_check_false(self, mocker, tmp_path):
        """Should pass check=False to run_command to not raise on failure."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        assert mock_run_command.call_args[1]["check"] is False

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_passes_logger(self, mocker, tmp_path):
        """Should pass logger to run_command."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        assert mock_run_command.call_args[1]["logger"] == mock_logger

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_enables_spinner(self, mocker, tmp_path):
        """Should enable spinner for user feedback."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        assert mock_run_command.call_args[1]["show_spinner"] is True
        assert mock_run_command.call_args[1]["capture_output"] is True

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_includes_quiet_flag(self, mocker, tmp_path):
        """Should include --quiet flag in gcloud command."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.budget.run_command",
            return_value=mock_result
        )
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        call_args = mock_run_command.call_args[0][0]
        assert "--quiet" in call_args

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_logs_setup_message(self, mocker, tmp_path):
        """Should log informative messages about setup."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        
        mocker.patch("providers.gcp.budget.run_command", return_value=mock_result)
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        mock_logger.info.assert_any_call("Setting up automated budget controls")
        mock_logger.info.assert_any_call(
            "Deploying Cloud Function for automatic shutdown at 90% budget..."
        )

    @pytest.mark.parametrize(
        "returncode,expected_log_call",
        [
            (0, "info"),
            (1, "warning"),
            (127, "warning"),
        ],
        ids=["success", "error", "command-not-found"]
    )
    @pytest.mark.asyncio
    async def test_setup_budget_alerts_logs_based_on_return_code(
        self, returncode, expected_log_call, mocker, tmp_path
    ):
        """Should log appropriately based on command return code."""
        # Arrange
        mock_logger = MagicMock()
        
        function_dir = tmp_path / "cloud" / "functions"
        function_dir.mkdir(parents=True)
        
        mock_result = AsyncMock()
        mock_result.returncode = returncode
        mock_result.stderr = "error" if returncode != 0 else ""
        
        mocker.patch("providers.gcp.budget.run_command", return_value=mock_result)
        
        # Act
        await budget.setup_budget_alerts(
            mock_logger, "test-project", "us-central1", tmp_path, "us-central1", "job"
        )
        
        # Assert
        if expected_log_call == "info":
            assert any(
                "[OK]" in str(call)
                for call in mock_logger.info.call_args_list
            )
        else:
            mock_logger.warning.assert_called()
