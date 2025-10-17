"""
Comprehensive unit tests for cloud.providers.gcp.cloud_run module.

Tests cover:
- Docker image building and pushing
- Dockerfile creation (production and simple)
- Cloud Run job creation and updates
- Error handling and fallback logic
- Command construction and execution
- Path handling and file operations

Following Pytest Architect patterns:
- AAA (Arrange-Act-Assert) structure
- Async test support with pytest-asyncio
- Deterministic mocking (no external dependencies)
- Clear test names with scenario_expected pattern
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, call, mock_open, patch

import pytest

from cloud.providers.gcp.cloud_run import (
    _create_dockerfile,
    _create_simple_dockerfile,
    build_and_push_image,
    create_or_update_job,
)


class TestBuildAndPushImage:
    """Test suite for build_and_push_image function."""

    @pytest.mark.asyncio
    async def test_build_and_push_image_with_existing_dockerfile(self, tmp_path):
        """Test build_and_push_image when Dockerfile already exists."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")

        mock_logger = Mock()
        expected_tag = "us-central1-docker.pkg.dev/test-proj/repo/job-scraper:latest"

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            # Act
            result = await build_and_push_image(
                mock_logger, project_root, "test-proj", "us-central1", "repo"
            )

        # Assert
        assert result == expected_tag
        mock_run.assert_called_once()
        assert "gcloud" in mock_run.call_args[0][0]
        assert "builds" in mock_run.call_args[0][0]
        assert "submit" in mock_run.call_args[0][0]

    @pytest.mark.asyncio
    async def test_build_and_push_image_creates_dockerfile_when_missing(self, tmp_path):
        """Test build_and_push_image creates Dockerfile when it doesn't exist."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        with patch("cloud.providers.gcp.cloud_run._create_dockerfile") as mock_create:
            with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock):
                # Act
                await build_and_push_image(
                    mock_logger, project_root, "test-proj", "us-central1", "repo"
                )

        # Assert
        mock_create.assert_called_once_with(project_root, mock_logger)

    @pytest.mark.asyncio
    async def test_build_and_push_image_constructs_correct_image_tag(self, tmp_path):
        """Test build_and_push_image constructs correct GCP image tag format."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")
        mock_logger = Mock()

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock):
            # Act
            result = await build_and_push_image(
                mock_logger, project_root, "my-project", "europe-west1", "my-repo"
            )

        # Assert
        assert result == "europe-west1-docker.pkg.dev/my-project/my-repo/job-scraper:latest"

    @pytest.mark.asyncio
    async def test_build_and_push_image_passes_correct_gcloud_args(self, tmp_path):
        """Test build_and_push_image passes correct arguments to gcloud."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")
        mock_logger = Mock()

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            # Act
            await build_and_push_image(
                mock_logger, project_root, "test-proj", "us-central1", "repo"
            )

        # Assert
        call_args = mock_run.call_args[0][0]
        assert call_args[0] == "gcloud"
        assert call_args[1] == "builds"
        assert call_args[2] == "submit"
        assert "--tag" in call_args
        assert str(project_root) in call_args

    @pytest.mark.asyncio
    async def test_build_and_push_image_handles_build_failure_with_fallback(self, tmp_path):
        """Test build_and_push_image creates simple Dockerfile on failure."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")
        mock_logger = Mock()

        # First call fails, second succeeds
        mock_run_command = AsyncMock(side_effect=[RuntimeError("Build failed"), None])

        with patch("cloud.providers.gcp.cloud_run.run_command", mock_run_command):
            with patch("cloud.providers.gcp.cloud_run._create_simple_dockerfile") as mock_simple:
                # Act
                result = await build_and_push_image(
                    mock_logger, project_root, "test-proj", "us-central1", "repo"
                )

        # Assert
        assert mock_run_command.call_count == 2
        mock_simple.assert_called_once_with(project_root, mock_logger)
        assert "job-scraper:latest" in result

    @pytest.mark.asyncio
    async def test_build_and_push_image_logs_messages(self, tmp_path):
        """Test build_and_push_image logs appropriate messages."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")
        mock_logger = Mock()

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock):
            # Act
            await build_and_push_image(
                mock_logger, project_root, "test-proj", "us-central1", "repo"
            )

        # Assert
        mock_logger.info.assert_any_call("Building container image via Cloud Build")
        mock_logger.info.assert_any_call("Starting Cloud Build (this may take 3-5 minutes)...")

    @pytest.mark.asyncio
    async def test_build_and_push_image_passes_retry_config(self, tmp_path):
        """Test build_and_push_image passes retry configuration to run_command."""
        # Arrange
        project_root = tmp_path
        dockerfile = project_root / "Dockerfile"
        dockerfile.write_text("FROM python:3.12-slim\n")
        mock_logger = Mock()

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            # Act
            await build_and_push_image(
                mock_logger, project_root, "test-proj", "us-central1", "repo"
            )

        # Assert
        assert mock_run.call_args[1]["retries"] == 3
        assert mock_run.call_args[1]["delay"] == 10
        assert mock_run.call_args[1]["stream_output"] is True


class TestCreateDockerfile:
    """Test suite for _create_dockerfile function."""

    def test_create_dockerfile_writes_file(self, tmp_path):
        """Test _create_dockerfile creates Dockerfile with correct content."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        assert dockerfile_path.exists()
        content = dockerfile_path.read_text()
        assert "FROM python:3.12-slim" in content
        assert "WORKDIR /app" in content

    def test_create_dockerfile_includes_requirements_install(self, tmp_path):
        """Test _create_dockerfile includes requirements installation."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "COPY requirements.txt" in content
        assert "pip install" in content

    def test_create_dockerfile_sets_pythonpath(self, tmp_path):
        """Test _create_dockerfile sets PYTHONPATH environment variable."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "ENV PYTHONPATH=" in content
        assert "deploy/common/app/src" in content

    def test_create_dockerfile_includes_cmd(self, tmp_path):
        """Test _create_dockerfile includes CMD instruction."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "CMD" in content
        assert "agent.py" in content

    def test_create_dockerfile_logs_creation(self, tmp_path):
        """Test _create_dockerfile logs file creation."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_dockerfile(project_root, mock_logger)

        # Assert
        mock_logger.info.assert_called_once()
        assert "Created Dockerfile at" in mock_logger.info.call_args[0][0]


class TestCreateSimpleDockerfile:
    """Test suite for _create_simple_dockerfile function."""

    def test_create_simple_dockerfile_writes_file(self, tmp_path):
        """Test _create_simple_dockerfile creates minimal Dockerfile."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_simple_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        assert dockerfile_path.exists()
        content = dockerfile_path.read_text()
        assert "FROM python:3.12-slim" in content

    def test_create_simple_dockerfile_includes_test_script(self, tmp_path):
        """Test _create_simple_dockerfile includes test script creation."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_simple_dockerfile(project_root, mock_logger)

        # Assert
        dockerfile_path = project_root / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "echo" in content
        assert "test.py" in content
        assert "Job scraper container is working!" in content

    def test_create_simple_dockerfile_logs_creation(self, tmp_path):
        """Test _create_simple_dockerfile logs file creation."""
        # Arrange
        project_root = tmp_path
        mock_logger = Mock()

        # Act
        _create_simple_dockerfile(project_root, mock_logger)

        # Assert
        mock_logger.info.assert_called_once()
        assert "Created simple test Dockerfile" in mock_logger.info.call_args[0][0]


class TestCreateOrUpdateJob:
    """Test suite for create_or_update_job function."""

    @pytest.mark.asyncio
    async def test_create_or_update_job_creates_new_job_when_not_exists(self):
        """Test create_or_update_job creates job when it doesn't exist."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)  # Job doesn't exist

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]  # describe fails, create succeeds

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        assert mock_run.call_count == 2
        create_call = mock_run.call_args_list[1][0][0]
        assert "create" in create_call
        assert "test-job" in create_call

    @pytest.mark.asyncio
    async def test_create_or_update_job_updates_existing_job(self):
        """Test create_or_update_job updates job when it exists."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=0)  # Job exists

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]  # describe succeeds, update succeeds

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        assert mock_run.call_count == 2
        update_call = mock_run.call_args_list[1][0][0]
        assert "update" in update_call
        assert "test-job" in update_call

    @pytest.mark.asyncio
    async def test_create_or_update_job_includes_secrets(self):
        """Test create_or_update_job includes secret configuration."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "my-prefs-secret",
                "my-webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        command_str = " ".join(command)
        assert "--set-secrets" in command_str
        assert "my-prefs-secret" in command_str
        assert "my-webhook-secret" in command_str

    @pytest.mark.asyncio
    async def test_create_or_update_job_includes_env_vars(self):
        """Test create_or_update_job includes environment variables."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "my-bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        command_str = " ".join(command)
        assert "--set-env-vars" in command_str
        assert "JOB_RUN_MODE=poll" in command_str
        assert "STORAGE_BUCKET=my-bucket" in command_str

    @pytest.mark.asyncio
    async def test_create_or_update_job_includes_vpc_connector(self):
        """Test create_or_update_job includes VPC connector configuration."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "my-vpc-connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        assert "--vpc-connector" in command
        assert "my-vpc-connector" in command
        assert "--vpc-egress=all-traffic" in command

    @pytest.mark.asyncio
    async def test_create_or_update_job_sets_resource_limits(self):
        """Test create_or_update_job sets CPU and memory limits."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        assert "--cpu=1" in command
        assert "--memory=512Mi" in command

    @pytest.mark.asyncio
    async def test_create_or_update_job_sets_timeout_and_retries(self):
        """Test create_or_update_job sets task timeout and max retries."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        assert "--max-retries=1" in command
        assert "--task-timeout=1800s" in command

    @pytest.mark.asyncio
    async def test_create_or_update_job_uses_gen2_environment(self):
        """Test create_or_update_job uses gen2 execution environment."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        command = mock_run.call_args_list[1][0][0]
        assert "--execution-environment=gen2" in command

    @pytest.mark.asyncio
    async def test_create_or_update_job_logs_appropriately(self):
        """Test create_or_update_job logs appropriate messages."""
        # Arrange
        mock_logger = Mock()
        mock_result = Mock(returncode=1)

        with patch("cloud.providers.gcp.cloud_run.run_command", new_callable=AsyncMock) as mock_run:
            mock_run.side_effect = [mock_result, None]

            # Act
            await create_or_update_job(
                mock_logger,
                "test-proj",
                "us-central1",
                "test-job",
                "image:latest",
                "sa@project.iam.gserviceaccount.com",
                "poll",
                "bucket",
                "connector",
                "prefs-secret",
                "webhook-secret",
            )

        # Assert
        mock_logger.info.assert_any_call("Configuring Cloud Run Job")
        mock_logger.info.assert_any_call("Job 'test-job' not found. Creating...")
