#!/usr/bin/env python3
"""
Tests for Windows Enhancement Modules

Tests the new Windows-specific enhancement features:
- System pre-check (windows_precheck.py)
- Desktop shortcuts (windows_shortcuts.py)

These tests run on all platforms but validate Windows-specific behavior.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest


class TestWindowsPreCheck:
    """Tests for windows_precheck module."""

    def test_precheck_module_imports(self):
        """Test that windows_precheck module can be imported."""
        from jsa.windows_precheck import WindowsPreCheck, CheckResult

        assert WindowsPreCheck is not None
        assert CheckResult is not None

    def test_check_result_creation(self):
        """Test CheckResult dataclass."""
        from jsa.windows_precheck import CheckResult

        result = CheckResult(
            name="Test Check",
            passed=True,
            message="Test passed",
            severity="info",
            help_text="Help text",
            help_url="https://example.com",
        )

        assert result.name == "Test Check"
        assert result.passed is True
        assert result.message == "Test passed"
        assert result.severity == "info"
        assert result.help_text == "Help text"
        assert result.help_url == "https://example.com"

    def test_python_version_check(self):
        """Test Python version checking."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        result = checker.check_python_version()

        assert result.name == "Python Version"
        # Should pass on CI (Python 3.12+)
        assert result.passed is True
        assert "Python" in result.message

    def test_disk_space_check(self):
        """Test disk space checking."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        result = checker.check_disk_space()

        assert result.name == "Disk Space"
        # Should have enough space on CI
        assert result.passed is True
        assert "GB" in result.message

    def test_internet_check(self):
        """Test internet connectivity checking."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        result = checker.check_internet_connection()

        assert result.name == "Internet Connection"
        # CI should have internet
        assert result.passed is True

    def test_write_permissions_check(self):
        """Test write permissions checking."""
        import os
        import tempfile
        from pathlib import Path
        from jsa.windows_precheck import WindowsPreCheck

        # Use a temporary directory for the test
        with tempfile.TemporaryDirectory() as tmpdir:
            # Save current dir as Path to handle deleted directories
            try:
                original_dir = Path.cwd()
            except (FileNotFoundError, OSError):
                # Already in a deleted directory, use /tmp
                original_dir = Path("/tmp")

            try:
                os.chdir(tmpdir)

                checker = WindowsPreCheck()
                result = checker.check_write_permissions()

                assert result.name == "Write Permissions"
                # Should be able to write in temp directory
                assert result.passed is True
            finally:
                # Restore original directory (or go to /tmp if it's gone)
                try:
                    os.chdir(str(original_dir))
                except (FileNotFoundError, OSError):
                    os.chdir("/tmp")

    def test_memory_check(self):
        """Test memory availability checking."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        result = checker.check_memory()

        assert result.name == "Memory"
        # Memory check should not fail (even if psutil unavailable)
        assert result is not None

    def test_ports_check(self):
        """Test port availability checking."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        result = checker.check_ports_available()

        assert result.name == "Port Availability"
        # Ports should be available on CI
        # (or warning severity if in use)

    def test_run_all_checks(self):
        """Test running all checks together."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck(verbose=False)
        results = checker.run_all_checks()

        # Should have run multiple checks
        assert len(results) >= 5

        # All results should have required fields
        for result in results:
            assert hasattr(result, "name")
            assert hasattr(result, "passed")
            assert hasattr(result, "message")
            assert hasattr(result, "severity")

    def test_can_proceed_logic(self):
        """Test can_proceed logic."""
        from jsa.windows_precheck import WindowsPreCheck

        checker = WindowsPreCheck()
        checker.run_all_checks()

        # On Linux, Windows check will fail (critical)
        # So can_proceed should be False
        if sys.platform != "win32":
            assert checker.can_proceed() is False
        else:
            # On Windows with Python 3.12+, should pass
            # (assuming other requirements met)
            pass  # Can't test reliably

    @patch("platform.system")
    @patch("platform.version")
    def test_windows_version_check_pass(self, mock_version, mock_system):
        """Test Windows version check passes on Windows 11."""
        from jsa.windows_precheck import WindowsPreCheck

        # Mock Windows 11 (build 22000+)
        mock_system.return_value = "Windows"
        mock_version.return_value = "10.0.22621"

        checker = WindowsPreCheck()
        result = checker.check_windows_version()

        assert result.passed is True
        assert "Windows 11" in result.message

    @patch("platform.system")
    @patch("platform.version")
    def test_windows_version_check_fail(self, mock_version, mock_system):
        """Test Windows version check fails on old Windows."""
        from jsa.windows_precheck import WindowsPreCheck

        # Mock Windows 10 (build < 22000)
        mock_system.return_value = "Windows"
        mock_version.return_value = "10.0.19041"

        checker = WindowsPreCheck()
        result = checker.check_windows_version()

        assert result.passed is False
        assert result.severity == "critical"


class TestWindowsShortcuts:
    """Tests for windows_shortcuts module."""

    def test_shortcuts_module_imports(self):
        """Test that windows_shortcuts module can be imported."""
        from jsa.windows_shortcuts import (
            create_desktop_shortcut,
            create_jobsentinel_shortcuts,
        )

        assert create_desktop_shortcut is not None
        assert create_jobsentinel_shortcuts is not None

    def test_create_shortcut_non_windows(self):
        """Test shortcut creation fails gracefully on non-Windows."""
        from jsa.windows_shortcuts import create_desktop_shortcut

        # Should return False on non-Windows
        if sys.platform != "win32":
            result = create_desktop_shortcut(
                name="Test Shortcut",
                target=sys.executable,
                arguments="-c print('test')",
            )
            assert result is False

    def test_create_jobsentinel_shortcuts_structure(self):
        """Test that create_jobsentinel_shortcuts returns proper structure."""
        from jsa.windows_shortcuts import create_jobsentinel_shortcuts

        project_root = Path(__file__).parent.parent
        results = create_jobsentinel_shortcuts(project_root)

        # Should return a dictionary
        assert isinstance(results, dict)

        # Should have expected shortcuts
        expected_shortcuts = [
            "Run JobSentinel",
            "Configure JobSentinel",
            "JobSentinel Dashboard",
            "JobSentinel Health Check",
        ]

        for shortcut_name in expected_shortcuts:
            assert shortcut_name in results
            # Each result should be a boolean
            assert isinstance(results[shortcut_name], bool)

    @pytest.mark.skipif(sys.platform != "win32", reason="Windows-only test")
    def test_create_shortcut_windows(self):
        """Test shortcut creation on Windows (if running on Windows)."""
        from jsa.windows_shortcuts import create_desktop_shortcut

        # Try to create a test shortcut
        result = create_desktop_shortcut(
            name="JobSentinel_Test",
            target=sys.executable,
            arguments="-c print('test')",
            description="Test shortcut",
        )

        # Should succeed on Windows (or fail gracefully)
        assert isinstance(result, bool)

        # Clean up if created
        if result:
            desktop = Path.home() / "Desktop"
            test_shortcut = desktop / "JobSentinel_Test.lnk"
            if test_shortcut.exists():
                test_shortcut.unlink()


class TestWindowsSetupIntegration:
    """Integration tests for Windows setup script."""

    def test_windows_setup_script_exists(self):
        """Test that windows_setup.py exists."""
        script_path = Path(__file__).parent.parent / "scripts" / "windows_setup.py"
        assert script_path.exists()

    def test_windows_setup_imports(self):
        """Test that windows_setup.py can import enhancement modules."""
        # Import the setup script's check for enhanced modules
        import sys
        from pathlib import Path

        sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

        # Try to import the modules
        try:
            from jsa.windows_precheck import WindowsPreCheck
            from jsa.windows_shortcuts import create_jobsentinel_shortcuts

            has_modules = True
        except ImportError:
            has_modules = False

        # Should be able to import (modules exist)
        assert has_modules is True

    def test_setup_script_syntax(self):
        """Test that windows_setup.py has valid syntax."""
        script_path = Path(__file__).parent.parent / "scripts" / "windows_setup.py"

        # Read and compile the script
        code = script_path.read_text()
        compile(code, str(script_path), "exec")


class TestEnhancedErrorMessages:
    """Tests for enhanced error message formatting."""

    def test_error_formatter_module_exists(self):
        """Test that error_formatter module exists."""
        from jsa.error_formatter import ErrorFormatter

        assert ErrorFormatter is not None

    def test_config_error_formatting(self):
        """Test configuration error formatting."""
        from jsa.error_formatter import ErrorFormatter

        error_msg = "Missing required field: keywords"
        config_path = "config/user_prefs.json"

        formatted = ErrorFormatter.format_config_error(error_msg, config_path)

        # Should include error message
        assert error_msg in formatted
        # Should include help text
        assert "How to fix" in formatted
        # Should include resources
        assert "Resources" in formatted

    def test_install_error_formatting(self):
        """Test installation error formatting."""
        from jsa.error_formatter import ErrorFormatter

        error_msg = "Package not found"
        package = "pytest"

        formatted = ErrorFormatter.format_install_error(error_msg, package)

        # Should include error message
        assert error_msg in formatted
        # Should include installation error header
        assert "Installation Error" in formatted


# Mark all tests as Windows deployment tests
pytestmark = pytest.mark.windows_deployment
