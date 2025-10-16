"""Comprehensive tests for GCP authentication module.

Tests authentication checking, login flows, and application default credentials setup.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

# Import module under test - note path is handled by conftest.py
from providers.gcp import auth


class TestAuthenticate:
    """Test GCP authentication flow."""

    @pytest.mark.asyncio
    async def test_authenticate_already_authenticated_with_adc(self, mocker):
        """Should skip login when already authenticated with ADC."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock successful auth check
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 0
        auth_check_result.stdout = "user@example.com"
        
        # Mock successful ADC check
        adc_check_result = AsyncMock()
        adc_check_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, adc_check_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert
        assert mock_run_command.call_count == 2
        mock_logger.info.assert_any_call("Already authenticated as user@example.com")
        mock_logger.info.assert_any_call("Application default credentials already configured")

    @pytest.mark.asyncio
    async def test_authenticate_authenticated_but_no_adc(self, mocker):
        """Should setup ADC when authenticated but ADC not configured."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock successful auth check
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 0
        auth_check_result.stdout = "user@example.com"
        
        # Mock failed ADC check
        adc_check_result = AsyncMock()
        adc_check_result.returncode = 1
        
        # Mock login commands
        login_result = AsyncMock()
        adc_login_result = AsyncMock()
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, adc_check_result, login_result, adc_login_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert
        assert mock_run_command.call_count == 4
        mock_logger.info.assert_any_call("Already authenticated as user@example.com")
        mock_logger.info.assert_any_call("Authenticating with Google Cloud")

    @pytest.mark.asyncio
    async def test_authenticate_not_authenticated(self, mocker):
        """Should perform full login when not authenticated."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock failed auth check
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 1
        auth_check_result.stdout = ""
        
        # Mock login commands
        login_result = AsyncMock()
        adc_login_result = AsyncMock()
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, login_result, adc_login_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert
        assert mock_run_command.call_count == 3
        mock_logger.info.assert_any_call("Authenticating with Google Cloud")
        
        # Verify login commands called
        calls = mock_run_command.call_args_list
        assert calls[1][0][0] == ["gcloud", "auth", "login"]
        assert calls[2][0][0] == ["gcloud", "auth", "application-default", "login"]

    @pytest.mark.asyncio
    async def test_authenticate_empty_account_triggers_login(self, mocker):
        """Should perform login when auth check returns empty account."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock auth check with empty stdout (whitespace only)
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 0
        auth_check_result.stdout = "   \n  "
        
        # Mock login commands
        login_result = AsyncMock()
        adc_login_result = AsyncMock()
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, login_result, adc_login_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert
        assert mock_run_command.call_count == 3
        mock_logger.info.assert_any_call("Authenticating with Google Cloud")

    @pytest.mark.asyncio
    async def test_authenticate_calls_correct_gcloud_commands(self, mocker):
        """Should call gcloud commands with correct arguments."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock failed auth check to trigger full login
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 1
        auth_check_result.stdout = ""
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, AsyncMock(), AsyncMock()]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert - check command arguments
        calls = mock_run_command.call_args_list
        
        # First call: auth check
        assert calls[0][0][0] == [
            "gcloud", "auth", "list",
            "--filter=status:ACTIVE",
            "--format=value(account)"
        ]
        assert calls[0][1]["capture_output"] is True
        assert calls[0][1]["check"] is False
        
        # Second call: login
        assert calls[1][0][0] == ["gcloud", "auth", "login"]
        
        # Third call: ADC login
        assert calls[2][0][0] == ["gcloud", "auth", "application-default", "login"]

    @pytest.mark.asyncio
    async def test_authenticate_passes_logger_to_run_command(self, mocker):
        """Should pass logger to all run_command calls."""
        # Arrange
        mock_logger = MagicMock()
        
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 1
        auth_check_result.stdout = ""
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, AsyncMock(), AsyncMock()]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert - all calls should include logger
        for call in mock_run_command.call_args_list:
            assert call[1]["logger"] == mock_logger

    @pytest.mark.asyncio
    async def test_authenticate_multiple_accounts_uses_first(self, mocker):
        """Should use first active account when multiple exist."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock auth check with multiple accounts (newline separated)
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 0
        auth_check_result.stdout = "user1@example.com\nuser2@example.com"
        
        # Mock successful ADC check
        adc_check_result = AsyncMock()
        adc_check_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, adc_check_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert - should report first account
        mock_logger.info.assert_any_call(
            "Already authenticated as user1@example.com\nuser2@example.com"
        )

    @pytest.mark.asyncio
    async def test_authenticate_special_characters_in_account(self, mocker):
        """Should handle account names with special characters."""
        # Arrange
        mock_logger = MagicMock()
        
        # Mock auth check with special characters
        auth_check_result = AsyncMock()
        auth_check_result.returncode = 0
        auth_check_result.stdout = "user+tag@sub.example.com"
        
        # Mock successful ADC check
        adc_check_result = AsyncMock()
        adc_check_result.returncode = 0
        
        mock_run_command = mocker.patch(
            "providers.gcp.auth.run_command",
            side_effect=[auth_check_result, adc_check_result]
        )
        
        # Act
        await auth.authenticate(mock_logger)
        
        # Assert
        mock_logger.info.assert_any_call("Already authenticated as user+tag@sub.example.com")
