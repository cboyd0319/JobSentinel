#!/usr/bin/env python3
"""
Test Deployment Script Path Resolution

This test validates that all deployment scripts correctly resolve paths
to the repository root and can find the necessary files.
"""

import os
import re
from pathlib import Path
import pytest


class TestDeploymentPaths:
    """Test that deployment scripts have correct path resolution."""

    @pytest.fixture
    def repo_root(self):
        """Get the repository root directory."""
        # This test file is in deploy/common/tests/
        # So repo root is 3 levels up
        test_dir = Path(__file__).parent
        return test_dir.parent.parent.parent

    def test_windows_setup_ps1_navigates_to_repo_root(self, repo_root):
        """Test that Windows setup.ps1 navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "setup.ps1"
        assert script_path.exists(), f"setup.ps1 not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates to repo root (3 levels up)
        assert "Split-Path -Parent (Split-Path -Parent (Split-Path -Parent" in content, \
            "setup.ps1 should navigate 3 levels up to find repo root"

        # Check that it references the correct Python script path
        assert "deploy\\common\\scripts\\windows_setup.py" in content, \
            "setup.ps1 should reference deploy\\common\\scripts\\windows_setup.py"

    def test_windows_launch_gui_ps1_navigates_to_repo_root(self, repo_root):
        """Test that Windows launch-gui.ps1 navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "launch-gui.ps1"
        assert script_path.exists(), f"launch-gui.ps1 not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates to repo root (3 levels up)
        assert "Split-Path -Parent (Split-Path -Parent (Split-Path -Parent" in content, \
            "launch-gui.ps1 should navigate 3 levels up to find repo root"

        # Check that it references the correct launcher path
        assert "deploy\\common\\launcher_gui.py" in content, \
            "launch-gui.ps1 should reference deploy\\common\\launcher_gui.py"

    def test_windows_bootstrap_ps1_navigates_to_repo_root(self, repo_root):
        """Test that Windows bootstrap.ps1 navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "bootstrap.ps1"
        assert script_path.exists(), f"bootstrap.ps1 not found at {script_path}"

        content = script_path.read_text()

        # Check that it calculates PROJECT_ROOT correctly (3 levels up)
        assert "Split-Path -Parent (Split-Path -Parent (Split-Path -Parent" in content, \
            "bootstrap.ps1 should navigate 3 levels up to find repo root"

    def test_windows_run_ps1_navigates_to_repo_root(self, repo_root):
        """Test that Windows run.ps1 navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "run.ps1"
        assert script_path.exists(), f"run.ps1 not found at {script_path}"

        content = script_path.read_text()

        # Check that it calculates PROJECT_ROOT correctly (3 levels up)
        assert "Split-Path -Parent (Split-Path -Parent (Split-Path -Parent" in content, \
            "run.ps1 should navigate 3 levels up to find repo root"

    def test_windows_setup_bat_navigates_to_repo_root(self, repo_root):
        """Test that Windows setup.bat navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "setup.bat"
        assert script_path.exists(), f"setup.bat not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates up 3 levels
        assert "cd ..\\..\\..\\" in content, \
            "setup.bat should navigate 3 levels up to find repo root"

        # Check that it references the correct Python script path
        assert "deploy\\common\\scripts\\windows_setup.py" in content, \
            "setup.bat should reference deploy\\common\\scripts\\windows_setup.py"

    def test_windows_launch_gui_bat_navigates_to_repo_root(self, repo_root):
        """Test that Windows launch-gui.bat navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "windows" / "launch-gui.bat"
        assert script_path.exists(), f"launch-gui.bat not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates up 3 levels
        assert "cd ..\\..\\..\\" in content, \
            "launch-gui.bat should navigate 3 levels up to find repo root"

        # Check that it references the correct launcher path
        assert "deploy\\common\\launcher_gui.py" in content, \
            "launch-gui.bat should reference deploy\\common\\launcher_gui.py"

    def test_macos_setup_sh_navigates_to_repo_root(self, repo_root):
        """Test that macOS setup.sh navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "macos" / "setup.sh"
        assert script_path.exists(), f"setup.sh not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates to repo root (../../..)
        assert 'REPO_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"' in content, \
            "setup.sh should navigate to repo root using ../../.."

        # Check that it references the correct Python script path
        assert "deploy/common/scripts/macos_setup.py" in content, \
            "setup.sh should reference deploy/common/scripts/macos_setup.py"

    def test_macos_launch_gui_sh_navigates_to_repo_root(self, repo_root):
        """Test that macOS launch-gui.sh navigates to repository root."""
        script_path = repo_root / "deploy" / "local" / "macos" / "launch-gui.sh"
        assert script_path.exists(), f"launch-gui.sh not found at {script_path}"

        content = script_path.read_text()

        # Check that it navigates to repo root (../../..)
        assert 'REPO_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"' in content, \
            "launch-gui.sh should navigate to repo root using ../../.."

        # Check that it references the correct launcher path
        assert "deploy/common/launcher_gui.py" in content, \
            "launch-gui.sh should reference deploy/common/launcher_gui.py"

    def test_referenced_files_exist(self, repo_root):
        """Test that all referenced Python files actually exist."""
        files_to_check = [
            repo_root / "deploy" / "common" / "scripts" / "windows_setup.py",
            repo_root / "deploy" / "common" / "scripts" / "macos_setup.py",
            repo_root / "deploy" / "common" / "launcher_gui.py",
        ]

        for file_path in files_to_check:
            assert file_path.exists(), f"Referenced file not found: {file_path}"
            assert file_path.is_file(), f"Path is not a file: {file_path}"

    def test_python_version_requirements_consistent(self, repo_root):
        """Test that Python version requirements are consistent across scripts."""
        scripts = [
            repo_root / "deploy" / "local" / "windows" / "setup.ps1",
            repo_root / "deploy" / "local" / "windows" / "launch-gui.ps1",
            repo_root / "deploy" / "local" / "macos" / "setup.sh",
            repo_root / "deploy" / "local" / "macos" / "launch-gui.sh",
        ]

        for script in scripts:
            content = script.read_text()
            # All scripts should mention 3.11+ as minimum
            assert "3.11" in content, \
                f"{script.name} should mention Python 3.11+ as minimum requirement"


class TestDeploymentVersionRequirements:
    """Test that version requirements are consistent."""

    @pytest.fixture
    def repo_root(self):
        """Get the repository root directory."""
        test_dir = Path(__file__).parent
        return test_dir.parent.parent.parent

    def test_macos_version_requirements(self, repo_root):
        """Test that macOS version requirements are consistent (12+)."""
        scripts = [
            repo_root / "deploy" / "local" / "macos" / "setup.sh",
            repo_root / "deploy" / "common" / "scripts" / "macos_setup.py",
        ]

        for script in scripts:
            content = script.read_text()
            # Scripts should accept macOS 12+
            assert "12" in content, \
                f"{script.name} should mention macOS 12+ as minimum requirement"

    def test_python_setup_scripts_accept_3_11(self, repo_root):
        """Test that Python setup scripts accept Python 3.11+."""
        scripts = [
            repo_root / "deploy" / "common" / "scripts" / "windows_setup.py",
            repo_root / "deploy" / "common" / "scripts" / "macos_setup.py",
        ]

        for script in scripts:
            content = script.read_text()
            # Scripts should check for 3.11+
            assert "3, 11" in content or "3.11" in content, \
                f"{script.name} should accept Python 3.11+"
