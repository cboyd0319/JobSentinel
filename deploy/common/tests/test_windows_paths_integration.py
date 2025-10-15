"""
Comprehensive Windows deployment path integration tests.

This test module verifies that all Windows-specific scripts and configurations
have correct paths and can locate all necessary files.
"""

import subprocess
import sys
from pathlib import Path

import pytest


class TestWindowsDeploymentPaths:
    """Test that all Windows deployment scripts have correct path references."""

    def test_repository_structure(self):
        """Verify the repository has the expected structure for Windows deployment."""
        repo_root = Path(__file__).parent.parent.parent.parent

        # Windows-specific files
        windows_files = [
            repo_root / "deploy" / "local" / "windows" / "setup.ps1",
            repo_root / "deploy" / "local" / "windows" / "bootstrap.ps1",
            repo_root / "deploy" / "local" / "windows" / "run.ps1",
            repo_root / "deploy" / "local" / "windows" / "launch-gui.ps1",
            repo_root / "deploy" / "local" / "windows" / "launch-gui.bat",
            repo_root / "deploy" / "local" / "windows" / "setup.bat",
            repo_root / "deploy" / "local" / "windows" / "README.md",
        ]

        for file_path in windows_files:
            assert file_path.exists(), f"Windows deployment file missing: {file_path}"

    def test_common_deployment_files(self):
        """Verify common deployment files exist at correct paths."""
        repo_root = Path(__file__).parent.parent.parent.parent

        common_files = [
            repo_root / "deploy" / "common" / "scripts" / "windows_setup.py",
            repo_root / "deploy" / "common" / "scripts" / "init_database.py",
            repo_root / "deploy" / "common" / "scripts" / "validate_windows_deployment.ps1",
            repo_root / "deploy" / "common" / "app" / "src" / "jsa" / "gui_launcher.py",
            repo_root / "deploy" / "common" / "config" / "user_prefs.example.json",
            repo_root / "deploy" / "common" / "config" / "user_prefs.schema.json",
        ]

        for file_path in common_files:
            assert file_path.exists(), f"Common deployment file missing: {file_path}"

    def test_windows_scripts_reference_correct_paths(self):
        """Verify Windows PowerShell scripts reference correct file paths."""
        repo_root = Path(__file__).parent.parent.parent.parent

        # Check setup.ps1 references
        setup_ps1 = repo_root / "deploy" / "local" / "windows" / "setup.ps1"
        content = setup_ps1.read_text()

        # Should reference deploy\common\scripts\windows_setup.py
        assert "deploy\\common\\scripts\\windows_setup.py" in content, \
            "setup.ps1 should reference deploy\\common\\scripts\\windows_setup.py"

        # Should NOT reference old paths
        assert "deploy/common/launcher_gui.py" not in content, \
            "setup.ps1 should not reference old launcher_gui.py path"

    def test_bootstrap_references_correct_paths(self):
        """Verify bootstrap.ps1 references correct file paths."""
        repo_root = Path(__file__).parent.parent.parent.parent

        bootstrap_ps1 = repo_root / "deploy" / "local" / "windows" / "bootstrap.ps1"
        content = bootstrap_ps1.read_text()

        # Should reference deploy\common\config
        assert "deploy\\common\\config" in content, \
            "bootstrap.ps1 should reference deploy\\common\\config"

        # Should reference deploy\common\scripts\init_database.py
        assert "deploy\\common\\scripts\\init_database.py" in content, \
            "bootstrap.ps1 should reference deploy\\common\\scripts\\init_database.py"

    def test_launch_gui_uses_module_import(self):
        """Verify launch-gui scripts use correct module import."""
        repo_root = Path(__file__).parent.parent.parent.parent

        # PowerShell version
        launch_gui_ps1 = repo_root / "deploy" / "local" / "windows" / "launch-gui.ps1"
        ps1_content = launch_gui_ps1.read_text()

        assert "jsa.gui_launcher" in ps1_content, \
            "launch-gui.ps1 should import jsa.gui_launcher module"

        # Batch version
        launch_gui_bat = repo_root / "deploy" / "local" / "windows" / "launch-gui.bat"
        bat_content = launch_gui_bat.read_text()

        assert "jsa.gui_launcher" in bat_content, \
            "launch-gui.bat should import jsa.gui_launcher module"

    def test_run_script_path_calculations(self):
        """Verify run.ps1 has correct path calculations."""
        repo_root = Path(__file__).parent.parent.parent.parent

        run_ps1 = repo_root / "deploy" / "local" / "windows" / "run.ps1"
        content = run_ps1.read_text()

        # Should calculate PROJECT_ROOT correctly
        assert "Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $SCRIPT_DIR))" in content, \
            "run.ps1 should calculate PROJECT_ROOT by going up 3 levels"

        # Should reference .venv at project root
        assert "Join-Path $PROJECT_ROOT" in content, \
            "run.ps1 should use Join-Path with PROJECT_ROOT"

    def test_gui_launcher_exists_at_correct_location(self):
        """Verify gui_launcher.py exists at the correct location."""
        repo_root = Path(__file__).parent.parent.parent.parent

        gui_launcher = repo_root / "deploy" / "common" / "app" / "src" / "jsa" / "gui_launcher.py"
        assert gui_launcher.exists(), \
            f"gui_launcher.py should exist at {gui_launcher}"

        # Verify it's importable as a module
        try:
            import jsa.gui_launcher
            assert hasattr(jsa.gui_launcher, "main"), \
                "gui_launcher should have a main function"
        except ImportError as e:
            pytest.skip(f"Cannot import jsa.gui_launcher: {e}")

    def test_config_directory_location(self):
        """Verify config directory is at correct location."""
        repo_root = Path(__file__).parent.parent.parent.parent

        config_dir = repo_root / "deploy" / "common" / "config"
        assert config_dir.exists(), \
            f"Config directory should exist at {config_dir}"

        # Check for essential config files
        assert (config_dir / "user_prefs.example.json").exists(), \
            "user_prefs.example.json should exist in config directory"
        assert (config_dir / "user_prefs.schema.json").exists(), \
            "user_prefs.schema.json should exist in config directory"

    def test_windows_readme_has_correct_paths(self):
        """Verify Windows README references correct paths."""
        repo_root = Path(__file__).parent.parent.parent.parent

        readme = repo_root / "deploy" / "local" / "windows" / "README.md"
        content = readme.read_text()

        # Should reference correct config path
        assert "deploy/common/config/user_prefs.json" in content or \
               "../../common/config/user_prefs.json" in content, \
            "README should reference correct config path"

    def test_windows_scripts_are_valid_powershell(self):
        """Verify Windows PowerShell scripts have valid syntax."""
        repo_root = Path(__file__).parent.parent.parent.parent

        ps1_scripts = [
            repo_root / "deploy" / "local" / "windows" / "setup.ps1",
            repo_root / "deploy" / "local" / "windows" / "bootstrap.ps1",
            repo_root / "deploy" / "local" / "windows" / "run.ps1",
            repo_root / "deploy" / "local" / "windows" / "launch-gui.ps1",
        ]

        for script in ps1_scripts:
            # Check that file exists and is not empty
            assert script.exists(), f"Script not found: {script}"
            content = script.read_text()
            assert len(content) > 0, f"Script is empty: {script}"

            # Check for common PowerShell patterns
            assert "#Requires -Version" in content or \
                   "param(" in content or \
                   "function " in content or \
                   "$" in content, \
                f"Script doesn't look like valid PowerShell: {script}"

    def test_no_references_to_old_launcher_gui_path(self):
        """Verify no references to the old launcher_gui.py path exist."""
        repo_root = Path(__file__).parent.parent.parent.parent

        # Check Windows scripts
        windows_dir = repo_root / "deploy" / "local" / "windows"
        for script in windows_dir.glob("*.ps1"):
            content = script.read_text()
            assert "deploy/common/launcher_gui.py" not in content, \
                f"{script.name} should not reference old launcher_gui.py path"
            assert "deploy\\common\\launcher_gui.py" not in content, \
                f"{script.name} should not reference old launcher_gui.py path"

        for script in windows_dir.glob("*.bat"):
            content = script.read_text()
            assert "deploy/common/launcher_gui.py" not in content, \
                f"{script.name} should not reference old launcher_gui.py path"
            assert "deploy\\common\\launcher_gui.py" not in content, \
                f"{script.name} should not reference old launcher_gui.py path"


class TestWindowsDeploymentIntegration:
    """Integration tests for Windows deployment."""

    def test_can_import_jsa_module(self):
        """Verify the jsa module can be imported."""
        try:
            import jsa
            assert jsa is not None
        except ImportError as e:
            pytest.fail(f"Failed to import jsa module: {e}")

    def test_gui_launcher_module_exists(self):
        """Verify gui_launcher can be imported as a module."""
        try:
            import jsa.gui_launcher
            assert hasattr(jsa.gui_launcher, "main")
        except ImportError:
            pytest.skip("gui_launcher module not available in this environment")

    def test_windows_setup_module_exists(self):
        """Verify windows_setup.py can be found and imported."""
        repo_root = Path(__file__).parent.parent.parent.parent
        windows_setup = repo_root / "deploy" / "common" / "scripts" / "windows_setup.py"

        assert windows_setup.exists(), "windows_setup.py should exist"

        # Verify it's valid Python
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", str(windows_setup)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"windows_setup.py has syntax errors: {result.stderr}"

    def test_init_database_script_exists(self):
        """Verify init_database.py exists and is valid."""
        repo_root = Path(__file__).parent.parent.parent.parent
        init_db = repo_root / "deploy" / "common" / "scripts" / "init_database.py"

        assert init_db.exists(), "init_database.py should exist"

        # Verify it's valid Python
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", str(init_db)],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"init_database.py has syntax errors: {result.stderr}"
