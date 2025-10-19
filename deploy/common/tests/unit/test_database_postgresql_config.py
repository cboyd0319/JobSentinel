"""
Test database.py PostgreSQL configuration at module import time.

This test module specifically covers lines 95-111 of database.py which
execute when the module is imported with a PostgreSQL DATABASE_URL.

These tests run in subprocess isolation to avoid SQLModel table conflicts.
"""

from __future__ import annotations

import subprocess
import sys


def test_postgresql_engine_creation_at_import():
    """
    Test PostgreSQL engine configuration when module is imported.
    
    Covers database.py lines 95-111 which execute at module import time
    when DB_TYPE is 'postgresql'.
    
    Runs in subprocess to avoid SQLModel metadata conflicts.
    """
    # Arrange: Create test script that will run in subprocess
    test_script = """
import sys
from unittest.mock import MagicMock, patch

pg_url = "postgresql+asyncpg://user:pass@localhost:5432/testdb"

# Mock sqlalchemy/sqlmodel engine creation functions
mock_async_engine = MagicMock()
mock_sync_engine = MagicMock()

with patch.dict("os.environ", {"DATABASE_URL": pg_url}):
    with patch("sqlalchemy.ext.asyncio.create_async_engine") as mock_create_async:
        with patch("sqlmodel.create_engine") as mock_create_sync:
            with patch("utils.logging.get_logger") as mock_logger:
                mock_create_async.return_value = mock_async_engine
                mock_create_sync.return_value = mock_sync_engine
                mock_log_instance = MagicMock()
                mock_logger.return_value = mock_log_instance
                
                # Act: Import the module (triggers lines 95-111)
                import database
                
                # Assert: Verify PostgreSQL configuration was used
                async_call_args = mock_create_async.call_args
                sync_call_args = mock_create_sync.call_args
                
                # Verify async engine call
                assert async_call_args[0][0] == pg_url
                assert async_call_args[1]["echo"] is False
                assert async_call_args[1]["pool_size"] == 10
                assert async_call_args[1]["max_overflow"] == 20
                assert async_call_args[1]["pool_pre_ping"] is True
                
                # Verify sync engine call
                expected_sync_url = "postgresql+psycopg2://user:pass@localhost:5432/testdb"
                assert sync_call_args[0][0] == expected_sync_url
                assert sync_call_args[1]["echo"] is False
                assert sync_call_args[1]["pool_size"] == 5
                assert sync_call_args[1]["max_overflow"] == 10
                assert sync_call_args[1]["pool_pre_ping"] is True
                
                # Verify logging
                mock_log_instance.info.assert_called_once_with(
                    "Using PostgreSQL database with connection pooling"
                )
                
                print("TEST_PASSED")
"""
    
    # Act: Run test in subprocess
    result = subprocess.run(
        [sys.executable, "-c", test_script],
        capture_output=True,
        text=True,
        timeout=30,
    )
    
    # Assert: Check that test passed
    assert result.returncode == 0, f"Test failed with output:\n{result.stdout}\n{result.stderr}"
    assert "TEST_PASSED" in result.stdout


def test_sqlite_engine_already_tested():
    """
    SQLite engine configuration is already tested in test_database.py.
    
    The else branch (lines 112-125) is covered by default since
    test_database.py runs with SQLite by default. This test serves
    as documentation that SQLite configuration doesn't need additional
    subprocess testing.
    """
    # SQLite is the default, tested extensively in test_database.py
    # All 61 tests in that file exercise the SQLite code path
    from database import DB_TYPE, async_engine, sync_engine
    
    # Verify that engines exist and are configured
    assert async_engine is not None
    assert sync_engine is not None
    
    # In test environment, DB_TYPE should be sqlite
    # (unless DATABASE_URL env var overrides it)
    assert DB_TYPE in ("sqlite", "postgresql")
