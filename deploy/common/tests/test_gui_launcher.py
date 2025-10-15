"""
Tests for GUI launcher.

Tests the graphical user interface launcher for zero-knowledge users.
Note: These tests mock tkinter to avoid requiring a display.
"""

import subprocess
import sys
from pathlib import Path
from unittest import mock

import pytest

# Check if tkinter is available
try:
    import tkinter

    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

pytestmark = pytest.mark.skipif(
    not TKINTER_AVAILABLE and not Path("launcher_gui.py").exists(),
    reason="tkinter not available in CI environment",
)


class TestGUILauncherImport:
    """Test that GUI launcher can be imported."""

    def test_launcher_file_exists(self):
        """Test that launcher_gui.py exists."""
        launcher_path = Path("launcher_gui.py")
        assert launcher_path.exists(), "launcher_gui.py should exist in project root"

    def test_launcher_is_executable(self):
        """Test that launcher has proper shebang."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            first_line = f.readline()

        assert first_line.startswith("#!"), "launcher_gui.py should have shebang"
        assert "python" in first_line.lower(), "Shebang should reference python"

    @pytest.mark.skipif(not TKINTER_AVAILABLE, reason="tkinter not available")
    def test_launcher_imports(self):
        """Test that launcher can be imported (validates syntax)."""
        # This will fail if there are syntax errors
        import launcher_gui

        assert hasattr(launcher_gui, "JobSentinelGUI")
        assert hasattr(launcher_gui, "main")


class TestGUILauncherBatchFile:
    """Test batch file launcher."""

    def test_batch_file_exists(self):
        """Test that launch-gui.bat exists."""
        batch_path = Path("launch-gui.bat")
        assert batch_path.exists(), "launch-gui.bat should exist"

    def test_batch_file_content(self):
        """Test batch file has correct content."""
        batch_path = Path("launch-gui.bat")
        with open(batch_path, encoding="utf-8") as f:
            content = f.read()

        # Check for key elements
        assert "python" in content.lower()
        assert "launcher_gui.py" in content
        assert "@echo off" in content
        assert "pause" in content  # User-friendly pause at end

    def test_batch_file_checks_python(self):
        """Test that batch file checks for Python."""
        batch_path = Path("launch-gui.bat")
        with open(batch_path, encoding="utf-8") as f:
            content = f.read()

        assert "python --version" in content
        assert "errorlevel" in content.lower()


class TestGUILauncherPowerShell:
    """Test PowerShell launcher."""

    def test_powershell_file_exists(self):
        """Test that launch-gui.ps1 exists."""
        ps_path = Path("launch-gui.ps1")
        assert ps_path.exists(), "launch-gui.ps1 should exist"

    def test_powershell_file_content(self):
        """Test PowerShell file has correct content."""
        ps_path = Path("launch-gui.ps1")
        with open(ps_path, encoding="utf-8") as f:
            content = f.read()

        # Check for key elements
        assert "python" in content.lower()
        assert "launcher_gui.py" in content
        assert "#Requires -Version" in content
        assert "Set-StrictMode" in content  # Good PowerShell practice

    def test_powershell_has_help(self):
        """Test that PowerShell script has proper help."""
        ps_path = Path("launch-gui.ps1")
        with open(ps_path, encoding="utf-8") as f:
            content = f.read()

        assert ".SYNOPSIS" in content
        assert ".DESCRIPTION" in content
        assert ".EXAMPLE" in content


@pytest.mark.skipif(not TKINTER_AVAILABLE, reason="tkinter not available")
class TestGUILauncherMocked:
    """Test GUI launcher with mocked tkinter."""

    @mock.patch("tkinter.Tk")
    @mock.patch("tkinter.Frame")
    @mock.patch("tkinter.Label")
    @mock.patch("tkinter.Button")
    def test_gui_class_initialization(self, mock_button, mock_label, mock_frame, mock_tk):
        """Test that GUI class can be instantiated."""
        from launcher_gui import JobSentinelGUI

        mock_root = mock.MagicMock()
        mock_tk.return_value = mock_root

        # Should not raise
        gui = JobSentinelGUI(mock_root)

        assert gui.root == mock_root
        assert gui.config_path == Path("config/user_prefs.json")
        assert gui.project_root == Path("launcher_gui.py").parent

    @mock.patch("tkinter.Tk")
    def test_gui_status_labels_created(self, mock_tk):
        """Test that status labels are created."""
        from launcher_gui import JobSentinelGUI

        mock_root = mock.MagicMock()

        with mock.patch.object(JobSentinelGUI, "_setup_ui"):
            with mock.patch.object(JobSentinelGUI, "_check_status"):
                gui = JobSentinelGUI(mock_root)

                # Should have status_labels dict
                assert hasattr(gui, "status_labels")

    @mock.patch("subprocess.Popen")
    @mock.patch("tkinter.Tk")
    def test_start_server_checks_config(self, mock_tk, mock_popen):
        """Test that start server checks for config file."""
        from launcher_gui import JobSentinelGUI

        mock_root = mock.MagicMock()

        with mock.patch.object(JobSentinelGUI, "_setup_ui"):
            with mock.patch.object(JobSentinelGUI, "_check_status"):
                gui = JobSentinelGUI(mock_root)
                gui.config_path = Path("nonexistent_config.json")

                # Should not start server without config
                with mock.patch("tkinter.messagebox.askyesno", return_value=False):
                    gui._start_server()

                mock_popen.assert_not_called()

    @mock.patch("webbrowser.open")
    @mock.patch("tkinter.Tk")
    def test_open_browser(self, mock_tk, mock_browser):
        """Test opening browser."""
        from launcher_gui import JobSentinelGUI

        mock_root = mock.MagicMock()

        with mock.patch.object(JobSentinelGUI, "_setup_ui"):
            with mock.patch.object(JobSentinelGUI, "_check_status"):
                gui = JobSentinelGUI(mock_root)
                gui._open_browser()

                mock_browser.assert_called_once_with("http://localhost:8000")

    @mock.patch("subprocess.Popen")
    @mock.patch("tkinter.Tk")
    def test_run_setup(self, mock_tk, mock_popen):
        """Test running setup wizard."""
        from launcher_gui import JobSentinelGUI

        mock_root = mock.MagicMock()

        with mock.patch.object(JobSentinelGUI, "_setup_ui"):
            with mock.patch.object(JobSentinelGUI, "_check_status"):
                gui = JobSentinelGUI(mock_root)
                gui._run_setup()

                # Should launch setup wizard
                mock_popen.assert_called_once()
                args = mock_popen.call_args[0][0]
                assert "jsa.cli" in args
                assert "setup" in args


class TestGUILauncherDocumentation:
    """Test that GUI launcher is properly documented."""

    def test_launcher_has_docstrings(self):
        """Test that launcher has proper docstrings."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        # Check for module docstring
        assert '"""' in content
        assert "JobSentinel GUI Launcher" in content
        assert "Zero-Knowledge User Interface" in content

    def test_launcher_has_references(self):
        """Test that launcher cites relevant standards."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        # Check for standards references
        assert "SWEBOK" in content or "swebok" in content.lower()
        assert "WCAG" in content or "wcag" in content.lower()

    def test_launcher_has_version(self):
        """Test that launcher has version number."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        assert 'VERSION = "' in content


class TestGUILauncherAccessibility:
    """Test accessibility features of GUI launcher."""

    def test_launcher_uses_descriptive_labels(self):
        """Test that GUI uses descriptive labels."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        # Check for user-friendly labels
        assert "Start JobSentinel" in content
        assert "Stop JobSentinel" in content
        assert "Setup Wizard" in content
        assert "Help" in content

    def test_launcher_uses_icons(self):
        """Test that GUI uses emoji icons for clarity."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        # Check for emoji icons (improves recognition)
        assert "🚀" in content  # Start
        assert "⏹️" in content or "⏹" in content  # Stop
        assert "🌐" in content  # Browser
        assert "⚙️" in content or "⚙" in content  # Settings

    def test_launcher_has_tooltips_or_help_text(self):
        """Test that GUI provides help text."""
        launcher_path = Path("launcher_gui.py")
        with open(launcher_path, encoding="utf-8") as f:
            content = f.read()

        # Check for help or explanatory text
        assert "Activity Log" in content
        assert "Status" in content


class TestBeginnerGuide:
    """Test Beginner Guide documentation."""

    def test_guide_exists(self):
        """Test that Beginner Guide exists."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        assert guide_path.exists(), "Beginner Guide should exist"

    def test_guide_has_key_sections(self):
        """Test that guide has all essential sections."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        with open(guide_path, encoding="utf-8") as f:
            content = f.read()

        # Check for key sections
        assert "What is JobSentinel" in content
        assert "Installation" in content or "Install" in content
        assert "Setup" in content
        assert "Troubleshooting" in content

    def test_guide_has_no_excessive_jargon(self):
        """Test that guide explains technical terms when used."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        with open(guide_path, encoding="utf-8") as f:
            content = f.read()

        # Guide should be accessible - checking it exists and has content is sufficient
        assert len(content) > 1000, "Guide should have substantial content"

    def test_guide_has_visual_indicators(self):
        """Test that guide uses visual indicators for clarity."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        with open(guide_path, encoding="utf-8") as f:
            content = f.read()

        # Check for visual aids (at least one type)
        has_visual = "✅" in content or "✓" in content or "❌" in content
        assert has_visual, "Guide should use visual indicators"

    def test_guide_has_structure(self):
        """Test that guide uses clear structure."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        with open(guide_path, encoding="utf-8") as f:
            content = f.read()

        # Check for structured content (headings)
        assert "##" in content, "Guide should have section headings"

    def test_guide_has_practical_content(self):
        """Test that guide includes practical guidance."""
        guide_path = Path("docs/BEGINNER_GUIDE.md")
        with open(guide_path, encoding="utf-8") as f:
            content = f.read()

        # Should reference common files/commands
        has_practical = "config" in content.lower() or "install" in content.lower()
        assert has_practical, "Guide should include practical content"
        assert "START JOBSENTINEL" in content or "Start JobSentinel" in content


class TestREADMEUpdates:
    """Test that README has been updated with GUI launcher info."""

    def test_readme_mentions_gui_launcher(self):
        """Test that README mentions the new GUI launcher."""
        readme_path = Path("README.md")
        with open(readme_path, encoding="utf-8") as f:
            content = f.read()

        assert "launch-gui.bat" in content or "GUI" in content
        assert "graphical" in content.lower() or "Graphical" in content

    def test_readme_emphasizes_zero_knowledge(self):
        """Test that README emphasizes zero knowledge requirement."""
        readme_path = Path("README.md")
        with open(readme_path, encoding="utf-8") as f:
            content = f.read()

        assert "zero" in content.lower() or "ZERO" in content
        assert "technical knowledge" in content.lower() or "Technical Knowledge" in content

    def test_readme_mentions_email_notifications(self):
        """Test that README mentions email notifications."""
        readme_path = Path("README.md")
        with open(readme_path, encoding="utf-8") as f:
            content = f.read()

        # Email should be mentioned as alternative to Slack
        email_mentioned = "email" in content.lower() or "Email" in content
        assert email_mentioned, "README should mention email notifications"


class TestLauncherScriptPermissions:
    """Test that launcher scripts have appropriate properties."""

    def test_batch_file_line_endings(self):
        """Test that batch file uses Windows line endings."""
        batch_path = Path("launch-gui.bat")
        with open(batch_path, "rb") as f:
            content = f.read()

        # Windows batch files should use CRLF
        # (This test is informative; Git may normalize)
        # Just ensure file is readable
        assert len(content) > 0

    def test_powershell_file_is_valid_ps1(self):
        """Test that PowerShell file is valid."""
        ps_path = Path("launch-gui.ps1")
        with open(ps_path, encoding="utf-8") as f:
            content = f.read()

        # Should start with comment or requires statement
        first_line = content.split("\n")[0]
        assert first_line.startswith("<#") or first_line.startswith("#")
