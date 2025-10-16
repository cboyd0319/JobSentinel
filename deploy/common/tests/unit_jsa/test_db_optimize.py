"""Comprehensive tests for db_optimize module.

Tests database optimization operations, WAL mode, indexing, and vacuuming.
"""

from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

import pytest

from jsa.db_optimize import DatabaseOptimizer, OptimizationResult


class TestOptimizationResult:
    """Test OptimizationResult dataclass."""

    def test_basic_creation(self):
        """Test creating OptimizationResult with required fields."""
        # Act
        result = OptimizationResult(
            operation="TEST",
            success=True,
            duration_ms=10.5,
            message="Test message",
        )

        # Assert
        assert result.operation == "TEST"
        assert result.success is True
        assert result.duration_ms == 10.5
        assert result.message == "Test message"
        assert result.size_before_mb is None
        assert result.size_after_mb is None

    def test_creation_with_size_info(self):
        """Test creating OptimizationResult with size information."""
        # Act
        result = OptimizationResult(
            operation="VACUUM",
            success=True,
            duration_ms=50.0,
            message="Database vacuumed",
            size_before_mb=100.5,
            size_after_mb=90.2,
        )

        # Assert
        assert result.size_before_mb == 100.5
        assert result.size_after_mb == 90.2

    def test_failed_operation(self):
        """Test OptimizationResult for failed operation."""
        # Act
        result = OptimizationResult(
            operation="INDEX",
            success=False,
            duration_ms=5.0,
            message="Index creation failed",
        )

        # Assert
        assert result.success is False
        assert "failed" in result.message.lower()


class TestDatabaseOptimizer:
    """Test DatabaseOptimizer class."""

    @pytest.fixture
    def temp_db(self) -> Path:
        """Create a temporary SQLite database for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = Path(f.name)

        # Initialize database with a simple table
        conn = sqlite3.connect(db_path)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                posted_date TEXT
            )
        """
        )
        conn.commit()
        conn.close()

        yield db_path

        # Cleanup
        if db_path.exists():
            db_path.unlink()
        # Also clean up WAL files if they exist
        for suffix in ["-wal", "-shm"]:
            wal_file = Path(str(db_path) + suffix)
            if wal_file.exists():
                wal_file.unlink()

    def test_initialization_with_path_string(self, temp_db: Path):
        """Test DatabaseOptimizer initialization with string path."""
        # Act
        optimizer = DatabaseOptimizer(str(temp_db))

        # Assert
        assert optimizer.db_path == temp_db

    def test_initialization_with_path_object(self, temp_db: Path):
        """Test DatabaseOptimizer initialization with Path object."""
        # Act
        optimizer = DatabaseOptimizer(temp_db)

        # Assert
        assert optimizer.db_path == temp_db

    def test_enable_wal_mode_first_time(self, temp_db: Path):
        """Test enabling WAL mode on a database for the first time."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Verify initial state is not WAL
        with sqlite3.connect(temp_db) as conn:
            initial_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
            assert initial_mode.lower() != "wal"

        # Act
        result = optimizer.enable_wal_mode()

        # Assert
        assert result.operation == "WAL Mode"
        assert result.success is True
        assert result.duration_ms > 0
        assert "Enabled" in result.message or "enabled" in result.message.lower()

        # Verify WAL mode is now active
        with sqlite3.connect(temp_db) as conn:
            new_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
            assert new_mode.lower() == "wal"

    def test_enable_wal_mode_already_enabled(self, temp_db: Path):
        """Test enabling WAL mode when already enabled."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Enable WAL mode first
        with sqlite3.connect(temp_db) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.commit()

        # Act
        result = optimizer.enable_wal_mode()

        # Assert
        assert result.operation == "WAL Mode"
        assert result.success is True
        assert "Already" in result.message or "already" in result.message.lower()

    def test_optimize_all_returns_multiple_results(self, temp_db: Path):
        """Test optimize_all returns results for all operations."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        results = optimizer.optimize_all()

        # Assert
        assert isinstance(results, list)
        assert len(results) > 0

        # Check that different operations are present
        operations = {r.operation for r in results}
        assert len(operations) > 1  # Should have multiple different operations

    def test_optimize_all_includes_wal_mode(self, temp_db: Path):
        """Test optimize_all includes WAL mode optimization."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        results = optimizer.optimize_all()

        # Assert
        operations = [r.operation for r in results]
        assert "WAL Mode" in operations

    def test_all_optimizations_have_positive_duration(self, temp_db: Path):
        """Test that all optimization operations record positive durations."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        results = optimizer.optimize_all()

        # Assert
        for result in results:
            assert result.duration_ms >= 0, f"{result.operation} has negative duration"

    @pytest.mark.parametrize(
        "operation_method",
        [
            "enable_wal_mode",
            "create_indexes",
            "analyze_database",
            "vacuum_database",
            "optimize_pragmas",
        ],
        ids=[
            "wal_mode",
            "indexes",
            "analyze",
            "vacuum",
            "pragmas",
        ],
    )
    def test_individual_operations_return_result(
        self, temp_db: Path, operation_method: str
    ):
        """Test that individual optimization operations return OptimizationResult."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        result = getattr(optimizer, operation_method)()

        # Assert
        assert isinstance(result, OptimizationResult)
        assert result.operation is not None
        assert result.success in [True, False]
        assert result.duration_ms >= 0
        assert result.message is not None

    def test_create_indexes_operation(self, temp_db: Path):
        """Test create_indexes operation."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        result = optimizer.create_indexes()

        # Assert
        assert result.operation == "Create Indexes"
        assert isinstance(result.success, bool)
        assert result.duration_ms >= 0

    def test_analyze_database_operation(self, temp_db: Path):
        """Test analyze_database operation."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        result = optimizer.analyze_database()

        # Assert
        assert result.operation == "Analyze Database"
        assert isinstance(result.success, bool)
        assert result.duration_ms >= 0

    def test_vacuum_database_operation(self, temp_db: Path):
        """Test vacuum_database operation."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        result = optimizer.vacuum_database()

        # Assert
        assert result.operation == "Vacuum Database"
        assert isinstance(result.success, bool)
        assert result.duration_ms >= 0

    def test_optimize_pragmas_operation(self, temp_db: Path):
        """Test optimize_pragmas operation."""
        # Arrange
        optimizer = DatabaseOptimizer(temp_db)

        # Act
        result = optimizer.optimize_pragmas()

        # Assert
        assert result.operation == "Optimize PRAGMAs"
        assert isinstance(result.success, bool)
        assert result.duration_ms >= 0


class TestDatabaseOptimizerEdgeCases:
    """Test edge cases for DatabaseOptimizer."""

    def test_nonexistent_database_file(self):
        """Test optimizer with nonexistent database file."""
        # Arrange
        nonexistent_path = Path("/tmp/nonexistent_db_12345.db")
        optimizer = DatabaseOptimizer(nonexistent_path)

        # Act & Assert - Operations should handle missing file gracefully
        # Either by creating the DB or by returning failed results
        result = optimizer.enable_wal_mode()
        assert isinstance(result, OptimizationResult)

    def test_database_path_as_directory(self):
        """Test optimizer with a directory path instead of file."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            optimizer = DatabaseOptimizer(tmpdir)

            # Act
            result = optimizer.enable_wal_mode()

            # Assert - Should fail or handle gracefully
            assert isinstance(result, OptimizationResult)

    def test_multiple_optimizations_in_sequence(self):
        """Test running optimizations multiple times in sequence."""
        # Arrange
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = Path(f.name)

        try:
            # Initialize database
            conn = sqlite3.connect(db_path)
            conn.execute("CREATE TABLE test (id INTEGER)")
            conn.commit()
            conn.close()

            optimizer = DatabaseOptimizer(db_path)

            # Act - Run optimize_all multiple times
            results1 = optimizer.optimize_all()
            results2 = optimizer.optimize_all()

            # Assert - Should work both times
            assert len(results1) > 0
            assert len(results2) > 0
            assert all(r.success for r in results1)
            assert all(r.success for r in results2)

        finally:
            if db_path.exists():
                db_path.unlink()
            for suffix in ["-wal", "-shm"]:
                wal_file = Path(str(db_path) + suffix)
                if wal_file.exists():
                    wal_file.unlink()

    def test_optimization_with_data_in_database(self):
        """Test optimization on database with actual data."""
        # Arrange
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = Path(f.name)

        try:
            # Create database with data
            conn = sqlite3.connect(db_path)
            conn.execute("CREATE TABLE jobs (id INTEGER, title TEXT)")
            # Insert some data
            for i in range(100):
                conn.execute(
                    "INSERT INTO jobs VALUES (?, ?)", (i, f"Job Title {i}")
                )
            conn.commit()
            conn.close()

            optimizer = DatabaseOptimizer(db_path)

            # Act
            results = optimizer.optimize_all()

            # Assert
            assert len(results) > 0
            # Data should still be intact after optimization
            conn = sqlite3.connect(db_path)
            count = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
            conn.close()
            assert count == 100

        finally:
            if db_path.exists():
                db_path.unlink()
            for suffix in ["-wal", "-shm"]:
                wal_file = Path(str(db_path) + suffix)
                if wal_file.exists():
                    wal_file.unlink()
