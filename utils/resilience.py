"""
Resilience and failure recovery utilities for the job scraper.
Handles various failure scenarios and automatic recovery for PostgreSQL.
"""

import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from utils.logging import get_logger

logger = get_logger("resilience")


@dataclass
class BackupConfig:
    """Configuration for backup operations."""

    enabled: bool = True
    backup_dir: str = "data/backups"
    max_backups: int = 7
    backup_interval_hours: int = 24
    auto_backup_on_startup: bool = True


class DatabaseResilience:
    """Handles database backup, recovery, and integrity checking for PostgreSQL."""

    def __init__(self, db_url: str = None, config: BackupConfig = None):
        """Initialize database resilience for PostgreSQL.

        Args:
            db_url: PostgreSQL connection URL (e.g., postgresql://user:pass@host:port/db)
            config: Backup configuration
        """
        self.db_url = db_url or os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://jobsentinel:jobsentinel@localhost:5432/jobsentinel",
        )
        self.config = config or BackupConfig()
        self.backup_dir = Path(self.config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Parse database URL to get connection parameters
        self._parse_db_url()

    def _parse_db_url(self) -> None:
        """Parse PostgreSQL URL to extract connection parameters."""
        # Remove SQLAlchemy dialect prefix if present
        url = self.db_url.replace("postgresql+asyncpg://", "postgresql://")
        url = url.replace("postgresql+psycopg2://", "postgresql://")

        parsed = urlparse(url)
        self.db_host = parsed.hostname or "localhost"
        self.db_port = parsed.port or 5432
        self.db_name = parsed.path.lstrip("/") or "jobsentinel"
        self.db_user = parsed.username or "jobsentinel"
        self.db_password = parsed.password or "jobsentinel"

    def create_backup(self, reason: str = "manual") -> Path | None:
        """Create a PostgreSQL database backup using pg_dump."""
        if not self.config.enabled:
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"jobs_backup_{timestamp}_{reason}.sql"
            backup_path = self.backup_dir / backup_name

            # Set environment for pg_dump
            env = os.environ.copy()
            env["PGPASSWORD"] = self.db_password

            # Create backup using pg_dump
            cmd = [
                "pg_dump",
                "-h",
                self.db_host,
                "-p",
                str(self.db_port),
                "-U",
                self.db_user,
                "-F",
                "c",  # Custom format (compressed)
                "-f",
                str(backup_path),
                self.db_name,
            ]

            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                return None

            logger.info(f"Database backup created: {backup_path}")
            self._cleanup_old_backups()
            return backup_path

        except subprocess.TimeoutExpired:
            logger.error("Database backup timed out after 5 minutes")
            return None
        except FileNotFoundError:
            logger.error("pg_dump command not found. Ensure PostgreSQL client tools are installed.")
            return None
        except Exception as e:
            logger.error(f"Failed to create database backup: {e}")
            return None

    def restore_from_backup(self, backup_path: Path = None) -> bool:
        """Restore database from backup using pg_restore."""
        if backup_path is None:
            backup_path = self._get_latest_backup()

        if not backup_path or not backup_path.exists():
            logger.error("No backup available for restore")
            return False

        try:
            # Create a backup before restore
            self.create_backup("pre_restore")

            # Set environment for pg_restore
            env = os.environ.copy()
            env["PGPASSWORD"] = self.db_password

            # Restore using pg_restore
            cmd = [
                "pg_restore",
                "-h",
                self.db_host,
                "-p",
                str(self.db_port),
                "-U",
                self.db_user,
                "-d",
                self.db_name,
                "-c",  # Clean (drop) database objects before recreating
                str(backup_path),
            ]

            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                logger.error(f"pg_restore failed: {result.stderr}")
                return False

            logger.info(f"Database restored from {backup_path}")
            return True

        except subprocess.TimeoutExpired:
            logger.error("Database restore timed out after 5 minutes")
            return False
        except FileNotFoundError:
            logger.error(
                "pg_restore command not found. Ensure PostgreSQL client tools are installed."
            )
            return False
        except Exception as e:
            logger.error(f"Failed to restore database from {backup_path}: {e}")
            return False

    def check_database_integrity(self) -> dict[str, Any]:
        """Check PostgreSQL database connectivity and basic health."""
        result = {
            "healthy": False,
            "readable": False,
            "table_count": 0,
            "job_count": 0,
            "errors": [],
        }

        try:
            # Set environment for psql
            env = os.environ.copy()
            env["PGPASSWORD"] = self.db_password

            # Test basic connectivity
            cmd = [
                "psql",
                "-h",
                self.db_host,
                "-p",
                str(self.db_port),
                "-U",
                self.db_user,
                "-d",
                self.db_name,
                "-c",
                "SELECT 1;",
            ]

            result_check = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result_check.returncode == 0:
                result["readable"] = True
                result["healthy"] = True
            else:
                result["errors"].append(f"Database connection failed: {result_check.stderr}")
                return result

            # Count tables using information_schema
            cmd_tables = [
                "psql",
                "-h",
                self.db_host,
                "-p",
                str(self.db_port),
                "-U",
                self.db_user,
                "-d",
                self.db_name,
                "-t",  # Tuples only (no headers)
                "-c",
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';",
            ]

            table_result = subprocess.run(
                cmd_tables,
                env=env,
                capture_output=True,
                text=True,
                timeout=10,
            )

            if table_result.returncode == 0:
                try:
                    result["table_count"] = int(table_result.stdout.strip())
                except ValueError:
                    result["table_count"] = 0

            # Count jobs
            cmd_jobs = [
                "psql",
                "-h",
                self.db_host,
                "-p",
                str(self.db_port),
                "-U",
                self.db_user,
                "-d",
                self.db_name,
                "-t",
                "-c",
                "SELECT COUNT(*) FROM job;",
            ]

            jobs_result = subprocess.run(
                cmd_jobs,
                env=env,
                capture_output=True,
                text=True,
                timeout=10,
            )

            if jobs_result.returncode == 0:
                try:
                    result["job_count"] = int(jobs_result.stdout.strip())
                except ValueError:
                    result["job_count"] = 0

        except subprocess.TimeoutExpired:
            result["errors"].append("Database query timed out")
        except FileNotFoundError:
            result["errors"].append("psql command not found")
        except Exception as e:
            result["errors"].append(f"Database check failed: {e}")

        return result

    def auto_backup_if_needed(self) -> bool:
        """Create backup if interval has elapsed."""
        if not self.config.enabled or not self.config.auto_backup_on_startup:
            return False

        latest_backup = self._get_latest_backup()
        if latest_backup is None:
            self.create_backup("initial")
            return True

        # Check if backup is needed based on interval
        backup_age = datetime.now() - datetime.fromtimestamp(latest_backup.stat().st_mtime)
        if backup_age > timedelta(hours=self.config.backup_interval_hours):
            self.create_backup("scheduled")
            return True

        return False

    def _get_latest_backup(self) -> Path | None:
        """Get the most recent backup file."""
        if not self.backup_dir.exists():
            return None

        backups = list(self.backup_dir.glob("jobs_backup_*.sql"))
        if not backups:
            return None

        return max(backups, key=lambda p: p.stat().st_mtime)

    def _cleanup_old_backups(self):
        """Remove old backups beyond the configured limit."""
        backups = list(self.backup_dir.glob("jobs_backup_*.sql"))
        if len(backups) <= self.config.max_backups:
            return

        # Sort by modification time (oldest first)
        backups.sort(key=lambda p: p.stat().st_mtime)

        # Remove oldest backups
        for backup in backups[: -self.config.max_backups]:
            try:
                backup.unlink()
                logger.debug(f"Removed old backup: {backup}")
            except Exception as e:
                logger.warning(f"Failed to remove old backup {backup}: {e}")


class NetworkResilience:
    """Handles network failures and connectivity issues."""

    def __init__(self):
        self.consecutive_failures = {}
        self.backoff_delays = {}

    def record_failure(self, domain: str):
        """Record a network failure for a domain."""
        self.consecutive_failures[domain] = self.consecutive_failures.get(domain, 0) + 1

        # Calculate exponential backoff
        failures = self.consecutive_failures[domain]
        delay = min(300, 30 * (2 ** min(failures - 1, 4)))  # Max 5 minutes
        self.backoff_delays[domain] = time.time() + delay

        logger.warning(f"Network failure #{failures} for {domain}, backing off {delay}s")

    def record_success(self, domain: str):
        """Record a successful connection for a domain."""
        if domain in self.consecutive_failures:
            logger.info(f"Network recovered for {domain}")
            del self.consecutive_failures[domain]

        if domain in self.backoff_delays:
            del self.backoff_delays[domain]

    def should_skip_domain(self, domain: str) -> bool:
        """Check if domain should be skipped due to backoff."""
        if domain in self.backoff_delays:
            return time.time() < self.backoff_delays[domain]
        return False

    def get_failure_count(self, domain: str) -> int:
        """Get consecutive failure count for domain."""
        return self.consecutive_failures.get(domain, 0)


class ProcessResilience:
    """Handles process crashes and automatic restart."""

    def __init__(self, lockfile_path: str = "data/scraper.lock"):
        self.lockfile_path = Path(lockfile_path)
        self.lockfile_path.parent.mkdir(parents=True, exist_ok=True)

    def acquire_lock(self) -> bool:
        """Acquire process lock to prevent multiple instances."""
        try:
            if self.lockfile_path.exists():
                # Check if process is still running
                with open(self.lockfile_path) as f:
                    old_pid = int(f.read().strip())

                if self._is_process_running(old_pid):
                    logger.warning(f"Another instance is running (PID: {old_pid})")
                    return False
                else:
                    logger.info(f"Removing stale lockfile for PID {old_pid}")
                    self.lockfile_path.unlink()

            # Create new lockfile
            with open(self.lockfile_path, "w") as f:
                f.write(str(os.getpid()))

            logger.debug(f"Process lock acquired (PID: {os.getpid()})")
            return True

        except Exception as e:
            logger.error(f"Failed to acquire process lock: {e}")
            return False

    def release_lock(self):
        """Release process lock."""
        try:
            if self.lockfile_path.exists():
                self.lockfile_path.unlink()
                logger.debug("Process lock released")
        except Exception as e:
            logger.warning(f"Failed to release process lock: {e}")

    def _is_process_running(self, pid: int) -> bool:
        """Check if a process with given PID is running."""
        try:
            import psutil

            return psutil.pid_exists(pid)
        except ImportError:
            # Fallback for systems without psutil
            try:
                os.kill(pid, 0)
                return True
            except OSError:
                return False


def run_startup_checks() -> dict[str, Any]:
    """Run comprehensive startup checks and recovery."""
    logger.info("Running startup resilience checks...")

    results = {
        "database_healthy": False,
        "backup_created": False,
        "config_valid": False,
        "directories_ready": False,
        "issues_found": [],
        "actions_taken": [],
    }

    try:
        # Check and create required directories
        required_dirs = ["data", "data/logs", "data/backups"]
        for dir_path in required_dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
        results["directories_ready"] = True
        results["actions_taken"].append("Created required directories")

        # Database checks
        db_resilience = DatabaseResilience()
        db_health = db_resilience.check_database_integrity()

        if db_health["healthy"]:
            results["database_healthy"] = True
            logger.info("Database integrity check passed")
        else:
            results["issues_found"].extend(db_health["errors"])

            # Attempt recovery
            if not db_health["readable"]:
                logger.warning("Database corrupted, attempting restore from backup")
                if db_resilience.restore_from_backup():
                    results["actions_taken"].append("Restored database from backup")
                    results["database_healthy"] = True
                else:
                    logger.error("Failed to restore database, will reinitialize")
                    results["actions_taken"].append("Database will be reinitialized")

        # Create backup if needed
        if db_resilience.auto_backup_if_needed():
            results["backup_created"] = True
            results["actions_taken"].append("Created database backup")

        # Configuration validation
        try:
            from utils.config import config_manager

            config_manager.load_config()
            results["config_valid"] = True
            logger.info("Configuration validation passed")
        except Exception as e:
            results["issues_found"].append(f"Configuration error: {e}")
            logger.error(f"Configuration validation failed: {e}")

    except Exception as e:
        logger.error(f"Startup checks failed: {e}")
        results["issues_found"].append(f"Startup check failure: {e}")

    # Log summary
    if results["issues_found"]:
        logger.warning(f"Startup issues found: {results['issues_found']}")
    if results["actions_taken"]:
        logger.info(f"Recovery actions taken: {results['actions_taken']}")

    return results


# Global instances
db_resilience = DatabaseResilience()
network_resilience = NetworkResilience()
process_resilience = ProcessResilience()
