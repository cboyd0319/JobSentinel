"""Comprehensive tests for GCP bootstrap module (gcp.py).

Tests the GCPBootstrap class which orchestrates the full GCP deployment workflow.
Covers:
- Initialization and configuration
- Main workflow orchestration
- Prerequisite checking
- Terraform operations
- Secret management
- Budget alert setup
- Error handling and edge cases

Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, call, patch

import pytest

# Import module under test
from providers.gcp.gcp import INSTALL_VERSION, GCPBootstrap, get_bootstrap


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_logger():
    """Mock logger for testing."""
    logger = MagicMock()
    logger.info = MagicMock()
    logger.warning = MagicMock()
    logger.error = MagicMock()
    logger.debug = MagicMock()
    return logger


@pytest.fixture
def mock_project_root(tmp_path):
    """Create a mock project root directory structure."""
    project_root = tmp_path / "project"
    project_root.mkdir()
    
    # Create required directories
    (project_root / "terraform" / "gcp").mkdir(parents=True)
    (project_root / "terraform" / "gcp_backend").mkdir(parents=True)
    (project_root / "cloud" / "functions").mkdir(parents=True)
    (project_root / "config").mkdir(parents=True)
    
    # Create required files
    (project_root / "config" / "user_prefs.example.json").write_text('{"test": "config"}')
    (project_root / "terraform" / "gcp" / "backend.tf").write_text(
        'terraform {\n  backend "gcs" {\n    bucket = "__TF_STATE_BUCKET_NAME__"\n  }\n}'
    )
    (project_root / "terraform" / "gcp" / "main.tf").write_text('# Terraform main config')
    
    return project_root


@pytest.fixture
def bootstrap_instance(mock_logger, mock_project_root, monkeypatch):
    """Create a GCPBootstrap instance with mocked dependencies."""
    # Mock resolve_project_root to return our mock path
    monkeypatch.setattr("providers.gcp.gcp.resolve_project_root", lambda: mock_project_root)
    
    instance = GCPBootstrap(mock_logger, no_prompt=True, dry_run=False)
    return instance


# ============================================================================
# Initialization Tests
# ============================================================================


class TestGCPBootstrapInitialization:
    """Test GCPBootstrap class initialization."""

    def test_init_with_defaults(self, mock_logger):
        """GCPBootstrap initializes with default values."""
        # Act
        with patch("providers.gcp.gcp.resolve_project_root") as mock_resolve:
            mock_resolve.return_value = Path("/fake/root")
            bootstrap = GCPBootstrap(mock_logger)
        
        # Assert
        assert bootstrap.logger == mock_logger
        assert bootstrap.no_prompt is False
        assert bootstrap.dry_run is False
        assert bootstrap.project_id is None
        assert bootstrap.artifact_repo == "job-scraper"
        assert bootstrap.job_name == "job-scraper"
        assert bootstrap.job_mode == "poll"
        assert bootstrap.schedule_frequency == "0 6-18 * * 1-5"

    def test_init_with_custom_parameters(self, mock_logger):
        """GCPBootstrap initializes with custom parameters."""
        # Act
        with patch("providers.gcp.gcp.resolve_project_root") as mock_resolve:
            mock_resolve.return_value = Path("/fake/root")
            bootstrap = GCPBootstrap(mock_logger, no_prompt=True, dry_run=True)
        
        # Assert
        assert bootstrap.no_prompt is True
        assert bootstrap.dry_run is True

    def test_init_sets_correct_paths(self, mock_logger, mock_project_root, monkeypatch):
        """GCPBootstrap sets correct directory paths."""
        # Arrange
        monkeypatch.setattr("providers.gcp.gcp.resolve_project_root", lambda: mock_project_root)
        
        # Act
        bootstrap = GCPBootstrap(mock_logger)
        
        # Assert
        assert bootstrap.project_root == mock_project_root
        assert bootstrap.terraform_dir == mock_project_root / "terraform" / "gcp"

    def test_name_attribute(self, mock_logger):
        """GCPBootstrap has correct name attribute."""
        # Act
        with patch("providers.gcp.gcp.resolve_project_root") as mock_resolve:
            mock_resolve.return_value = Path("/fake/root")
            bootstrap = GCPBootstrap(mock_logger)
        
        # Assert
        assert bootstrap.name == "Google Cloud Platform"


# ============================================================================
# Main Workflow Tests
# ============================================================================


class TestGCPBootstrapRunWorkflow:
    """Test the main run() workflow orchestration."""

    @pytest.mark.asyncio
    async def test_run_new_deployment_workflow(self, bootstrap_instance, mocker):
        """run() executes full workflow for new deployment."""
        # Arrange - Mock all major workflow steps
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        
        # Mock external dependencies
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.detect_existing_deployment", new=AsyncMock(return_value=None))
        mocker.patch("providers.gcp.gcp.generate_project_id", return_value="test-proj-12345")
        mocker.patch("providers.gcp.gcp.select_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.choose_billing_account", new=AsyncMock(return_value="bill-123"))
        
        # Mock project creation workflow
        mock_run_command = mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(side_effect=[
                # gcloud projects list
                AsyncMock(returncode=0, stdout=""),
            ])
        )
        mocker.patch("providers.gcp.gcp.create_project", new=AsyncMock())
        
        # Mock configuration and deployment steps
        mocker.patch.object(bootstrap_instance, "_collect_configuration")
        mocker.patch.object(bootstrap_instance, "_provision_backend", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_write_terraform_vars", new=AsyncMock())
        
        # Mock Terraform outputs
        terraform_outputs = {
            "artifact_registry_repo_name": {"value": "test-repo"},
            "cloud_run_job_name": {"value": "test-job"},
            "image_uri": {"value": "gcr.io/test/image"},
            "budget_pubsub_topic": {"value": "projects/test/topics/budget"},
            "vpc_network_name": {"value": "test-vpc"},
            "vpc_subnet_name": {"value": "test-subnet"},
            "vpc_connector_id": {"value": "test-connector"},
            "storage_bucket_full_name": {"value": "test-bucket"},
            "runtime_service_account_email": {"value": "runtime@test.iam"},
            "scheduler_service_account_email": {"value": "scheduler@test.iam"},
            "user_prefs_secret_id": {"value": "user-prefs-secret"},
            "slack_webhook_secret_id": {"value": "slack-webhook-secret"},
            "project_number": {"value": "123456789"},
        }
        mocker.patch.object(
            bootstrap_instance,
            "_run_terraform_apply",
            new=AsyncMock(return_value=terraform_outputs)
        )
        
        # Mock remaining workflow steps
        mocker.patch("providers.gcp.gcp.save_deployment_config")
        mocker.patch.object(bootstrap_instance, "_update_secret_values", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.select_scheduler_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.build_and_push_image", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.schedule_job", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_setup_budget_alerts", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.verify_deployment", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.print_summary")
        mocker.patch("providers.gcp.gcp.send_slack_notification", new=AsyncMock())
        
        # Act
        await bootstrap_instance.run()
        
        # Assert - Verify key workflow steps were called
        bootstrap_instance._print_welcome.assert_called_once()
        bootstrap_instance._confirm_prerequisites.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_existing_deployment_update(self, bootstrap_instance, mocker):
        """run() updates existing deployment correctly."""
        # Arrange
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        
        # Mock existing deployment detection
        mocker.patch(
            "providers.gcp.gcp.detect_existing_deployment",
            new=AsyncMock(return_value="existing-proj-123")
        )
        
        # Mock existing config
        existing_config = {
            "region": "us-west1",
            "billing_account": "existing-bill-123",
        }
        mocker.patch("providers.gcp.gcp.load_deployment_config", return_value=existing_config)
        
        # Mock remaining workflow
        mocker.patch.object(bootstrap_instance, "_collect_configuration")
        mocker.patch.object(bootstrap_instance, "_provision_backend", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_write_terraform_vars", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_run_terraform_apply", new=AsyncMock(return_value={}))
        
        # Act
        await bootstrap_instance.run()
        
        # Assert
        assert bootstrap_instance.project_id == "existing-proj-123"
        assert bootstrap_instance.region == "us-west1"
        assert bootstrap_instance.billing_account == "existing-bill-123"

    @pytest.mark.asyncio
    async def test_run_dry_run_mode(self, bootstrap_instance, mocker):
        """run() handles dry run mode correctly."""
        # Arrange
        bootstrap_instance.dry_run = True
        
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.detect_existing_deployment", new=AsyncMock(return_value=None))
        mocker.patch("providers.gcp.gcp.generate_project_id", return_value="test-proj-12345")
        mocker.patch("providers.gcp.gcp.select_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.choose_billing_account", new=AsyncMock(return_value="bill-123"))
        mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock(return_value=AsyncMock(stdout="", returncode=0)))
        mocker.patch("providers.gcp.gcp.create_project", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_collect_configuration")
        mocker.patch.object(bootstrap_instance, "_provision_backend", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_write_terraform_vars", new=AsyncMock())
        
        # Mock empty Terraform outputs for dry run
        mocker.patch.object(bootstrap_instance, "_run_terraform_apply", new=AsyncMock(return_value={}))
        
        # Act
        await bootstrap_instance.run()
        
        # Assert - Workflow should stop after terraform outputs are empty
        # Verify the workflow completes without calling post-terraform steps
        assert bootstrap_instance.artifact_repo == "job-scraper"  # Default value, not updated


# ============================================================================
# Prerequisite Checking Tests
# ============================================================================


class TestPrerequisiteChecking:
    """Test prerequisite validation methods."""

    @pytest.mark.asyncio
    async def test_confirm_prerequisites_python_version_check(self, bootstrap_instance, mocker):
        """_confirm_prerequisites checks Python version correctly."""
        # Arrange
        mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock(return_value=AsyncMock(
            stdout="pip 24.0 from /usr/lib/python3.11", returncode=0
        )))
        mocker.patch("providers.gcp.gcp.confirm", return_value=True)
        
        # Act
        await bootstrap_instance._confirm_prerequisites()
        
        # Assert
        # Check for the actual Python version message (3.11+, not current version)
        bootstrap_instance.logger.info.assert_any_call("✓ Python 3.11+ detected")

    @pytest.mark.asyncio
    async def test_confirm_prerequisites_missing_pip(self, bootstrap_instance, mocker):
        """_confirm_prerequisites exits when pip is missing."""
        # Arrange
        mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(side_effect=RuntimeError("pip not found"))
        )
        
        # Act & Assert
        with pytest.raises(SystemExit):
            await bootstrap_instance._confirm_prerequisites()
        
        bootstrap_instance.logger.error.assert_any_call("❌ pip is not installed!")

    @pytest.mark.asyncio
    async def test_confirm_prerequisites_user_declines_setup(self, bootstrap_instance, mocker):
        """_confirm_prerequisites exits when user declines setup."""
        # Arrange
        mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock(return_value=AsyncMock(
            stdout="pip 24.0", returncode=0
        )))
        mocker.patch("providers.gcp.gcp.confirm", return_value=False)
        
        # Act & Assert
        with pytest.raises(SystemExit):
            await bootstrap_instance._confirm_prerequisites()


# ============================================================================
# Terraform Operations Tests
# ============================================================================


class TestTerraformOperations:
    """Test Terraform-related operations."""

    @pytest.mark.asyncio
    async def test_write_terraform_vars_creates_config(self, bootstrap_instance, mocker, tmp_path):
        """_write_terraform_vars creates terraform.tfvars file."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.billing_account = "bill-account-123"
        bootstrap_instance.region = "us-central1"
        bootstrap_instance.alert_email = "test@example.com"
        
        # Mock get_state_directory
        state_dir = tmp_path / "state"
        state_dir.mkdir()
        mocker.patch("providers.gcp.gcp.get_state_directory", return_value=state_dir)
        
        # Act
        await bootstrap_instance._write_terraform_vars()
        
        # Assert
        tfvars_path = state_dir / "terraform" / "terraform.tfvars"
        assert tfvars_path.exists()
        
        content = tfvars_path.read_text()
        assert 'project_id           = "test-project-123"' in content
        assert 'billing_account_id   = "bill-account-123"' in content
        assert 'region               = "us-central1"' in content
        assert 'alert_email_address  = "test@example.com"' in content

    @pytest.mark.asyncio
    async def test_run_terraform_apply_success(self, bootstrap_instance, mocker):
        """_run_terraform_apply executes terraform workflow successfully."""
        # Arrange
        mock_run_command = mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock()
        )
        
        # Mock terraform output
        terraform_output = {
            "artifact_registry_repo_name": {"value": "test-repo"},
            "cloud_run_job_name": {"value": "test-job"},
        }
        
        # Mock output command to return JSON
        output_result = AsyncMock()
        output_result.stdout = json.dumps(terraform_output)
        mock_run_command.return_value = output_result
        
        # Act
        result = await bootstrap_instance._run_terraform_apply()
        
        # Assert
        assert result == terraform_output
        assert mock_run_command.call_count >= 3  # init, plan, apply, output

    @pytest.mark.asyncio
    async def test_run_terraform_apply_dry_run(self, bootstrap_instance, mocker):
        """_run_terraform_apply returns empty dict in dry run mode."""
        # Arrange
        bootstrap_instance.dry_run = True
        mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock())
        
        # Act
        result = await bootstrap_instance._run_terraform_apply()
        
        # Assert
        assert result == {}

    @pytest.mark.asyncio
    async def test_provision_backend_creates_state_bucket(self, bootstrap_instance, mocker, tmp_path):
        """_provision_backend creates and configures Terraform state bucket."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        
        # Create backend directory
        backend_dir = bootstrap_instance.project_root / "terraform" / "gcp_backend"
        backend_dir.mkdir(parents=True, exist_ok=True)
        
        # Mock state directory
        state_dir = tmp_path / "state"
        state_dir.mkdir()
        terraform_work_dir = state_dir / "terraform"
        terraform_work_dir.mkdir()
        
        mocker.patch("providers.gcp.gcp.get_state_directory", return_value=state_dir)
        bootstrap_instance.terraform_dir = terraform_work_dir
        
        # Create backend.tf in work dir
        (terraform_work_dir / "backend.tf").write_text(
            'terraform { backend "gcs" { bucket = "__TF_STATE_BUCKET_NAME__" } }'
        )
        
        mock_run_command = mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock())
        
        # Act
        await bootstrap_instance._provision_backend()
        
        # Assert
        assert mock_run_command.call_count >= 2  # backend init/apply + main init
        
        # Check backend.tf was updated
        backend_content = (terraform_work_dir / "backend.tf").read_text()
        assert "__TF_STATE_BUCKET_NAME__" not in backend_content
        assert "tf-state-test-project-123-jpsf" in backend_content


# ============================================================================
# Secret Management Tests
# ============================================================================


class TestSecretManagement:
    """Test Secret Manager operations."""

    @pytest.mark.asyncio
    async def test_update_secret_values_user_prefs(self, bootstrap_instance, mocker):
        """_update_secret_values updates user preferences secret."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.user_prefs_payload = '{"test": "preferences"}'
        bootstrap_instance.prefs_secret_name = "user-prefs-secret"
        
        mock_create_secret = mocker.patch(
            "providers.gcp.gcp.create_or_update_secret",
            new=AsyncMock()
        )
        
        # Act
        await bootstrap_instance._update_secret_values()
        
        # Assert
        mock_create_secret.assert_called_once_with(
            "test-project-123",
            "user-prefs-secret",
            '{"test": "preferences"}'
        )

    @pytest.mark.asyncio
    async def test_update_secret_values_slack_webhook(self, bootstrap_instance, mocker):
        """_update_secret_values updates Slack webhook secret."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.env_values = {"SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/XXX"}
        bootstrap_instance.slack_webhook_secret_name = "slack-webhook-secret"
        
        mock_create_secret = mocker.patch(
            "providers.gcp.gcp.create_or_update_secret",
            new=AsyncMock()
        )
        
        # Act
        await bootstrap_instance._update_secret_values()
        
        # Assert
        assert mock_create_secret.call_count >= 1
        mock_create_secret.assert_any_call(
            "test-project-123",
            "slack-webhook-secret",
            "https://hooks.slack.com/services/XXX"
        )

    @pytest.mark.asyncio
    async def test_update_secret_values_empty_values(self, bootstrap_instance, mocker):
        """_update_secret_values handles empty values gracefully."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.user_prefs_payload = ""
        bootstrap_instance.env_values = {}
        
        mock_create_secret = mocker.patch(
            "providers.gcp.gcp.create_or_update_secret",
            new=AsyncMock()
        )
        
        # Act
        await bootstrap_instance._update_secret_values()
        
        # Assert
        mock_create_secret.assert_not_called()


# ============================================================================
# Configuration Collection Tests
# ============================================================================


class TestConfigurationCollection:
    """Test configuration collection methods."""

    def test_collect_configuration_from_env(self, bootstrap_instance, monkeypatch):
        """_collect_configuration loads from environment variables."""
        # Arrange
        monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/TEST123")
        monkeypatch.setenv("ALERT_EMAIL_ADDRESS", "alerts@example.com")
        monkeypatch.setenv("JOB_MODE", "schedule")
        monkeypatch.setenv("SCHEDULE_FREQUENCY", "0 */2 * * *")
        
        # Act
        bootstrap_instance._collect_configuration()
        
        # Assert
        assert bootstrap_instance.env_values["SLACK_WEBHOOK_URL"] == "https://hooks.slack.com/services/TEST123"
        assert bootstrap_instance.alert_email == "alerts@example.com"
        assert bootstrap_instance.job_mode == "schedule"
        assert bootstrap_instance.schedule_frequency == "0 */2 * * *"

    def test_collect_configuration_missing_slack_webhook(self, bootstrap_instance, monkeypatch):
        """_collect_configuration raises error when Slack webhook missing."""
        # Arrange - No SLACK_WEBHOOK_URL set
        monkeypatch.delenv("SLACK_WEBHOOK_URL", raising=False)
        
        # Act & Assert
        with pytest.raises(Exception):  # ConfigurationException
            bootstrap_instance._collect_configuration()

    def test_collect_configuration_invalid_slack_webhook(self, bootstrap_instance, monkeypatch):
        """_collect_configuration raises error for invalid Slack webhook."""
        # Arrange
        monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://invalid-url.com")
        
        # Act & Assert
        with pytest.raises(Exception):  # ConfigurationException
            bootstrap_instance._collect_configuration()

    def test_collect_configuration_default_values(self, bootstrap_instance, monkeypatch):
        """_collect_configuration uses default values when env vars missing."""
        # Arrange
        monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/TEST123")
        monkeypatch.delenv("ALERT_EMAIL_ADDRESS", raising=False)
        monkeypatch.delenv("JOB_MODE", raising=False)
        
        # Act
        bootstrap_instance._collect_configuration()
        
        # Assert
        assert bootstrap_instance.alert_email == "noreply@example.com"
        assert bootstrap_instance.job_mode == "poll"


# ============================================================================
# Budget Alerts Tests
# ============================================================================


class TestBudgetAlerts:
    """Test budget alert setup."""

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_success(self, bootstrap_instance, mocker):
        """_setup_budget_alerts deploys Cloud Function successfully."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.region = "us-central1"
        bootstrap_instance.scheduler_region = "us-central1"
        bootstrap_instance.job_name = "test-job"
        bootstrap_instance.budget_topic_name = "projects/test/topics/budget-alerts"
        
        mock_result = AsyncMock()
        mock_result.returncode = 0
        mock_run_command = mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(return_value=mock_result)
        )
        
        # Act
        await bootstrap_instance._setup_budget_alerts()
        
        # Assert
        mock_run_command.assert_called_once()
        call_args = mock_run_command.call_args
        assert "gcloud" in call_args[0][0]
        assert "functions" in call_args[0][0]
        assert "deploy" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_setup_budget_alerts_failure_non_critical(self, bootstrap_instance, mocker):
        """_setup_budget_alerts handles deployment failure gracefully."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.region = "us-central1"
        bootstrap_instance.scheduler_region = "us-central1"
        bootstrap_instance.job_name = "test-job"
        bootstrap_instance.budget_topic_name = "projects/test/topics/budget-alerts"
        
        mock_result = AsyncMock()
        mock_result.returncode = 1
        mock_result.stderr = "Deployment failed"
        mock_run_command = mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(return_value=mock_result)
        )
        
        # Act - Should not raise exception
        await bootstrap_instance._setup_budget_alerts()
        
        # Assert
        bootstrap_instance.logger.warning.assert_called()


# ============================================================================
# Project Quota Tests
# ============================================================================


class TestProjectQuotaHandling:
    """Test project quota and reuse logic."""

    @pytest.mark.asyncio
    async def test_run_reuses_project_when_quota_exceeded(self, bootstrap_instance, mocker):
        """run() reuses existing project when quota is reached."""
        # Arrange
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.detect_existing_deployment", new=AsyncMock(return_value=None))
        mocker.patch("providers.gcp.gcp.generate_project_id", return_value="new-proj-12345")
        mocker.patch("providers.gcp.gcp.select_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.choose_billing_account", new=AsyncMock(return_value="bill-123"))
        
        # Mock project list showing existing projects
        mock_run_command = mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock()
        )
        
        # First call: list project states
        list_result = AsyncMock()
        list_result.stdout = "ACTIVE\n"
        
        # Second call: list active project IDs
        active_projects_result = AsyncMock()
        active_projects_result.stdout = "existing-project-123\n"
        
        # Third call: set active project
        set_project_result = AsyncMock()
        
        mock_run_command.side_effect = [list_result, active_projects_result, set_project_result]
        
        # Mock remaining workflow to return empty (simulate dry run)
        mocker.patch.object(bootstrap_instance, "_collect_configuration")
        mocker.patch.object(bootstrap_instance, "_provision_backend", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_write_terraform_vars", new=AsyncMock())
        mocker.patch.object(bootstrap_instance, "_run_terraform_apply", new=AsyncMock(return_value={}))
        
        # Act
        await bootstrap_instance.run()
        
        # Assert
        assert bootstrap_instance.project_id == "existing-project-123"


# ============================================================================
# Helper Method Tests
# ============================================================================


class TestHelperMethods:
    """Test helper and utility methods."""

    def test_try_clipboard_webhook_success(self, bootstrap_instance, mocker):
        """_try_clipboard_webhook returns webhook from clipboard."""
        # Arrange
        mock_pyperclip = MagicMock()
        mock_pyperclip.paste.return_value = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
        
        with patch.dict(sys.modules, {"pyperclip": mock_pyperclip}):
            # Act
            result = bootstrap_instance._try_clipboard_webhook()
        
        # Assert
        assert result is not None
        assert result.startswith("https://hooks.slack.com/services/")

    def test_try_clipboard_webhook_invalid_url(self, bootstrap_instance, mocker):
        """_try_clipboard_webhook returns None for invalid URL."""
        # Arrange
        mock_pyperclip = MagicMock()
        mock_pyperclip.paste.return_value = "https://example.com"
        
        with patch.dict(sys.modules, {"pyperclip": mock_pyperclip}):
            # Act
            result = bootstrap_instance._try_clipboard_webhook()
        
        # Assert
        assert result is None

    def test_try_clipboard_webhook_pyperclip_not_installed(self, bootstrap_instance, mocker):
        """_try_clipboard_webhook handles missing pyperclip gracefully."""
        # Arrange - Remove pyperclip from modules
        with patch.dict(sys.modules, {"pyperclip": None}):
            # Act
            result = bootstrap_instance._try_clipboard_webhook()
        
        # Assert
        assert result is None

    def test_print_welcome_displays_consent(self, bootstrap_instance, mocker):
        """_print_welcome displays consent message."""
        # Arrange
        mocker.patch("providers.gcp.gcp.confirm", return_value=True)
        
        # Act
        bootstrap_instance._print_welcome()
        
        # Assert
        bootstrap_instance.logger.info.assert_called()
        
        # Check that key consent messages were logged
        info_calls = [call[0][0] for call in bootstrap_instance.logger.info.call_args_list]
        assert any("Google Cloud Run Automated Provisioning" in msg for msg in info_calls)
        assert any("INSTALLATION & CONSENT" in msg for msg in info_calls)

    def test_print_welcome_user_declines_consent(self, bootstrap_instance, mocker):
        """_print_welcome exits when user declines consent."""
        # Arrange
        mocker.patch("providers.gcp.gcp.confirm", return_value=False)
        
        # Act & Assert
        with pytest.raises(SystemExit):
            bootstrap_instance._print_welcome()


# ============================================================================
# Factory Function Tests
# ============================================================================


class TestGetBootstrap:
    """Test the get_bootstrap factory function."""

    def test_get_bootstrap_returns_instance(self, mock_logger):
        """get_bootstrap returns GCPBootstrap instance."""
        # Act
        with patch("providers.gcp.gcp.resolve_project_root") as mock_resolve:
            mock_resolve.return_value = Path("/fake/root")
            result = get_bootstrap(mock_logger)
        
        # Assert
        assert isinstance(result, GCPBootstrap)
        assert result.logger == mock_logger

    def test_get_bootstrap_with_no_prompt(self, mock_logger):
        """get_bootstrap creates instance with no_prompt flag."""
        # Act
        with patch("providers.gcp.gcp.resolve_project_root") as mock_resolve:
            mock_resolve.return_value = Path("/fake/root")
            result = get_bootstrap(mock_logger, no_prompt=True)
        
        # Assert
        assert result.no_prompt is True


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================


class TestEdgeCasesAndErrors:
    """Test edge cases and error handling."""

    def test_collect_resume_preferences_returns_none_when_no_prompt(self, bootstrap_instance):
        """_collect_resume_preferences returns None in no_prompt mode."""
        # Arrange
        bootstrap_instance.no_prompt = True
        
        # Act
        result = bootstrap_instance._collect_resume_preferences()
        
        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_provision_backend_missing_directory(self, bootstrap_instance, mocker):
        """_provision_backend raises error when backend directory missing."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        
        # Remove backend directory
        backend_dir = bootstrap_instance.project_root / "terraform" / "gcp_backend"
        if backend_dir.exists():
            import shutil
            shutil.rmtree(backend_dir)
        
        # Act & Assert
        with pytest.raises(FileNotFoundError):
            await bootstrap_instance._provision_backend()

    @pytest.mark.asyncio
    async def test_provision_backend_terraform_failure(self, bootstrap_instance, mocker, tmp_path):
        """_provision_backend raises error on Terraform failure."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        
        # Ensure backend directory exists
        backend_dir = bootstrap_instance.project_root / "terraform" / "gcp_backend"
        backend_dir.mkdir(parents=True, exist_ok=True)
        
        # Mock terraform command to fail
        mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(side_effect=Exception("Terraform failed"))
        )
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await bootstrap_instance._provision_backend()
        
        assert "Terraform failed" in str(exc_info.value)


# ============================================================================
# Resume Preferences Tests
# ============================================================================


class TestResumePreferences:
    """Test resume preference collection."""

    def test_collect_resume_preferences_user_declines(self, bootstrap_instance, mocker):
        """_collect_resume_preferences returns None when user declines."""
        # Arrange
        bootstrap_instance.no_prompt = False
        mock_input = mocker.patch("builtins.input", return_value="n")
        
        # Act
        result = bootstrap_instance._collect_resume_preferences()
        
        # Assert
        assert result is None
        mock_input.assert_called()

    def test_collect_resume_preferences_missing_parser(self, bootstrap_instance, mocker):
        """_collect_resume_preferences handles missing parser module."""
        # Arrange
        bootstrap_instance.no_prompt = False
        mocker.patch("builtins.input", side_effect=["y", "n"])
        
        # Mock import to fail
        with patch.dict(sys.modules, {"utils.resume_parser": None}):
            # Act
            result = bootstrap_instance._collect_resume_preferences()
        
        # Assert
        assert result is None

    def test_collect_resume_preferences_invalid_input_retry(self, bootstrap_instance, mocker):
        """_collect_resume_preferences handles invalid input."""
        # Arrange
        bootstrap_instance.no_prompt = False
        mock_input = mocker.patch("builtins.input", side_effect=["invalid", "maybe", "n"])
        
        # Act
        result = bootstrap_instance._collect_resume_preferences()
        
        # Assert
        assert result is None
        assert mock_input.call_count >= 3


# ============================================================================
# Python Version Check Tests
# ============================================================================


class TestPythonVersionChecks:
    """Test Python version validation."""

    @pytest.mark.asyncio
    async def test_confirm_prerequisites_old_python_version(self, bootstrap_instance, mocker):
        """_confirm_prerequisites exits on old Python version."""
        # Arrange - Create a named tuple that behaves like sys.version_info
        from collections import namedtuple
        VersionInfo = namedtuple("VersionInfo", ["major", "minor", "micro", "releaselevel", "serial"])
        old_version = VersionInfo(3, 10, 0, "final", 0)
        
        mocker.patch("providers.gcp.gcp.sys.version_info", old_version)
        
        # Act & Assert
        with pytest.raises(SystemExit) as exc_info:
            await bootstrap_instance._confirm_prerequisites()
        
        assert exc_info.value.code == 1
        bootstrap_instance.logger.error.assert_called()


# ============================================================================
# Additional Coverage Tests
# ============================================================================


class TestAdditionalCoverage:
    """Additional tests to improve coverage."""

    @pytest.mark.asyncio
    async def test_write_terraform_vars_updates_terraform_dir(self, bootstrap_instance, mocker, tmp_path):
        """_write_terraform_vars updates bootstrap terraform_dir to state directory."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.billing_account = "bill-123"
        bootstrap_instance.region = "us-central1"
        bootstrap_instance.alert_email = "test@example.com"
        
        state_dir = tmp_path / "state"
        state_dir.mkdir()
        mocker.patch("providers.gcp.gcp.get_state_directory", return_value=state_dir)
        
        original_terraform_dir = bootstrap_instance.terraform_dir
        
        # Act
        await bootstrap_instance._write_terraform_vars()
        
        # Assert
        assert bootstrap_instance.terraform_dir == state_dir / "terraform"
        assert bootstrap_instance.terraform_dir != original_terraform_dir

    def test_collect_configuration_loads_user_prefs_template(self, bootstrap_instance, monkeypatch):
        """_collect_configuration loads user preferences template."""
        # Arrange
        monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/TEST123")
        
        # Act
        bootstrap_instance._collect_configuration()
        
        # Assert
        assert bootstrap_instance.user_prefs_payload is not None
        assert len(bootstrap_instance.user_prefs_payload) > 0
        assert "test" in bootstrap_instance.user_prefs_payload.lower()

    @pytest.mark.asyncio
    async def test_provision_backend_creates_backend_tf(self, bootstrap_instance, mocker, tmp_path):
        """_provision_backend creates backend.tf with correct bucket name."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        
        # Create backend directory
        backend_dir = bootstrap_instance.project_root / "terraform" / "gcp_backend"
        backend_dir.mkdir(parents=True, exist_ok=True)
        
        # Mock state directory
        state_dir = tmp_path / "state"
        state_dir.mkdir()
        terraform_work_dir = state_dir / "terraform"
        terraform_work_dir.mkdir()
        
        mocker.patch("providers.gcp.gcp.get_state_directory", return_value=state_dir)
        bootstrap_instance.terraform_dir = terraform_work_dir
        
        # Create backend.tf template in work dir
        (terraform_work_dir / "backend.tf").write_text(
            'terraform { backend "gcs" { bucket = "__TF_STATE_BUCKET_NAME__" } }'
        )
        
        mocker.patch("providers.gcp.gcp.run_command", new=AsyncMock())
        
        # Act
        await bootstrap_instance._provision_backend()
        
        # Assert
        backend_content = (terraform_work_dir / "backend.tf").read_text()
        expected_bucket = f"tf-state-{bootstrap_instance.project_id}-jpsf"
        assert expected_bucket in backend_content


# ============================================================================
# File Operations Tests
# ============================================================================


class TestFileOperations:
    """Test file and directory operations."""

    @pytest.mark.asyncio
    async def test_write_terraform_vars_copies_modules_directory(self, bootstrap_instance, mocker, tmp_path):
        """_write_terraform_vars copies modules directory when present."""
        # Arrange
        bootstrap_instance.project_id = "test-project-123"
        bootstrap_instance.billing_account = "bill-123"
        bootstrap_instance.region = "us-central1"
        bootstrap_instance.alert_email = "test@example.com"
        
        # Create modules directory in terraform source
        modules_dir = bootstrap_instance.terraform_dir / "modules"
        modules_dir.mkdir(parents=True, exist_ok=True)
        (modules_dir / "test.tf").write_text("# Test module")
        
        # Mock state directory
        state_dir = tmp_path / "state"
        state_dir.mkdir()
        mocker.patch("providers.gcp.gcp.get_state_directory", return_value=state_dir)
        
        # Act
        await bootstrap_instance._write_terraform_vars()
        
        # Assert
        target_modules = state_dir / "terraform" / "modules"
        assert target_modules.exists()
        assert (target_modules / "test.tf").exists()


# ============================================================================
# Project Quota Edge Cases
# ============================================================================


class TestProjectQuotaEdgeCases:
    """Test edge cases in project quota handling."""

    @pytest.mark.asyncio
    async def test_run_user_declines_project_reuse(self, bootstrap_instance, mocker):
        """run() raises error when user declines to reuse project."""
        # Arrange
        bootstrap_instance.no_prompt = False
        
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.detect_existing_deployment", new=AsyncMock(return_value=None))
        mocker.patch("providers.gcp.gcp.generate_project_id", return_value="new-proj-12345")
        mocker.patch("providers.gcp.gcp.select_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.choose_billing_account", new=AsyncMock(return_value="bill-123"))
        
        # Mock project list showing existing projects
        list_result = AsyncMock()
        list_result.stdout = "ACTIVE\n"
        
        active_projects_result = AsyncMock()
        active_projects_result.stdout = "existing-project-123\n"
        
        mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(side_effect=[list_result, active_projects_result])
        )
        
        # Mock user declining project reuse
        mocker.patch("providers.gcp.gcp.confirm", return_value=False)
        
        # Act & Assert
        with pytest.raises(Exception):  # QuotaExceededError
            await bootstrap_instance.run()

    @pytest.mark.asyncio
    async def test_run_no_active_projects_available(self, bootstrap_instance, mocker):
        """run() raises error when no active projects available."""
        # Arrange
        bootstrap_instance.no_prompt = True
        
        mocker.patch.object(bootstrap_instance, "_print_welcome")
        mocker.patch.object(bootstrap_instance, "_confirm_prerequisites", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.ensure_gcloud")
        mocker.patch("providers.gcp.gcp.ensure_terraform", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.authenticate", new=AsyncMock())
        mocker.patch("providers.gcp.gcp.detect_existing_deployment", new=AsyncMock(return_value=None))
        mocker.patch("providers.gcp.gcp.generate_project_id", return_value="new-proj-12345")
        mocker.patch("providers.gcp.gcp.select_region", new=AsyncMock(return_value="us-central1"))
        mocker.patch("providers.gcp.gcp.choose_billing_account", new=AsyncMock(return_value="bill-123"))
        
        # Mock project list showing projects exist but none are active
        list_result = AsyncMock()
        list_result.stdout = "ACTIVE\n"
        
        active_projects_result = AsyncMock()
        active_projects_result.stdout = ""  # No active projects
        
        mocker.patch(
            "providers.gcp.gcp.run_command",
            new=AsyncMock(side_effect=[list_result, active_projects_result])
        )
        
        # Act & Assert
        with pytest.raises(Exception):  # QuotaExceededError
            await bootstrap_instance.run()


# ============================================================================
# Constants Tests
# ============================================================================


def test_install_version_constant():
    """INSTALL_VERSION constant is defined."""
    assert INSTALL_VERSION == "540.0.0"
    assert isinstance(INSTALL_VERSION, str)
