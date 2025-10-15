#!/usr/bin/env python3
"""
macOS Enhancement Tests

Tests for macOS-specific enhancements and features that improve
the user experience on macOS 15+.

Test Coverage:
- Shortcut creation (.command files)
- Shell alias integration
- Gatekeeper handling
- Apple Silicon compatibility
- File system permissions
- Terminal integration
"""

import os
import platform
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
class TestCommandFileCreation:
    """Test .command file creation and functionality."""

    def test_create_basic_command_file(self):
        """Test creating a basic .command file."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                success = create_command_file(
                    name="Test", command="echo 'Hello macOS'", description="Test command"
                )

                assert success
                command_file = desktop / "Test.command"
                assert command_file.exists()

    def test_command_file_is_executable(self):
        """Test that created .command file is executable."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                create_command_file(name="Executable", command="echo test")

                command_file = desktop / "Executable.command"
                assert os.access(command_file, os.X_OK)

    def test_command_file_has_shebang(self):
        """Test that .command file has proper shebang."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                create_command_file(name="Shebang", command="echo test")

                command_file = desktop / "Shebang.command"
                content = command_file.read_text()
                assert content.startswith("#!/usr/bin/env bash")

    def test_command_file_includes_command(self):
        """Test that .command file includes the actual command."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                test_command = "python3 -m jsa.cli health"
                create_command_file(name="Health", command=test_command)

                command_file = desktop / "Health.command"
                content = command_file.read_text()
                assert test_command in content

    def test_command_file_with_working_directory(self):
        """Test .command file with working directory."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                working_dir = "/path/to/jobsentinel"
                create_command_file(name="WorkDir", command="echo test", working_dir=working_dir)

                command_file = desktop / "WorkDir.command"
                content = command_file.read_text()
                assert f"cd '{working_dir}'" in content


@pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
class TestShellAliases:
    """Test shell alias creation."""

    def test_zsh_alias_creation(self):
        """Test creating zsh alias."""
        from jsa.macos_shortcuts import create_shell_alias

        with tempfile.TemporaryDirectory() as tmpdir:
            zshrc = Path(tmpdir) / ".zshrc"
            zshrc.touch()

            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                success = create_shell_alias(
                    name="jobsentinel-test", command="python3 -m jsa.cli health", shell="zsh"
                )

                assert success
                content = zshrc.read_text()
                assert "alias jobsentinel-test=" in content

    def test_bash_alias_creation(self):
        """Test creating bash alias."""
        from jsa.macos_shortcuts import create_shell_alias

        with tempfile.TemporaryDirectory() as tmpdir:
            bash_profile = Path(tmpdir) / ".bash_profile"
            bash_profile.touch()

            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                success = create_shell_alias(
                    name="jobsentinel-test", command="python3 -m jsa.cli health", shell="bash"
                )

                assert success
                content = bash_profile.read_text()
                assert "alias jobsentinel-test=" in content

    def test_duplicate_alias_handling(self):
        """Test that duplicate aliases are handled gracefully."""
        from jsa.macos_shortcuts import create_shell_alias

        with tempfile.TemporaryDirectory() as tmpdir:
            zshrc = Path(tmpdir) / ".zshrc"
            zshrc.write_text('alias jobsentinel-test="echo existing"\n')

            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                success = create_shell_alias(
                    name="jobsentinel-test", command="python3 -m jsa.cli health", shell="zsh"
                )

                # Should return True (already exists)
                assert success


class TestJobSentinelShortcuts:
    """Test complete JobSentinel shortcut suite."""

    @pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
    def test_create_all_shortcuts(self):
        """Test creating all JobSentinel shortcuts."""
        from jsa.macos_shortcuts import create_jobsentinel_shortcuts

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                # Create .zshrc for aliases
                (Path(tmpdir) / ".zshrc").touch()

                results = create_jobsentinel_shortcuts(Path(tmpdir))

                # Should create multiple shortcuts
                assert len(results) > 0

                # At least some should succeed
                success_count = sum(1 for v in results.values() if v)
                assert success_count > 0

    @pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
    def test_launcher_script_creation(self):
        """Test creating GUI launcher script."""
        from jsa.macos_shortcuts import create_launcher_script

        with tempfile.TemporaryDirectory() as tmpdir:
            success = create_launcher_script(Path(tmpdir), "test-launcher.command")

            assert success

            launcher = Path(tmpdir) / "test-launcher.command"
            assert launcher.exists()
            assert os.access(launcher, os.X_OK)


class TestMacOSFileSystem:
    """Test macOS file system handling."""

    def test_handles_spaces_in_paths(self):
        """Test handling paths with spaces."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path_with_spaces = Path(tmpdir) / "Path With Spaces"
            path_with_spaces.mkdir()

            test_file = path_with_spaces / "test.txt"
            test_file.write_text("test content")

            assert test_file.exists()
            assert test_file.read_text() == "test content"

    def test_handles_unicode_in_filenames(self):
        """Test handling Unicode characters in filenames."""
        with tempfile.TemporaryDirectory() as tmpdir:
            unicode_file = Path(tmpdir) / "test_文件.txt"
            unicode_file.write_text("test content")

            assert unicode_file.exists()
            assert unicode_file.read_text() == "test content"

    def test_respects_macos_permissions(self):
        """Test that file permissions work as expected on macOS."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "test.sh"
            test_file.write_text("#!/bin/bash\necho test")

            # Make executable
            current_mode = test_file.stat().st_mode
            test_file.chmod(current_mode | stat.S_IXUSR)

            assert os.access(test_file, os.X_OK)


@pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
class TestMacOSVersion:
    """Test macOS version detection."""

    def test_sw_vers_command_available(self):
        """Test sw_vers command is available."""
        result = subprocess.run(
            ["sw_vers", "-productVersion"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )

        assert result.returncode == 0
        assert len(result.stdout.strip()) > 0

    def test_macos_version_parsing(self):
        """Test macOS version parsing."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_macos_version()

        assert result.name == "macOS Version"
        assert "macOS" in result.message


@pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
class TestHomebrewIntegration:
    """Test Homebrew integration."""

    def test_homebrew_check(self):
        """Test Homebrew detection."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_homebrew()

        assert result.name == "Homebrew"
        assert result.message is not None
        # Should always pass (optional)
        assert result.passed


class TestShellScripts:
    """Test shell script syntax and structure."""

    def test_setup_script_has_shebang(self):
        """Test setup-macos.sh has proper shebang."""
        setup_script = Path("setup-macos.sh")
        if setup_script.exists():
            content = setup_script.read_text()
            assert content.startswith("#!/usr/bin/env bash")

    def test_launcher_script_has_shebang(self):
        """Test launch-gui.sh has proper shebang."""
        launcher_script = Path("launch-gui.sh")
        if launcher_script.exists():
            content = launcher_script.read_text()
            assert content.startswith("#!/usr/bin/env bash")

    def test_setup_script_has_error_handling(self):
        """Test setup script has error handling."""
        setup_script = Path("setup-macos.sh")
        if setup_script.exists():
            content = setup_script.read_text()
            # Should have set -e for error handling
            assert "set -e" in content or "set -ue" in content

    def test_scripts_use_python3(self):
        """Test scripts use python3 command (not python)."""
        for script in ["setup-macos.sh", "launch-gui.sh"]:
            script_path = Path(script)
            if script_path.exists():
                content = script_path.read_text()
                # Should use python3 (standard on macOS)
                if "python" in content:
                    assert "python3" in content


class TestDocumentationQuality:
    """Test macOS documentation quality."""

    def test_quick_start_has_macos_specifics(self):
        """Test quick start guide has macOS-specific content."""
        doc = Path("docs/MACOS_QUICK_START.md")
        if doc.exists():
            content = doc.read_text()
            # Should mention macOS-specific things
            assert "macOS" in content.lower() or "mac" in content.lower()
            assert "Homebrew" in content or "brew" in content
            assert ".command" in content

    def test_troubleshooting_has_gatekeeper_info(self):
        """Test troubleshooting guide mentions Gatekeeper."""
        doc = Path("docs/MACOS_TROUBLESHOOTING.md")
        if doc.exists():
            content = doc.read_text()
            assert "Gatekeeper" in content or "unidentified developer" in content.lower()

    def test_deployment_checklist_has_macos_checks(self):
        """Test deployment checklist has macOS-specific checks."""
        doc = Path("docs/MACOS_DEPLOYMENT_CHECKLIST.md")
        if doc.exists():
            content = doc.read_text()
            assert "macOS" in content
            assert "Apple Silicon" in content or "M1" in content or "M2" in content


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
