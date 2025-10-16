"""Comprehensive tests for GCP regions module.

Tests region selection for Cloud Run and Cloud Scheduler.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

# Import module under test
from providers.gcp import regions


class TestSelectRegion:
    """Test Cloud Run region selection."""

    @pytest.mark.asyncio
    async def test_select_region_returns_chosen_region(self, mocker):
        """Should return the region chosen by user."""
        # Arrange
        mock_logger = MagicMock()
        chosen_region = "us-central1"
        
        mock_choose = mocker.patch("providers.gcp.regions.choose", return_value=chosen_region)
        mock_run_command = mocker.patch(
            "providers.gcp.regions.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        result = await regions.select_region(mock_logger, no_prompt=False)
        
        # Assert
        assert result == chosen_region

    @pytest.mark.asyncio
    async def test_select_region_sets_gcloud_config(self, mocker):
        """Should set gcloud run/region config with chosen region."""
        # Arrange
        mock_logger = MagicMock()
        chosen_region = "europe-west1"
        
        mocker.patch("providers.gcp.regions.choose", return_value=chosen_region)
        mock_run_command = mocker.patch(
            "providers.gcp.regions.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        await regions.select_region(mock_logger, no_prompt=False)
        
        # Assert
        mock_run_command.assert_called_once_with(
            ["gcloud", "config", "set", "run/region", chosen_region],
            logger=mock_logger
        )

    @pytest.mark.asyncio
    async def test_select_region_logs_region_selection(self, mocker):
        """Should log region selection prompt."""
        # Arrange
        mock_logger = MagicMock()
        
        mocker.patch("providers.gcp.regions.choose", return_value="us-central1")
        mocker.patch("providers.gcp.regions.run_command", return_value=AsyncMock())
        
        # Act
        await regions.select_region(mock_logger, no_prompt=False)
        
        # Assert
        mock_logger.info.assert_any_call("Select Cloud Run region")
        mock_logger.info.assert_any_call(
            "Regions are ordered by cost-effectiveness (cheapest first):"
        )

    @pytest.mark.asyncio
    async def test_select_region_passes_no_prompt(self, mocker):
        """Should pass no_prompt flag to choose function."""
        # Arrange
        mock_logger = MagicMock()
        
        mock_choose = mocker.patch("providers.gcp.regions.choose", return_value="us-central1")
        mocker.patch("providers.gcp.regions.run_command", return_value=AsyncMock())
        
        # Act
        await regions.select_region(mock_logger, no_prompt=True)
        
        # Assert
        call_args = mock_choose.call_args[0]
        assert call_args[2] is True  # no_prompt parameter

    @pytest.mark.asyncio
    async def test_select_region_includes_all_regions_in_choices(self, mocker):
        """Should include all expected regions in choices."""
        # Arrange
        mock_logger = MagicMock()
        expected_regions = [
            "us-central1",
            "us-east1",
            "us-west1",
            "europe-west1",
            "us-west2",
            "europe-west4",
            "asia-northeast1",
            "asia-southeast1",
            "australia-southeast1",
        ]
        
        mock_choose = mocker.patch("providers.gcp.regions.choose", return_value="us-central1")
        mocker.patch("providers.gcp.regions.run_command", return_value=AsyncMock())
        
        # Act
        await regions.select_region(mock_logger, no_prompt=False)
        
        # Assert
        call_args = mock_choose.call_args[0]
        actual_regions = call_args[1]
        assert actual_regions == expected_regions

    @pytest.mark.parametrize(
        "region",
        [
            "us-central1",
            "us-east1",
            "europe-west1",
            "asia-northeast1",
            "australia-southeast1",
        ],
        ids=["us-central", "us-east", "europe", "asia", "australia"]
    )
    @pytest.mark.asyncio
    async def test_select_region_handles_various_regions(self, region, mocker):
        """Should handle selection of any valid region."""
        # Arrange
        mock_logger = MagicMock()
        
        mocker.patch("providers.gcp.regions.choose", return_value=region)
        mock_run_command = mocker.patch(
            "providers.gcp.regions.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        result = await regions.select_region(mock_logger, no_prompt=False)
        
        # Assert
        assert result == region
        mock_run_command.assert_called_once_with(
            ["gcloud", "config", "set", "run/region", region],
            logger=mock_logger
        )


class TestSelectSchedulerRegion:
    """Test Cloud Scheduler region selection."""

    def test_select_scheduler_region_returns_same_if_supported(self, mocker):
        """Should return the same region if it's supported by Cloud Scheduler."""
        # Arrange
        mock_logger = MagicMock()
        region = "us-central1"
        
        # Act
        result = regions.select_scheduler_region(mock_logger, no_prompt=False, region=region)
        
        # Assert
        assert result == region
        mock_logger.info.assert_called_once_with("Select Cloud Scheduler region")

    @pytest.mark.parametrize(
        "region",
        [
            "us-central1",
            "us-east1",
            "us-east4",
            "us-west1",
            "us-west2",
            "europe-west1",
            "europe-west2",
            "asia-northeast1",
            "asia-southeast1",
            "asia-south1",
            "australia-southeast1",
        ],
        ids=[
            "us-central1", "us-east1", "us-east4", "us-west1", "us-west2",
            "europe-west1", "europe-west2", "asia-northeast1", "asia-southeast1",
            "asia-south1", "australia-southeast1"
        ]
    )
    def test_select_scheduler_region_all_supported_regions(self, region, mocker):
        """Should return the region directly for all supported regions."""
        # Arrange
        mock_logger = MagicMock()
        
        # Act
        result = regions.select_scheduler_region(mock_logger, no_prompt=False, region=region)
        
        # Assert
        assert result == region

    def test_select_scheduler_region_prompts_for_unsupported(self, mocker):
        """Should prompt user when Cloud Run region not supported by Scheduler."""
        # Arrange
        mock_logger = MagicMock()
        unsupported_region = "us-west4"
        chosen_scheduler_region = "us-west2"
        
        mock_choose = mocker.patch(
            "providers.gcp.regions.choose",
            return_value=chosen_scheduler_region
        )
        
        # Act
        result = regions.select_scheduler_region(
            mock_logger, no_prompt=False, region=unsupported_region
        )
        
        # Assert
        assert result == chosen_scheduler_region
        mock_logger.info.assert_any_call(
            "Cloud Scheduler is not available in your chosen Cloud Run region. "
            "Select the nearest supported location for the scheduler trigger."
        )

    def test_select_scheduler_region_offers_sorted_choices(self, mocker):
        """Should offer sorted list of supported regions when prompting."""
        # Arrange
        mock_logger = MagicMock()
        unsupported_region = "us-west4"
        
        mock_choose = mocker.patch("providers.gcp.regions.choose", return_value="us-west1")
        
        # Act
        regions.select_scheduler_region(mock_logger, no_prompt=False, region=unsupported_region)
        
        # Assert
        call_args = mock_choose.call_args[0]
        choices = call_args[1]
        
        # Verify choices are sorted
        assert choices == sorted(choices)
        
        # Verify all expected regions in choices
        expected_regions = {
            "asia-northeast1", "asia-south1", "asia-southeast1",
            "australia-southeast1", "europe-west1", "europe-west2",
            "us-central1", "us-east1", "us-east4", "us-west1", "us-west2"
        }
        assert set(choices) == expected_regions

    def test_select_scheduler_region_passes_no_prompt(self, mocker):
        """Should pass no_prompt flag to choose function."""
        # Arrange
        mock_logger = MagicMock()
        unsupported_region = "us-west4"
        
        mock_choose = mocker.patch("providers.gcp.regions.choose", return_value="us-west1")
        
        # Act
        regions.select_scheduler_region(mock_logger, no_prompt=True, region=unsupported_region)
        
        # Assert
        call_args = mock_choose.call_args[0]
        assert call_args[2] is True  # no_prompt parameter

    def test_select_scheduler_region_logs_selection_prompt(self, mocker):
        """Should log selection prompt message."""
        # Arrange
        mock_logger = MagicMock()
        region = "us-central1"
        
        # Act
        regions.select_scheduler_region(mock_logger, no_prompt=False, region=region)
        
        # Assert
        mock_logger.info.assert_called_once_with("Select Cloud Scheduler region")

    def test_select_scheduler_region_unsupported_examples(self, mocker):
        """Should handle various unsupported regions correctly."""
        # Arrange
        mock_logger = MagicMock()
        unsupported_regions = [
            "us-west3",
            "us-west4",
            "europe-west3",
            "asia-east1",
        ]
        
        for unsupported in unsupported_regions:
            mock_choose = mocker.patch(
                "providers.gcp.regions.choose",
                return_value="us-central1"
            )
            
            # Act
            result = regions.select_scheduler_region(
                mock_logger, no_prompt=False, region=unsupported
            )
            
            # Assert
            assert result == "us-central1"
            mock_choose.assert_called_once()
            mock_choose.reset_mock()

    def test_select_scheduler_region_returns_user_choice_for_unsupported(self, mocker):
        """Should return user's choice when region unsupported."""
        # Arrange
        mock_logger = MagicMock()
        unsupported_region = "us-west3"
        user_choice = "europe-west1"
        
        mocker.patch("providers.gcp.regions.choose", return_value=user_choice)
        
        # Act
        result = regions.select_scheduler_region(
            mock_logger, no_prompt=False, region=unsupported_region
        )
        
        # Assert
        assert result == user_choice
