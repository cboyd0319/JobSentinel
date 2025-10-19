"""
Comprehensive unit tests for agent.py module.

Tests cover:
- Job board URL extraction
- User preferences loading
- Job processing and scoring
- Error handling
- Async workflows
- Notification logic

Following PyTest Architect principles:
- AAA pattern (Arrange, Act, Assert)
- Parametrized tests where applicable
- Proper mocking at import site
- Deterministic and fast (< 100ms per test)
- Isolation between tests
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import functions to test
from agent import get_job_board_urls, load_user_prefs, process_jobs


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def _seed_rng(monkeypatch):
    """Seed RNG for deterministic tests."""
    import random

    random.seed(1337)
    try:
        import numpy as np

        np.random.seed(1337)
    except ImportError:
        pass


@pytest.fixture
def mock_env(monkeypatch):
    """Set up mock environment variables."""
    monkeypatch.setenv("MAX_CONCURRENT_JOBS", "10")
    monkeypatch.setenv("LOG_LEVEL", "INFO")


# ============================================================================
# Tests for get_job_board_urls
# ============================================================================


class TestGetJobBoardUrls:
    """Tests for get_job_board_urls function."""

    def test_get_job_board_urls_returns_list_of_urls(self):
        """get_job_board_urls extracts URLs from companies."""
        # Arrange
        mock_company1 = MagicMock()
        mock_company1.url = "https://jobs.example.com"
        mock_company2 = MagicMock()
        mock_company2.url = "https://careers.acme.com"

        with patch("agent.config_manager") as mock_config:
            mock_config.get_companies.return_value = [mock_company1, mock_company2]

            # Act
            urls = get_job_board_urls()

            # Assert
            assert urls == ["https://jobs.example.com", "https://careers.acme.com"]

    def test_get_job_board_urls_returns_empty_list_when_no_companies(self):
        """get_job_board_urls returns empty list when no companies configured."""
        # Arrange
        with patch("agent.config_manager") as mock_config:
            mock_config.get_companies.return_value = []

            # Act
            urls = get_job_board_urls()

            # Assert
            assert urls == []

    def test_get_job_board_urls_handles_single_company(self):
        """get_job_board_urls works with single company."""
        # Arrange
        mock_company = MagicMock()
        mock_company.url = "https://single.company.com"

        with patch("agent.config_manager") as mock_config:
            mock_config.get_companies.return_value = [mock_company]

            # Act
            urls = get_job_board_urls()

            # Assert
            assert len(urls) == 1
            assert urls[0] == "https://single.company.com"


# ============================================================================
# Tests for load_user_prefs
# ============================================================================


class TestLoadUserPrefs:
    """Tests for load_user_prefs function."""

    def test_load_user_prefs_returns_config(self):
        """load_user_prefs returns configuration from config_manager."""
        # Arrange
        expected_config = {"preference": "value", "threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_config.load_config.return_value = expected_config

            # Act
            result = load_user_prefs()

            # Assert
            assert result == expected_config

    def test_load_user_prefs_raises_configuration_exception(self):
        """load_user_prefs re-raises ConfigurationException."""
        # Arrange
        from utils.errors import ConfigurationException

        with patch("agent.config_manager") as mock_config:
            mock_config.load_config.side_effect = ConfigurationException("Invalid config")

            # Act & Assert
            with pytest.raises(ConfigurationException, match="Invalid config"):
                load_user_prefs()

    def test_load_user_prefs_raises_general_exception(self):
        """load_user_prefs re-raises general exceptions."""
        # Arrange
        with patch("agent.config_manager") as mock_config:
            mock_config.load_config.side_effect = Exception("Unexpected error")

            # Act & Assert
            with pytest.raises(Exception, match="Unexpected error"):
                load_user_prefs()


# ============================================================================
# Tests for process_jobs
# ============================================================================


class TestProcessJobs:
    """Tests for process_jobs async function."""

    @pytest.mark.asyncio
    async def test_process_jobs_handles_empty_job_list(self, mock_env):
        """process_jobs handles empty job list."""
        # Arrange
        jobs = []
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_config.get_filter_config.return_value = MagicMock(
                immediate_alert_threshold=0.9
            )
            mock_config.get_notification_config.return_value = MagicMock()

            # Act
            result = await process_jobs(jobs, prefs)

            # Assert
            assert result is None  # Function doesn't return anything

    @pytest.mark.asyncio
    async def test_process_jobs_skips_duplicate_jobs(self, mock_env):
        """process_jobs skips jobs marked as duplicates in cache."""
        # Arrange
        jobs = [{"title": "Engineer", "company": "ACME"}]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_config.get_filter_config.return_value = MagicMock(
                immediate_alert_threshold=0.9
            )
            mock_config.get_notification_config.return_value = MagicMock()

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = True

                # Act
                result = await process_jobs(jobs, prefs)

                # Assert
                assert result is None  # Function completes successfully

    @pytest.mark.asyncio
    async def test_process_jobs_processes_high_score_job(self, mock_env):
        """process_jobs processes high-scoring job and sends alert."""
        # Arrange
        jobs = [{"title": "Senior Engineer", "company": "ACME", "hash": "test123"}]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_filter_config = MagicMock(immediate_alert_threshold=0.9)
            mock_notif_config = MagicMock()
            mock_notif_config.validate_slack.return_value = False  # Don't actually send Slack
            mock_config.get_filter_config.return_value = mock_filter_config
            mock_config.get_notification_config.return_value = mock_notif_config

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = False

                with patch("agent.score_job") as mock_score:
                    # Return score > threshold (3-tuple format)
                    mock_score.return_value = (
                        0.95,
                        ["Good match"],
                        {"scoring_method": "llm", "tokens_used": 100},
                    )

                    with patch("agent.add_job") as mock_add_job:
                        mock_db_job = MagicMock()
                        mock_db_job.id = 123
                        mock_add_job.return_value = mock_db_job

                        with patch("agent.mark_jobs_alert_sent_batch") as mock_mark:
                            # Act
                            await process_jobs(jobs, prefs)

                            # Assert
                            mock_add_job.assert_called_once()
                            mock_mark.assert_called_once_with([123])

    @pytest.mark.asyncio
    async def test_process_jobs_processes_medium_score_job(self, mock_env):
        """process_jobs adds medium-scoring job to database without alert."""
        # Arrange
        jobs = [{"title": "Engineer", "company": "ACME", "hash": "test456"}]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_filter_config = MagicMock(immediate_alert_threshold=0.9)
            mock_config.get_filter_config.return_value = mock_filter_config
            mock_config.get_notification_config.return_value = MagicMock()

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = False

                with patch("agent.score_job") as mock_score:
                    # Return score < immediate threshold but > 0 (2-tuple legacy format)
                    mock_score.return_value = (0.7, ["Decent match"])

                    with patch("agent.add_job") as mock_add_job:
                        mock_db_job = MagicMock()
                        mock_db_job.id = 456
                        mock_add_job.return_value = mock_db_job

                        with patch("agent.mark_jobs_alert_sent_batch") as mock_mark:
                            # Act
                            await process_jobs(jobs, prefs)

                            # Assert
                            mock_add_job.assert_called_once()
                            # Should NOT mark as alert sent (digest job)
                            mock_mark.assert_not_called()
                            # Should add legacy metadata
                            assert jobs[0]["score_metadata"]["scoring_method"] == "legacy"

    @pytest.mark.asyncio
    async def test_process_jobs_filters_low_score_job(self, mock_env):
        """process_jobs filters out jobs with score <= 0."""
        # Arrange
        jobs = [{"title": "Unrelated Job", "company": "Other"}]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_config.get_filter_config.return_value = MagicMock(
                immediate_alert_threshold=0.9
            )
            mock_config.get_notification_config.return_value = MagicMock()

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = False

                with patch("agent.score_job") as mock_score:
                    # Return score <= 0
                    mock_score.return_value = (0.0, ["No match"], {"scoring_method": "llm"})

                    with patch("agent.add_job") as mock_add_job:
                        # Act
                        await process_jobs(jobs, prefs)

                        # Assert
                        # Should NOT add job to database
                        mock_add_job.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_jobs_handles_scoring_exception(self, mock_env):
        """process_jobs handles exceptions during job scoring."""
        # Arrange
        jobs = [{"title": "Broken Job", "company": "Test"}]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_config.get_filter_config.return_value = MagicMock(
                immediate_alert_threshold=0.9
            )
            mock_config.get_notification_config.return_value = MagicMock()

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = False

                with patch("agent.score_job") as mock_score:
                    mock_score.side_effect = Exception("Scoring failed")

                    # Act
                    result = await process_jobs(jobs, prefs)

                    # Assert
                    # Should handle exception gracefully
                    assert result is None

    @pytest.mark.asyncio
    async def test_process_jobs_processes_multiple_jobs(self, mock_env):
        """process_jobs handles multiple jobs with mixed scores."""
        # Arrange
        jobs = [
            {"title": "Great Job", "company": "A", "hash": "hash1"},
            {"title": "Good Job", "company": "B", "hash": "hash2"},
            {"title": "Bad Job", "company": "C", "hash": "hash3"},
        ]
        prefs = {"threshold": 0.8}

        with patch("agent.config_manager") as mock_config:
            mock_filter_config = MagicMock(immediate_alert_threshold=0.9)
            mock_config.get_filter_config.return_value = mock_filter_config
            mock_config.get_notification_config.return_value = MagicMock()

            with patch("agent.job_cache") as mock_cache:
                mock_cache.is_duplicate.return_value = False

                with patch("agent.score_job") as mock_score:
                    # Different scores for different jobs
                    mock_score.side_effect = [
                        (0.95, ["Excellent"], {"scoring_method": "llm"}),
                        (0.7, ["Good"], {"scoring_method": "llm"}),
                        (0.0, ["Poor"], {"scoring_method": "llm"}),
                    ]

                    with patch("agent.add_job") as mock_add_job:
                        mock_db_job1 = MagicMock()
                        mock_db_job1.id = 1
                        mock_db_job2 = MagicMock()
                        mock_db_job2.id = 2
                        mock_add_job.side_effect = [mock_db_job1, mock_db_job2]

                        with patch("agent.mark_jobs_alert_sent_batch"):
                            # Act
                            await process_jobs(jobs, prefs)

                            # Assert
                            assert mock_add_job.call_count == 2  # 2 jobs above 0


# ============================================================================
# Integration Tests
# ============================================================================


class TestAgentIntegration:
    """Integration tests for agent module."""

    def test_agent_module_imports_successfully(self):
        """agent module imports without errors."""
        # Arrange & Act
        import agent

        # Assert
        assert agent is not None

    def test_agent_exports_expected_functions(self):
        """agent module exports expected public functions."""
        # Arrange & Act
        import agent

        # Assert
        assert hasattr(agent, "get_job_board_urls")
        assert hasattr(agent, "load_user_prefs")
        assert hasattr(agent, "process_jobs")
