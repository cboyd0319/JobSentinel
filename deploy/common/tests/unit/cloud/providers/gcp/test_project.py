"""Comprehensive tests for GCP project management module.

Tests project creation, billing account selection, and project management flows.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

# Import module under test
from providers.gcp import project


class TestCreateProject:
    """Test GCP project creation."""

    @pytest.mark.asyncio
    async def test_create_project_success(self, mocker):
        """Should create project, link billing, and set as active."""
        # Arrange
        mock_logger = MagicMock()
        project_id = "test-project-123"
        project_name = "Test Project"
        billing_account = "ABCDEF-123456-ABCDEF"
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        await project.create_project(mock_logger, project_id, project_name, billing_account)
        
        # Assert
        assert mock_run_command.call_count == 3
        
        # Check project creation command
        calls = mock_run_command.call_args_list
        assert calls[0][0][0] == [
            "gcloud", "projects", "create", project_id,
            f"--name={project_name}"
        ]
        
        # Check billing link command
        assert calls[1][0][0] == [
            "gcloud", "billing", "projects", "link", project_id,
            f"--billing-account={billing_account}"
        ]
        
        # Check set active project command
        assert calls[2][0][0] == [
            "gcloud", "config", "set", "project", project_id
        ]
        
        mock_logger.info.assert_any_call(f"Creating GCP project: {project_id}")
        mock_logger.info.assert_any_call(f"Linking billing account: {billing_account}")
        mock_logger.info.assert_any_call(f"[OK] Project {project_id} created and configured")

    @pytest.mark.asyncio
    async def test_create_project_with_special_characters(self, mocker):
        """Should handle project names with special characters."""
        # Arrange
        mock_logger = MagicMock()
        project_id = "test-project-2025"
        project_name = "Test & Dev Project (2025)"
        billing_account = "ABCDEF-123456-ABCDEF"
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        await project.create_project(mock_logger, project_id, project_name, billing_account)
        
        # Assert
        calls = mock_run_command.call_args_list
        assert project_name in calls[0][0][0][4]

    @pytest.mark.asyncio
    async def test_create_project_passes_logger_to_commands(self, mocker):
        """Should pass logger to all run_command calls."""
        # Arrange
        mock_logger = MagicMock()
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            return_value=AsyncMock()
        )
        
        # Act
        await project.create_project(mock_logger, "test-id", "Test", "billing-123")
        
        # Assert
        for call in mock_run_command.call_args_list:
            assert call[1]["logger"] == mock_logger

    @pytest.mark.asyncio
    async def test_create_project_raises_on_creation_failure(self, mocker):
        """Should propagate RuntimeError when project creation fails."""
        # Arrange
        mock_logger = MagicMock()
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            side_effect=RuntimeError("Project creation failed")
        )
        
        # Act & Assert
        with pytest.raises(RuntimeError, match="Project creation failed"):
            await project.create_project(mock_logger, "test-id", "Test", "billing-123")


class TestChooseBillingAccount:
    """Test billing account selection logic."""

    @pytest.mark.asyncio
    async def test_choose_billing_account_single_open_account(self, mocker):
        """Should auto-select single open billing account."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/ABCDEF-123456-ABCDEF",
                "displayName": "My Billing Account",
                "open": True
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            return_value=mock_result
        )
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        assert result == "ABCDEF-123456-ABCDEF"
        mock_logger.info.assert_any_call("Open billing account detected: ABCDEF-123456-ABCDEF")

    @pytest.mark.asyncio
    async def test_choose_billing_account_no_accounts_exits(self, mocker):
        """Should exit with error when no billing accounts found."""
        # Arrange
        mock_logger = MagicMock()
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps([])
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        # Act & Assert
        with pytest.raises(SystemExit) as exc_info:
            await project.choose_billing_account(mock_logger, no_prompt=False)
        
        assert exc_info.value.code == 1
        mock_logger.error.assert_called_once_with(
            "No billing accounts detected. Create one in the console and re-run."
        )

    @pytest.mark.asyncio
    async def test_choose_billing_account_single_non_open_account(self, mocker):
        """Should auto-select single billing account even if not open."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/ABCDEF-123456-ABCDEF",
                "displayName": "My Billing Account",
                "open": False
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        assert result == "ABCDEF-123456-ABCDEF"
        mock_logger.info.assert_any_call("Billing account detected: ABCDEF-123456-ABCDEF")

    @pytest.mark.asyncio
    async def test_choose_billing_account_multiple_open_prompts_user(self, mocker):
        """Should prompt user when multiple open accounts exist."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": True
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Account 2",
                "open": True
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        # Mock choose function to return first account
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="AAAAAA-111111-AAAAAA (Account 1) [OPEN]"
        )
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        assert result == "AAAAAA-111111-AAAAAA"
        mock_choose.assert_called_once()
        
        # Verify choices include both accounts with status
        call_args = mock_choose.call_args[0]
        assert "AAAAAA-111111-AAAAAA (Account 1) [OPEN]" in call_args[1]
        assert "BBBBBB-222222-BBBBBB (Account 2) [OPEN]" in call_args[1]

    @pytest.mark.asyncio
    async def test_choose_billing_account_mixed_open_closed_single_open(self, mocker):
        """Should auto-select single open account even if closed accounts exist."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Open Account",
                "open": True
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Closed Account",
                "open": False
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert - should auto-select the single open account
        assert result == "AAAAAA-111111-AAAAAA"
        mock_logger.info.assert_any_call("Open billing account detected: AAAAAA-111111-AAAAAA")

    @pytest.mark.asyncio
    async def test_choose_billing_account_multiple_open_filters_closed(self, mocker):
        """Should filter out closed accounts when multiple open accounts exist."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Open Account 1",
                "open": True
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Open Account 2",
                "open": True
            },
            {
                "name": "billingAccounts/CCCCCC-333333-CCCCCC",
                "displayName": "Closed Account",
                "open": False
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="AAAAAA-111111-AAAAAA (Open Account 1) [OPEN]"
        )
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        mock_logger.info.assert_any_call("Using open billing accounts")
        
        # Verify only open accounts in choices (closed account filtered out)
        call_args = mock_choose.call_args[0]
        choices = call_args[1]
        assert len(choices) == 2  # Only the two open accounts
        assert all("[OPEN]" in choice for choice in choices)
        assert "Closed Account" not in str(choices)

    @pytest.mark.asyncio
    async def test_choose_billing_account_extracts_id_from_selection(self, mocker):
        """Should correctly extract billing account ID from user selection."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": True
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        # Mock choose to return formatted selection with extra info
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="AAAAAA-111111-AAAAAA (Account 1) [OPEN]"
        )
        
        # Act
        result = await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert - should extract just the ID (first part before space)
        assert result == "AAAAAA-111111-AAAAAA"

    @pytest.mark.asyncio
    async def test_choose_billing_account_passes_no_prompt_to_choose(self, mocker):
        """Should pass no_prompt flag to choose function."""
        # Arrange
        mock_logger = MagicMock()
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": True
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Account 2",
                "open": True
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="AAAAAA-111111-AAAAAA (Account 1) [OPEN]"
        )
        
        # Act
        await project.choose_billing_account(mock_logger, no_prompt=True)
        
        # Assert
        call_args = mock_choose.call_args[0]
        assert call_args[2] is True  # no_prompt parameter

    @pytest.mark.asyncio
    async def test_choose_billing_account_calls_gcloud_list_command(self, mocker):
        """Should call gcloud billing accounts list with correct format."""
        # Arrange
        mock_logger = MagicMock()
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps([
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": True
            }
        ])
        
        mock_run_command = mocker.patch(
            "providers.gcp.project.run_command",
            return_value=mock_result
        )
        
        # Act
        await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        mock_run_command.assert_called_once()
        call_args = mock_run_command.call_args[0]
        assert call_args[0] == ["gcloud", "billing", "accounts", "list", "--format=json"]
        assert mock_run_command.call_args[1]["capture_output"] is True

    @pytest.mark.asyncio
    async def test_choose_billing_account_formats_open_status_correctly(self, mocker):
        """Should format account status correctly in choices."""
        # Arrange
        mock_logger = MagicMock()
        # Two open accounts to ensure choose is called
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": True
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Account 2",
                "open": True
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="BBBBBB-222222-BBBBBB (Account 2) [OPEN]"
        )
        
        # Act
        await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        call_args = mock_choose.call_args[0]
        choices = call_args[1]
        # All choices should have [OPEN] status
        assert all("[OPEN]" in choice for choice in choices)
        
    @pytest.mark.asyncio
    async def test_choose_billing_account_formats_closed_status_correctly(self, mocker):
        """Should format closed account status correctly when no open accounts exist."""
        # Arrange
        mock_logger = MagicMock()
        # Two closed accounts to ensure choose is called
        accounts_data = [
            {
                "name": "billingAccounts/AAAAAA-111111-AAAAAA",
                "displayName": "Account 1",
                "open": False
            },
            {
                "name": "billingAccounts/BBBBBB-222222-BBBBBB",
                "displayName": "Account 2",
                "open": False
            }
        ]
        
        mock_result = AsyncMock()
        mock_result.stdout = json.dumps(accounts_data)
        
        mocker.patch("providers.gcp.project.run_command", return_value=mock_result)
        
        mock_choose = mocker.patch(
            "providers.gcp.project.choose",
            return_value="BBBBBB-222222-BBBBBB (Account 2) [CLOSED]"
        )
        
        # Act
        await project.choose_billing_account(mock_logger, no_prompt=False)
        
        # Assert
        call_args = mock_choose.call_args[0]
        choices = call_args[1]
        # All choices should have [CLOSED] status
        assert all("[CLOSED]" in choice for choice in choices)
