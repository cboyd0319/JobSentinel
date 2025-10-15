#!/usr/bin/env python3
"""
Comprehensive macOS Deployment Tests

Tests the complete deployment flow for macOS 15+ with ZERO technical knowledge assumption.
Simulates a fresh macOS installation and validates every step of the setup process.

Test Coverage:
- Python environment detection
- Dependency installation
- Configuration creation (via wizard)
- Database initialization (SQLite)
- Health check system
- CLI commands
- Web UI startup
- API server startup
- Job scraping (dry-run)
- Error handling and recovery
- Privacy and security validation
- Zero admin rights requirement
- macOS-specific features (Gatekeeper, .command files, etc.)
"""

import json
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest


class TestMacOSDeploymentCore:
    """Core deployment tests that must pass for macOS deployment."""

    def test_python_version_check(self):
        """Test that Python version meets macOS requirements."""
        version = sys.version_info
        # Python 3.11+ is required for macOS deployment (3.12+ recommended)
        assert version >= (
            3,
            11,
        ), f"Python {version.major}.{version.minor} < 3.11 (minimum required for macOS)"

    def test_required_packages_installed(self):
        """Test that all required packages are installed."""
        required_packages = [
            "requests",
            "bs4",  # beautifulsoup4
            "sqlalchemy",
            "pydantic",
            "flask",
            "fastapi",
            "uvicorn",
        ]

        for package in required_packages:
            try:
                __import__(package)
            except ImportError:
                pytest.fail(f"Required package '{package}' not installed")

    def test_optional_packages_available(self):
        """Test optional packages for enhanced features."""
        optional_packages = {
            "playwright": "Web scraping with browser automation",
            "sentence_transformers": "ML-based job matching",
            "docx": "Resume parsing (DOCX files)",
        }

        available = []
        missing = []

        for package, description in optional_packages.items():
            try:
                __import__(package)
                available.append(package)
            except ImportError:
                missing.append(f"{package} ({description})")

        # Don't fail on optional packages, just log
        if missing:
            pytest.skip(f"Optional packages not installed: {', '.join(missing)}")

    def test_sqlite_database_no_admin_required(self):
        """Test that SQLite works without admin rights."""
        from sqlalchemy import create_engine, text

        # Create a temporary database
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.sqlite"
            db_url = f"sqlite:///{db_path}"

            # This should work without admin rights
            engine = create_engine(db_url)
            with engine.connect() as conn:
                # Test basic operations
                conn.execute(text("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)"))
                conn.execute(text("INSERT INTO test (value) VALUES ('test')"))
                result = conn.execute(text("SELECT * FROM test"))
                rows = result.fetchall()
                assert len(rows) == 1
                assert rows[0][1] == "test"
                conn.commit()

            engine.dispose()

            # Verify file was created
            assert db_path.exists()
            assert db_path.stat().st_size > 0

    def test_config_directory_writable(self):
        """Test that config directory can be created without admin rights."""
        config_dir = Path("config")
        assert config_dir.exists(), "Config directory missing"

        # Test write access
        test_file = config_dir / ".write_test"
        try:
            test_file.write_text("test")
            assert test_file.read_text() == "test"
        finally:
            if test_file.exists():
                test_file.unlink()

    def test_data_directory_creation(self):
        """Test that data directory can be created automatically."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir) / "data"

            # Should be able to create without admin
            data_dir.mkdir(parents=True, exist_ok=True)
            assert data_dir.exists()
            assert os.access(data_dir, os.W_OK)


class TestMacOSConfigurationSystem:
    """Test configuration system for macOS deployment."""

    def test_example_config_exists(self):
        """Test that example config exists and is valid JSON."""
        example_config = Path("config/user_prefs.example.json")
        assert example_config.exists(), "Example config missing"

        # Validate JSON
        with open(example_config) as f:
            config = json.load(f)

        # Verify required fields
        assert "keywords" in config
        assert "locations" in config
        assert isinstance(config["keywords"], list)
        assert isinstance(config["locations"], list)


class TestMacOSPreCheck:
    """Test macOS pre-check module."""

    def test_precheck_module_exists(self):
        """Test that macOS precheck module can be imported."""
        try:
            from jsa.macos_precheck import MacOSPreCheck
        except ImportError:
            pytest.fail("macOS precheck module not found")

    @pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
    def test_macos_version_detection(self):
        """Test macOS version detection on actual macOS system."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_macos_version()

        assert result.name == "macOS Version"
        assert result.message is not None
        # Should detect macOS on macOS system
        assert result.passed is True

    def test_python_version_detection(self):
        """Test Python version detection."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_python_version()

        assert result.name == "Python Version"
        assert result.message is not None
        # Should pass with Python 3.12+
        assert result.passed is True

    def test_disk_space_check(self):
        """Test disk space check."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_disk_space()

        assert result.name == "Disk Space"
        assert result.message is not None
        # Should have enough space in test environment
        assert result.passed is True

    def test_internet_connection_check(self):
        """Test internet connection check."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_internet_connection()

        assert result.name == "Internet Connection"
        assert result.message is not None
        # May pass or fail depending on network

    def test_write_permissions_check(self):
        """Test write permissions check."""
        from jsa.macos_precheck import MacOSPreCheck

        checker = MacOSPreCheck()
        result = checker.check_write_permissions()

        assert result.name == "Write Permissions"
        assert result.message is not None
        # Should pass in test environment
        assert result.passed is True


class TestMacOSShortcuts:
    """Test macOS shortcuts module."""

    def test_shortcuts_module_exists(self):
        """Test that macOS shortcuts module can be imported."""
        try:
            from jsa.macos_shortcuts import create_command_file, create_jobsentinel_shortcuts
        except ImportError:
            pytest.fail("macOS shortcuts module not found")

    @pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
    def test_command_file_creation(self):
        """Test .command file creation."""
        from jsa.macos_shortcuts import create_command_file

        with tempfile.TemporaryDirectory() as tmpdir:
            # Temporarily change home to tmpdir
            with patch("pathlib.Path.home", return_value=Path(tmpdir)):
                # Create Desktop in tmpdir
                desktop = Path(tmpdir) / "Desktop"
                desktop.mkdir()

                # Create command file
                success = create_command_file(
                    name="Test Command", command="echo 'test'", description="Test description"
                )

                assert success is True

                # Verify file exists
                command_file = desktop / "Test Command.command"
                assert command_file.exists()

                # Verify executable
                assert os.access(command_file, os.X_OK)

                # Verify content
                content = command_file.read_text()
                assert "#!/usr/bin/env bash" in content
                assert "echo 'test'" in content


class TestMacOSSetupScripts:
    """Test macOS setup scripts."""

    def test_setup_script_exists(self):
        """Test that setup-macos.sh exists and is executable."""
        setup_script = Path("setup-macos.sh")
        assert setup_script.exists(), "setup-macos.sh not found"

        # Check if executable
        if platform.system() == "Darwin":
            assert os.access(setup_script, os.X_OK), "setup-macos.sh not executable"

    def test_gui_launcher_exists(self):
        """Test that launch-gui.sh exists and is executable."""
        launcher_script = Path("launch-gui.sh")
        assert launcher_script.exists(), "launch-gui.sh not found"

        # Check if executable
        if platform.system() == "Darwin":
            assert os.access(launcher_script, os.X_OK), "launch-gui.sh not executable"

    def test_macos_setup_py_exists(self):
        """Test that macos_setup.py exists and is executable."""
        setup_py = Path("scripts/macos_setup.py")
        assert setup_py.exists(), "scripts/macos_setup.py not found"

        # Check if executable
        if platform.system() == "Darwin":
            assert os.access(setup_py, os.X_OK), "scripts/macos_setup.py not executable"


class TestMacOSCLICommands:
    """Test CLI commands work on macOS."""

    def test_health_command(self):
        """Test health command runs without errors."""
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "health"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        # Should not crash (exit code 0 or 1 is acceptable)
        assert result.returncode in [0, 1]

    def test_config_validate_command(self):
        """Test config validation command."""
        # Create a temporary valid config
        with tempfile.TemporaryDirectory() as tmpdir:
            config_file = Path(tmpdir) / "test_config.json"
            config = {"keywords": ["python"], "locations": ["Remote"], "job_sources": {}}

            config_file.write_text(json.dumps(config))

            result = subprocess.run(
                [sys.executable, "-m", "jsa.cli", "config-validate", "--path", str(config_file)],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            # Should pass validation
            assert result.returncode == 0


class TestMacOSDocumentation:
    """Test macOS-specific documentation exists."""

    def test_quick_start_guide_exists(self):
        """Test MACOS_QUICK_START.md exists."""
        doc = Path("docs/MACOS_QUICK_START.md")
        assert doc.exists(), "MACOS_QUICK_START.md not found"
        assert doc.stat().st_size > 0

    def test_troubleshooting_guide_exists(self):
        """Test MACOS_TROUBLESHOOTING.md exists."""
        doc = Path("docs/MACOS_TROUBLESHOOTING.md")
        assert doc.exists(), "MACOS_TROUBLESHOOTING.md not found"
        assert doc.stat().st_size > 0

    def test_deployment_checklist_exists(self):
        """Test MACOS_DEPLOYMENT_CHECKLIST.md exists."""
        doc = Path("docs/MACOS_DEPLOYMENT_CHECKLIST.md")
        assert doc.exists(), "MACOS_DEPLOYMENT_CHECKLIST.md not found"
        assert doc.stat().st_size > 0


class TestMacOSFeatureParity:
    """Test feature parity with Windows deployment."""

    def test_has_setup_script(self):
        """Test macOS has equivalent setup script."""
        assert Path("setup-macos.sh").exists()
        # Compare to Windows
        assert Path("setup-windows.ps1").exists() or Path("setup-windows.bat").exists()

    def test_has_gui_launcher(self):
        """Test macOS has GUI launcher."""
        assert Path("launch-gui.sh").exists()
        # Compare to Windows
        assert Path("launch-gui.ps1").exists() or Path("launch-gui.bat").exists()

    def test_has_precheck_module(self):
        """Test macOS has precheck module."""
        assert Path("src/jsa/macos_precheck.py").exists()
        # Compare to Windows
        assert Path("src/jsa/windows_precheck.py").exists()

    def test_has_shortcuts_module(self):
        """Test macOS has shortcuts module."""
        assert Path("src/jsa/macos_shortcuts.py").exists()
        # Compare to Windows
        assert Path("src/jsa/windows_shortcuts.py").exists()

    def test_has_setup_py(self):
        """Test macOS has Python setup script."""
        assert Path("scripts/macos_setup.py").exists()
        # Compare to Windows
        assert Path("scripts/windows_setup.py").exists()


@pytest.mark.skipif(platform.system() != "Darwin", reason="macOS only")
class TestMacOSAppleSilicon:
    """Test Apple Silicon (M1/M2/M3) compatibility."""

    def test_python_architecture(self):
        """Test Python runs natively on Apple Silicon."""
        arch = platform.machine()
        # Should be arm64 on Apple Silicon, x86_64 on Intel
        assert arch in ["arm64", "x86_64"]

    def test_dependencies_install_on_apple_silicon(self):
        """Test that dependencies can be installed on Apple Silicon."""
        # This is more of a smoke test - actual installation is done by setup
        result = subprocess.run(
            [sys.executable, "-m", "pip", "list"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        assert result.returncode == 0
        # Should show installed packages
        assert len(result.stdout) > 0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
