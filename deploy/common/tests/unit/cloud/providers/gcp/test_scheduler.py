"""Comprehensive tests for cloud.providers.gcp.scheduler module.

Tests Cloud Scheduler job creation and management for automated runs.
Following pytest architect best practices with mocking and error handling.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from cloud.providers.gcp.scheduler import schedule_job


class TestScheduleJob:
    """Test Cloud Scheduler job management."""

    @pytest.mark.asyncio
    async def test_schedule_job_success(self):
        """Should create scheduler job with correct parameters."""
        logger = MagicMock()
        project_id = "test-project"
        region = "us-central1"
        job_name = "job-scraper"
        scheduler_region = "us-central1"
        scheduler_sa = "scheduler@test-project.iam.gserviceaccount.com"
        schedule_frequency = "0 6-18 * * 1-5"

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()

            await schedule_job(
                logger,
                project_id,
                region,
                job_name,
                scheduler_region,
                scheduler_sa,
                schedule_frequency
            )

        # Should attempt create then update
        assert mock_run.call_count == 2

        # Check create command
        create_call = mock_run.call_args_list[0]
        create_cmd = create_call[0][0]
        assert "gcloud" in create_cmd
        assert "scheduler" in create_cmd
        assert "create" in create_cmd
        assert "http" in create_cmd
        assert f"{job_name}-schedule" in create_cmd
        assert any(f"--location={scheduler_region}" in arg for arg in create_cmd)
        assert any(f"--schedule={schedule_frequency}" in arg for arg in create_cmd)

    @pytest.mark.asyncio
    async def test_schedule_job_missing_scheduler_region_raises(self):
        """Should raise RuntimeError if scheduler region not configured."""
        logger = MagicMock()

        with pytest.raises(RuntimeError, match="Scheduler region not configured"):
            await schedule_job(
                logger,
                "test-project",
                "us-central1",
                "job-scraper",
                None,  # Missing scheduler_region
                "scheduler@test.iam.gserviceaccount.com",
                "0 6-18 * * 1-5"
            )

    @pytest.mark.asyncio
    async def test_schedule_job_missing_project_id_raises(self):
        """Should raise RuntimeError if required parameters missing."""
        logger = MagicMock()

        with pytest.raises(RuntimeError, match="Project ID, region, and job name"):
            await schedule_job(
                logger,
                None,  # Missing project_id
                "us-central1",
                "job-scraper",
                "us-central1",
                "scheduler@test.iam.gserviceaccount.com",
                "0 6-18 * * 1-5"
            )

    @pytest.mark.asyncio
    async def test_schedule_job_builds_correct_uri(self):
        """Should build correct Cloud Run job URI."""
        logger = MagicMock()
        project_id = "test-project-123"
        region = "us-west1"
        job_name = "my-job"

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()
            
            with patch("cloud.providers.gcp.scheduler.build_google_api_url") as mock_build_url:
                mock_build_url.return_value = "https://run.googleapis.com/..."

                await schedule_job(
                    logger,
                    project_id,
                    region,
                    job_name,
                    "us-central1",
                    "scheduler@test.iam.gserviceaccount.com",
                    "0 6-18 * * 1-5"
                )

        # Verify build_google_api_url was called with correct parameters
        mock_build_url.assert_called_once()
        call_kwargs = mock_build_url.call_args[1]
        assert call_kwargs["host"] == "run.googleapis.com"
        segments = call_kwargs["segments"]
        assert project_id in segments
        assert region in segments
        assert f"{job_name}:run" in segments

    @pytest.mark.asyncio
    async def test_schedule_job_with_retries(self):
        """Should use retries for command execution."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()

            await schedule_job(
                logger,
                "test-project",
                "us-central1",
                "job-scraper",
                "us-central1",
                "scheduler@test.iam.gserviceaccount.com",
                "0 6-18 * * 1-5"
            )

        # Check that retries are configured
        for call in mock_run.call_args_list:
            assert call[1]["retries"] == 3
            assert call[1]["delay"] == 5

    @pytest.mark.asyncio
    async def test_schedule_job_update_command_format(self):
        """Should create update command by modifying create command."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()

            await schedule_job(
                logger,
                "test-project",
                "us-central1",
                "job-scraper",
                "us-central1",
                "scheduler@test.iam.gserviceaccount.com",
                "0 6-18 * * 1-5"
            )

        # Second call should be update
        update_call = mock_run.call_args_list[1]
        update_cmd = update_call[0][0]
        assert "update" in update_cmd
        assert "create" not in update_cmd

    @pytest.mark.asyncio
    async def test_schedule_job_uses_oidc_authentication(self):
        """Should configure OIDC authentication for scheduler."""
        logger = MagicMock()
        scheduler_sa = "scheduler@test-project.iam.gserviceaccount.com"

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()

            await schedule_job(
                logger,
                "test-project",
                "us-central1",
                "job-scraper",
                "us-central1",
                scheduler_sa,
                "0 6-18 * * 1-5"
            )

        # Check create command for OIDC flags
        create_cmd = mock_run.call_args_list[0][0][0]
        cmd_str = " ".join(create_cmd)
        assert f"--oidc-service-account-email={scheduler_sa}" in cmd_str

    @pytest.mark.parametrize(
        "schedule,description",
        [
            ("0 6-18 * * 1-5", "business-hours-weekdays"),
            ("0 */4 * * *", "every-4-hours"),
            ("0 0 * * *", "daily-midnight"),
            ("*/15 * * * *", "every-15-minutes"),
        ],
        ids=["business-hours", "every-4-hours", "daily", "frequent"]
    )
    @pytest.mark.asyncio
    async def test_schedule_job_various_schedules(self, schedule, description):
        """Should handle various schedule frequency patterns."""
        logger = MagicMock()

        with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
            mock_run.return_value = AsyncMock()

            await schedule_job(
                logger,
                "test-project",
                "us-central1",
                "job-scraper",
                "us-central1",
                "scheduler@test.iam.gserviceaccount.com",
                schedule
            )

        # Verify schedule is passed correctly
        create_cmd = mock_run.call_args_list[0][0][0]
        assert any(f"--schedule={schedule}" in arg for arg in create_cmd)


@pytest.mark.asyncio
async def test_schedule_job_http_method_post():
    """Should configure scheduler to use HTTP POST method."""
    logger = MagicMock()

    with patch("cloud.providers.gcp.scheduler.run_command") as mock_run:
        mock_run.return_value = AsyncMock()

        await schedule_job(
            logger,
            "test-project",
            "us-central1",
            "job-scraper",
            "us-central1",
            "scheduler@test.iam.gserviceaccount.com",
            "0 6-18 * * 1-5"
        )

    create_cmd = mock_run.call_args_list[0][0][0]
    assert "--http-method=POST" in create_cmd
    assert "--message-body={}" in create_cmd
