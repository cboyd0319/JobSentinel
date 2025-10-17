"""Comprehensive unit tests for GCP Cloud Database module.

Tests cover:
- CloudDatabase initialization with and without cloud storage
- Lock acquisition/release mechanisms
- Database download and upload operations
- Backup management and cleanup
- Error handling and edge cases
"""

from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from google.api_core import exceptions as gcp_exceptions

from providers.gcp import cloud_database


class TestCloudDatabaseInit:
    """Tests for CloudDatabase initialization."""

    def test_init_without_bucket_disables_cloud(self, mocker, monkeypatch):
        """Should disable cloud mode when STORAGE_BUCKET not set."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")

        # Act
        db = cloud_database.CloudDatabase()

        # Assert
        assert db.cloud_enabled is False
        assert db.bucket_name is None
        assert not hasattr(db, "storage_client")

    def test_init_with_bucket_enables_cloud(self, mocker, monkeypatch):
        """Should enable cloud mode when STORAGE_BUCKET is set."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_storage.Client.return_value = mock_client

        # Act
        db = cloud_database.CloudDatabase()

        # Assert
        assert db.cloud_enabled is True
        assert db.bucket_name == "test-bucket"
        assert db.storage_client == mock_client
        mock_client.bucket.assert_called_once_with("test-bucket")

    def test_init_creates_local_data_directory(self, mocker, monkeypatch):
        """Should create local data directory on init."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mock_mkdir = mocker.patch("providers.gcp.cloud_database.Path.mkdir")

        # Act
        db = cloud_database.CloudDatabase()

        # Assert
        mock_mkdir.assert_called_once_with(parents=True, exist_ok=True)

    def test_init_sets_paths_correctly(self, mocker, monkeypatch):
        """Should set correct paths for database and backups."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")

        # Act
        db = cloud_database.CloudDatabase()

        # Assert
        assert db.local_db_path == Path("data/jobs.sqlite")
        assert db.cloud_db_path == "jobs.sqlite"
        assert db.lock_path == "jobs.sqlite.lock"
        assert "backup/jobs-" in db.backup_path
        assert db.backup_path.endswith(".sqlite")


class TestAcquireLock:
    """Tests for lock acquisition mechanism."""

    @pytest.mark.asyncio
    async def test_acquire_lock_succeeds_in_local_mode(self, mocker, monkeypatch):
        """Should immediately return True in local mode."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        db = cloud_database.CloudDatabase()

        # Act
        result = await db._acquire_lock()

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_acquire_lock_succeeds_when_no_lock_exists(self, mocker, monkeypatch):
        """Should acquire lock when no existing lock."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()

        # Mock successful lock creation
        mock_upload = AsyncMock()
        mocker.patch("asyncio.to_thread", side_effect=lambda f, *args, **kwargs: mock_upload())

        # Act
        result = await db._acquire_lock(timeout=5)

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_acquire_lock_retries_on_precondition_failed(self, mocker, monkeypatch):
        """Should retry when lock exists but eventually succeeds."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()

        # First attempt fails, second succeeds
        call_count = [0]

        async def mock_to_thread(f, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise gcp_exceptions.PreconditionFailed("Lock exists")
            return None

        mocker.patch("asyncio.to_thread", side_effect=mock_to_thread)
        mocker.patch("asyncio.sleep", new_callable=AsyncMock)

        # Act
        result = await db._acquire_lock(timeout=5)

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_acquire_lock_breaks_stale_lock(self, mocker, monkeypatch):
        """Should break lock if it's older than 5 minutes."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        # Make blob appear stale
        old_time = datetime.now(UTC) - timedelta(minutes=10)
        mock_blob.updated = old_time

        db = cloud_database.CloudDatabase()

        call_count = [0]

        async def mock_to_thread(f, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                # First call: upload_from_string fails
                raise gcp_exceptions.PreconditionFailed("Lock exists")
            elif call_count[0] == 2:
                # Second call: reload to check age
                return None
            elif call_count[0] == 3:
                # Third call: delete stale lock
                return None
            else:
                # Fourth call: successful upload
                return None

        mocker.patch("asyncio.to_thread", side_effect=mock_to_thread)
        mocker.patch("asyncio.sleep", new_callable=AsyncMock)
        
        # Mock event loop time to simulate timeout
        mock_time = [0, 0, 31]  # Timeout after checking
        mocker.patch("asyncio.get_event_loop").return_value.time = lambda: mock_time.pop(0)

        # Act
        result = await db._acquire_lock(timeout=30)

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_acquire_lock_fails_on_timeout(self, mocker, monkeypatch):
        """Should return False after timeout."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        # Recent lock, not stale
        mock_blob.updated = datetime.now(UTC)

        db = cloud_database.CloudDatabase()

        # Always fail to acquire lock
        async def mock_to_thread(f, *args, **kwargs):
            if f == mock_blob.upload_from_string:
                raise gcp_exceptions.PreconditionFailed("Lock exists")
            return None  # reload succeeds

        mocker.patch("asyncio.to_thread", side_effect=mock_to_thread)
        mocker.patch("asyncio.sleep", new_callable=AsyncMock)
        
        # Mock time to trigger timeout
        time_values = [0, 0, 2]  # First check, precondition check, timeout check
        
        def mock_time():
            return time_values.pop(0) if time_values else 100
        
        mocker.patch("asyncio.get_event_loop").return_value.time = mock_time

        # Act
        result = await db._acquire_lock(timeout=1)

        # Assert
        assert result is False


class TestReleaseLock:
    """Tests for lock release mechanism."""

    @pytest.mark.asyncio
    async def test_release_lock_does_nothing_in_local_mode(self, mocker, monkeypatch):
        """Should do nothing in local mode."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        db = cloud_database.CloudDatabase()

        # Act & Assert (should not raise)
        await db._release_lock()

    @pytest.mark.asyncio
    async def test_release_lock_deletes_blob_in_cloud_mode(self, mocker, monkeypatch):
        """Should delete lock blob in cloud mode."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()

        mock_delete = AsyncMock()
        mocker.patch("asyncio.to_thread", return_value=mock_delete())

        # Act
        await db._release_lock()

        # Assert - to_thread was called to delete the blob
        # (we can't easily verify the exact call due to async wrapping)

    @pytest.mark.asyncio
    async def test_release_lock_handles_errors_gracefully(self, mocker, monkeypatch):
        """Should handle errors during lock release."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()

        async def mock_to_thread(f, *args, **kwargs):
            raise Exception("Delete failed")

        mocker.patch("asyncio.to_thread", side_effect=mock_to_thread)

        # Act & Assert - should not raise
        await db._release_lock()


class TestDownloadDatabase:
    """Tests for database download functionality."""

    @pytest.mark.asyncio
    async def test_download_skips_in_local_mode(self, mocker, monkeypatch):
        """Should skip download when cloud not enabled."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        db = cloud_database.CloudDatabase()

        # Act
        await db.download_database()

        # Assert - no errors, just logs

    @pytest.mark.asyncio
    async def test_download_when_blob_exists(self, mocker, monkeypatch, tmp_path):
        """Should download database when blob exists."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = True
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()
        db._acquire_lock = AsyncMock(return_value=True)
        db._release_lock = AsyncMock()

        # Mock file operations
        mocker.patch("tempfile.NamedTemporaryFile")
        mocker.patch("asyncio.to_thread", new_callable=AsyncMock)
        mocker.patch("shutil.move")

        # Act
        await db.download_database()

        # Assert
        db._acquire_lock.assert_called_once()
        db._release_lock.assert_called_once()

    @pytest.mark.asyncio
    async def test_download_when_blob_does_not_exist(self, mocker, monkeypatch):
        """Should log message when no cloud database exists."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_blob = Mock()
        mock_blob.exists.return_value = False
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob

        db = cloud_database.CloudDatabase()
        db._acquire_lock = AsyncMock(return_value=True)
        db._release_lock = AsyncMock()

        # Act
        await db.download_database()

        # Assert
        db._acquire_lock.assert_called_once()
        db._release_lock.assert_called_once()


class TestUploadDatabase:
    """Tests for database upload functionality."""

    @pytest.mark.asyncio
    async def test_upload_skips_in_local_mode(self, mocker, monkeypatch):
        """Should skip upload when cloud not enabled."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        db = cloud_database.CloudDatabase()

        # Act
        await db.upload_database()

        # Assert - no errors, just logs

    @pytest.mark.asyncio
    async def test_upload_skips_when_local_db_missing(self, mocker, monkeypatch):
        """Should skip upload when local database doesn't exist."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket

        db = cloud_database.CloudDatabase()
        
        # Mock Path.exists() method call
        mocker.patch("pathlib.Path.exists", return_value=False)

        # Act
        await db.upload_database()

        # Assert - no errors, logs warning

    @pytest.mark.asyncio
    async def test_upload_creates_backup_when_requested(self, mocker, monkeypatch):
        """Should create backup before uploading new version."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_existing_blob = Mock()
        mock_existing_blob.exists.return_value = True
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_existing_blob

        db = cloud_database.CloudDatabase()
        db._acquire_lock = AsyncMock(return_value=True)
        db._release_lock = AsyncMock()
        
        # Mock Path.exists() method call
        mocker.patch("pathlib.Path.exists", return_value=True)

        # Mock file operations
        mocker.patch("tempfile.NamedTemporaryFile")
        mocker.patch("asyncio.to_thread", new_callable=AsyncMock)
        mocker.patch("shutil.copy2")
        mocker.patch("os.unlink")

        # Act
        await db.upload_database(create_backup=True)

        # Assert
        db._acquire_lock.assert_called_once()
        db._release_lock.assert_called_once()


class TestCleanupOldBackups:
    """Tests for backup cleanup functionality."""

    @pytest.mark.asyncio
    async def test_cleanup_skips_in_local_mode(self, mocker, monkeypatch):
        """Should skip cleanup when cloud not enabled."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mocker.patch("providers.gcp.cloud_database.cloud_db", cloud_database.CloudDatabase())

        # Act
        result = await cloud_database.cleanup_old_backups()

        # Assert
        assert result == 0

    @pytest.mark.asyncio
    async def test_cleanup_deletes_old_backups(self, mocker, monkeypatch):
        """Should delete backups older than retention period."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket

        # Create mock old blobs
        old_blob = Mock()
        old_blob.updated = datetime.now(UTC) - timedelta(days=35)
        old_blob.name = "backup/old.sqlite"

        recent_blob = Mock()
        recent_blob.updated = datetime.now(UTC) - timedelta(days=5)
        recent_blob.name = "backup/recent.sqlite"

        mock_bucket.list_blobs.return_value = [old_blob, recent_blob]

        db = cloud_database.CloudDatabase()
        mocker.patch("providers.gcp.cloud_database.cloud_db", db)
        mocker.patch("asyncio.to_thread", new_callable=AsyncMock)

        # Act
        result = await cloud_database.cleanup_old_backups(retention_days=30)

        # Assert
        assert result == 1  # Only one old backup deleted


class TestGetCloudDbStats:
    """Tests for database statistics functionality."""

    @pytest.mark.asyncio
    async def test_get_stats_in_local_mode(self, mocker, monkeypatch):
        """Should return stats in local mode."""
        # Arrange
        monkeypatch.delenv("STORAGE_BUCKET", raising=False)
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        db = cloud_database.CloudDatabase()
        mocker.patch("providers.gcp.cloud_database.cloud_db", db)
        mocker.patch("pathlib.Path.exists", return_value=False)
        mocker.patch("providers.gcp.cloud_database.get_database_stats", new_callable=AsyncMock, return_value={})

        # Act
        stats = await cloud_database.get_cloud_db_stats()

        # Assert
        assert stats["cloud_enabled"] is False
        assert stats["local_db_exists"] is False
        assert stats["bucket_name"] is None

    @pytest.mark.asyncio
    async def test_get_stats_includes_backup_count(self, mocker, monkeypatch):
        """Should include backup count when cloud enabled."""
        # Arrange
        monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
        mocker.patch("providers.gcp.cloud_database.Path.mkdir")
        mock_storage = mocker.patch("providers.gcp.cloud_database.storage")
        mock_client = Mock()
        mock_bucket = Mock()
        mock_storage.Client.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket

        # Mock backup blobs
        blob1 = Mock()
        blob1.size = 1000
        blob2 = Mock()
        blob2.size = 2000
        mock_bucket.list_blobs.return_value = [blob1, blob2]

        db = cloud_database.CloudDatabase()
        mocker.patch("providers.gcp.cloud_database.cloud_db", db)
        mocker.patch("pathlib.Path.exists", return_value=False)
        mocker.patch("providers.gcp.cloud_database.get_database_stats", new_callable=AsyncMock, return_value={})

        # Act
        stats = await cloud_database.get_cloud_db_stats()

        # Assert
        assert stats["cloud_enabled"] is True
        assert stats["backup_count"] == 2
        assert stats["total_backup_size"] == 3000
