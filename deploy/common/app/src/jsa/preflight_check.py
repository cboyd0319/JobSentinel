"""Pre-flight system checks for JobSentinel.

Comprehensive validation before installation or running to catch issues early
and provide actionable feedback to users with zero technical knowledge.

References:
- ISO/IEC 25010:2023 | Systems and software Quality Requirements and Evaluation (SQuaRE)
- SWEBOK v4.0a | Software Engineering Body of Knowledge
- Microsoft Windows Application Development Guidelines
"""

import json
import os
import platform
import shutil
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import psutil
except ImportError:
    psutil = None  # type: ignore[assignment]


@dataclass
class CheckResult:
    """Result of a pre-flight check."""

    name: str
    passed: bool
    message: str
    fix_suggestion: str | None = None
    severity: str = "error"  # error, warning, info


class PreflightChecker:
    """Comprehensive pre-flight system validation."""

    def __init__(self) -> None:
        """Initialize the pre-flight checker."""
        self.results: list[CheckResult] = []

    def run_all_checks(self) -> tuple[bool, list[CheckResult]]:
        """Run all pre-flight checks.

        Returns:
            Tuple of (all_passed, results)
        """
        self.results = []

        # System checks
        self._check_os()
        self._check_python_version()
        self._check_python_path()

        # Resource checks
        self._check_disk_space()
        self._check_memory()
        self._check_cpu()

        # Permission checks
        self._check_write_permissions()

        # Network checks
        self._check_internet()
        self._check_ports()

        # Dependency checks
        self._check_pip()
        self._check_git()
        self._check_ripgrep()

        # Configuration checks
        self._check_config_directory()

        # Database checks
        self._check_data_directory()

        all_passed = all(r.passed or r.severity != "error" for r in self.results)
        return all_passed, self.results

    def _check_os(self) -> None:
        """Check operating system compatibility."""
        os_name = platform.system()
        os_release = platform.release()

        if os_name == "Windows":
            # Check Windows version
            try:
                version = sys.getwindowsversion()  # type: ignore[attr-defined]
                build = version.build

                if build >= 22000:  # Windows 11
                    self.results.append(
                        CheckResult(
                            name="Operating System",
                            passed=True,
                            message=f"Windows 11 detected (build {build})",
                        )
                    )
                elif build >= 19041:  # Windows 10
                    self.results.append(
                        CheckResult(
                            name="Operating System",
                            passed=True,
                            message=f"Windows 10 detected (build {build})",
                            severity="warning",
                        )
                    )
                else:
                    self.results.append(
                        CheckResult(
                            name="Operating System",
                            passed=False,
                            message=f"Windows version too old (build {build})",
                            fix_suggestion="Upgrade to Windows 10 (build 19041+) or Windows 11",
                        )
                    )
            except AttributeError:
                # Not Windows
                self.results.append(
                    CheckResult(
                        name="Operating System",
                        passed=True,
                        message=f"Windows {os_release} detected",
                        severity="info",
                    )
                )
        elif os_name in ("Linux", "Darwin"):
            self.results.append(
                CheckResult(
                    name="Operating System",
                    passed=True,
                    message=f"{os_name} {os_release} detected",
                    severity="info",
                )
            )
        else:
            self.results.append(
                CheckResult(
                    name="Operating System",
                    passed=False,
                    message=f"Unsupported OS: {os_name}",
                    fix_suggestion="JobSentinel supports Windows 10+, macOS, and Linux",
                )
            )

    def _check_python_version(self) -> None:
        """Check Python version."""
        version_info = sys.version_info
        version_str = f"{version_info.major}.{version_info.minor}.{version_info.micro}"

        # Windows requires 3.12+, others support 3.11+
        is_windows = platform.system() == "Windows"
        min_major = 3
        min_minor = 12 if is_windows else 11

        if version_info.major >= min_major and version_info.minor >= min_minor:
            self.results.append(
                CheckResult(
                    name="Python Version",
                    passed=True,
                    message=f"Python {version_str} found",
                )
            )
        else:
            required = f"{min_major}.{min_minor}"
            self.results.append(
                CheckResult(
                    name="Python Version",
                    passed=False,
                    message=f"Python {version_str} found (requires {required}+)",
                    fix_suggestion=f"Install Python {required}+ from https://www.python.org/downloads/\n"
                    "IMPORTANT: Check 'Add Python to PATH' during installation",
                )
            )

    def _check_python_path(self) -> None:
        """Check if Python is in PATH."""
        python_cmd = "python" if platform.system() == "Windows" else "python3"

        try:
            result = subprocess.run(
                [python_cmd, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                self.results.append(
                    CheckResult(
                        name="Python PATH",
                        passed=True,
                        message="Python found in PATH",
                    )
                )
            else:
                self._add_python_path_error()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            self._add_python_path_error()

    def _add_python_path_error(self) -> None:
        """Add Python PATH error."""
        if platform.system() == "Windows":
            fix = (
                "1. Search for 'Environment Variables' in Windows\n"
                "2. Click 'Environment Variables' button\n"
                "3. Under 'User variables', select 'Path' and click 'Edit'\n"
                "4. Click 'New' and add Python installation directory\n"
                "5. Click 'OK' and restart terminal"
            )
        else:
            fix = (
                "Add Python to your PATH in ~/.bashrc or ~/.zshrc:\n"
                'export PATH="$HOME/.local/bin:$PATH"'
            )

        self.results.append(
            CheckResult(
                name="Python PATH",
                passed=False,
                message="Python not found in system PATH",
                fix_suggestion=fix,
            )
        )

    def _check_disk_space(self) -> None:
        """Check available disk space."""
        if psutil:
            try:
                disk = psutil.disk_usage(".")
                free_gb = disk.free / (1024**3)

                if free_gb >= 2.0:
                    self.results.append(
                        CheckResult(
                            name="Disk Space",
                            passed=True,
                            message=f"{free_gb:.1f} GB free",
                        )
                    )
                elif free_gb >= 1.0:
                    self.results.append(
                        CheckResult(
                            name="Disk Space",
                            passed=True,
                            message=f"{free_gb:.1f} GB free (recommended: 2+ GB)",
                            severity="warning",
                        )
                    )
                else:
                    self.results.append(
                        CheckResult(
                            name="Disk Space",
                            passed=False,
                            message=f"Only {free_gb:.1f} GB free",
                            fix_suggestion="Free up at least 1 GB of disk space",
                        )
                    )
            except Exception as e:
                self.results.append(
                    CheckResult(
                        name="Disk Space",
                        passed=True,
                        message=f"Could not check disk space: {e}",
                        severity="warning",
                    )
                )

    def _check_memory(self) -> None:
        """Check available memory."""
        if psutil:
            try:
                memory = psutil.virtual_memory()
                available_gb = memory.available / (1024**3)

                if available_gb >= 1.0:
                    self.results.append(
                        CheckResult(
                            name="Available Memory",
                            passed=True,
                            message=f"{available_gb:.1f} GB available",
                        )
                    )
                else:
                    self.results.append(
                        CheckResult(
                            name="Available Memory",
                            passed=True,
                            message=f"Only {available_gb:.1f} GB available (may run slowly)",
                            severity="warning",
                        )
                    )
            except Exception as e:
                self.results.append(
                    CheckResult(
                        name="Available Memory",
                        passed=True,
                        message=f"Could not check memory: {e}",
                        severity="warning",
                    )
                )

    def _check_cpu(self) -> None:
        """Check CPU information."""
        if psutil:
            try:
                cpu_count = psutil.cpu_count(logical=False)
                cpu_percent = psutil.cpu_percent(interval=0.1)

                if cpu_count and cpu_count >= 2:
                    self.results.append(
                        CheckResult(
                            name="CPU",
                            passed=True,
                            message=f"{cpu_count} cores, {cpu_percent}% usage",
                        )
                    )
                else:
                    self.results.append(
                        CheckResult(
                            name="CPU",
                            passed=True,
                            message="Single core CPU (may run slowly)",
                            severity="warning",
                        )
                    )
            except Exception as e:
                self.results.append(
                    CheckResult(
                        name="CPU",
                        passed=True,
                        message=f"Could not check CPU: {e}",
                        severity="warning",
                    )
                )

    def _check_write_permissions(self) -> None:
        """Check write permissions in current directory."""
        test_file = Path(".preflight_test")

        try:
            test_file.write_text("test")
            test_file.unlink()
            self.results.append(
                CheckResult(
                    name="Write Permissions",
                    passed=True,
                    message="Can write to current directory",
                )
            )
        except (OSError, PermissionError) as e:
            self.results.append(
                CheckResult(
                    name="Write Permissions",
                    passed=False,
                    message=f"Cannot write to current directory: {e}",
                    fix_suggestion="Move JobSentinel to a directory where you have write access "
                    "(e.g., Documents or Desktop)",
                )
            )

    def _check_internet(self) -> None:
        """Check internet connectivity."""
        try:
            # Try to connect to a reliable host
            socket.create_connection(("1.1.1.1", 53), timeout=3)
            self.results.append(
                CheckResult(
                    name="Internet Connection",
                    passed=True,
                    message="Connected",
                )
            )
        except OSError:
            self.results.append(
                CheckResult(
                    name="Internet Connection",
                    passed=True,
                    message="Not connected (job scraping will fail)",
                    severity="warning",
                )
            )

    def _check_ports(self) -> None:
        """Check if required ports are available."""
        ports_to_check = [5000, 8000]

        for port in ports_to_check:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(("localhost", port))
                sock.close()

                if result != 0:
                    # Port is free
                    self.results.append(
                        CheckResult(
                            name=f"Port {port}",
                            passed=True,
                            message=f"Port {port} available",
                            severity="info",
                        )
                    )
                else:
                    # Port is in use
                    self.results.append(
                        CheckResult(
                            name=f"Port {port}",
                            passed=True,
                            message=f"Port {port} in use (will try alternative)",
                            severity="warning",
                        )
                    )
            except Exception:
                # Port check is informational only
                pass

    def _check_pip(self) -> None:
        """Check if pip is available."""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                self.results.append(
                    CheckResult(
                        name="pip",
                        passed=True,
                        message="pip found",
                    )
                )
            else:
                self._add_pip_error()
        except (subprocess.TimeoutExpired, FileNotFoundError):
            self._add_pip_error()

    def _add_pip_error(self) -> None:
        """Add pip not found error."""
        self.results.append(
            CheckResult(
                name="pip",
                passed=False,
                message="pip not found",
                fix_suggestion="Install pip: python -m ensurepip --upgrade",
            )
        )

    def _check_git(self) -> None:
        """Check if git is available (optional)."""
        if shutil.which("git"):
            self.results.append(
                CheckResult(
                    name="git",
                    passed=True,
                    message="git found (optional)",
                    severity="info",
                )
            )
        else:
            self.results.append(
                CheckResult(
                    name="git",
                    passed=True,
                    message="git not found (optional - can download ZIP instead)",
                    severity="info",
                )
            )

    def _check_ripgrep(self) -> None:
        """Check if RipGrep is available (optional but recommended)."""
        if shutil.which("rg"):
            self.results.append(
                CheckResult(
                    name="RipGrep",
                    passed=True,
                    message="RipGrep found (recommended for performance)",
                    severity="info",
                )
            )
        else:
            self.results.append(
                CheckResult(
                    name="RipGrep",
                    passed=True,
                    message="RipGrep not found (optional - enables 10-50x faster search)",
                    fix_suggestion=(
                        "Install RipGrep for better performance:\n"
                        "  macOS: brew install ripgrep\n"
                        "  Linux: apt install ripgrep\n"
                        "  Windows: winget install BurntSushi.ripgrep.MSVC"
                    ),
                    severity="info",
                )
            )

    def _check_config_directory(self) -> None:
        """Check if config directory exists."""
        config_dir = Path("config")

        if config_dir.exists() and config_dir.is_dir():
            self.results.append(
                CheckResult(
                    name="Config Directory",
                    passed=True,
                    message="Config directory found",
                )
            )
        else:
            self.results.append(
                CheckResult(
                    name="Config Directory",
                    passed=True,
                    message="Config directory will be created",
                    severity="info",
                )
            )

    def _check_data_directory(self) -> None:
        """Check if data directory exists."""
        data_dir = Path("data")

        if data_dir.exists() and data_dir.is_dir():
            self.results.append(
                CheckResult(
                    name="Data Directory",
                    passed=True,
                    message="Data directory found",
                )
            )
        else:
            self.results.append(
                CheckResult(
                    name="Data Directory",
                    passed=True,
                    message="Data directory will be created",
                    severity="info",
                )
            )

    def print_results(self) -> None:
        """Print results in a user-friendly format."""
        print("\n" + "=" * 70)
        print("JobSentinel Pre-Flight Check Results")
        print("=" * 70 + "\n")

        errors = [r for r in self.results if not r.passed and r.severity == "error"]
        warnings = [r for r in self.results if r.severity == "warning"]
        passed = [r for r in self.results if r.passed and r.severity != "warning"]

        if errors:
            print("❌ CRITICAL ISSUES (must fix to proceed):")
            print("-" * 70)
            for result in errors:
                print(f"\n  • {result.name}: {result.message}")
                if result.fix_suggestion:
                    print(f"    Fix: {result.fix_suggestion}")
            print()

        if warnings:
            print("⚠️  WARNINGS (recommended to address):")
            print("-" * 70)
            for result in warnings:
                print(f"\n  • {result.name}: {result.message}")
                if result.fix_suggestion:
                    print(f"    Fix: {result.fix_suggestion}")
            print()

        if passed:
            print("✅ PASSED CHECKS:")
            print("-" * 70)
            for result in passed:
                if result.severity == "info":
                    print(f"  ℹ️  {result.name}: {result.message}")
                else:
                    print(f"  ✓ {result.name}: {result.message}")
            print()

        print("=" * 70)

        if errors:
            print("\n❌ Pre-flight check FAILED. Please fix the issues above.")
        elif warnings:
            print("\n⚠️  Pre-flight check PASSED with warnings.")
        else:
            print("\n✅ All pre-flight checks PASSED! Ready to install.")

        print()


def main() -> int:
    """Run pre-flight checks from command line."""
    checker = PreflightChecker()
    all_passed, _ = checker.run_all_checks()
    checker.print_results()

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
