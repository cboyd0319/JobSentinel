#!/usr/bin/env python3
"""
Tests for universal installer (scripts/install.py)
"""

import platform
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

# Add scripts to path for import
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from install import PlatformInfo, UniversalInstaller


class TestPlatformDetection:
    """Test platform detection logic."""

    @patch("platform.system", return_value="Windows")
    @patch("platform.release", return_value="10.0.22621")  # Windows 11
    @patch("platform.machine", return_value="AMD64")
    def test_detect_windows_11(self, mock_machine, mock_release, mock_system):
        """Test Windows 11 detection."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "windows"
        assert installer.platform.is_compatible is True
        assert len(installer.platform.issues) == 0

    @patch("platform.system", return_value="Windows")
    @patch("platform.release", return_value="10.0.19044")  # Windows 10
    @patch("platform.machine", return_value="AMD64")
    def test_detect_windows_10_incompatible(self, mock_machine, mock_release, mock_system):
        """Test Windows 10 is marked as incompatible."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "windows"
        assert installer.platform.is_compatible is False
        assert "Windows 11" in installer.platform.issues[0]

    @patch("platform.system", return_value="Darwin")
    @patch("platform.release", return_value="24.0.0")  # macOS 15 (Sequoia)
    @patch("platform.machine", return_value="arm64")
    def test_detect_macos_15(self, mock_machine, mock_release, mock_system):
        """Test macOS 15 detection."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "macos"
        assert installer.platform.is_compatible is True
        assert len(installer.platform.issues) == 0

    @patch("platform.system", return_value="Darwin")
    @patch("platform.release", return_value="23.0.0")  # macOS 14
    @patch("platform.machine", return_value="arm64")
    def test_detect_macos_14_incompatible(self, mock_machine, mock_release, mock_system):
        """Test macOS 14 is marked as incompatible."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "macos"
        assert installer.platform.is_compatible is False
        assert "macOS 15" in installer.platform.issues[0]

    @patch("platform.system", return_value="Linux")
    @patch("platform.release", return_value="5.15.0-76-generic")
    @patch("platform.machine", return_value="x86_64")
    @patch(
        "builtins.open",
        MagicMock(
            return_value=MagicMock(
                __enter__=MagicMock(
                    return_value=MagicMock(
                        __iter__=lambda self: iter(
                            ['ID="ubuntu"', 'VERSION_ID="22.04"']
                        )
                    )
                ),
                __exit__=MagicMock(),
            )
        ),
    )
    def test_detect_ubuntu_2204(self, mock_machine, mock_release, mock_system):
        """Test Ubuntu 22.04 detection."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "linux"
        assert installer.platform.is_compatible is True

    @patch("platform.system", return_value="Linux")
    @patch("platform.release", return_value="5.4.0-42-generic")
    @patch("platform.machine", return_value="x86_64")
    @patch(
        "builtins.open",
        MagicMock(
            return_value=MagicMock(
                __enter__=MagicMock(
                    return_value=MagicMock(
                        __iter__=lambda self: iter(
                            ['ID="ubuntu"', 'VERSION_ID="20.04"']
                        )
                    )
                ),
                __exit__=MagicMock(),
            )
        ),
    )
    def test_detect_ubuntu_2004_incompatible(self, mock_machine, mock_release, mock_system):
        """Test Ubuntu 20.04 is marked as incompatible."""
        installer = UniversalInstaller()
        assert installer.platform.os_name == "linux"
        assert installer.platform.is_compatible is False
        assert "Ubuntu 22.04+" in installer.platform.issues[0]


class TestPythonVersionCheck:
    """Test Python version checking."""

    @patch("subprocess.run")
    def test_python_313_found(self, mock_run, tmp_path):
        """Test detection of Python 3.13."""
        # Mock successful Python version check
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Python 3.13.8\n",
            stderr="",
        )

        installer = UniversalInstaller(project_root=tmp_path)
        found, path = installer.check_python()

        assert found is True
        assert path is not None

    @patch("subprocess.run")
    def test_python_312_incompatible(self, mock_run, tmp_path):
        """Test that Python 3.12 is considered incompatible."""
        # Mock Python 3.12 version
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Python 3.12.0\n",
            stderr="",
        )

        installer = UniversalInstaller(project_root=tmp_path)
        found, path = installer.check_python()

        assert found is False
        assert path is None

    @patch("subprocess.run")
    def test_python_not_found(self, mock_run, tmp_path):
        """Test handling when Python is not found."""
        # Mock command not found
        mock_run.side_effect = FileNotFoundError()

        installer = UniversalInstaller(project_root=tmp_path)
        found, path = installer.check_python()

        assert found is False
        assert path is None


class TestVirtualEnvironment:
    """Test virtual environment creation."""

    @patch("subprocess.run")
    def test_create_venv_success(self, mock_run, tmp_path):
        """Test successful venv creation."""
        mock_run.return_value = Mock(returncode=0)

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        python_path = Path("/usr/bin/python3.13")
        success = installer.create_venv(python_path)

        assert success is True
        mock_run.assert_called_once()

    @patch("subprocess.run")
    def test_create_venv_already_exists(self, mock_run, tmp_path):
        """Test handling of existing venv."""
        # Create fake venv directory
        venv_path = tmp_path / ".venv"
        venv_path.mkdir()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = venv_path

        python_path = Path("/usr/bin/python3.13")
        success = installer.create_venv(python_path)

        assert success is True
        # Should not call subprocess.run since venv exists
        mock_run.assert_not_called()

    @patch("subprocess.run")
    def test_create_venv_failure(self, mock_run, tmp_path):
        """Test venv creation failure handling."""
        mock_run.side_effect = subprocess.CalledProcessError(1, "python")

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        python_path = Path("/usr/bin/python3.13")
        success = installer.create_venv(python_path)

        assert success is False


class TestDependencyInstallation:
    """Test dependency installation."""

    @patch("subprocess.run")
    def test_install_dependencies_success(self, mock_run, tmp_path):
        """Test successful dependency installation."""
        mock_run.return_value = Mock(returncode=0)

        # Create fake venv structure
        venv_path = tmp_path / ".venv"
        if platform.system() == "Windows":
            scripts_dir = venv_path / "Scripts"
            python_exe = scripts_dir / "python.exe"
        else:
            scripts_dir = venv_path / "bin"
            python_exe = scripts_dir / "python"

        scripts_dir.mkdir(parents=True)
        python_exe.touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = venv_path

        success = installer.install_dependencies()

        assert success is True
        # Should call pip upgrade, install dependencies, and playwright install
        assert mock_run.call_count >= 3

    @patch("subprocess.run")
    def test_install_dependencies_missing_venv(self, mock_run, tmp_path):
        """Test handling of missing venv."""
        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        success = installer.install_dependencies()

        assert success is False


class TestConfigSetup:
    """Test configuration file setup."""

    def test_setup_config_creates_files(self, tmp_path):
        """Test configuration file creation."""
        # Create example files
        config_dir = tmp_path / "config"
        config_dir.mkdir()

        example_prefs = config_dir / "user_prefs.example.json"
        example_prefs.write_text('{"keywords": []}')

        env_example = tmp_path / ".env.example"
        env_example.write_text("DEBUG=false")

        installer = UniversalInstaller(project_root=tmp_path)
        success = installer.setup_config()

        assert success is True
        assert (config_dir / "user_prefs.json").exists()
        assert (tmp_path / ".env").exists()
        assert (tmp_path / "data" / "logs").exists()

    def test_setup_config_preserves_existing(self, tmp_path):
        """Test that existing config files are preserved."""
        config_dir = tmp_path / "config"
        config_dir.mkdir()

        # Create existing files
        user_prefs = config_dir / "user_prefs.json"
        user_prefs.write_text('{"keywords": ["existing"]}')

        env_file = tmp_path / ".env"
        env_file.write_text("DEBUG=true")

        installer = UniversalInstaller(project_root=tmp_path)
        success = installer.setup_config()

        assert success is True
        # Should not overwrite existing files
        assert user_prefs.read_text() == '{"keywords": ["existing"]}'
        assert env_file.read_text() == "DEBUG=true"


class TestAutomationSetup:
    """Test platform-specific automation setup."""

    @pytest.mark.skipif(platform.system() != "Windows", reason="Windows-specific test")
    @patch("subprocess.run")
    def test_setup_windows_task_scheduler(self, mock_run, tmp_path):
        """Test Windows Task Scheduler setup."""
        mock_run.return_value = Mock(returncode=0)

        # Create fake venv
        venv_path = tmp_path / ".venv" / "Scripts"
        venv_path.mkdir(parents=True)
        (venv_path / "python.exe").touch()

        # Create fake agent script
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        (src_dir / "agent.py").touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        success = installer.setup_automation_windows()

        assert success is True
        # Should call schtasks
        assert any("schtasks" in str(call) for call in mock_run.call_args_list)

    @pytest.mark.skipif(platform.system() != "Darwin", reason="macOS-specific test")
    @patch("subprocess.run")
    def test_setup_macos_launchd(self, mock_run, tmp_path):
        """Test macOS launchd setup."""
        mock_run.return_value = Mock(returncode=0)

        # Create fake venv
        venv_path = tmp_path / ".venv" / "bin"
        venv_path.mkdir(parents=True)
        (venv_path / "python").touch()

        # Create fake agent script
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        (src_dir / "agent.py").touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        with patch("pathlib.Path.home") as mock_home:
            mock_home.return_value = tmp_path
            success = installer.setup_automation_macos()

        assert success is True

    @pytest.mark.skipif(platform.system() != "Linux", reason="Linux-specific test")
    def test_setup_linux_cron(self, tmp_path):
        """Test Linux cron setup (displays instructions)."""
        # Create fake venv
        venv_path = tmp_path / ".venv" / "bin"
        venv_path.mkdir(parents=True)
        (venv_path / "python").touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        success = installer.setup_automation_linux()

        # Should always return True (just displays instructions)
        assert success is True


class TestInstallationVerification:
    """Test installation verification."""

    @patch("subprocess.run")
    def test_run_tests_success(self, mock_run, tmp_path):
        """Test successful installation verification."""
        mock_run.return_value = Mock(
            returncode=0,
            stdout="✅ Core modules loaded\n",
            stderr="",
        )

        # Create fake venv
        venv_path = tmp_path / ".venv" / "bin"
        venv_path.mkdir(parents=True)
        (venv_path / "python").touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        success = installer.run_tests()

        assert success is True

    @patch("subprocess.run")
    def test_run_tests_failure(self, mock_run, tmp_path):
        """Test handling of verification failure."""
        mock_run.return_value = Mock(
            returncode=1,
            stdout="",
            stderr="ImportError: No module named 'jsa'\n",
        )

        # Create fake venv
        venv_path = tmp_path / ".venv" / "bin"
        venv_path.mkdir(parents=True)
        (venv_path / "python").touch()

        installer = UniversalInstaller(project_root=tmp_path)
        installer.config.venv_path = tmp_path / ".venv"

        success = installer.run_tests()

        assert success is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
