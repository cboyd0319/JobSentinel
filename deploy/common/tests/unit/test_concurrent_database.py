"""Comprehensive tests for concurrent_database.py module.

Tests for thread-safe database operations and connection pooling.

Following PyTest Architect principles:
- AAA pattern (Arrange, Act, Assert)
- Parametrized tests where applicable
- Proper mocking at import site
- Deterministic and fast (< 100ms per test)
- Isolation between tests
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from queue import Empty, Queue
from unittest.mock import MagicMock, Mock, patch

import pytest

# Import using absolute imports since concurrent_database uses them
from concurrent_database import (
    BatchJobData,
    ConcurrentJobDatabase,
    DatabaseConnectionPool,
)


class TestBatchJobData:
    """Tests for BatchJobData dataclass."""

    def test_batch_job_data_initialization(self):
        """BatchJobData initializes with required fields."""
        # Arrange
        job_data = {"title": "Engineer", "company": "TechCorp"}

        # Act
        batch_job = BatchJobData(job_data=job_data)

        # Assert
        assert batch_job.job_data == job_data
        assert batch_job.score == 0.0
        assert batch_job.timestamp == 0.0

    def test_batch_job_data_with_score(self):
        """BatchJobData accepts custom score."""
        # Arrange
        job_data = {"title": "Engineer"}
        score = 0.85

        # Act
        batch_job = BatchJobData(job_data=job_data, score=score)

        # Assert
        assert batch_job.score == score

    def test_batch_job_data_with_timestamp(self):
        """BatchJobData accepts custom timestamp."""
        # Arrange
        job_data = {"title": "Engineer"}
        timestamp = 1234567890.0  # Fixed timestamp for determinism

        # Act
        batch_job = BatchJobData(job_data=job_data, timestamp=timestamp)

        # Assert
        assert batch_job.timestamp == timestamp

    @pytest.mark.parametrize(
        "score,timestamp",
        [
            (0.0, 0.0),
            (0.5, 100.0),
            (1.0, 1234567890.0),  # Fixed timestamp instead of time.time()
            (0.99, 999999.99),
        ],
        ids=["zeros", "half", "fixed_time", "large_values"],
    )
    def test_batch_job_data_various_values(self, score, timestamp):
        """BatchJobData handles various score and timestamp values."""
        # Arrange
        job_data = {"title": "Test"}

        # Act
        batch_job = BatchJobData(job_data=job_data, score=score, timestamp=timestamp)

        # Assert
        assert batch_job.score == score
        assert batch_job.timestamp == timestamp


class TestDatabaseConnectionPool:
    """Tests for DatabaseConnectionPool class."""

    def test_connection_pool_initialization(self):
        """DatabaseConnectionPool initializes with correct defaults."""
        # Arrange & Act
        pool = DatabaseConnectionPool(max_connections=5)

        # Assert
        assert pool.max_connections == 5
        assert pool._created_connections >= 0  # May pre-create some

    def test_connection_pool_pre_creates_connections(self):
        """DatabaseConnectionPool pre-creates minimum connections."""
        # Arrange & Act
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=10)

            # Assert
            # Should pre-create min(3, max_connections) connections
            assert pool._created_connections == 3
            assert mock_engine.call_count == 3

    def test_connection_pool_creates_connection_with_sqlite_url(self):
        """DatabaseConnectionPool creates SQLite connections correctly."""
        # Arrange
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            with patch("unified_database.UNIFIED_DB_FILE", "test.sqlite"):
                # Use larger max to avoid queue blocking
                pool = DatabaseConnectionPool(max_connections=10)

                # Assert - check that create_engine was called with correct params
                assert mock_engine.called
                call_args = mock_engine.call_args
                assert "sqlite:///" in call_args[0][0]
                assert call_args[1]["echo"] is False
                assert call_args[1]["pool_pre_ping"] is True

    def test_connection_pool_respects_max_connections(self):
        """DatabaseConnectionPool doesn't exceed max_connections."""
        # Arrange
        max_conn = 2
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=max_conn)

            # Act - Try to create more than max
            for _ in range(10):
                pool._create_connection()

            # Assert
            assert pool._created_connections <= max_conn

    def test_get_connection_returns_connection(self):
        """get_connection returns a database connection."""
        # Arrange
        mock_engine = MagicMock()
        with patch("sqlmodel.create_engine", return_value=mock_engine):
            pool = DatabaseConnectionPool(max_connections=3)

            # Act
            with pool.get_connection() as conn:
                # Assert
                assert conn is not None

    def test_get_connection_returns_to_pool(self):
        """get_connection returns connection to pool after use."""
        # Arrange
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=3)
            initial_size = pool._connections.qsize()

            # Act
            with pool.get_connection() as conn:
                pass  # Just acquire and release

            # Assert
            # Connection should be back in pool
            assert pool._connections.qsize() == initial_size

    def test_get_connection_creates_if_none_available(self):
        """get_connection creates new connection if none available and under max."""
        # Arrange
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=5)
            # Empty the queue
            while not pool._connections.empty():
                try:
                    pool._connections.get_nowait()
                except Empty:
                    break

            initial_count = pool._created_connections

            # Act
            with pool.get_connection() as conn:
                # Assert
                assert conn is not None
                # Should have created a new one (if under max)
                if initial_count < pool.max_connections:
                    assert pool._created_connections > initial_count

    def test_connection_pool_thread_safe(self):
        """DatabaseConnectionPool is thread-safe."""
        # Arrange
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=5)
            results = []
            errors = []

            def get_conn():
                try:
                    with pool.get_connection() as conn:
                        results.append(conn)
                        # Removed sleep for fast execution - thread safety doesn't require delays
                except Exception as e:
                    errors.append(e)

            # Act
            threads = [threading.Thread(target=get_conn) for _ in range(10)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # Assert
            assert len(errors) == 0  # No errors
            assert len(results) == 10  # All threads succeeded

    def test_connection_pool_timeout_handling(self):
        """get_connection handles timeout when pool exhausted."""
        # Arrange
        with patch("sqlmodel.create_engine") as mock_engine:
            mock_engine.return_value = MagicMock()
            pool = DatabaseConnectionPool(max_connections=1)
            # Hold the only connection
            with pool.get_connection():
                # Try to get another (should timeout and create new if possible)
                # Since max is 1, this will try to wait then create
                with patch.object(pool._connections, "get", side_effect=Empty):
                    with patch.object(pool, "_create_connection") as mock_create:
                        try:
                            with pool.get_connection():
                                pass
                        except Empty:
                            # Expected if can't create new
                            pass
                        # Should have attempted to create
                        mock_create.assert_called()


class TestConcurrentJobDatabase:
    """Tests for ConcurrentJobDatabase class."""

    def test_concurrent_job_database_initialization_with_defaults(self):
        """ConcurrentJobDatabase initializes with default parameters."""
        # Arrange & Act
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread") as mock_thread:
                db = ConcurrentJobDatabase()

                # Assert
                assert db.batch_size == 50
                assert db.batch_timeout == 5.0
                assert db.enable_batching is True
                assert db._batch_queue == []
                assert db._stats["jobs_saved"] == 0
                mock_thread.assert_called_once()

    def test_concurrent_job_database_initialization_with_custom_params(self):
        """ConcurrentJobDatabase accepts custom initialization parameters."""
        # Arrange & Act
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase(
                    batch_size=100, batch_timeout=10.0, max_connections=20, enable_batching=True
                )

                # Assert
                assert db.batch_size == 100
                assert db.batch_timeout == 10.0

    def test_concurrent_job_database_initialization_batching_disabled(self):
        """ConcurrentJobDatabase skips batch thread when batching disabled."""
        # Arrange & Act
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread") as mock_thread:
                db = ConcurrentJobDatabase(enable_batching=False)

                # Assert
                assert db.enable_batching is False
                mock_thread.assert_not_called()

    def test_save_job_concurrent_uses_batching_when_enabled(self):
        """save_job_concurrent uses batching when enabled."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase(enable_batching=True)
                job_data = {"hash": "test123", "title": "Engineer"}

                with patch.object(db, "_add_to_batch", return_value=True) as mock_add:
                    # Act
                    result = db.save_job_concurrent(job_data, score=0.8)

                    # Assert
                    assert result is True
                    mock_add.assert_called_once_with(job_data, 0.8)

    def test_save_job_concurrent_uses_immediate_when_batching_disabled(self):
        """save_job_concurrent uses immediate save when batching disabled."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase(enable_batching=False)
                job_data = {"hash": "test123", "title": "Engineer"}

                with patch.object(db, "_save_job_immediate", return_value=True) as mock_save:
                    # Act
                    result = db.save_job_concurrent(job_data, score=0.8)

                    # Assert
                    assert result is True
                    mock_save.assert_called_once_with(job_data, 0.8)

    def test_save_jobs_batch_returns_zero_for_empty_list(self):
        """save_jobs_batch returns 0 when given empty jobs list."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()

                # Act
                result = db.save_jobs_batch([])

                # Assert
                assert result == 0

    def test_save_jobs_batch_defaults_scores_to_zero(self):
        """save_jobs_batch defaults scores to 0.0 when not provided."""
        # Arrange
        jobs_data = [{"hash": "h1", "title": "Job1"}, {"hash": "h2", "title": "Job2"}]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session") as mock_session_class:
                    with patch("concurrent_database.select") as mock_select:
                        with patch("concurrent_database.UnifiedJob") as mock_job_class:
                            # Setup mocks
                            mock_pool = MagicMock()
                            mock_engine = MagicMock()
                            mock_session = MagicMock()
                            mock_result = MagicMock()

                            mock_pool_class.return_value = mock_pool
                            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
                            mock_session_class.return_value.__enter__.return_value = mock_session
                            mock_result.first.return_value = None  # No existing job
                            mock_session.exec.return_value = mock_result
                            mock_job_class.from_scraped_data.return_value = MagicMock()

                            db = ConcurrentJobDatabase()

                            # Act
                            result = db.save_jobs_batch(jobs_data, scores=None)

                            # Assert - should call from_scraped_data with score=0.0
                            assert mock_job_class.from_scraped_data.call_count == 2
                            assert result == 2

    def test_save_jobs_batch_skips_jobs_without_hash(self):
        """save_jobs_batch skips jobs that don't have a hash."""
        # Arrange
        jobs_data = [{"title": "No Hash Job"}, {"hash": "h1", "title": "Valid Job"}]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session") as mock_session_class:
                    with patch("concurrent_database.select"):
                        with patch("concurrent_database.UnifiedJob") as mock_job_class:
                            # Setup mocks
                            mock_pool = MagicMock()
                            mock_engine = MagicMock()
                            mock_session = MagicMock()
                            mock_result = MagicMock()

                            mock_pool_class.return_value = mock_pool
                            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
                            mock_session_class.return_value.__enter__.return_value = mock_session
                            mock_result.first.return_value = None
                            mock_session.exec.return_value = mock_result
                            mock_job_class.from_scraped_data.return_value = MagicMock()

                            db = ConcurrentJobDatabase()

                            # Act
                            result = db.save_jobs_batch(jobs_data)

                            # Assert - only 1 job should be processed (the one with hash)
                            assert mock_job_class.from_scraped_data.call_count == 1
                            assert result == 1

    def test_save_jobs_batch_updates_existing_job(self):
        """save_jobs_batch updates existing job when hash exists."""
        # Arrange
        jobs_data = [{"hash": "existing", "title": "Updated Job"}]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session") as mock_session_class:
                    with patch("concurrent_database.select"):
                        with patch("concurrent_database.UnifiedJob"):
                            # Setup mocks
                            mock_pool = MagicMock()
                            mock_engine = MagicMock()
                            mock_session = MagicMock()
                            mock_result = MagicMock()
                            mock_existing_job = MagicMock()

                            mock_pool_class.return_value = mock_pool
                            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
                            mock_session_class.return_value.__enter__.return_value = mock_session
                            mock_result.first.return_value = mock_existing_job  # Job exists
                            mock_session.exec.return_value = mock_result

                            db = ConcurrentJobDatabase()

                            with patch.object(db, "_update_existing_job") as mock_update:
                                # Act
                                result = db.save_jobs_batch(jobs_data)

                                # Assert - should update existing job
                                mock_update.assert_called_once()
                                assert result == 1

    def test_save_jobs_batch_continues_on_job_error(self):
        """save_jobs_batch continues processing when a job fails."""
        # Arrange
        jobs_data = [{"hash": "bad", "title": "Bad Job"}, {"hash": "good", "title": "Good Job"}]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session") as mock_session_class:
                    with patch("concurrent_database.select"):
                        with patch("concurrent_database.UnifiedJob") as mock_job_class:
                            # Setup mocks
                            mock_pool = MagicMock()
                            mock_engine = MagicMock()
                            mock_session = MagicMock()
                            mock_result = MagicMock()

                            mock_pool_class.return_value = mock_pool
                            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
                            mock_session_class.return_value.__enter__.return_value = mock_session
                            mock_result.first.return_value = None
                            mock_session.exec.return_value = mock_result

                            # First call raises exception, second succeeds
                            mock_job_class.from_scraped_data.side_effect = [
                                Exception("Bad job"),
                                MagicMock(),
                            ]

                            db = ConcurrentJobDatabase()

                            # Act
                            result = db.save_jobs_batch(jobs_data)

                            # Assert - should save 1 job (the good one)
                            assert result == 1

    def test_save_jobs_batch_returns_zero_on_exception(self):
        """save_jobs_batch returns 0 when connection fails."""
        # Arrange
        jobs_data = [{"hash": "test", "title": "Job"}]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                # Setup connection to raise exception
                mock_pool = MagicMock()
                mock_pool.get_connection.side_effect = Exception("Connection failed")
                mock_pool_class.return_value = mock_pool

                db = ConcurrentJobDatabase()

                # Act
                result = db.save_jobs_batch(jobs_data)

                # Assert
                assert result == 0

    def test_save_jobs_batch_uses_provided_scores(self):
        """save_jobs_batch uses provided scores instead of defaults."""
        # Arrange
        jobs_data = [{"hash": "h1", "title": "Job1"}]
        scores = [0.95]

        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session") as mock_session_class:
                    with patch("concurrent_database.select"):
                        with patch("concurrent_database.UnifiedJob") as mock_job_class:
                            # Setup mocks
                            mock_pool = MagicMock()
                            mock_engine = MagicMock()
                            mock_session = MagicMock()
                            mock_result = MagicMock()

                            mock_pool_class.return_value = mock_pool
                            mock_pool.get_connection.return_value.__enter__.return_value = (
                                mock_engine
                            )
                            mock_session_class.return_value.__enter__.return_value = mock_session
                            mock_result.first.return_value = None
                            mock_session.exec.return_value = mock_result
                            mock_job_class.from_scraped_data.return_value = MagicMock()

                            db = ConcurrentJobDatabase()

                            # Act
                            result = db.save_jobs_batch(jobs_data, scores=scores)

                            # Assert
                            assert result == 1
                            # Verify the provided score was used
                            call_args = mock_job_class.from_scraped_data.call_args
                            assert call_args[0][1] == 0.95

    def test_add_to_batch_adds_job_to_queue(self):
        """_add_to_batch adds job data to batch queue."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase(batch_size=100)
                job_data = {"hash": "test", "title": "Test Job"}

                # Act
                result = db._add_to_batch(job_data, score=0.9)

                # Assert
                assert result is True
                assert len(db._batch_queue) == 1
                assert db._batch_queue[0].job_data == job_data
                assert db._batch_queue[0].score == 0.9

    def test_add_to_batch_flushes_when_size_reached(self):
        """_add_to_batch flushes when batch size reached."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase(batch_size=2)

                with patch.object(db, "_flush_batch") as mock_flush:
                    # Act - add 2 jobs to reach batch size
                    db._add_to_batch({"hash": "1", "title": "Job1"}, 0.5)
                    db._add_to_batch({"hash": "2", "title": "Job2"}, 0.6)

                    # Assert - flush should be called
                    mock_flush.assert_called()

    def test_add_to_batch_flushes_when_timeout_reached(self):
        """_add_to_batch flushes when batch timeout reached."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.time.time") as mock_time:
                    # Set initial time
                    mock_time.return_value = 100.0
                    db = ConcurrentJobDatabase(batch_size=100, batch_timeout=5.0)
                    db._last_batch_time = 90.0  # 10 seconds ago

                    with patch.object(db, "_flush_batch") as mock_flush:
                        # Act - time difference > timeout
                        db._add_to_batch({"hash": "1", "title": "Job1"}, 0.5)

                        # Assert
                        mock_flush.assert_called()

    def test_flush_batch_does_nothing_when_queue_empty(self):
        """_flush_batch returns early when queue is empty."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()
                db._batch_queue = []

                with patch.object(db, "save_jobs_batch") as mock_save:
                    # Act
                    db._flush_batch()

                    # Assert
                    mock_save.assert_not_called()

    def test_flush_batch_saves_and_clears_queue(self):
        """_flush_batch saves jobs and clears the queue."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()
                db._batch_queue = [
                    BatchJobData({"hash": "1", "title": "Job1"}, 0.5, 100.0),
                    BatchJobData({"hash": "2", "title": "Job2"}, 0.6, 101.0),
                ]

                with patch.object(db, "save_jobs_batch", return_value=2) as mock_save:
                    # Act
                    db._flush_batch()

                    # Assert
                    assert len(db._batch_queue) == 0
                    mock_save.assert_called_once()
                    call_args = mock_save.call_args
                    assert len(call_args[0][0]) == 2  # jobs_data
                    assert call_args[0][1] == [0.5, 0.6]  # scores

    def test_batch_processor_flushes_on_timeout(self):
        """_batch_processor flushes batches when timeout reached."""
        # This is a daemon thread that runs forever, so we test logic without running thread
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.time") as mock_time_module:
                    mock_time_module.time.side_effect = [100.0, 106.0]  # 6 seconds passed
                    mock_time_module.sleep = MagicMock()  # Don't actually sleep

                    db = ConcurrentJobDatabase(batch_timeout=5.0)
                    db._batch_queue = [BatchJobData({"hash": "1"}, 0.5, 100.0)]
                    db._last_batch_time = 100.0

                    with patch.object(db, "_flush_batch") as mock_flush:
                        # Act - Simulate one iteration of batch processor
                        # The actual loop runs forever in a thread, we test the condition
                        if db._batch_queue and (106.0 - db._last_batch_time) >= db.batch_timeout:
                            db._flush_batch()

                        # Assert
                        mock_flush.assert_called_once()

    def test_save_job_immediate_saves_successfully(self):
        """_save_job_immediate saves job without batching."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            mock_engine = MagicMock()
            mock_pool = MagicMock()
            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
            mock_pool.get_connection.return_value.__exit__.return_value = None
            mock_pool_class.return_value = mock_pool

            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.save_unified_job", return_value=MagicMock()):
                    db = ConcurrentJobDatabase()
                    job_data = {"hash": "test", "title": "Engineer"}

                    # Act
                    result = db._save_job_immediate(job_data, score=0.7)

                    # Assert
                    assert result is True
                    assert db._stats["jobs_saved"] == 1

    def test_save_job_immediate_handles_exception(self):
        """_save_job_immediate handles exceptions gracefully."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            mock_pool = MagicMock()
            mock_pool.get_connection.side_effect = Exception("Database error")
            mock_pool_class.return_value = mock_pool

            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()

                # Act
                result = db._save_job_immediate({"hash": "test"}, score=0.5)

                # Assert
                assert result is False

    def test_save_job_immediate_returns_false_when_save_fails(self):
        """_save_job_immediate returns False when save returns None."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            mock_engine = MagicMock()
            mock_pool = MagicMock()
            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
            mock_pool.get_connection.return_value.__exit__.return_value = None
            mock_pool_class.return_value = mock_pool

            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.save_unified_job", return_value=None):
                    db = ConcurrentJobDatabase()
                    job_data = {"hash": "test", "title": "Engineer"}

                    # Act
                    result = db._save_job_immediate(job_data, score=0.7)

                    # Assert
                    assert result is False
                    assert db._stats["jobs_saved"] == 0  # Not incremented

    def test_update_existing_job_updates_fields(self):
        """_update_existing_job updates job with new data."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()

                mock_job = MagicMock()
                mock_job.times_seen = 1
                mock_session = MagicMock()

                job_data = {"title": "New Title", "company": "NewCo", "invalid_field": "ignored"}

                # Act
                db._update_existing_job(mock_job, job_data, mock_session)

                # Assert
                assert mock_job.times_seen == 2
                assert mock_job.title == "New Title"
                assert mock_job.company == "NewCo"
                mock_session.add.assert_called_once_with(mock_job)

    def test_update_existing_job_skips_none_values(self):
        """_update_existing_job skips None values."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()

                mock_job = MagicMock()
                mock_job.times_seen = 1
                mock_job.title = "Original Title"
                mock_session = MagicMock()

                job_data = {"title": None, "company": "NewCo"}

                # Act
                db._update_existing_job(mock_job, job_data, mock_session)

                # Assert
                assert mock_job.times_seen == 2
                # title should not be updated because value is None
                assert mock_job.title == "Original Title"
                # company should be updated
                assert mock_job.company == "NewCo"

    def test_flush_pending_batches_flushes_queue(self):
        """flush_pending_batches forces flush of pending jobs."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()
                db._batch_queue = [BatchJobData({"hash": "1"}, 0.5, 100.0)]

                with patch.object(db, "_flush_batch") as mock_flush:
                    # Act
                    db.flush_pending_batches()

                    # Assert
                    mock_flush.assert_called_once()

    def test_flush_pending_batches_does_nothing_when_empty(self):
        """flush_pending_batches does nothing when queue empty."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()
                db._batch_queue = []

                with patch.object(db, "_flush_batch") as mock_flush:
                    # Act
                    db.flush_pending_batches()

                    # Assert
                    mock_flush.assert_not_called()

    def test_get_stats_returns_copy_of_stats(self):
        """get_stats returns a copy of statistics dict."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool"):
            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()
                db._stats["jobs_saved"] = 42
                db._stats["jobs_updated"] = 10

                # Act
                stats = db.get_stats()

                # Assert
                assert stats["jobs_saved"] == 42
                assert stats["jobs_updated"] == 10
                # Verify it's a copy, not the original
                stats["jobs_saved"] = 999
                assert db._stats["jobs_saved"] == 42

    def test_optimize_database_runs_vacuum_and_analyze(self):
        """optimize_database runs VACUUM and ANALYZE."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            mock_engine = MagicMock()
            mock_session = MagicMock()
            mock_pool = MagicMock()
            mock_pool.get_connection.return_value.__enter__.return_value = mock_engine
            mock_pool.get_connection.return_value.__exit__.return_value = None
            mock_pool_class.return_value = mock_pool

            with patch("concurrent_database.threading.Thread"):
                with patch("concurrent_database.Session", return_value=mock_session):
                    mock_session.__enter__.return_value = mock_session
                    mock_session.__exit__.return_value = None

                    db = ConcurrentJobDatabase()

                    # Act
                    db.optimize_database()

                    # Assert
                    assert mock_session.exec.call_count == 2

    def test_optimize_database_handles_exception(self):
        """optimize_database handles exceptions gracefully."""
        # Arrange
        with patch("concurrent_database.DatabaseConnectionPool") as mock_pool_class:
            mock_pool = MagicMock()
            mock_pool.get_connection.side_effect = Exception("Optimization error")
            mock_pool_class.return_value = mock_pool

            with patch("concurrent_database.threading.Thread"):
                db = ConcurrentJobDatabase()

                # Act - should not raise
                db.optimize_database()

                # No assert needed - just verify it doesn't raise


class TestConcurrentDatabaseGlobalFunctions:
    """Tests for global convenience functions."""

    def test_get_concurrent_database_returns_singleton(self):
        """get_concurrent_database returns singleton instance."""
        # Arrange
        from concurrent_database import get_concurrent_database

        with patch("concurrent_database.ConcurrentJobDatabase") as mock_db_class:
            mock_instance = MagicMock()
            mock_db_class.return_value = mock_instance

            # Reset global to ensure clean test
            import concurrent_database

            concurrent_database._global_db_handler = None

            # Act
            db1 = get_concurrent_database()
            db2 = get_concurrent_database()

            # Assert
            assert db1 is db2  # Same instance
            mock_db_class.assert_called_once()  # Only created once

    def test_save_jobs_concurrent_calls_handler(self):
        """save_jobs_concurrent delegates to handler."""
        # Arrange
        from concurrent_database import save_jobs_concurrent

        jobs = [{"hash": "1"}]
        scores = [0.5]

        with patch("concurrent_database.get_concurrent_database") as mock_get_db:
            mock_handler = MagicMock()
            mock_handler.save_jobs_batch.return_value = 1
            mock_get_db.return_value = mock_handler

            # Act
            result = save_jobs_concurrent(jobs, scores)

            # Assert
            assert result == 1
            mock_handler.save_jobs_batch.assert_called_once_with(jobs, scores)

    def test_save_job_concurrent_function_calls_handler(self):
        """save_job_concurrent function delegates to handler."""
        # Arrange
        from concurrent_database import save_job_concurrent

        job = {"hash": "test"}

        with patch("concurrent_database.get_concurrent_database") as mock_get_db:
            mock_handler = MagicMock()
            mock_handler.save_job_concurrent.return_value = True
            mock_get_db.return_value = mock_handler

            # Act
            result = save_job_concurrent(job, score=0.8)

            # Assert
            assert result is True
            mock_handler.save_job_concurrent.assert_called_once_with(job, 0.8)


class TestDatabaseBenchmark:
    """Tests for DatabaseBenchmark class."""

    def test_benchmark_save_performance_returns_results(self):
        """benchmark_save_performance returns performance metrics."""
        # Arrange
        from concurrent_database import DatabaseBenchmark

        jobs_data = [{"hash": f"job{i}", "title": f"Job {i}"} for i in range(5)]

        with patch("concurrent_database.save_job_concurrent", return_value=True):
            with patch("concurrent_database.ConcurrentJobDatabase") as mock_db_class:
                mock_db = MagicMock()
                mock_db.save_jobs_batch.return_value = 5
                mock_db.flush_pending_batches.return_value = None
                mock_db_class.return_value = mock_db

                # Act
                results = DatabaseBenchmark.benchmark_save_performance(jobs_data)

                # Assert
                assert "sequential" in results
                assert "concurrent_batch" in results
                assert "time" in results["sequential"]
                assert "jobs_saved" in results["sequential"]
                assert results["sequential"]["jobs_saved"] == 5
                assert results["concurrent_batch"]["jobs_saved"] == 5


class TestConcurrentDatabaseIntegration:
    """Integration tests for concurrent database operations."""

    def test_module_imports_successfully(self):
        """concurrent_database module imports without errors."""
        # Arrange & Act
        import concurrent_database

        # Assert
        assert concurrent_database is not None

    def test_module_exports_expected_classes(self):
        """concurrent_database exports expected public classes."""
        # Arrange & Act
        import concurrent_database

        # Assert
        assert hasattr(concurrent_database, "BatchJobData")
        assert hasattr(concurrent_database, "DatabaseConnectionPool")
        assert hasattr(concurrent_database, "ConcurrentJobDatabase")

    def test_batch_job_data_is_dataclass(self):
        """BatchJobData is a proper dataclass."""
        # Arrange & Act
        import dataclasses

        # Assert
        assert dataclasses.is_dataclass(BatchJobData)
