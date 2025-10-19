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

from concurrent_database import BatchJobData, DatabaseConnectionPool


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
        with patch("concurrent_database.create_engine") as mock_engine:
            pool = DatabaseConnectionPool(max_connections=10)

            # Assert
            # Should pre-create min(3, max_connections) connections
            assert pool._created_connections == 3
            assert mock_engine.call_count == 3

    def test_connection_pool_creates_connection_with_sqlite_url(self):
        """DatabaseConnectionPool creates SQLite connections correctly."""
        # Arrange
        with patch("concurrent_database.create_engine") as mock_engine:
            with patch("concurrent_database.UNIFIED_DB_FILE", "test.sqlite"):
                pool = DatabaseConnectionPool(max_connections=1)

                # Act - force creation
                pool._created_connections = 0  # Reset counter
                pool._create_connection()

                # Assert
                mock_engine.assert_called()
                call_args = mock_engine.call_args
                assert "sqlite:///" in call_args[0][0]
                assert call_args[1]["echo"] is False
                assert call_args[1]["pool_pre_ping"] is True

    def test_connection_pool_respects_max_connections(self):
        """DatabaseConnectionPool doesn't exceed max_connections."""
        # Arrange
        max_conn = 2
        with patch("concurrent_database.create_engine"):
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
        with patch("concurrent_database.create_engine", return_value=mock_engine):
            pool = DatabaseConnectionPool(max_connections=3)

            # Act
            with pool.get_connection() as conn:
                # Assert
                assert conn is not None

    def test_get_connection_returns_to_pool(self):
        """get_connection returns connection to pool after use."""
        # Arrange
        with patch("concurrent_database.create_engine") as mock_engine:
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
        with patch("concurrent_database.create_engine"):
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
        with patch("concurrent_database.create_engine"):
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
        with patch("concurrent_database.create_engine"):
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
