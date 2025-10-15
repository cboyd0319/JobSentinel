#!/usr/bin/env python3
"""
Complete Windows Deployment Test Script

This script performs a comprehensive end-to-end test of the Windows deployment,
verifying that all components work correctly together.

This can be run on any platform to verify the Windows deployment structure.
"""

import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# ANSI color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


class WindowsDeploymentTester:
    """Test the Windows deployment configuration."""

    def __init__(self):
        """Initialize the tester."""
        self.repo_root = Path(__file__).parent.parent.parent.parent
        self.tests_passed = 0
        self.tests_failed = 0
        self.tests_warned = 0

    def print_header(self, message: str) -> None:
        """Print a section header."""
        print(f"\n{BLUE}{'=' * 70}{RESET}")
        print(f"{BLUE}{message}{RESET}")
        print(f"{BLUE}{'=' * 70}{RESET}\n")

    def print_success(self, message: str) -> None:
        """Print a success message."""
        print(f"{GREEN}✓ {message}{RESET}")
        self.tests_passed += 1

    def print_failure(self, message: str) -> None:
        """Print a failure message."""
        print(f"{RED}✗ {message}{RESET}")
        self.tests_failed += 1

    def print_warning(self, message: str) -> None:
        """Print a warning message."""
        print(f"{YELLOW}⚠ {message}{RESET}")
        self.tests_warned += 1

    def test_file_structure(self) -> None:
        """Test that all required files exist."""
        self.print_header("Testing Windows Deployment File Structure")

        # Windows-specific files
        windows_files = [
            "deploy/local/windows/setup.ps1",
            "deploy/local/windows/bootstrap.ps1",
            "deploy/local/windows/run.ps1",
            "deploy/local/windows/launch-gui.ps1",
            "deploy/local/windows/launch-gui.bat",
            "deploy/local/windows/setup.bat",
            "deploy/local/windows/README.md",
        ]

        for file_path in windows_files:
            full_path = self.repo_root / file_path
            if full_path.exists():
                self.print_success(f"Found: {file_path}")
            else:
                self.print_failure(f"Missing: {file_path}")

        # Common deployment files
        common_files = [
            "deploy/common/scripts/windows_setup.py",
            "deploy/common/scripts/init_database.py",
            "deploy/common/scripts/validate_windows_deployment.ps1",
            "deploy/common/app/src/jsa/gui_launcher.py",
            "deploy/common/config/user_prefs.example.json",
            "deploy/common/config/user_prefs.schema.json",
        ]

        for file_path in common_files:
            full_path = self.repo_root / file_path
            if full_path.exists():
                self.print_success(f"Found: {file_path}")
            else:
                self.print_failure(f"Missing: {file_path}")

    def test_python_syntax(self) -> None:
        """Test that Python scripts have valid syntax."""
        self.print_header("Testing Python Script Syntax")

        python_scripts = [
            "deploy/common/scripts/windows_setup.py",
            "deploy/common/scripts/init_database.py",
            "deploy/common/app/src/jsa/gui_launcher.py",
        ]

        for script_path in python_scripts:
            full_path = self.repo_root / script_path
            if not full_path.exists():
                self.print_failure(f"Script not found: {script_path}")
                continue

            result = subprocess.run(
                [sys.executable, "-m", "py_compile", str(full_path)],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                self.print_success(f"Valid Python syntax: {script_path}")
            else:
                self.print_failure(f"Syntax error in {script_path}: {result.stderr}")

    def test_powershell_structure(self) -> None:
        """Test that PowerShell scripts have expected structure."""
        self.print_header("Testing PowerShell Script Structure")

        ps1_scripts = [
            "deploy/local/windows/setup.ps1",
            "deploy/local/windows/bootstrap.ps1",
            "deploy/local/windows/run.ps1",
            "deploy/local/windows/launch-gui.ps1",
        ]

        for script_path in ps1_scripts:
            full_path = self.repo_root / script_path
            if not full_path.exists():
                self.print_failure(f"Script not found: {script_path}")
                continue

            content = full_path.read_text()

            # Check for PowerShell requirements
            if "#Requires -Version" in content or "param(" in content:
                self.print_success(f"Valid PowerShell structure: {script_path}")
            else:
                self.print_warning(f"Missing PowerShell markers: {script_path}")

    def test_path_references(self) -> None:
        """Test that scripts reference correct paths."""
        self.print_header("Testing Path References in Scripts")

        # Check setup.ps1
        setup_ps1 = self.repo_root / "deploy/local/windows/setup.ps1"
        if setup_ps1.exists():
            content = setup_ps1.read_text()
            if "deploy\\common\\scripts\\windows_setup.py" in content:
                self.print_success("setup.ps1 references correct windows_setup.py path")
            else:
                self.print_failure("setup.ps1 has incorrect windows_setup.py path")

        # Check bootstrap.ps1
        bootstrap_ps1 = self.repo_root / "deploy/local/windows/bootstrap.ps1"
        if bootstrap_ps1.exists():
            content = bootstrap_ps1.read_text()
            if "deploy\\common\\config" in content:
                self.print_success("bootstrap.ps1 references correct config path")
            else:
                self.print_failure("bootstrap.ps1 has incorrect config path")

        # Check launch-gui scripts
        launch_gui_ps1 = self.repo_root / "deploy/local/windows/launch-gui.ps1"
        if launch_gui_ps1.exists():
            content = launch_gui_ps1.read_text()
            if "jsa.gui_launcher" in content:
                self.print_success("launch-gui.ps1 uses module import")
            else:
                self.print_failure("launch-gui.ps1 doesn't use module import")

        launch_gui_bat = self.repo_root / "deploy/local/windows/launch-gui.bat"
        if launch_gui_bat.exists():
            content = launch_gui_bat.read_text()
            if "jsa.gui_launcher" in content:
                self.print_success("launch-gui.bat uses module import")
            else:
                self.print_failure("launch-gui.bat doesn't use module import")

    def test_no_old_references(self) -> None:
        """Test that old path references are not present."""
        self.print_header("Checking for Old Path References")

        windows_scripts = [
            "deploy/local/windows/setup.ps1",
            "deploy/local/windows/bootstrap.ps1",
            "deploy/local/windows/run.ps1",
            "deploy/local/windows/launch-gui.ps1",
            "deploy/local/windows/launch-gui.bat",
        ]

        old_paths = [
            "deploy/common/launcher_gui.py",
            "deploy\\common\\launcher_gui.py",
        ]

        for script_path in windows_scripts:
            full_path = self.repo_root / script_path
            if not full_path.exists():
                continue

            content = full_path.read_text()
            has_old_refs = any(old_path in content for old_path in old_paths)

            if not has_old_refs:
                self.print_success(f"No old path references in {script_path}")
            else:
                self.print_failure(f"Old path references found in {script_path}")

    def test_module_imports(self) -> None:
        """Test that Python modules can be imported."""
        self.print_header("Testing Python Module Imports")

        # Test jsa module
        try:
            import jsa

            self.print_success("jsa module can be imported")
        except ImportError as e:
            self.print_failure(f"Cannot import jsa module: {e}")

        # Test jsa.gui_launcher
        try:
            import jsa.gui_launcher

            if hasattr(jsa.gui_launcher, "main"):
                self.print_success("jsa.gui_launcher has main function")
            else:
                self.print_warning("jsa.gui_launcher missing main function")
        except ImportError:
            self.print_warning("jsa.gui_launcher not available (may need tkinter)")

        # Test jsa.cli
        try:
            import jsa.cli

            self.print_success("jsa.cli module can be imported")
        except ImportError as e:
            self.print_failure(f"Cannot import jsa.cli: {e}")

    def test_cli_commands(self) -> None:
        """Test that CLI commands work."""
        self.print_header("Testing CLI Commands")

        # Test help command
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0 and "JobSentinel" in result.stdout:
            self.print_success("CLI help command works")
        else:
            self.print_failure("CLI help command failed")

        # Test health command
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "health"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if "Health Check" in result.stdout:
            self.print_success("CLI health command works")
        else:
            self.print_failure("CLI health command failed")

    def test_config_files(self) -> None:
        """Test that config files are valid."""
        self.print_header("Testing Configuration Files")

        # Test example config
        example_config = self.repo_root / "deploy/common/config/user_prefs.example.json"
        if example_config.exists():
            try:
                import json

                with open(example_config) as f:
                    json.load(f)
                self.print_success("user_prefs.example.json is valid JSON")
            except json.JSONDecodeError as e:
                self.print_failure(f"user_prefs.example.json is invalid: {e}")
        else:
            self.print_failure("user_prefs.example.json not found")

        # Test schema
        schema_config = self.repo_root / "deploy/common/config/user_prefs.schema.json"
        if schema_config.exists():
            try:
                import json

                with open(schema_config) as f:
                    json.load(f)
                self.print_success("user_prefs.schema.json is valid JSON")
            except json.JSONDecodeError as e:
                self.print_failure(f"user_prefs.schema.json is invalid: {e}")
        else:
            self.print_failure("user_prefs.schema.json not found")

    def print_summary(self) -> None:
        """Print test summary."""
        self.print_header("Test Summary")

        total = self.tests_passed + self.tests_failed + self.tests_warned

        print(f"Total tests: {total}")
        print(f"{GREEN}Passed: {self.tests_passed}{RESET}")
        print(f"{RED}Failed: {self.tests_failed}{RESET}")
        print(f"{YELLOW}Warnings: {self.tests_warned}{RESET}")
        print()

        if self.tests_failed == 0:
            print(f"{GREEN}{'=' * 70}{RESET}")
            print(f"{GREEN}✓ All Windows deployment tests PASSED!{RESET}")
            print(f"{GREEN}{'=' * 70}{RESET}")
            return 0
        else:
            print(f"{RED}{'=' * 70}{RESET}")
            print(f"{RED}✗ {self.tests_failed} test(s) FAILED{RESET}")
            print(f"{RED}{'=' * 70}{RESET}")
            return 1

    def run_all_tests(self) -> int:
        """Run all tests and return exit code."""
        print(f"\n{BLUE}Windows Deployment Complete Test Suite{RESET}")
        print(f"{BLUE}Repository: {self.repo_root}{RESET}\n")

        self.test_file_structure()
        self.test_python_syntax()
        self.test_powershell_structure()
        self.test_path_references()
        self.test_no_old_references()
        self.test_module_imports()
        self.test_cli_commands()
        self.test_config_files()

        return self.print_summary()


def main() -> int:
    """Main entry point."""
    tester = WindowsDeploymentTester()
    return tester.run_all_tests()


if __name__ == "__main__":
    sys.exit(main())
