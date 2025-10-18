"""
Comprehensive tests for jsa.windows_shortcuts module.

Tests Windows desktop shortcut creation including:
- Shortcut creation via COM interface
- Fallback batch file creation
- Multi-shortcut setup
- Platform detection
- Edge cases and error handling
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from jsa.windows_shortcuts import (
    _create_batch_shortcut,
    create_desktop_shortcut,
    create_jobsentinel_shortcuts,
    main,
)


class TestCreateDesktopShortcut:
    """Test create_desktop_shortcut function."""

    def test_returns_false_on_non_windows_platform(self):
        """Test that function returns False on non-Windows platforms."""
        with patch("jsa.windows_shortcuts.sys.platform", "linux"):
            result = create_desktop_shortcut("test", "target.exe")
            assert result is False

    @pytest.mark.parametrize(
        "platform",
        ["darwin", "linux", "linux2", "freebsd"],
        ids=["macos", "linux", "linux2", "freebsd"],
    )
    def test_returns_false_on_various_non_windows_platforms(self, platform):
        """Test function returns False on various non-Windows platforms."""
        with patch("jsa.windows_shortcuts.sys.platform", platform):
            result = create_desktop_shortcut("test", "target.exe")
            assert result is False

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    def test_creates_shortcut_with_win32com(self, tmp_path, monkeypatch):
        """Test successful shortcut creation with win32com."""
        # Arrange
        mock_shell = MagicMock()
        mock_shortcut = MagicMock()
        mock_shell.CreateShortcut.return_value = mock_shortcut

        mock_dispatch = MagicMock(return_value=mock_shell)

        mock_win32com = MagicMock()
        mock_win32com.client.Dispatch = mock_dispatch

        monkeypatch.setitem(sys.modules, "win32com", mock_win32com)
        monkeypatch.setitem(sys.modules, "win32com.client", mock_win32com.client)

        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = create_desktop_shortcut(
                name="TestApp",
                target="C:\\test\\app.exe",
                arguments="--test",
                description="Test Application",
                icon="C:\\test\\app.ico",
                working_dir="C:\\test",
            )

        # Assert
        assert result is True
        mock_dispatch.assert_called_once_with("WScript.Shell")
        mock_shell.CreateShortcut.assert_called_once()
        assert mock_shortcut.TargetPath == "C:\\test\\app.exe"
        assert mock_shortcut.Arguments == "--test"
        assert mock_shortcut.Description == "Test Application"
        assert mock_shortcut.WorkingDirectory == "C:\\test"
        assert mock_shortcut.IconLocation == "C:\\test\\app.ico"
        mock_shortcut.Save.assert_called_once()

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    def test_creates_shortcut_without_optional_params(self, tmp_path, monkeypatch):
        """Test shortcut creation with minimal parameters."""
        # Arrange
        mock_shell = MagicMock()
        mock_shortcut = MagicMock()
        mock_shell.CreateShortcut.return_value = mock_shortcut

        mock_dispatch = MagicMock(return_value=mock_shell)

        mock_win32com = MagicMock()
        mock_win32com.client.Dispatch = mock_dispatch

        monkeypatch.setitem(sys.modules, "win32com", mock_win32com)
        monkeypatch.setitem(sys.modules, "win32com.client", mock_win32com.client)

        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = create_desktop_shortcut(
                name="MinimalApp", target="C:\\app\\minimal.exe"
            )

        # Assert
        assert result is True
        assert mock_shortcut.Arguments == ""
        assert mock_shortcut.Description == ""
        # Working dir should be set (will be target's parent)
        assert isinstance(mock_shortcut.WorkingDirectory, str)

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    @patch("jsa.windows_shortcuts._create_batch_shortcut", return_value=True)
    def test_falls_back_to_batch_on_import_error(self, mock_batch, tmp_path):
        """Test fallback to batch file when win32com is not available."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        # Mock the import to raise ImportError
        with patch("builtins.__import__", side_effect=ImportError("win32com not available")):
            with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
                # Act
                result = create_desktop_shortcut(
                    name="TestApp", target="C:\\test\\app.exe", arguments="--test"
                )

        # Assert
        assert result is True
        mock_batch.assert_called_once_with(
            "TestApp", "C:\\test\\app.exe", "--test", None
        )

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    def test_handles_com_errors_gracefully(self, tmp_path, monkeypatch, capsys):
        """Test graceful handling of COM errors."""
        # Arrange
        def raise_com_error(*args, **kwargs):
            raise Exception("COM Error: Access denied")

        mock_win32com = MagicMock()
        mock_win32com.client.Dispatch.side_effect = raise_com_error

        monkeypatch.setitem(sys.modules, "win32com", mock_win32com)
        monkeypatch.setitem(sys.modules, "win32com.client", mock_win32com.client)

        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = create_desktop_shortcut("TestApp", "C:\\test\\app.exe")

        # Assert
        assert result is False
        captured = capsys.readouterr()
        assert "Warning: Could not create shortcut" in captured.out


class TestCreateBatchShortcut:
    """Test _create_batch_shortcut fallback function."""

    def test_creates_basic_batch_file(self, tmp_path):
        """Test creation of basic batch file."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="TestBatch", target="C:\\test\\app.exe", arguments="--arg1 --arg2"
            )

        # Assert
        assert result is True
        batch_file = desktop / "TestBatch.bat"
        assert batch_file.exists()

        content = batch_file.read_text(encoding="utf-8")
        assert "@echo off" in content
        assert "TestBatch - JobSentinel Launcher" in content
        assert '"C:\\test\\app.exe" --arg1 --arg2' in content

    def test_creates_batch_file_with_working_directory(self, tmp_path):
        """Test batch file creation with working directory."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="TestBatch",
                target="C:\\test\\app.exe",
                arguments="",
                working_dir="C:\\my\\work\\dir",
            )

        # Assert
        assert result is True
        batch_file = desktop / "TestBatch.bat"
        content = batch_file.read_text(encoding="utf-8")

        assert "C:" in content
        assert 'cd /d "C:\\my\\work\\dir"' in content

    def test_creates_batch_file_without_working_directory(self, tmp_path):
        """Test batch file creation without working directory."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="Simple", target="app.exe", arguments="--flag"
            )

        # Assert
        assert result is True
        batch_file = desktop / "Simple.bat"
        content = batch_file.read_text(encoding="utf-8")

        assert "cd /d" not in content
        assert '"app.exe" --flag' in content

    def test_handles_write_errors_gracefully(self, tmp_path, capsys):
        """Test graceful handling of write errors."""
        # Arrange
        desktop = tmp_path / "Desktop"
        # Don't create desktop directory to cause error

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut("Test", "app.exe")

        # Assert
        assert result is False
        captured = capsys.readouterr()
        assert "Warning: Could not create batch file" in captured.out

    @pytest.mark.parametrize(
        "target,arguments",
        [
            ("notepad.exe", "file.txt"),
            ("C:\\Program Files\\App\\app.exe", "--flag"),
            ("python", "-m module"),
        ],
        ids=["simple", "with_spaces", "module"],
    )
    def test_handles_various_targets_and_arguments(self, tmp_path, target, arguments):
        """Test batch file creation with various targets and arguments."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="Test", target=target, arguments=arguments
            )

        # Assert
        assert result is True
        batch_file = desktop / "Test.bat"
        content = batch_file.read_text(encoding="utf-8")
        assert f'"{target}" {arguments}' in content


class TestCreateJobsentinelShortcuts:
    """Test create_jobsentinel_shortcuts function."""

    def test_creates_all_shortcuts(self, tmp_path):
        """Test that all JobSentinel shortcuts are attempted."""
        # Arrange
        project_root = tmp_path / "jobsentinel"
        project_root.mkdir()

        with patch(
            "jsa.windows_shortcuts.create_desktop_shortcut", return_value=True
        ) as mock_create:
            # Act
            results = create_jobsentinel_shortcuts(project_root)

        # Assert
        expected_shortcuts = [
            "Run JobSentinel",
            "Configure JobSentinel",
            "JobSentinel Dashboard",
            "JobSentinel Health Check",
        ]

        assert len(results) == 4
        for name in expected_shortcuts:
            assert name in results
            assert results[name] is True

        assert mock_create.call_count == 4

    def test_uses_correct_python_executable(self, tmp_path):
        """Test that shortcuts use the current Python executable."""
        # Arrange
        project_root = tmp_path / "jobsentinel"
        project_root.mkdir()

        with patch(
            "jsa.windows_shortcuts.create_desktop_shortcut", return_value=True
        ) as mock_create:
            # Act
            results = create_jobsentinel_shortcuts(project_root)

        # Assert
        for call in mock_create.call_args_list:
            kwargs = call.kwargs
            assert kwargs["target"] == sys.executable

    def test_sets_correct_working_directory(self, tmp_path):
        """Test that shortcuts have correct working directory."""
        # Arrange
        project_root = tmp_path / "jobsentinel"
        project_root.mkdir()

        with patch(
            "jsa.windows_shortcuts.create_desktop_shortcut", return_value=True
        ) as mock_create:
            # Act
            results = create_jobsentinel_shortcuts(project_root)

        # Assert
        for call in mock_create.call_args_list:
            kwargs = call.kwargs
            assert kwargs["working_dir"] == str(project_root)

    def test_handles_mixed_success_results(self, tmp_path):
        """Test handling when some shortcuts succeed and others fail."""
        # Arrange
        project_root = tmp_path / "jobsentinel"
        project_root.mkdir()

        call_count = 0

        def mock_create_with_failures(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # Succeed on 1st and 3rd calls, fail on 2nd and 4th
            return call_count in [1, 3]

        with patch(
            "jsa.windows_shortcuts.create_desktop_shortcut",
            side_effect=mock_create_with_failures,
        ):
            # Act
            results = create_jobsentinel_shortcuts(project_root)

        # Assert
        assert len(results) == 4
        success_count = sum(1 for v in results.values() if v)
        assert success_count == 2


class TestMain:
    """Test main CLI function."""

    def test_main_successful_creation(self, tmp_path, capsys):
        """Test main function with successful shortcut creation."""
        # Arrange
        with patch(
            "jsa.windows_shortcuts.create_jobsentinel_shortcuts",
            return_value={
                "Run JobSentinel": True,
                "Configure JobSentinel": True,
                "JobSentinel Dashboard": True,
                "JobSentinel Health Check": True,
            },
        ):
            # Act
            exit_code = main()

        # Assert
        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Creating JobSentinel desktop shortcuts" in captured.out
        assert "All 4 shortcuts created successfully" in captured.out
        assert "✓" in captured.out

    def test_main_partial_success(self, tmp_path, capsys):
        """Test main function with partial success."""
        # Arrange
        with patch(
            "jsa.windows_shortcuts.create_jobsentinel_shortcuts",
            return_value={
                "Run JobSentinel": True,
                "Configure JobSentinel": False,
                "JobSentinel Dashboard": True,
                "JobSentinel Health Check": False,
            },
        ):
            # Act
            exit_code = main()

        # Assert
        assert exit_code == 0  # Still returns 0 if at least one succeeded
        captured = capsys.readouterr()
        assert "2/4 shortcuts created" in captured.out

    def test_main_complete_failure(self, tmp_path, capsys):
        """Test main function with complete failure."""
        # Arrange
        with patch(
            "jsa.windows_shortcuts.create_jobsentinel_shortcuts",
            return_value={
                "Run JobSentinel": False,
                "Configure JobSentinel": False,
                "JobSentinel Dashboard": False,
                "JobSentinel Health Check": False,
            },
        ):
            # Act
            exit_code = main()

        # Assert
        assert exit_code == 1
        captured = capsys.readouterr()
        assert "No shortcuts created" in captured.out
        assert "Shortcuts require Windows platform" in captured.out

    def test_main_displays_project_root(self, capsys):
        """Test that main displays the project root path."""
        # Arrange
        with patch(
            "jsa.windows_shortcuts.create_jobsentinel_shortcuts",
            return_value={"Test": True},
        ):
            # Act
            main()

        # Assert
        captured = capsys.readouterr()
        assert "Project root:" in captured.out


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    def test_shortcut_with_empty_name(self, tmp_path, monkeypatch):
        """Test shortcut creation with empty name."""
        # Arrange
        mock_shell = MagicMock()
        mock_shortcut = MagicMock()
        mock_shell.CreateShortcut.return_value = mock_shortcut

        mock_win32com = MagicMock()
        mock_win32com.client.Dispatch = MagicMock(return_value=mock_shell)

        monkeypatch.setitem(sys.modules, "win32com", mock_win32com)
        monkeypatch.setitem(sys.modules, "win32com.client", mock_win32com.client)

        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = create_desktop_shortcut(name="", target="app.exe")

        # Assert - should still succeed, creating ".lnk"
        assert result is True

    def test_batch_file_with_unicode_path(self, tmp_path):
        """Test batch file creation with unicode paths."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="Unicode", target="C:\\测试\\app.exe", arguments="--测试"
            )

        # Assert
        assert result is True
        batch_file = desktop / "Unicode.bat"
        content = batch_file.read_text(encoding="utf-8")
        assert "测试" in content

    def test_batch_file_with_very_long_path(self, tmp_path):
        """Test batch file creation with very long paths."""
        # Arrange
        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        long_path = "C:\\" + "\\".join(["verylongdirectoryname"] * 10) + "\\app.exe"

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = _create_batch_shortcut(
                name="LongPath", target=long_path, arguments=""
            )

        # Assert
        assert result is True
        batch_file = desktop / "LongPath.bat"
        assert batch_file.exists()

    @patch("jsa.windows_shortcuts.sys.platform", "win32")
    def test_shortcut_with_special_characters_in_name(self, tmp_path, monkeypatch):
        """Test shortcut creation with special characters in name."""
        # Arrange
        mock_shell = MagicMock()
        mock_shortcut = MagicMock()
        mock_shell.CreateShortcut.return_value = mock_shortcut

        mock_win32com = MagicMock()
        mock_win32com.client.Dispatch = MagicMock(return_value=mock_shell)

        monkeypatch.setitem(sys.modules, "win32com", mock_win32com)
        monkeypatch.setitem(sys.modules, "win32com.client", mock_win32com.client)

        desktop = tmp_path / "Desktop"
        desktop.mkdir()

        with patch("jsa.windows_shortcuts.Path.home", return_value=tmp_path):
            # Act
            result = create_desktop_shortcut(
                name="Test App (v1.0)", target="app.exe"
            )

        # Assert
        assert result is True
        # Verify the shortcut path includes special chars
        call_args = mock_shell.CreateShortcut.call_args
        assert "Test App (v1.0).lnk" in call_args[0][0]
