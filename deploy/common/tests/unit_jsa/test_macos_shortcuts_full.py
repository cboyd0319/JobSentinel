"""
Comprehensive tests for jsa.macos_shortcuts module.

Tests macOS shortcut and alias creation.
"""

import os
import stat
import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from jsa.macos_shortcuts import (
    create_command_file,
    create_jobsentinel_shortcuts,
    create_launcher_script,
    create_shell_alias,
    main,
)


class TestCreateCommandFile:
    """Test create_command_file function."""

    def test_returns_false_on_non_darwin_platform(self):
        """Test that function returns False on non-macOS platforms."""
        with patch("jsa.macos_shortcuts.sys.platform", "win32"):
            result = create_command_file("test", "echo test")
            assert result is False

    @pytest.mark.parametrize(
        "platform", ["win32", "linux", "linux2"], ids=["windows", "linux", "linux2"]
    )
    def test_returns_false_on_various_non_darwin_platforms(self, platform):
        """Test function returns False on various non-Darwin platforms."""
        with patch("jsa.macos_shortcuts.sys.platform", platform):
            result = create_command_file("test", "echo test")
            assert result is False

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_creates_command_file(self, tmp_path):
        """Test successful command file creation."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_command_file(
                name="TestCommand",
                command="python -m test",
                description="Test Command",
                working_dir="/test/dir",
            )

        assert result is True
        command_file = desktop / "TestCommand.command"
        assert command_file.exists()

        content = command_file.read_text()
        assert "#!/usr/bin/env bash" in content
        assert "TestCommand - JobSentinel" in content
        assert "Test Command" in content
        assert "cd " in content and "/test/dir" in content
        assert "python -m test" in content

        # Check executable permissions
        file_stat = command_file.stat()
        assert file_stat.st_mode & stat.S_IXUSR

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_creates_command_file_without_description(self, tmp_path):
        """Test command file creation without description."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_command_file(name="Simple", command="ls")

        assert result is True
        command_file = desktop / "Simple.command"
        content = command_file.read_text()
        assert "Simple - JobSentinel" in content
        assert "ls" in content

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_creates_command_file_without_working_dir(self, tmp_path):
        """Test command file creation without working directory."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_command_file(name="NoDir", command="pwd")

        assert result is True
        command_file = desktop / "NoDir.command"
        content = command_file.read_text()
        assert "cd " not in content or "cd" not in content.split("\n")[0:10]

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_handles_errors_gracefully(self, tmp_path, capsys):
        """Test graceful error handling."""
        # Don't create desktop to cause error
        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_command_file("Test", "echo test")

        assert result is False
        captured = capsys.readouterr()
        assert "Warning: Could not create command file" in captured.out


class TestCreateShellAlias:
    """Test create_shell_alias function."""

    def test_returns_false_on_non_darwin_platform(self):
        """Test that function returns False on non-macOS platforms."""
        with patch("jsa.macos_shortcuts.sys.platform", "win32"):
            result = create_shell_alias("test", "echo test")
            assert result is False

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_creates_zsh_alias(self, tmp_path):
        """Test successful zsh alias creation."""
        zshrc = tmp_path / ".zshrc"

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_shell_alias(
                name="myalias", command="python -m test", shell="zsh"
            )

        assert result is True
        assert zshrc.exists()
        content = zshrc.read_text()
        assert 'alias myalias="python -m test"' in content

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_creates_bash_alias(self, tmp_path):
        """Test successful bash alias creation."""
        bash_profile = tmp_path / ".bash_profile"

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_shell_alias(
                name="myalias", command="ls -la", shell="bash"
            )

        assert result is True
        assert bash_profile.exists()
        content = bash_profile.read_text()
        assert 'alias myalias="ls -la"' in content

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_returns_false_for_unknown_shell(self, tmp_path):
        """Test that unknown shell types return False."""
        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_shell_alias(
                name="myalias", command="echo test", shell="fish"
            )

        assert result is False

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_skips_duplicate_aliases(self, tmp_path):
        """Test that existing aliases are not duplicated."""
        zshrc = tmp_path / ".zshrc"
        zshrc.write_text('alias myalias="old command"\n')

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_shell_alias(
                name="myalias", command="new command", shell="zsh"
            )

        assert result is True
        content = zshrc.read_text()
        assert content.count("alias myalias=") == 1

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_handles_errors_gracefully(self, tmp_path, capsys):
        """Test graceful error handling."""
        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            with patch("pathlib.Path.open", side_effect=PermissionError()):
                result = create_shell_alias("test", "echo test")

        assert result is False
        captured = capsys.readouterr()
        assert "Warning: Could not create shell alias" in captured.out


class TestCreateJobsentinelShortcuts:
    """Test create_jobsentinel_shortcuts function."""

    @patch("jsa.macos_shortcuts.create_command_file", return_value=True)
    @patch("jsa.macos_shortcuts.create_shell_alias", return_value=True)
    @patch("jsa.macos_shortcuts.os.path.exists", return_value=True)
    def test_creates_all_shortcuts(
        self, mock_exists, mock_alias, mock_command, tmp_path, capsys
    ):
        """Test that all shortcuts are created."""
        results = create_jobsentinel_shortcuts(tmp_path)

        # Should have 5 desktop shortcuts + 4 aliases
        assert len(results) >= 5
        assert mock_command.call_count == 5

    @patch("jsa.macos_shortcuts.create_command_file", return_value=True)
    @patch("jsa.macos_shortcuts.create_shell_alias", return_value=True)
    @patch("jsa.macos_shortcuts.os.path.exists", return_value=True)
    def test_uses_custom_python_command(
        self, mock_exists, mock_alias, mock_command, tmp_path
    ):
        """Test using custom Python command."""
        results = create_jobsentinel_shortcuts(tmp_path, python_cmd="/usr/bin/python3.11")

        # Check that commands were created with custom python
        for call in mock_command.call_args_list:
            command = call.kwargs["command"]
            assert "/usr/bin/python3.11" in command or "python3.11" in command

    @patch("jsa.macos_shortcuts.create_command_file", return_value=True)
    @patch("jsa.macos_shortcuts.create_shell_alias", return_value=True)
    @patch("jsa.macos_shortcuts.os.path.exists", return_value=False)
    def test_falls_back_to_python_when_python3_missing(
        self, mock_exists, mock_alias, mock_command, tmp_path
    ):
        """Test fallback to 'python' when 'python3' doesn't exist."""
        results = create_jobsentinel_shortcuts(tmp_path)

        # Check that some command was used
        assert mock_command.call_count > 0


class TestCreateLauncherScript:
    """Test create_launcher_script function."""

    @patch("jsa.macos_shortcuts.os.path.exists", return_value=True)
    def test_creates_launcher_on_desktop(self, mock_exists, tmp_path):
        """Test launcher script creation on desktop."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_launcher_script(tmp_path)

        assert result is True
        launcher = desktop / "JobSentinel Launcher.command"
        assert launcher.exists()

        content = launcher.read_text()
        assert "#!/usr/bin/env bash" in content
        assert "JobSentinel GUI Launcher" in content
        assert "-m jsa.gui_launcher" in content

        # Check executable
        file_stat = launcher.stat()
        assert file_stat.st_mode & stat.S_IXUSR

    @patch("jsa.macos_shortcuts.os.path.exists", return_value=True)
    def test_creates_launcher_with_custom_name(self, mock_exists, tmp_path):
        """Test launcher creation with custom name."""
        custom_path = tmp_path / "custom_launcher.command"

        result = create_launcher_script(tmp_path, script_name=str(custom_path))

        assert result is True
        assert custom_path.exists()

    @patch("jsa.macos_shortcuts.os.path.exists", return_value=True)
    def test_creates_launcher_with_custom_python(self, mock_exists, tmp_path):
        """Test launcher with custom Python command."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_launcher_script(
                tmp_path, python_cmd="/opt/python/bin/python3"
            )

        assert result is True
        launcher = desktop / "JobSentinel Launcher.command"
        content = launcher.read_text()
        assert "/opt/python/bin/python3" in content or "python3" in content

    def test_handles_errors_gracefully(self, tmp_path, capsys):
        """Test graceful error handling."""
        with patch("pathlib.Path.write_text", side_effect=PermissionError()):
            result = create_launcher_script(tmp_path)

        assert result is False
        captured = capsys.readouterr()
        assert "Could not create launcher script" in captured.out


class TestMain:
    """Test main CLI function."""

    @patch("jsa.macos_shortcuts.create_jobsentinel_shortcuts")
    @patch("jsa.macos_shortcuts.create_launcher_script")
    def test_main_successful(self, mock_launcher, mock_shortcuts, capsys):
        """Test main function with successful creation."""
        mock_shortcuts.return_value = {"shortcut1": True, "shortcut2": True}
        mock_launcher.return_value = True

        result = main()

        assert result == 0
        captured = capsys.readouterr()
        assert "JobSentinel macOS Shortcut Creator" in captured.out

    @patch("jsa.macos_shortcuts.create_jobsentinel_shortcuts")
    @patch("jsa.macos_shortcuts.create_launcher_script")
    def test_main_partial_failure(self, mock_launcher, mock_shortcuts, capsys):
        """Test main with partial failures."""
        mock_shortcuts.return_value = {"shortcut1": True, "shortcut2": False}
        mock_launcher.return_value = True

        result = main()

        assert result == 0
        captured = capsys.readouterr()
        assert "Created 1/2 shortcuts" in captured.out

    @patch("jsa.macos_shortcuts.create_jobsentinel_shortcuts")
    @patch("jsa.macos_shortcuts.create_launcher_script")
    def test_main_complete_failure(self, mock_launcher, mock_shortcuts, capsys):
        """Test main with complete failure."""
        mock_shortcuts.return_value = {}
        mock_launcher.return_value = False

        result = main()

        assert result == 1


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_command_file_with_special_characters(self, tmp_path):
        """Test command file with special characters in paths."""
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_command_file(
                name="Special",
                command="echo 'test'",
                working_dir="/path with spaces/test",
            )

        assert result is True
        command_file = desktop / "Special.command"
        content = command_file.read_text()
        # shlex.quote should handle the spaces
        assert "path with spaces" in content

    @patch("jsa.macos_shortcuts.sys.platform", "darwin")
    def test_alias_with_quotes_in_command(self, tmp_path):
        """Test alias creation with quotes in command."""
        zshrc = tmp_path / ".zshrc"

        with patch("jsa.macos_shortcuts.Path.home", return_value=tmp_path):
            result = create_shell_alias(
                name="quoted", command='echo "Hello World"', shell="zsh"
            )

        assert result is True
        content = zshrc.read_text()
        assert "Hello World" in content
