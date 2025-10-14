"""
Windows System Pre-Check Module

Comprehensive system compatibility check before installation.
Catches issues BEFORE installation starts to provide better user experience.

Features:
- Windows version detection
- Python version validation
- Disk space check
- Internet connectivity test
- Write permissions check
- Port availability check
- Memory check

All checks designed for Windows 11+ with ZERO admin rights.
"""

import platform
import shutil
import socket
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class CheckResult:
    """Result of a single system check."""

    name: str
    passed: bool
    message: str
    severity: str  # "critical", "warning", "info"
    help_text: str | None = None
    help_url: str | None = None


class WindowsPreCheck:
    """Comprehensive Windows system pre-check."""

    # Minimum requirements
    MIN_WINDOWS_BUILD = 22000  # Windows 11
    MIN_PYTHON_VERSION = (3, 12)
    MIN_DISK_SPACE_GB = 1.0
    MIN_MEMORY_MB = 1024
    REQUIRED_PORTS = [5000, 8000]  # Flask, FastAPI defaults

    def __init__(self, verbose: bool = False):
        """
        Initialize pre-check system.

        Args:
            verbose: If True, show detailed check progress
        """
        self.verbose = verbose
        self.results: list[CheckResult] = []

    def check_windows_version(self) -> CheckResult:
        """Check if running on Windows 11+."""
        try:
            # Check OS type
            if platform.system() != "Windows":
                return CheckResult(
                    name="Windows Version",
                    passed=False,
                    message=f"Windows 11 required. Detected: {platform.system()}",
                    severity="critical",
                    help_text="JobSentinel Windows installer is for Windows 11+ only.",
                    help_url="https://www.microsoft.com/windows/windows-11",
                )

            # Check build number
            version = platform.version()
            build = int(version.split(".")[2]) if "." in version else 0

            if build >= self.MIN_WINDOWS_BUILD:
                return CheckResult(
                    name="Windows Version",
                    passed=True,
                    message=f"Windows 11 (build {build})",
                    severity="info",
                )
            else:
                return CheckResult(
                    name="Windows Version",
                    passed=False,
                    message=f"Windows 11 required (build {self.MIN_WINDOWS_BUILD}+). Found: build {build}",
                    severity="critical",
                    help_text="Please upgrade to Windows 11.",
                    help_url="https://www.microsoft.com/windows/windows-11",
                )

        except Exception as e:
            return CheckResult(
                name="Windows Version",
                passed=False,
                message=f"Could not detect Windows version: {e}",
                severity="warning",
            )

    def check_python_version(self) -> CheckResult:
        """Check if Python 3.12+ is installed."""
        version = sys.version_info
        min_version = self.MIN_PYTHON_VERSION

        if version >= min_version:
            return CheckResult(
                name="Python Version",
                passed=True,
                message=f"Python {version.major}.{version.minor}.{version.micro}",
                severity="info",
            )
        else:
            return CheckResult(
                name="Python Version",
                passed=False,
                message=f"Python {min_version[0]}.{min_version[1]}+ required. Found: {version.major}.{version.minor}.{version.micro}",
                severity="critical",
                help_text=(
                    "Please install Python 3.12 or newer from:\n"
                    "https://www.python.org/downloads/\n\n"
                    "IMPORTANT: Check 'Add Python to PATH' during installation!"
                ),
                help_url="https://www.python.org/downloads/",
            )

    def check_disk_space(self) -> CheckResult:
        """Check if enough disk space is available."""
        try:
            total, used, free = shutil.disk_usage(".")
            free_gb = free / (1024**3)

            if free_gb >= self.MIN_DISK_SPACE_GB:
                return CheckResult(
                    name="Disk Space",
                    passed=True,
                    message=f"{free_gb:.1f} GB free",
                    severity="info",
                )
            else:
                return CheckResult(
                    name="Disk Space",
                    passed=False,
                    message=f"Only {free_gb:.1f} GB free. Need at least {self.MIN_DISK_SPACE_GB} GB.",
                    severity="critical",
                    help_text="Please free up some disk space:\n"
                    "• Empty Recycle Bin\n"
                    "• Delete temporary files\n"
                    "• Uninstall unused programs\n"
                    "• Run Disk Cleanup",
                )

        except Exception as e:
            return CheckResult(
                name="Disk Space",
                passed=False,
                message=f"Could not check disk space: {e}",
                severity="warning",
            )

    def check_internet_connection(self) -> CheckResult:
        """Check if internet connection is available."""
        try:
            # Try to connect to Google DNS
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return CheckResult(
                name="Internet Connection",
                passed=True,
                message="Connected",
                severity="info",
            )
        except OSError:
            return CheckResult(
                name="Internet Connection",
                passed=False,
                message="No internet connection detected",
                severity="critical",
                help_text=(
                    "Internet connection required for:\n"
                    "• Installing dependencies\n"
                    "• Scraping job boards\n\n"
                    "Please connect to the internet and try again."
                ),
            )

    def check_write_permissions(self) -> CheckResult:
        """Check if we have write permissions in current directory."""
        try:
            # Try to create a temporary file
            test_file = Path(".precheck_test_file")
            test_file.write_text("test")
            test_file.unlink()

            return CheckResult(
                name="Write Permissions",
                passed=True,
                message="Can write to directory",
                severity="info",
            )
        except Exception as e:
            return CheckResult(
                name="Write Permissions",
                passed=False,
                message=f"Cannot write to directory: {e}",
                severity="critical",
                help_text=(
                    "JobSentinel needs write access to:\n"
                    "• Create data and log directories\n"
                    "• Store job database\n"
                    "• Save configuration\n\n"
                    "Try running from a different location (e.g., Desktop)."
                ),
            )

    def check_memory(self) -> CheckResult:
        """Check if enough memory is available."""
        try:
            import psutil

            # Get available memory
            memory = psutil.virtual_memory()
            available_mb = memory.available / (1024**2)

            if available_mb >= self.MIN_MEMORY_MB:
                return CheckResult(
                    name="Memory",
                    passed=True,
                    message=f"{available_mb / 1024:.1f} GB available",
                    severity="info",
                )
            else:
                return CheckResult(
                    name="Memory",
                    passed=False,
                    message=f"Only {available_mb:.0f} MB available. Need at least {self.MIN_MEMORY_MB} MB.",
                    severity="warning",
                    help_text="Close some applications to free up memory.",
                )

        except ImportError:
            # psutil not installed yet - skip check
            return CheckResult(
                name="Memory",
                passed=True,
                message="Not checked (psutil not available)",
                severity="info",
            )
        except Exception as e:
            return CheckResult(
                name="Memory",
                passed=True,
                message=f"Could not check memory: {e}",
                severity="info",
            )

    def check_ports_available(self) -> CheckResult:
        """Check if required ports are available."""
        busy_ports = []

        for port in self.REQUIRED_PORTS:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("localhost", port))
            except OSError:
                busy_ports.append(port)

        if not busy_ports:
            return CheckResult(
                name="Port Availability",
                passed=True,
                message=f"Ports {', '.join(map(str, self.REQUIRED_PORTS))} available",
                severity="info",
            )
        else:
            return CheckResult(
                name="Port Availability",
                passed=False,
                message=f"Ports {', '.join(map(str, busy_ports))} already in use",
                severity="warning",
                help_text=(
                    "Some applications may be using these ports.\n"
                    "JobSentinel can use different ports if needed:\n"
                    "  python -m jsa.cli web --port 5001\n"
                    "  python -m jsa.cli api --port 8001"
                ),
            )

    def run_all_checks(self) -> list[CheckResult]:
        """
        Run all pre-checks and return results.

        Returns:
            List of check results
        """
        checks = [
            self.check_windows_version,
            self.check_python_version,
            self.check_disk_space,
            self.check_internet_connection,
            self.check_write_permissions,
            self.check_memory,
            self.check_ports_available,
        ]

        self.results = []
        for check in checks:
            if self.verbose:
                print(f"Checking {check.__name__.replace('check_', '').replace('_', ' ')}...")
            result = check()
            self.results.append(result)

        return self.results

    def print_results(self, show_help: bool = True):
        """
        Print formatted check results.

        Args:
            show_help: If True, show help text for failed checks
        """
        print()
        print("=" * 70)
        print(" " * 20 + "System Compatibility Check")
        print("=" * 70)
        print()

        # Print results
        for result in self.results:
            # Icon based on severity and status
            if result.passed:
                icon = "✅"
            elif result.severity == "critical":
                icon = "❌"
            else:
                icon = "⚠️"

            print(f"{icon} {result.name}: {result.message}")

        print()

        # Count results
        critical_failed = sum(
            1 for r in self.results if not r.passed and r.severity == "critical"
        )
        warnings = sum(1 for r in self.results if not r.passed and r.severity == "warning")
        passed = sum(1 for r in self.results if r.passed)

        # Summary
        if critical_failed == 0:
            if warnings == 0:
                print(f"✅ All {len(self.results)} checks passed! Ready to install.")
            else:
                print(
                    f"⚠️  {passed}/{len(self.results)} checks passed with {warnings} warning(s)."
                )
                print("   You can continue, but some features may not work optimally.")
        else:
            print(f"❌ {critical_failed} critical check(s) failed.")
            print("   Please fix the issues below before continuing.")

        # Show help for failed checks
        if show_help and not all(r.passed for r in self.results):
            print()
            print("=" * 70)
            print("How to Fix Issues:")
            print("=" * 70)

            for result in self.results:
                if not result.passed and result.help_text:
                    print()
                    print(f"📝 {result.name}:")
                    print(f"   {result.help_text}")
                    if result.help_url:
                        print(f"   Learn more: {result.help_url}")

        print()
        print("=" * 70)
        print()

    def can_proceed(self) -> bool:
        """
        Check if installation can proceed.

        Returns:
            True if no critical checks failed, False otherwise
        """
        return not any(
            not r.passed and r.severity == "critical" for r in self.results
        )


def main():
    """CLI entry point for pre-check."""
    print()
    print("JobSentinel System Pre-Check")
    print()

    checker = WindowsPreCheck(verbose=True)
    checker.run_all_checks()
    checker.print_results(show_help=True)

    return 0 if checker.can_proceed() else 1


if __name__ == "__main__":
    sys.exit(main())
