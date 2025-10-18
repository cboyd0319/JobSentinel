"""
Comprehensive Health Check System

Validates system configuration, dependencies, and connectivity.
Provides actionable recommendations for any issues found.

References:
- Google SRE | https://sre.google | Medium | Health monitoring patterns
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality assurance

Security:
- No sensitive data in output
- Safe command execution
- Timeout protection
"""

from __future__ import annotations

import importlib.util
import json
import logging
import os
import platform
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class HealthCheckResult:
    """Result of a health check."""

    name: str
    status: str  # "pass", "warn", "fail"
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    recommendations: list[str] = field(default_factory=list)


class HealthChecker:
    """Comprehensive system health checker."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: list[HealthCheckResult] = []

    def check_python_version(self) -> HealthCheckResult:
        """Check Python version meets requirements."""
        version = sys.version_info
        required = (3, 12)

        if version >= required:
            return HealthCheckResult(
                name="Python Version",
                status="pass",
                message=f"Python {version.major}.{version.minor}.{version.micro}",
                details={"version": f"{version.major}.{version.minor}.{version.micro}"},
            )
        else:
            return HealthCheckResult(
                name="Python Version",
                status="fail",
                message=f"Python {version.major}.{version.minor}.{version.micro} (requires 3.12+)",
                details={
                    "version": f"{version.major}.{version.minor}.{version.micro}",
                    "required": "3.12+",
                },
                recommendations=[
                    "Install Python 3.12 or newer",
                    "Download from: https://www.python.org/downloads/",
                ],
            )

    def check_dependencies(self) -> list[HealthCheckResult]:
        """Check required Python packages."""
        results = []

        # Map package names to their import names (some differ from pip package name)
        package_import_mapping = {
            "beautifulsoup4": "bs4",
            "sentence_transformers": "sentence_transformers",
            "sentence-transformers": "sentence_transformers",
        }

        core_packages = [
            ("requests", "HTTP requests"),
            ("beautifulsoup4", "HTML parsing"),
            ("sqlalchemy", "Database"),
            ("pydantic", "Data validation"),
            ("flask", "Web UI"),
        ]

        optional_packages = [
            ("sentence_transformers", "ML features"),
            ("transformers", "ML features"),
            ("mcp", "MCP integration"),
            ("spacy", "Resume parsing"),
        ]

        # Check core packages
        missing_core = []
        for package, purpose in core_packages:
            # Get the actual import name (may differ from package name)
            import_name = package_import_mapping.get(package, package.replace("-", "_"))
            if importlib.util.find_spec(import_name) is None:
                missing_core.append(f"{package} ({purpose})")

        if not missing_core:
            results.append(
                HealthCheckResult(
                    name="Core Dependencies",
                    status="pass",
                    message="All core packages installed",
                    details={"packages": len(core_packages)},
                )
            )
        else:
            results.append(
                HealthCheckResult(
                    name="Core Dependencies",
                    status="fail",
                    message=f"Missing {len(missing_core)} core package(s)",
                    details={"missing": missing_core},
                    recommendations=[
                        "Install missing packages: pip install -e .",
                        "Or run: python -m jsa.cli setup",
                    ],
                )
            )

        # Check optional packages
        missing_optional = []
        for package, purpose in optional_packages:
            # Get the actual import name (may differ from package name)
            import_name = package_import_mapping.get(package, package.replace("-", "_"))
            if importlib.util.find_spec(import_name) is None:
                missing_optional.append(f"{package} ({purpose})")

        if missing_optional:
            results.append(
                HealthCheckResult(
                    name="Optional Dependencies",
                    status="warn",
                    message=f"{len(missing_optional)} optional feature(s) unavailable",
                    details={"missing": missing_optional},
                    recommendations=[
                        "Install ML features: pip install -e .[ml]",
                        "Install MCP: pip install -e .[mcp]",
                        "Install resume parsing: pip install -e .[resume]",
                    ],
                )
            )
        else:
            results.append(
                HealthCheckResult(
                    name="Optional Dependencies",
                    status="pass",
                    message="All optional packages installed",
                    details={"packages": len(optional_packages)},
                )
            )

        return results

    def check_configuration(self) -> list[HealthCheckResult]:
        """Check configuration files."""
        results = []

        # Check config file
        config_path = Path("deploy/common/config/user_prefs.json")
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)

                # Validate structure
                has_keywords = bool(config.get("keywords"))
                has_sources = any(
                    source.get("enabled", False)
                    for source in config.get("job_sources", {}).values()
                )

                if has_keywords and has_sources:
                    results.append(
                        HealthCheckResult(
                            name="Configuration File",
                            status="pass",
                            message="Configuration valid",
                            details={
                                "keywords": len(config.get("keywords", [])),
                                "sources": sum(
                                    1
                                    for s in config.get("job_sources", {}).values()
                                    if s.get("enabled", False)
                                ),
                            },
                        )
                    )
                else:
                    warnings = []
                    if not has_keywords:
                        warnings.append("No keywords configured")
                    if not has_sources:
                        warnings.append("No job sources enabled")

                    results.append(
                        HealthCheckResult(
                            name="Configuration File",
                            status="warn",
                            message="Configuration incomplete",
                            details={"warnings": warnings},
                            recommendations=[
                                "Run: python -m jsa.cli setup",
                                "Or edit: deploy/common/config/user_prefs.json",
                            ],
                        )
                    )
            except Exception as e:
                results.append(
                    HealthCheckResult(
                        name="Configuration File",
                        status="fail",
                        message=f"Configuration invalid: {e}",
                        recommendations=[
                            "Check JSON syntax",
                            "Run: python -m jsa.cli setup",
                        ],
                    )
                )
        else:
            results.append(
                HealthCheckResult(
                    name="Configuration File",
                    status="fail",
                    message="Configuration file missing",
                    details={"expected_path": str(config_path)},
                    recommendations=[
                        "Run setup wizard: python -m jsa.cli setup",
                        "Or copy example: cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json",
                    ],
                )
            )

        # Check .env file
        env_path = Path(".env")
        if env_path.exists():
            results.append(
                HealthCheckResult(
                    name="Environment Variables", status="pass", message=".env file present"
                )
            )
        else:
            results.append(
                HealthCheckResult(
                    name="Environment Variables",
                    status="warn",
                    message=".env file missing (optional)",
                    recommendations=[
                        "Create .env for API keys",
                        "Copy example: cp .env.example .env",
                    ],
                )
            )

        return results

    def check_database(self) -> HealthCheckResult:
        """Check database accessibility."""
        db_path = Path("data/jobs.db")

        if db_path.exists():
            try:
                # Check if it's writable
                if os.access(db_path, os.W_OK):
                    return HealthCheckResult(
                        name="Database",
                        status="pass",
                        message="Database accessible",
                        details={"path": str(db_path), "size_kb": db_path.stat().st_size // 1024},
                    )
                else:
                    return HealthCheckResult(
                        name="Database",
                        status="warn",
                        message="Database not writable",
                        details={"path": str(db_path)},
                        recommendations=["Check file permissions"],
                    )
            except Exception as e:
                return HealthCheckResult(
                    name="Database",
                    status="fail",
                    message=f"Database error: {e}",
                    recommendations=["Delete and recreate database"],
                )
        else:
            return HealthCheckResult(
                name="Database",
                status="warn",
                message="Database will be created on first run",
                details={"path": str(db_path)},
            )

    def check_network(self) -> list[HealthCheckResult]:
        """Check network connectivity."""
        results = []

        # Test internet connectivity
        try:
            urllib.request.urlopen("https://www.google.com", timeout=5)
            results.append(
                HealthCheckResult(
                    name="Internet Connectivity", status="pass", message="Internet connection OK"
                )
            )
        except Exception as e:
            results.append(
                HealthCheckResult(
                    name="Internet Connectivity",
                    status="fail",
                    message=f"No internet connection: {e}",
                    recommendations=[
                        "Check network connection",
                        "Check firewall settings",
                        "Check proxy configuration",
                    ],
                )
            )

        # Test Slack webhook (if configured)
        config_path = Path("deploy/common/config/user_prefs.json")
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    slack_url = config.get("slack", {}).get("webhook_url")

                    if slack_url:
                        # Just test DNS resolution, not actual webhook
                        from urllib.parse import urlparse

                        hostname = urlparse(slack_url).hostname
                        if hostname:
                            import socket

                            socket.gethostbyname(hostname)
                            results.append(
                                HealthCheckResult(
                                    name="Slack Connectivity",
                                    status="pass",
                                    message="Slack webhook hostname reachable",
                                )
                            )
            except Exception as e:
                results.append(
                    HealthCheckResult(
                        name="Slack Connectivity",
                        status="warn",
                        message=f"Slack webhook may be unreachable: {e}",
                        recommendations=[
                            "Verify webhook URL in config",
                            "Test with: curl -X POST [webhook_url]",
                        ],
                    )
                )

        return results

    def check_system_resources(self) -> list[HealthCheckResult]:
        """Check system resources."""
        results = []

        # Check disk space
        try:
            import psutil

            disk = psutil.disk_usage(".")
            free_gb = disk.free / (1024**3)

            if free_gb > 1.0:
                results.append(
                    HealthCheckResult(
                        name="Disk Space",
                        status="pass",
                        message=f"{free_gb:.1f} GB free",
                        details={"free_gb": free_gb},
                    )
                )
            elif free_gb > 0.5:
                results.append(
                    HealthCheckResult(
                        name="Disk Space",
                        status="warn",
                        message=f"Only {free_gb:.1f} GB free",
                        recommendations=["Free up disk space"],
                    )
                )
            else:
                results.append(
                    HealthCheckResult(
                        name="Disk Space",
                        status="fail",
                        message=f"Critical: Only {free_gb:.1f} GB free",
                        recommendations=["Free up disk space immediately"],
                    )
                )
        except Exception:
            results.append(
                HealthCheckResult(
                    name="Disk Space",
                    status="warn",
                    message="Could not check disk space (psutil not installed)",
                )
            )

        # Check memory
        try:
            import psutil

            mem = psutil.virtual_memory()
            free_gb = mem.available / (1024**3)

            if free_gb > 1.0:
                results.append(
                    HealthCheckResult(
                        name="Memory",
                        status="pass",
                        message=f"{free_gb:.1f} GB available",
                        details={"available_gb": free_gb, "percent_used": mem.percent},
                    )
                )
            else:
                results.append(
                    HealthCheckResult(
                        name="Memory",
                        status="warn",
                        message=f"Only {free_gb:.1f} GB available",
                        recommendations=["Close unnecessary applications"],
                    )
                )
        except Exception as e:
            logger.debug(f"Memory check failed: {e}")  # psutil already checked above

        return results

    def check_ripgrep(self) -> HealthCheckResult:
        """Check if RipGrep is installed (optional but recommended for performance)."""
        rg_path = shutil.which("rg")

        if rg_path:
            try:
                # Get version
                result = subprocess.run(
                    ["rg", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                version_line = result.stdout.split("\n")[0] if result.stdout else "unknown"

                return HealthCheckResult(
                    name="RipGrep (Performance Tool)",
                    status="pass",
                    message=f"Installed: {version_line}",
                    details={"path": rg_path, "version": version_line},
                )
            except (subprocess.TimeoutExpired, subprocess.SubprocessError):
                return HealthCheckResult(
                    name="RipGrep (Performance Tool)",
                    status="warn",
                    message="Installed but not responding",
                    recommendations=["Reinstall RipGrep if issues persist"],
                )
        else:
            return HealthCheckResult(
                name="RipGrep (Performance Tool)",
                status="warn",
                message="Not installed (optional - degrades performance)",
                recommendations=[
                    "Install RipGrep for 10-50x faster job search and log analysis",
                    "macOS: brew install ripgrep",
                    "Linux: apt install ripgrep (Debian/Ubuntu)",
                    "Windows: winget install BurntSushi.ripgrep.MSVC",
                ],
            )

    def run_all_checks(self) -> dict[str, Any]:
        """Run all health checks."""
        self.results = []

        # Run all checks
        self.results.append(self.check_python_version())
        self.results.extend(self.check_dependencies())
        self.results.extend(self.check_configuration())
        self.results.append(self.check_database())
        self.results.extend(self.check_network())
        self.results.extend(self.check_system_resources())
        self.results.append(self.check_ripgrep())

        # Calculate summary
        pass_count = sum(1 for r in self.results if r.status == "pass")
        warn_count = sum(1 for r in self.results if r.status == "warn")
        fail_count = sum(1 for r in self.results if r.status == "fail")

        overall_status = "healthy"
        if fail_count > 0:
            overall_status = "unhealthy"
        elif warn_count > 0:
            overall_status = "degraded"

        return {
            "overall_status": overall_status,
            "summary": {
                "total": len(self.results),
                "pass": pass_count,
                "warn": warn_count,
                "fail": fail_count,
            },
            "checks": self.results,
        }

    def print_report(self, results: dict[str, Any]) -> None:
        """Print formatted health check report."""

        # Print header
        status = results["overall_status"]
        status_emoji = {"healthy": "✅", "degraded": "⚠️", "unhealthy": "❌"}

        print(f"\n{'='*70}")
        print(f"JobSentinel Health Check - {status_emoji.get(status, '?')} {status.upper()}")
        print(f"{'='*70}\n")

        # Print summary
        summary = results["summary"]
        print(
            f"Checks: {summary['total']} total, "
            f"{summary['pass']} passed, "
            f"{summary['warn']} warnings, "
            f"{summary['fail']} failed\n"
        )

        # Print each check
        for check in results["checks"]:
            status_symbol = {"pass": "✓", "warn": "⚠", "fail": "✗"}.get(check.status, "?")

            print(f"{status_symbol} {check.name}: {check.message}")

            if self.verbose and check.details:
                for key, value in check.details.items():
                    print(f"    {key}: {value}")

            if check.recommendations:
                print("    Recommendations:")
                for rec in check.recommendations:
                    print(f"      - {rec}")
            print()

        # Print footer
        if status == "unhealthy":
            print("⚠️  System is not ready. Please fix critical issues above.")
        elif status == "degraded":
            print("⚠️  System is functional but has warnings.")
        else:
            print("✅ System is healthy and ready to use!")

        print(f"\n{'='*70}\n")


def run_health_check(verbose: bool = False) -> int:
    """Run health check and return exit code."""
    checker = HealthChecker(verbose=verbose)
    results = checker.run_all_checks()
    checker.print_report(results)

    # Return appropriate exit code
    if results["overall_status"] == "unhealthy":
        return 1
    return 0
