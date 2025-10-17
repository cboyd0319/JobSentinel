"""
Comprehensive unit tests for cloud.providers.gcp.update module.

Tests cover:
- GCPUpdate initialization
- Interactive update workflow
- User preferences update
- File validation and reading
- Secret creation integration
- Print/display methods
- Error handling

Following Pytest Architect patterns:
- AAA (Arrange-Act-Assert) structure
- Async test support with pytest-asyncio
- Deterministic mocking (no external dependencies)
- Clear test names with scenario_expected pattern
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from cloud.providers.gcp.update import GCPUpdate


class TestGCPUpdateInit:
    """Test suite for GCPUpdate initialization."""

    def test_init_stores_project_id(self):
        """Test that __init__ stores project_id correctly."""
        # Arrange & Act
        updater = GCPUpdate(project_id="test-project-123")

        # Assert
        assert updater.project_id == "test-project-123"

    def test_init_with_empty_project_id(self):
        """Test initialization with empty project ID."""
        # Arrange & Act
        updater = GCPUpdate(project_id="")

        # Assert
        assert updater.project_id == ""

    def test_init_with_special_characters_in_project_id(self):
        """Test initialization with special characters in project ID."""
        # Arrange & Act
        updater = GCPUpdate(project_id="my-project-with-dashes-123")

        # Assert
        assert updater.project_id == "my-project-with-dashes-123"


class TestGCPUpdateRun:
    """Test suite for GCPUpdate.run() workflow."""

    @pytest.mark.asyncio
    async def test_run_calls_print_welcome(self, mocker):
        """Test that run() calls _print_welcome."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch.object(updater, "_print_welcome") as mock_welcome:
            # Mock stdin to avoid reading from terminal
            mocker.patch("builtins.input", return_value="1")
            with patch.object(
                updater, "_update_user_preferences", new_callable=AsyncMock
            ) as mock_update:
                with patch.object(updater, "_print_summary"):
                    # Act
                    await updater.run()

        # Assert
        mock_welcome.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_prompts_for_selection(self, mocker):
        """Test that run() prompts user for update selection."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch.object(updater, "_print_welcome"):
            # Mock stdin to provide selection
            mocker.patch("builtins.input", return_value="1")
            # Mock choose to capture calls
            with patch("cloud.providers.gcp.update.choose", return_value="User Preferences") as mock_choose:
                with patch.object(
                    updater, "_update_user_preferences", new_callable=AsyncMock
                ):
                    with patch.object(updater, "_print_summary"):
                        # Act
                        await updater.run()

        # Assert
        mock_choose.assert_called_once_with(
            "What would you like to update?", ["User Preferences"]
        )

    @pytest.mark.asyncio
    async def test_run_executes_selected_update_function(self):
        """Test that run() executes the selected update function."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch.object(updater, "_print_welcome"):
            with patch("cloud.providers.gcp.update.choose", return_value="User Preferences"):
                with patch.object(
                    updater, "_update_user_preferences", new_callable=AsyncMock
                ) as mock_update:
                    with patch.object(updater, "_print_summary"):
                        # Act
                        await updater.run()

        # Assert
        mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_calls_print_summary(self):
        """Test that run() calls _print_summary at the end."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch.object(updater, "_print_welcome"):
            with patch("cloud.providers.gcp.update.choose", return_value="User Preferences"):
                with patch.object(
                    updater, "_update_user_preferences", new_callable=AsyncMock
                ):
                    with patch.object(updater, "_print_summary") as mock_summary:
                        # Act
                        await updater.run()

        # Assert
        mock_summary.assert_called_once()


class TestPrintWelcome:
    """Test suite for _print_welcome method."""

    def test_print_welcome_calls_print_header(self):
        """Test that _print_welcome calls print_header with correct message."""
        # Arrange
        updater = GCPUpdate(project_id="my-project-456")

        with patch("cloud.providers.gcp.update.print_header") as mock_print_header:
            # Act
            updater._print_welcome()

        # Assert
        mock_print_header.assert_called_once_with("Google Cloud Updater for project: my-project-456")

    def test_print_welcome_with_empty_project_id(self):
        """Test _print_welcome with empty project ID."""
        # Arrange
        updater = GCPUpdate(project_id="")

        with patch("cloud.providers.gcp.update.print_header") as mock_print_header:
            # Act
            updater._print_welcome()

        # Assert
        mock_print_header.assert_called_once_with("Google Cloud Updater for project: ")


class TestUpdateUserPreferences:
    """Test suite for _update_user_preferences method."""

    @pytest.mark.asyncio
    async def test_update_user_preferences_reads_valid_file(self, tmp_path):
        """Test _update_user_preferences reads and processes a valid file."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_content = '{"key": "value", "setting": "enabled"}'
        prefs_file.write_text(prefs_content, encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", return_value=str(prefs_file)):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ) as mock_create_secret:
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_create_secret.assert_called_once_with(
            "test-project", "job-scraper-prefs", prefs_content
        )

    @pytest.mark.asyncio
    async def test_update_user_preferences_retries_on_invalid_path(self, tmp_path):
        """Test _update_user_preferences retries when invalid path is provided."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_content = '{"key": "value"}'
        prefs_file.write_text(prefs_content, encoding="utf-8")

        # Simulate user entering invalid path first, then valid path
        invalid_path = str(tmp_path / "nonexistent.json")
        valid_path = str(prefs_file)

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", side_effect=[invalid_path, valid_path]):
                with patch("builtins.print") as mock_print:
                    with patch(
                        "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                    ):
                        # Act
                        await updater._update_user_preferences()

        # Assert - verify error message was printed
        mock_print.assert_called()
        error_message = mock_print.call_args[0][0]
        assert "File not found" in error_message
        assert invalid_path in error_message

    @pytest.mark.asyncio
    async def test_update_user_preferences_handles_utf8_content(self, tmp_path):
        """Test _update_user_preferences correctly handles UTF-8 encoded content."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_content = '{"emoji": "🚀", "unicode": "日本語"}'
        prefs_file.write_text(prefs_content, encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", return_value=str(prefs_file)):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ) as mock_create_secret:
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_create_secret.assert_called_once()
        actual_content = mock_create_secret.call_args[0][2]
        assert "🚀" in actual_content
        assert "日本語" in actual_content

    @pytest.mark.asyncio
    async def test_update_user_preferences_strips_whitespace_from_path(self, tmp_path):
        """Test _update_user_preferences strips whitespace from input path."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_content = '{"key": "value"}'
        prefs_file.write_text(prefs_content, encoding="utf-8")

        # Add whitespace to the path
        path_with_whitespace = f"  {prefs_file}  "

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", return_value=path_with_whitespace):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ) as mock_create_secret:
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_create_secret.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_preferences_calls_print_header(self, tmp_path):
        """Test _update_user_preferences calls print_header."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_file.write_text('{"key": "value"}', encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header") as mock_print_header:
            with patch("builtins.input", return_value=str(prefs_file)):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ):
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_print_header.assert_called_once_with("Updating User Preferences")

    @pytest.mark.asyncio
    async def test_update_user_preferences_with_large_file(self, tmp_path):
        """Test _update_user_preferences handles large preference files."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        # Create a large JSON content (10KB+)
        large_content = '{"data": "' + ("x" * 10000) + '"}'
        prefs_file.write_text(large_content, encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", return_value=str(prefs_file)):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ) as mock_create_secret:
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_create_secret.assert_called_once()
        actual_content = mock_create_secret.call_args[0][2]
        assert len(actual_content) > 10000

    @pytest.mark.asyncio
    async def test_update_user_preferences_with_empty_file(self, tmp_path):
        """Test _update_user_preferences handles empty preference files."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_file.write_text("", encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.input", return_value=str(prefs_file)):
                with patch(
                    "cloud.providers.gcp.update.create_or_update_secret", new_callable=AsyncMock
                ) as mock_create_secret:
                    # Act
                    await updater._update_user_preferences()

        # Assert
        mock_create_secret.assert_called_once_with("test-project", "job-scraper-prefs", "")


class TestPrintSummary:
    """Test suite for _print_summary method."""

    def test_print_summary_calls_print_header(self):
        """Test that _print_summary calls print_header."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch("cloud.providers.gcp.update.print_header") as mock_print_header:
            with patch("builtins.print"):
                # Act
                updater._print_summary()

        # Assert
        mock_print_header.assert_called_once_with("Update Summary")

    def test_print_summary_prints_confirmation_message(self):
        """Test that _print_summary prints a confirmation message."""
        # Arrange
        updater = GCPUpdate(project_id="test-project")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.print") as mock_print:
                # Act
                updater._print_summary()

        # Assert
        mock_print.assert_called_once_with("The selected configuration has been updated.")


class TestIntegrationScenarios:
    """Integration-style tests covering end-to-end scenarios."""

    @pytest.mark.asyncio
    async def test_full_update_workflow(self, tmp_path):
        """Test complete update workflow from start to finish."""
        # Arrange
        updater = GCPUpdate(project_id="integration-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_file.write_text('{"setting": "value"}', encoding="utf-8")

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.print"):
                with patch("cloud.providers.gcp.update.choose", return_value="User Preferences"):
                    with patch("builtins.input", return_value=str(prefs_file)):
                        with patch(
                            "cloud.providers.gcp.update.create_or_update_secret",
                            new_callable=AsyncMock,
                        ) as mock_create_secret:
                            # Act
                            await updater.run()

        # Assert
        mock_create_secret.assert_called_once()
        assert mock_create_secret.call_args[0][0] == "integration-project"
        assert mock_create_secret.call_args[0][1] == "job-scraper-prefs"
        assert '{"setting": "value"}' in mock_create_secret.call_args[0][2]

    @pytest.mark.asyncio
    async def test_update_workflow_with_multiple_retries(self, tmp_path):
        """Test update workflow when user provides invalid paths multiple times."""
        # Arrange
        updater = GCPUpdate(project_id="retry-project")
        prefs_file = tmp_path / "user_prefs.json"
        prefs_file.write_text('{"key": "value"}', encoding="utf-8")

        # Simulate 3 invalid attempts followed by success
        invalid1 = "/nonexistent/path1.json"
        invalid2 = "/nonexistent/path2.json"
        invalid3 = "/nonexistent/path3.json"
        valid = str(prefs_file)

        with patch("cloud.providers.gcp.update.print_header"):
            with patch("builtins.print") as mock_print:
                with patch("cloud.providers.gcp.update.choose", return_value="User Preferences"):
                    with patch("builtins.input", side_effect=[invalid1, invalid2, invalid3, valid]):
                        with patch(
                            "cloud.providers.gcp.update.create_or_update_secret",
                            new_callable=AsyncMock,
                        ):
                            # Act
                            await updater.run()

        # Assert - verify error messages were printed for each invalid path
        assert mock_print.call_count >= 3
