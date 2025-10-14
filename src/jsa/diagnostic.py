"""
System diagnostic tool for JobSentinel.

Provides comprehensive system health checks and troubleshooting guidance
for zero-knowledge users. Detects common issues and provides actionable fixes.

Features:
- Python version verification
- Dependency checking
- Configuration validation
- Database connectivity
- Network connectivity
- Port availability
- Permission checking

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Software quality
- IEEE 730-2014 | https://standards.ieee.org/standard/730-2014.html | High | Quality assurance

Author: JobSentinel Team
License: MIT
"""

import os
import platform
import socket
import subprocess
import sys
from pathlib import Path
from typing import Any, Literal, NamedTuple

from jsa.logging import get_logger

logger = get_logger(__name__, "diagnostic")


class DiagnosticResult(NamedTuple):
    """Result of a single diagnostic check."""
    
    name: str
    status: Literal["pass", "fail", "warning", "skip"]
    message: str
    fix: str = ""  # Suggested fix if status is fail or warning


class SystemDiagnostic:
    """Comprehensive system diagnostics for JobSentinel."""

    def __init__(self, project_root: Path | None = None) -> None:
        """Initialize diagnostic tool.

        Args:
            project_root: Path to project root (defaults to current dir)
        """
        self.project_root = project_root or Path.cwd()
        self.results: list[DiagnosticResult] = []

    def run_all_checks(self) -> list[DiagnosticResult]:
        """Run all diagnostic checks.

        Returns:
            List of diagnostic results
        """
        logger.info("Starting comprehensive system diagnostics")
        
        self.results = []
        
        # Core system checks
        self.check_python_version()
        self.check_operating_system()
        self.check_disk_space()
        
        # Dependency checks
        self.check_required_packages()
        self.check_optional_packages()
        
        # Configuration checks
        self.check_config_file()
        self.check_env_file()
        
        # Database checks
        self.check_database_directory()
        self.check_database_writable()
        
        # Network checks
        self.check_internet_connectivity()
        self.check_ports_available()
        
        # Permission checks
        self.check_file_permissions()
        
        logger.info(f"Diagnostics complete: {self._summary()}")
        return self.results

    def _summary(self) -> str:
        """Generate summary of diagnostic results.

        Returns:
            Human-readable summary
        """
        passed = sum(1 for r in self.results if r.status == "pass")
        failed = sum(1 for r in self.results if r.status == "fail")
        warnings = sum(1 for r in self.results if r.status == "warning")
        skipped = sum(1 for r in self.results if r.status == "skip")
        
        return f"{passed} passed, {failed} failed, {warnings} warnings, {skipped} skipped"

    def check_python_version(self) -> None:
        """Check Python version meets requirements."""
        try:
            version = sys.version_info
            version_str = f"{version.major}.{version.minor}.{version.micro}"
            
            if version.major == 3 and version.minor >= 12:
                self.results.append(DiagnosticResult(
                    name="Python Version",
                    status="pass",
                    message=f"Python {version_str} detected (OK)",
                ))
            elif version.major == 3 and version.minor >= 11:
                self.results.append(DiagnosticResult(
                    name="Python Version",
                    status="warning",
                    message=f"Python {version_str} detected (3.12+ recommended)",
                    fix="Consider upgrading to Python 3.12+ from https://www.python.org/downloads/",
                ))
            else:
                self.results.append(DiagnosticResult(
                    name="Python Version",
                    status="fail",
                    message=f"Python {version_str} detected (3.12+ required)",
                    fix="Install Python 3.12+ from https://www.python.org/downloads/\nIMPORTANT: Check 'Add Python to PATH' during installation",
                ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name="Python Version",
                status="fail",
                message=f"Could not check Python version: {e}",
            ))

    def check_operating_system(self) -> None:
        """Check operating system compatibility."""
        try:
            os_name = platform.system()
            os_version = platform.version()
            
            if os_name == "Windows":
                # Check Windows 11 (build 22000+)
                try:
                    build = int(platform.release().split(".")[0])
                    if build >= 22000 or "11" in platform.release():
                        self.results.append(DiagnosticResult(
                            name="Operating System",
                            status="pass",
                            message=f"Windows 11 detected (OK)",
                        ))
                    else:
                        self.results.append(DiagnosticResult(
                            name="Operating System",
                            status="warning",
                            message=f"Windows {platform.release()} detected (Windows 11 recommended)",
                            fix="JobSentinel works best on Windows 11. Consider upgrading if possible.",
                        ))
                except (ValueError, IndexError):
                    self.results.append(DiagnosticResult(
                        name="Operating System",
                        status="pass",
                        message=f"Windows detected (OK)",
                    ))
            elif os_name in ("Linux", "Darwin"):
                self.results.append(DiagnosticResult(
                    name="Operating System",
                    status="pass",
                    message=f"{os_name} detected (OK)",
                ))
            else:
                self.results.append(DiagnosticResult(
                    name="Operating System",
                    status="warning",
                    message=f"Unsupported OS: {os_name}",
                    fix="JobSentinel is designed for Windows 11, but may work on your OS.",
                ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name="Operating System",
                status="fail",
                message=f"Could not check OS: {e}",
            ))

    def check_disk_space(self) -> None:
        """Check available disk space."""
        try:
            import shutil
            stats = shutil.disk_usage(self.project_root)
            free_gb = stats.free / (1024 ** 3)
            
            if free_gb >= 1.0:
                self.results.append(DiagnosticResult(
                    name="Disk Space",
                    status="pass",
                    message=f"{free_gb:.1f} GB free (OK)",
                ))
            elif free_gb >= 0.5:
                self.results.append(DiagnosticResult(
                    name="Disk Space",
                    status="warning",
                    message=f"{free_gb:.1f} GB free (1 GB recommended)",
                    fix="Free up some disk space for optimal performance.",
                ))
            else:
                self.results.append(DiagnosticResult(
                    name="Disk Space",
                    status="fail",
                    message=f"{free_gb:.1f} GB free (1 GB required)",
                    fix="Free up disk space before continuing installation.",
                ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name="Disk Space",
                status="warning",
                message=f"Could not check disk space: {e}",
            ))

    def check_required_packages(self) -> None:
        """Check required Python packages are installed."""
        # Map package names to import names (some differ)
        required = {
            "aiofiles": "aiofiles",
            "aiohttp": "aiohttp",
            "aiosqlite": "aiosqlite",
            "beautifulsoup4": "bs4",  # Import name differs
            "fastapi": "fastapi",
            "pydantic": "pydantic",
            "requests": "requests",
            "sqlmodel": "sqlmodel",
        }
        
        missing = []
        for package_name, import_name in required.items():
            try:
                __import__(import_name)
            except ImportError:
                missing.append(package_name)
        
        if not missing:
            self.results.append(DiagnosticResult(
                name="Required Packages",
                status="pass",
                message="All required packages installed",
            ))
        else:
            self.results.append(DiagnosticResult(
                name="Required Packages",
                status="fail",
                message=f"Missing packages: {', '.join(missing)}",
                fix="Install missing packages: pip install -e .",
            ))

    def check_optional_packages(self) -> None:
        """Check optional packages (resume, ML, etc.)."""
        optional_groups = {
            "Resume Analysis": ["pdfplumber", "python-docx", "spacy"],
            "ML Features": ["sentence-transformers", "transformers", "torch"],
            "MCP Integration": ["mcp", "httpx-sse"],
        }
        
        for group_name, packages in optional_groups.items():
            installed = []
            for package in packages:
                try:
                    __import__(package.replace("-", "_"))
                    installed.append(package)
                except ImportError:
                    pass
            
            if len(installed) == len(packages):
                status = "pass"
                message = f"{group_name}: All installed"
            elif installed:
                status = "warning"
                message = f"{group_name}: Partially installed ({len(installed)}/{len(packages)})"
            else:
                status = "skip"
                message = f"{group_name}: Not installed (optional)"
            
            self.results.append(DiagnosticResult(
                name=f"Optional: {group_name}",
                status=status,
                message=message,
                fix=f"Install with: pip install -e .[{group_name.lower().replace(' ', '_')}]" if status != "pass" else "",
            ))

    def check_config_file(self) -> None:
        """Check configuration file exists and is valid."""
        config_path = self.project_root / "config" / "user_prefs.json"
        
        if not config_path.exists():
            self.results.append(DiagnosticResult(
                name="Configuration File",
                status="warning",
                message="Config file not found (needs setup)",
                fix="Run setup wizard: python -m jsa.cli setup\nOr use GUI: click 'Setup Wizard' button",
            ))
            return
        
        # Try to parse JSON
        try:
            import json
            with open(config_path, encoding="utf-8") as f:
                config_data = json.load(f)
            
            # Check for required fields
            required_fields = ["keywords_boost", "digest_min_score"]
            missing = [f for f in required_fields if f not in config_data]
            
            if missing:
                self.results.append(DiagnosticResult(
                    name="Configuration File",
                    status="warning",
                    message=f"Config missing fields: {', '.join(missing)}",
                    fix="Re-run setup wizard to complete configuration",
                ))
            else:
                self.results.append(DiagnosticResult(
                    name="Configuration File",
                    status="pass",
                    message="Config file valid",
                ))
        except json.JSONDecodeError as e:
            self.results.append(DiagnosticResult(
                name="Configuration File",
                status="fail",
                message=f"Config file has invalid JSON: {e}",
                fix="Fix JSON syntax or re-run setup wizard",
            ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name="Configuration File",
                status="fail",
                message=f"Could not read config: {e}",
            ))

    def check_env_file(self) -> None:
        """Check .env file for secrets."""
        env_path = self.project_root / ".env"
        
        if not env_path.exists():
            self.results.append(DiagnosticResult(
                name=".env File",
                status="warning",
                message=".env file not found (optional for Slack/email)",
                fix="Create .env from .env.example if you want Slack or email notifications",
            ))
            return
        
        try:
            with open(env_path, encoding="utf-8") as f:
                content = f.read()
            
            # Check for common secrets
            has_slack = "SLACK_WEBHOOK" in content
            has_email = "SMTP_" in content or "EMAIL_" in content
            
            if has_slack or has_email:
                self.results.append(DiagnosticResult(
                    name=".env File",
                    status="pass",
                    message="Credentials configured",
                ))
            else:
                self.results.append(DiagnosticResult(
                    name=".env File",
                    status="warning",
                    message=".env exists but no credentials configured",
                    fix="Add SLACK_WEBHOOK or email settings to enable notifications",
                ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name=".env File",
                status="fail",
                message=f"Could not read .env: {e}",
            ))

    def check_database_directory(self) -> None:
        """Check database directory exists."""
        db_dir = self.project_root / "data"
        
        if db_dir.exists():
            self.results.append(DiagnosticResult(
                name="Database Directory",
                status="pass",
                message="Database directory exists",
            ))
        else:
            self.results.append(DiagnosticResult(
                name="Database Directory",
                status="warning",
                message="Database directory will be created on first run",
            ))

    def check_database_writable(self) -> None:
        """Check database directory is writable."""
        db_dir = self.project_root / "data"
        
        try:
            # Create directory if it doesn't exist
            db_dir.mkdir(parents=True, exist_ok=True)
            
            # Try to create a test file
            test_file = db_dir / ".write_test"
            test_file.write_text("test")
            test_file.unlink()
            
            self.results.append(DiagnosticResult(
                name="Database Writable",
                status="pass",
                message="Database directory is writable",
            ))
        except PermissionError:
            self.results.append(DiagnosticResult(
                name="Database Writable",
                status="fail",
                message="No write permission for database directory",
                fix="Check folder permissions or run from a location where you have write access",
            ))
        except Exception as e:
            self.results.append(DiagnosticResult(
                name="Database Writable",
                status="fail",
                message=f"Could not write to database directory: {e}",
            ))

    def check_internet_connectivity(self) -> None:
        """Check internet connectivity."""
        try:
            # Try to connect to a reliable host
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            self.results.append(DiagnosticResult(
                name="Internet Connectivity",
                status="pass",
                message="Internet connection OK",
            ))
        except OSError:
            self.results.append(DiagnosticResult(
                name="Internet Connectivity",
                status="warning",
                message="No internet connection detected",
                fix="JobSentinel needs internet to scrape jobs. Check your connection.",
            ))

    def check_ports_available(self) -> None:
        """Check if required ports are available."""
        ports = [
            (8000, "FastAPI server"),
            (5000, "Flask web server"),
        ]
        
        for port, description in ports:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("127.0.0.1", port))
                self.results.append(DiagnosticResult(
                    name=f"Port {port}",
                    status="pass",
                    message=f"Port {port} available ({description})",
                ))
            except OSError:
                self.results.append(DiagnosticResult(
                    name=f"Port {port}",
                    status="warning",
                    message=f"Port {port} in use ({description})",
                    fix=f"Close application using port {port} or use different port",
                ))

    def check_file_permissions(self) -> None:
        """Check file permissions for key directories."""
        dirs_to_check = [
            self.project_root / "config",
            self.project_root / "data",
            self.project_root / "logs" if (self.project_root / "logs").exists() else None,
        ]
        
        issues = []
        for dir_path in dirs_to_check:
            if dir_path is None:
                continue
            
            if not dir_path.exists():
                continue
            
            if not os.access(dir_path, os.R_OK | os.W_OK):
                issues.append(str(dir_path))
        
        if not issues:
            self.results.append(DiagnosticResult(
                name="File Permissions",
                status="pass",
                message="All directories have correct permissions",
            ))
        else:
            self.results.append(DiagnosticResult(
                name="File Permissions",
                status="fail",
                message=f"Permission issues: {', '.join(issues)}",
                fix="Check folder permissions or run from a location where you have full access",
            ))

    def print_results(self, verbose: bool = False) -> None:
        """Print diagnostic results in a human-readable format.

        Args:
            verbose: Whether to show all checks (including passing ones)
        """
        print("\n" + "=" * 70)
        print("JobSentinel System Diagnostics")
        print("=" * 70 + "\n")
        
        # Group by status
        passed = [r for r in self.results if r.status == "pass"]
        failed = [r for r in self.results if r.status == "fail"]
        warnings = [r for r in self.results if r.status == "warning"]
        skipped = [r for r in self.results if r.status == "skip"]
        
        # Print failures first (most important)
        if failed:
            print("❌ FAILURES:")
            for result in failed:
                print(f"  • {result.name}: {result.message}")
                if result.fix:
                    print(f"    Fix: {result.fix}")
            print()
        
        # Then warnings
        if warnings:
            print("⚠️  WARNINGS:")
            for result in warnings:
                print(f"  • {result.name}: {result.message}")
                if result.fix:
                    print(f"    Fix: {result.fix}")
            print()
        
        # Then passes (if verbose)
        if verbose and passed:
            print("✅ PASSED:")
            for result in passed:
                print(f"  • {result.name}: {result.message}")
            print()
        
        # Then skipped (if verbose)
        if verbose and skipped:
            print("⏭️  SKIPPED:")
            for result in skipped:
                print(f"  • {result.name}: {result.message}")
            print()
        
        # Summary
        print("=" * 70)
        print(f"Summary: {len(passed)} passed, {len(failed)} failed, {len(warnings)} warnings, {len(skipped)} skipped")
        print("=" * 70 + "\n")
        
        if failed:
            print("❌ System has critical issues. Please fix them before continuing.")
        elif warnings:
            print("⚠️  System is OK but has warnings. JobSentinel will work but may have limitations.")
        else:
            print("✅ System is ready! You can now start JobSentinel.")


def run_diagnostics(verbose: bool = False) -> list[DiagnosticResult]:
    """Run system diagnostics (convenience function).

    Args:
        verbose: Whether to show all checks

    Returns:
        List of diagnostic results
    """
    diagnostic = SystemDiagnostic()
    results = diagnostic.run_all_checks()
    diagnostic.print_results(verbose=verbose)
    return results
