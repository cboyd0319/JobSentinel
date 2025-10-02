from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
import asyncio

from google.cloud import storage

from utils.logging import get_logger
from utils.errors import DatabaseException

# Import the existing database module
from src.database import init_db, get_database_stats  # Import specific functions

logger = get_logger("gcp_cloud_database")


class CloudDatabase:
    """Database handler that syncs SQLite with Cloud Storage."""

    def __init__(self):
        self.bucket_name = os.environ.get("STORAGE_BUCKET")
        self.local_db_path = Path("data/jobs.sqlite")
        self.cloud_db_path = "jobs.sqlite"
        self.backup_path = f"backup/jobs-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.sqlite"

        if not self.bucket_name:
            logger.warning("STORAGE_BUCKET not set - running in local mode only")
            self.cloud_enabled = False
        else:
            self.cloud_enabled = True
            self.storage_client = storage.Client()
            self.bucket = self.storage_client.bucket(self.bucket_name)

        # Ensure local data directory exists
        self.local_db_path.parent.mkdir(parents=True, exist_ok=True)

    async def download_database(self) -> None:
        """Download latest database from Cloud Storage if it exists."""
        if not self.cloud_enabled:
            logger.info("Cloud storage not enabled - using local database only")
            return

        try:
            blob = self.bucket.blob(self.cloud_db_path)
            if blob.exists():
                logger.info(f"Downloading database from gs://{self.bucket_name}/{self.cloud_db_path}")
                # Use a temporary file for download to avoid corruption during download
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    await asyncio.to_thread(blob.download_to_filename, temp_file.name)
                await asyncio.to_thread(shutil.move, temp_file.name, self.local_db_path)
                logger.info("✅ Database downloaded successfully")
            else:
                logger.info("No existing database found in cloud storage - starting fresh")
        except Exception as e:
            logger.error(f"Failed to download database: {e}")
            logger.info("Continuing with local database...")

    async def upload_database(self, create_backup: bool = True) -> None:
        """Upload local database to Cloud Storage with optional backup."""
        if not self.cloud_enabled:
            logger.info("Cloud storage not enabled - skipping upload")
            return

        if not self.local_db_path.exists():
            logger.warning("Local database doesn't exist - nothing to upload")
            return

        try:
            # Create backup of existing database first
            if create_backup:
                existing_blob = self.bucket.blob(self.cloud_db_path)
                if existing_blob.exists():
                    backup_blob = self.bucket.blob(self.backup_path)
                    # Download existing to memory, then upload to backup path
                    await asyncio.to_thread(
                        backup_blob.upload_from_string, await asyncio.to_thread(existing_blob.download_as_bytes)
                    )
                    logger.info(f"✅ Backup created: gs://{self.bucket_name}/{self.backup_path}")

            # Upload current database
            blob = self.bucket.blob(self.cloud_db_path)
            await asyncio.to_thread(blob.upload_from_filename, str(self.local_db_path))
            logger.info(f"✅ Database uploaded to gs://{self.bucket_name}/{self.cloud_db_path}")

        except Exception as e:
            logger.error(f"Failed to upload database: {e}")
            raise DatabaseException("cloud_upload", str(e), e)

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

    # Add local database stats
    local_stats = await get_database_stats()
    stats.update(local_stats)

    return stats
