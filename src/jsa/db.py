"""
Typed database facade layered over src.database.

Goals:
- Provide a small, explicit API for database access from new code
- Support testability via an override function for the database URL

Security: URLs are treated as configuration; this module does not log secrets.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import Session, create_engine

import src.database as legacy_db


# Re-export Job model for convenience (read-only usage in new code)
Job = legacy_db.Job


def _derive_sync_url(db_url: str) -> str:
    """Convert async driver URLs to sync driver URLs.

    Examples:
      - sqlite+aiosqlite:///file.db -> sqlite:///file.db
    """
    # For SQLite, convert async driver to sync
    if db_url.startswith("sqlite+aiosqlite"):
        return db_url.replace("sqlite+aiosqlite", "sqlite", 1)
    return db_url


async def init_database() -> None:
    """Initialize database tables using legacy async path."""
    from typing import Any, cast

    await cast(Any, legacy_db).init_db()


def get_stats_sync() -> dict[str, object]:
    """Return basic stats using the synchronous engine (UI-safe)."""
    return legacy_db.get_database_stats_sync()


@contextmanager
def open_session() -> Iterator[Session]:
    """Open a synchronous session; use as context manager."""
    with legacy_db.get_sync_session() as session:
        yield session


# Alias for compatibility with tracker blueprint
get_session_context = open_session


def override_database_url_for_testing(db_url: str) -> None:
    """Override the legacy module's engines for test isolation.

    Use a file-backed SQLite URL to ensure both async and sync engines
    point to the same store, e.g., sqlite+aiosqlite:///tmp/test.sqlite
    
    Args:
        db_url: Database URL. If using SQLite without async driver,
                will auto-convert to sqlite+aiosqlite://
    """
    from sqlmodel import SQLModel
    from sqlmodel.pool import StaticPool

    # Auto-convert plain sqlite:// to sqlite+aiosqlite:// for testing
    if db_url.startswith("sqlite://") and not db_url.startswith("sqlite+"):
        async_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    else:
        async_url = db_url
    
    sync_url = _derive_sync_url(async_url)

    # Rebind engines in legacy module with StaticPool for in-memory databases
    connect_args = {"check_same_thread": False} if "sqlite" in async_url else {}
    poolclass = StaticPool if ":memory:" in async_url else None
    
    legacy_db.async_engine = create_async_engine(
        async_url, echo=False, connect_args=connect_args, poolclass=poolclass
    )
    legacy_db.sync_engine = create_engine(
        sync_url, echo=False, connect_args=connect_args, poolclass=poolclass
    )

    # Import all models to ensure they're registered with SQLModel metadata
    from jsa.tracker.models import Activity, Contact, Document, TrackedJob  # noqa: F401
    from jsa.web.blueprints.api.auth import APIKey  # noqa: F401

    # Create all tables in the test database
    SQLModel.metadata.create_all(legacy_db.sync_engine)


__all__ = [
    "Job",
    "init_database",
    "get_stats_sync",
    "open_session",
    "get_session_context",
    "override_database_url_for_testing",
]
