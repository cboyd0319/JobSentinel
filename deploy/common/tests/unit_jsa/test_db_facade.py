from __future__ import annotations

import asyncio
from pathlib import Path

from jsa.db import get_stats_sync, init_database, override_database_url_for_testing


def test_db_facade_init_and_stats(tmp_path: Path):
    # Use file-backed SQLite so async and sync see the same database
    dbfile = tmp_path / "t.sqlite"
    url = f"sqlite+aiosqlite:///{dbfile}"
    override_database_url_for_testing(url)

    # Initialize tables
    asyncio.run(init_database())

    # Fetch stats; keys should exist with integer-like values
    stats = get_stats_sync()
    assert set(["total_jobs", "recent_jobs_24h", "high_score_jobs", "last_updated"]).issubset(
        stats.keys()
    )
