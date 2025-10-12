#!/usr/bin/env python3
"""
JobSentinel Health Check Tool

Automated system diagnostics and repair for JobSentinel.
Can be run standalone or via CLI: python -m jsa.cli health

Features:
- Check Python version and dependencies
- Validate configuration files
- Test database connectivity
- Check disk space and permissions
- Verify job board connectivity
- Auto-repair common issues
"""

import sys
import os
import subprocess
import json
import sqlite3
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import shutil


class HealthStatus(Enum):
    """Health check status levels."""
    OK = "ok"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    """Result of a single health check."""
    name: str
    status: HealthStatus
    message: str
    details: Optional[str] = None
    auto_repair_available: bool = False
    repair_function: Optional[str] = None


@dataclass
class HealthReport:
    """Complete health check report."""
    overall_status: HealthStatus
    checks: List[HealthCheck] = field(default_factory=list)
    timestamp: str = ""
    auto_repairs_available: int = 0
    
    def add_check(self, check: HealthCheck) -> None:
        """Add a check to the report."""
        self.checks.append(check)
        if check.auto_repair_available:
            self.auto_repairs_available += 1
        
        # Update overall status (worst status wins)
        status_priority = {
            HealthStatus.OK: 0,
            HealthStatus.WARNING: 1,
            HealthStatus.CRITICAL: 2,
            HealthStatus.UNKNOWN: 3
        }
        
        if status_priority[check.status] > status_priority[self.overall_status]:
            self.overall_status = check.status


class JobSentinelHealthChecker:
    """Main health checker class."""
    
    def __init__(self, auto_repair: bool = False, verbose: bool = False):
        self.auto_repair = auto_repair
        self.verbose = verbose
        self.repo_root = Path(__file__).parent.parent
        self.report = HealthReport(overall_status=HealthStatus.OK)
        
    def run_all_checks(self) -> HealthReport:
        """Run all health checks."""
        import datetime
        self.report.timestamp = datetime.datetime.now().isoformat()
        
        print("🏥 JobSentinel Health Check")
        print("=" * 60)
        print()
        
        # Run checks in order of importance
        self._check_python_version()
        self._check_dependencies()
        self._check_repo_structure()
        self._check_config_files()
        self._check_database()
        self._check_disk_space()
        self._check_permissions()
        self._check_environment_variables()
        self._check_log_directory()
        
        return self.report
    
    def _check_python_version(self) -> None:
        """Check if Python version is compatible."""
        print("🐍 Checking Python version...")
        
        version = sys.version_info
        required_major, required_minor = 3, 11
        
        if version.major >= required_major and version.minor >= required_minor:
            check = HealthCheck(
                name="Python Version",
                status=HealthStatus.OK,
                message=f"Python {version.major}.{version.minor}.{version.micro} (required: {required_major}.{required_minor}+)",
            )
        elif version.major == required_major and version.minor >= 10:
            check = HealthCheck(
                name="Python Version",
                status=HealthStatus.WARNING,
                message=f"Python {version.major}.{version.minor}.{version.micro} (recommended: 3.13+, minimum: 3.11)",
                details="Consider upgrading to Python 3.13 for best performance"
            )
        else:
            check = HealthCheck(
                name="Python Version",
                status=HealthStatus.CRITICAL,
                message=f"Python {version.major}.{version.minor}.{version.micro} is too old (minimum: 3.11)",
                details="Please upgrade Python: https://www.python.org/downloads/",
                auto_repair_available=False
            )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_dependencies(self) -> None:
        """Check if required dependencies are installed."""
        print("\n📦 Checking dependencies...")
        
        required_packages = [
            'flask', 'playwright', 'sqlalchemy', 'requests',
            'python-dotenv', 'rich', 'pydantic'
        ]
        
        missing = []
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing.append(package)
        
        if not missing:
            check = HealthCheck(
                name="Dependencies",
                status=HealthStatus.OK,
                message=f"All {len(required_packages)} required packages installed"
            )
        else:
            check = HealthCheck(
                name="Dependencies",
                status=HealthStatus.CRITICAL,
                message=f"Missing {len(missing)} required packages: {', '.join(missing)}",
                details="Run: pip install -e .[dev,resume]",
                auto_repair_available=True,
                repair_function="_repair_dependencies"
            )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_repo_structure(self) -> None:
        """Check if repository structure is correct."""
        print("\n📁 Checking repository structure...")
        
        required_dirs = ['src', 'config', 'scripts', 'tests', 'docs']
        required_files = ['pyproject.toml', 'README.md', 'requirements.txt']
        
        missing_dirs = [d for d in required_dirs if not (self.repo_root / d).exists()]
        missing_files = [f for f in required_files if not (self.repo_root / f).exists()]
        
        if not missing_dirs and not missing_files:
            check = HealthCheck(
                name="Repository Structure",
                status=HealthStatus.OK,
                message="All required directories and files present"
            )
        else:
            issues = []
            if missing_dirs:
                issues.append(f"Missing directories: {', '.join(missing_dirs)}")
            if missing_files:
                issues.append(f"Missing files: {', '.join(missing_files)}")
            
            check = HealthCheck(
                name="Repository Structure",
                status=HealthStatus.CRITICAL,
                message="Repository structure incomplete",
                details="; ".join(issues),
                auto_repair_available=False
            )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_config_files(self) -> None:
        """Check configuration files."""
        print("\n⚙️  Checking configuration files...")
        
        config_dir = self.repo_root / 'config'
        user_prefs = config_dir / 'user_prefs.json'
        example_prefs = config_dir / 'user_prefs.example.json'
        
        if not config_dir.exists():
            check = HealthCheck(
                name="Configuration",
                status=HealthStatus.CRITICAL,
                message="Config directory missing",
                auto_repair_available=True,
                repair_function="_repair_config_directory"
            )
        elif not user_prefs.exists():
            if example_prefs.exists():
                check = HealthCheck(
                    name="Configuration",
                    status=HealthStatus.WARNING,
                    message="user_prefs.json not found (using example)",
                    details="Copy user_prefs.example.json to user_prefs.json",
                    auto_repair_available=True,
                    repair_function="_repair_user_prefs"
                )
            else:
                check = HealthCheck(
                    name="Configuration",
                    status=HealthStatus.CRITICAL,
                    message="No configuration files found",
                    auto_repair_available=False
                )
        else:
            # Validate JSON
            try:
                with open(user_prefs) as f:
                    config = json.load(f)
                
                # Check for required fields
                required_fields = ['keywords', 'locations']
                missing_fields = [f for f in required_fields if f not in config]
                
                if missing_fields:
                    check = HealthCheck(
                        name="Configuration",
                        status=HealthStatus.WARNING,
                        message=f"Configuration missing fields: {', '.join(missing_fields)}",
                        details="Edit config/user_prefs.json to add missing fields"
                    )
                else:
                    check = HealthCheck(
                        name="Configuration",
                        status=HealthStatus.OK,
                        message="Configuration valid and complete"
                    )
            except json.JSONDecodeError as e:
                check = HealthCheck(
                    name="Configuration",
                    status=HealthStatus.CRITICAL,
                    message="Invalid JSON in user_prefs.json",
                    details=f"JSON error: {str(e)}",
                    auto_repair_available=False
                )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_database(self) -> None:
        """Check database connectivity and integrity."""
        print("\n💾 Checking database...")
        
        db_path = self.repo_root / 'data' / 'jobs.db'
        
        if not db_path.parent.exists():
            check = HealthCheck(
                name="Database",
                status=HealthStatus.WARNING,
                message="Data directory doesn't exist (will be created on first run)",
                auto_repair_available=True,
                repair_function="_repair_data_directory"
            )
        elif not db_path.exists():
            check = HealthCheck(
                name="Database",
                status=HealthStatus.WARNING,
                message="Database doesn't exist (will be created on first run)",
                details="This is normal for new installations"
            )
        else:
            # Check database integrity
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check")
                result = cursor.fetchone()[0]
                conn.close()
                
                if result == "ok":
                    # Get job count
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    try:
                        cursor.execute("SELECT COUNT(*) FROM jobs")
                        job_count = cursor.fetchone()[0]
                        conn.close()
                        
                        check = HealthCheck(
                            name="Database",
                            status=HealthStatus.OK,
                            message=f"Database healthy ({job_count} jobs stored)"
                        )
                    except sqlite3.OperationalError:
                        conn.close()
                        check = HealthCheck(
                            name="Database",
                            status=HealthStatus.WARNING,
                            message="Database exists but schema may be incomplete",
                            details="Will be initialized on first run"
                        )
                else:
                    check = HealthCheck(
                        name="Database",
                        status=HealthStatus.CRITICAL,
                        message="Database integrity check failed",
                        details=f"Integrity check result: {result}",
                        auto_repair_available=True,
                        repair_function="_repair_database"
                    )
            except Exception as e:
                check = HealthCheck(
                    name="Database",
                    status=HealthStatus.CRITICAL,
                    message=f"Database error: {str(e)}",
                    auto_repair_available=True,
                    repair_function="_repair_database"
                )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_disk_space(self) -> None:
        """Check available disk space."""
        print("\n💿 Checking disk space...")
        
        try:
            stat = shutil.disk_usage(self.repo_root)
            free_gb = stat.free / (1024 ** 3)
            total_gb = stat.total / (1024 ** 3)
            percent_free = (stat.free / stat.total) * 100
            
            if free_gb > 5.0:
                check = HealthCheck(
                    name="Disk Space",
                    status=HealthStatus.OK,
                    message=f"{free_gb:.1f} GB free ({percent_free:.1f}% of {total_gb:.1f} GB)"
                )
            elif free_gb > 2.0:
                check = HealthCheck(
                    name="Disk Space",
                    status=HealthStatus.WARNING,
                    message=f"Low disk space: {free_gb:.1f} GB free",
                    details="Consider freeing up space for optimal performance"
                )
            else:
                check = HealthCheck(
                    name="Disk Space",
                    status=HealthStatus.CRITICAL,
                    message=f"Critical: Only {free_gb:.1f} GB free",
                    details="JobSentinel needs at least 2 GB free space",
                    auto_repair_available=False
                )
        except Exception as e:
            check = HealthCheck(
                name="Disk Space",
                status=HealthStatus.UNKNOWN,
                message=f"Could not check disk space: {str(e)}"
            )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_permissions(self) -> None:
        """Check file permissions."""
        print("\n🔐 Checking permissions...")
        
        # Check if we can write to key directories
        writable_dirs = ['data', 'logs', 'config']
        permission_issues = []
        
        for dir_name in writable_dirs:
            dir_path = self.repo_root / dir_name
            if dir_path.exists():
                if not os.access(dir_path, os.W_OK):
                    permission_issues.append(dir_name)
        
        if not permission_issues:
            check = HealthCheck(
                name="Permissions",
                status=HealthStatus.OK,
                message="All directories writable"
            )
        else:
            check = HealthCheck(
                name="Permissions",
                status=HealthStatus.CRITICAL,
                message=f"Cannot write to: {', '.join(permission_issues)}",
                details="Run with appropriate permissions or fix ownership",
                auto_repair_available=sys.platform != "win32",
                repair_function="_repair_permissions"
            )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_environment_variables(self) -> None:
        """Check environment variables."""
        print("\n🌍 Checking environment variables...")
        
        env_file = self.repo_root / '.env'
        
        if not env_file.exists():
            check = HealthCheck(
                name="Environment",
                status=HealthStatus.WARNING,
                message=".env file not found",
                details="Copy .env.example to .env if you plan to use cloud features or AI",
                auto_repair_available=True,
                repair_function="_repair_env_file"
            )
        else:
            # Check for sensitive keys
            with open(env_file) as f:
                content = f.read()
            
            # Check if there are any actual values (not just examples)
            has_values = any(
                line.strip() and '=' in line and not line.strip().startswith('#')
                and 'YOUR_' not in line and 'EXAMPLE' not in line
                for line in content.split('\n')
            )
            
            if has_values:
                check = HealthCheck(
                    name="Environment",
                    status=HealthStatus.OK,
                    message=".env file configured"
                )
            else:
                check = HealthCheck(
                    name="Environment",
                    status=HealthStatus.WARNING,
                    message=".env file exists but may not be configured",
                    details="Edit .env to add your API keys if using cloud/AI features"
                )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _check_log_directory(self) -> None:
        """Check log directory."""
        print("\n📝 Checking log directory...")
        
        log_dir = self.repo_root / 'logs'
        
        if not log_dir.exists():
            check = HealthCheck(
                name="Logs",
                status=HealthStatus.WARNING,
                message="Log directory doesn't exist (will be created on first run)",
                auto_repair_available=True,
                repair_function="_repair_log_directory"
            )
        else:
            # Check if we can write
            if os.access(log_dir, os.W_OK):
                # Count log files
                log_files = list(log_dir.glob('*.log'))
                check = HealthCheck(
                    name="Logs",
                    status=HealthStatus.OK,
                    message=f"Log directory ready ({len(log_files)} log files)"
                )
            else:
                check = HealthCheck(
                    name="Logs",
                    status=HealthStatus.CRITICAL,
                    message="Cannot write to log directory",
                    auto_repair_available=True,
                    repair_function="_repair_log_directory"
                )
        
        self.report.add_check(check)
        self._print_check(check)
    
    def _print_check(self, check: HealthCheck) -> None:
        """Print a single check result."""
        # Status icon and color
        status_icons = {
            HealthStatus.OK: "✅",
            HealthStatus.WARNING: "⚠️ ",
            HealthStatus.CRITICAL: "❌",
            HealthStatus.UNKNOWN: "❓"
        }
        
        icon = status_icons[check.status]
        print(f"  {icon} {check.name}: {check.message}")
        
        if self.verbose and check.details:
            print(f"     ℹ️  {check.details}")
        
        if check.auto_repair_available and not self.auto_repair:
            print(f"     🔧 Auto-repair available (use --auto-repair)")
    
    def run_auto_repairs(self) -> int:
        """Run all available auto-repairs."""
        repairs_attempted = 0
        repairs_successful = 0
        
        print("\n")
        print("🔧 Running Auto-Repairs")
        print("=" * 60)
        print()
        
        for check in self.report.checks:
            if check.auto_repair_available and check.status != HealthStatus.OK:
                repairs_attempted += 1
                print(f"Repairing: {check.name}...")
                
                try:
                    repair_func = getattr(self, check.repair_function)
                    if repair_func():
                        repairs_successful += 1
                        print(f"  ✅ Repaired successfully")
                    else:
                        print(f"  ❌ Repair failed")
                except Exception as e:
                    print(f"  ❌ Repair error: {str(e)}")
        
        print()
        print(f"Repairs: {repairs_successful}/{repairs_attempted} successful")
        return repairs_successful
    
    # Repair functions
    
    def _repair_dependencies(self) -> bool:
        """Repair missing dependencies."""
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "-e", ".[dev,resume]"],
                cwd=self.repo_root,
                check=True,
                capture_output=True
            )
            return True
        except subprocess.CalledProcessError:
            return False
    
    def _repair_config_directory(self) -> bool:
        """Create config directory."""
        try:
            (self.repo_root / 'config').mkdir(exist_ok=True)
            return True
        except Exception:
            return False
    
    def _repair_user_prefs(self) -> bool:
        """Copy example config to user_prefs.json."""
        try:
            example = self.repo_root / 'config' / 'user_prefs.example.json'
            target = self.repo_root / 'config' / 'user_prefs.json'
            shutil.copy(example, target)
            return True
        except Exception:
            return False
    
    def _repair_data_directory(self) -> bool:
        """Create data directory."""
        try:
            (self.repo_root / 'data').mkdir(exist_ok=True)
            return True
        except Exception:
            return False
    
    def _repair_database(self) -> bool:
        """Backup and reinitialize database."""
        try:
            db_path = self.repo_root / 'data' / 'jobs.db'
            if db_path.exists():
                # Backup old database
                import datetime
                backup_name = f"jobs.db.backup.{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.move(db_path, db_path.parent / backup_name)
            # Database will be recreated on next run
            return True
        except Exception:
            return False
    
    def _repair_permissions(self) -> bool:
        """Fix directory permissions."""
        try:
            if sys.platform != "win32":
                for dir_name in ['data', 'logs', 'config']:
                    dir_path = self.repo_root / dir_name
                    if dir_path.exists():
                        os.chmod(dir_path, 0o755)
                return True
            return False
        except Exception:
            return False
    
    def _repair_env_file(self) -> bool:
        """Copy example .env file."""
        try:
            example = self.repo_root / '.env.example'
            target = self.repo_root / '.env'
            if example.exists():
                shutil.copy(example, target)
                return True
            return False
        except Exception:
            return False
    
    def _repair_log_directory(self) -> bool:
        """Create log directory with proper permissions."""
        try:
            log_dir = self.repo_root / 'logs'
            log_dir.mkdir(exist_ok=True)
            if sys.platform != "win32":
                os.chmod(log_dir, 0o755)
            return True
        except Exception:
            return False
    
    def print_summary(self) -> None:
        """Print final summary."""
        print("\n")
        print("📊 Health Check Summary")
        print("=" * 60)
        print()
        
        # Count by status
        status_counts = {status: 0 for status in HealthStatus}
        for check in self.report.checks:
            status_counts[check.status] += 1
        
        print(f"Overall Status: {self.report.overall_status.value.upper()}")
        print()
        print(f"  ✅ OK:       {status_counts[HealthStatus.OK]}")
        print(f"  ⚠️  Warning:  {status_counts[HealthStatus.WARNING]}")
        print(f"  ❌ Critical: {status_counts[HealthStatus.CRITICAL]}")
        
        if self.report.auto_repairs_available > 0 and not self.auto_repair:
            print()
            print(f"💡 {self.report.auto_repairs_available} auto-repair(s) available")
            print("   Run with --auto-repair to fix automatically")
        
        print()


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="JobSentinel Health Check - Diagnose and repair common issues"
    )
    parser.add_argument(
        "--auto-repair",
        action="store_true",
        help="Automatically repair issues where possible"
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed information"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    checker = JobSentinelHealthChecker(
        auto_repair=args.auto_repair,
        verbose=args.verbose
    )
    
    report = checker.run_all_checks()
    
    if args.auto_repair and report.auto_repairs_available > 0:
        checker.run_auto_repairs()
        # Run checks again to verify repairs
        print("\n🔄 Re-running health checks...")
        report = checker.run_all_checks()
    
    checker.print_summary()
    
    if args.json:
        # Output JSON report
        json_report = {
            "timestamp": report.timestamp,
            "overall_status": report.overall_status.value,
            "checks": [
                {
                    "name": check.name,
                    "status": check.status.value,
                    "message": check.message,
                    "details": check.details,
                    "auto_repair_available": check.auto_repair_available
                }
                for check in report.checks
            ]
        }
        print("\n" + json.dumps(json_report, indent=2))
    
    # Exit code based on overall status
    exit_codes = {
        HealthStatus.OK: 0,
        HealthStatus.WARNING: 0,
        HealthStatus.CRITICAL: 1,
        HealthStatus.UNKNOWN: 2
    }
    
    sys.exit(exit_codes[report.overall_status])


if __name__ == "__main__":
    main()
