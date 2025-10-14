from __future__ import annotations

import asyncio
import os
import platform
import shutil
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path

from google.api_core import exceptions as gcp_exceptions
from google.cloud import storage

# Import the existing database module
from src.database import get_database_stats, init_db  # Import specific functions
from utils.errors import DatabaseException
from utils.logging import get_logger

logger = get_logger("gcp_cloud_database")


class CloudDatabase:
    """LEGACY: Database handler that syncs SQLite with Cloud Storage.
    
    Note: This module is deprecated. JobSentinel now uses PostgreSQL which
    can be accessed remotely without file syncing. For cloud deployments,
    use Cloud SQL (PostgreSQL) or managed PostgreSQL services instead.
    
    This module is maintained for backward compatibility only.
    """

    def __init__(self):
        self.bucket_name = os.environ.get("STORAGE_BUCKET")
        self.local_db_path = Path("data/jobs.sqlite")
        self.cloud_db_path = "jobs.sqlite"
        # Add hostname to backup path to avoid collisions from multiple instances
        hostname = platform.node().replace(".", "-")
        self.backup_path = (
            f"backup/jobs-{hostname}-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}.sqlite"
        )
        self.lock_path = "jobs.sqlite.lock"  # Distributed lock file

        if not self.bucket_name:
            logger.warning("STORAGE_BUCKET not set - running in local mode only")
            self.cloud_enabled = False
        else:
            self.cloud_enabled = True
            self.storage_client = storage.Client()
            self.bucket = self.storage_client.bucket(self.bucket_name)

        # Ensure local data directory exists
        self.local_db_path.parent.mkdir(parents=True, exist_ok=True)

    async def _acquire_lock(self, timeout: int = 30) -> bool:
        """Acquire distributed lock for database operations.

        Args:
            timeout: Maximum time to wait for lock in seconds

        Returns:
            True if lock acquired, False if timeout
        """
        if not self.cloud_enabled:
            return True  # No locking needed for local-only mode

        lock_blob = self.bucket.blob(self.lock_path)
        start_time = asyncio.get_event_loop().time()

        while True:
            try:
                # Try to create lock file with precondition (must not exist)
                await asyncio.to_thread(
                    lock_blob.upload_from_string,
                    f"{platform.node()}:{os.getpid()}:{datetime.now(UTC).isoformat()}",
                    if_generation_match=0,  # Only succeeds if blob doesn't exist
                )
                logger.info("Acquired distributed lock for database sync")
                return True
            except gcp_exceptions.PreconditionFailed:
                # Lock already exists, check if it's stale
                if asyncio.get_event_loop().time() - start_time > timeout:
                    # Check if lock is stale (older than 5 minutes)
                    try:
                        await asyncio.to_thread(lock_blob.reload)
                        lock_age = (datetime.now(UTC) - lock_blob.updated).total_seconds()
                        if lock_age > 300:  # 5 minutes
                            logger.warning(f"Breaking stale lock (age: {lock_age:.0f}s)")
                            await asyncio.to_thread(lock_blob.delete)
                            continue
                    except Exception as e:
                        logger.error(f"Error checking lock age: {e}")

                    logger.error(f"Failed to acquire lock after {timeout}s timeout")
                    return False

                # Wait and retry
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error acquiring lock: {e}")
                return False

    async def _release_lock(self):
        """Release distributed lock."""
        if not self.cloud_enabled:
            return

        try:
            lock_blob = self.bucket.blob(self.lock_path)
            await asyncio.to_thread(lock_blob.delete, if_generation_match=None)
            logger.info("Released distributed lock")
        except Exception as e:
            logger.error(f"Error releasing lock: {e}")

    async def download_database(self) -> None:
        """Download latest database from Cloud Storage if it exists."""
        if not self.cloud_enabled:
            logger.info("Cloud storage not enabled - using local database only")
            return

        # Acquire lock before downloading
        if not await self._acquire_lock():
            logger.error("Failed to acquire lock for database download")
            return

        try:
            blob = self.bucket.blob(self.cloud_db_path)
            if blob.exists():
                logger.info(
                    f"Downloading database from gs://{self.bucket_name}/{self.cloud_db_path}"
                )
                # Use a temporary file for download to avoid corruption during download
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    await asyncio.to_thread(blob.download_to_filename, temp_file.name)
                await asyncio.to_thread(shutil.move, temp_file.name, self.local_db_path)
                logger.info("Database downloaded successfully")
            else:
                logger.info("No existing database found in cloud storage - starting fresh")
        except Exception as e:
            logger.error(f"Failed to download database: {e}")
            logger.info("Continuing with local database...")
        finally:
            await self._release_lock()

    async def upload_database(self, create_backup: bool = True) -> None:
        """Upload local database to Cloud Storage with optional backup."""
        if not self.cloud_enabled:
            logger.info("Cloud storage not enabled - skipping upload")
            return

        if not self.local_db_path.exists():
            logger.warning("Local database doesn't exist - nothing to upload")
            return

        # Acquire lock before uploading
        if not await self._acquire_lock():
            logger.error("Failed to acquire lock for database upload")
            return

        try:
            # Create backup of existing database first
            if create_backup:
                existing_blob = self.bucket.blob(self.cloud_db_path)
                if existing_blob.exists():
                    backup_blob = self.bucket.blob(self.backup_path)
                    # Download existing to memory, then upload to backup path
                    await asyncio.to_thread(
                        backup_blob.upload_from_string,
                        await asyncio.to_thread(existing_blob.download_as_bytes),
                    )
                    logger.info(f"Backup created: gs://{self.bucket_name}/{self.backup_path}")

            # Upload current database using tempfile to prevent corruption
            with tempfile.NamedTemporaryFile(delete=False, suffix=".sqlite") as temp_file:
                await asyncio.to_thread(shutil.copy2, self.local_db_path, temp_file.name)
                blob = self.bucket.blob(self.cloud_db_path)
                await asyncio.to_thread(blob.upload_from_filename, temp_file.name)
                await asyncio.to_thread(os.unlink, temp_file.name)
            logger.info(f"Database uploaded to gs://{self.bucket_name}/{self.cloud_db_path}")

        except Exception as e:
            logger.error(f"Failed to upload database: {e}")
            raise DatabaseException("cloud_upload", str(e), e) from e
        finally:
            await self._release_lock()

    async def sync_on_startup(self) -> None:
        """Initialize database - download from cloud, then ensure local tables exist."""
        logger.info("Syncing database on startup...")

        # Download latest from cloud storage
        await self.download_database()

        # Initialize local database (creates tables if needed)
        await init_db()

        logger.info("Database sync completed")

    async def sync_on_shutdown(self) -> None:
        """Upload database changes to cloud storage."""
        logger.info("Syncing database on shutdown...")
        await self.upload_database(create_backup=True)
        logger.info("Database sync completed")


# Global instance
cloud_db = CloudDatabase()


async def init_cloud_db():
    """Initialize cloud-aware database - call at app startup."""
    await cloud_db.sync_on_startup()


async def sync_cloud_db():
    """Sync database to cloud - call at app shutdown or periodically."""
    await cloud_db.sync_on_shutdown()


async def cleanup_old_backups(retention_days: int = 30) -> int:
    """Delete backups older than retention_days.

    Args:
        retention_days: Number of days to retain backups (default 30)

    Returns:
        Number of backups deleted
    """
    if not cloud_db.cloud_enabled:
        logger.info("Cloud storage not enabled - skipping backup cleanup")
        return 0

    try:
        deleted_count = 0
        cutoff_time = datetime.now(UTC) - timedelta(days=retention_days)

        # List all backup files
        prefix = "backup/"
        blobs = cloud_db.bucket.list_blobs(prefix=prefix)

        for blob in blobs:
            if blob.updated and blob.updated < cutoff_time:
                logger.info(
                    f"Deleting old backup: {blob.name} (age: {(datetime.now(UTC) - blob.updated).days} days)"
                )
                await asyncio.to_thread(blob.delete)
                deleted_count += 1

        logger.info(f"Backup cleanup completed: deleted {deleted_count} old backups")
        return deleted_count

    except Exception as e:
        logger.error(f"Backup cleanup failed: {e}")
        return 0


async def get_cloud_db_stats() -> dict:
    """Get database and cloud storage statistics."""
    stats = {
        "cloud_enabled": cloud_db.cloud_enabled,
        "local_db_exists": cloud_db.local_db_path.exists(),
        "local_db_size": 0,
        "bucket_name": cloud_db.bucket_name,
    }

    if cloud_db.local_db_path.exists():
        stats["local_db_size"] = cloud_db.local_db_path.stat().st_size

    # Count backups if cloud enabled
    if cloud_db.cloud_enabled:
        try:
            prefix = "backup/"
            blobs = list(cloud_db.bucket.list_blobs(prefix=prefix))
            stats["backup_count"] = len(blobs)
            if blobs:
                total_backup_size = sum(blob.size for blob in blobs)
                stats["total_backup_size"] = total_backup_size
        except Exception as e:
            logger.error(f"Failed to get backup stats: {e}")
            stats["backup_count"] = 0

    # Add local database stats
    local_stats = await get_database_stats()
    stats.update(local_stats)

    return stats
