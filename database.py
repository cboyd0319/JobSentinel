#!/usr/bin/env python3
"""Entry point wrapper for database module."""

import sys
from pathlib import Path

project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Re-export specific items from src.database for backward compatibility
from src.database import (
    Job,
    init_db,
    get_job_by_hash,
    add_job,
    get_jobs_for_digest,
    mark_jobs_digest_sent,
    mark_job_alert_sent,
    get_database_stats,
    cleanup_old_jobs
)

if __name__ == "__main__":
    print("Database module - use as import, not direct execution")
