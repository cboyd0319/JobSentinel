# Database notes

The project still uses SQLite. Most folks stick with the original schema in `src/database.py`, but I’ve been iterating on a richer table in case we want more metadata later.

## Current table (`src/database.py`)

```sql
CREATE TABLE job (
    id INTEGER PRIMARY KEY,
    hash VARCHAR UNIQUE,
    title VARCHAR,
    url VARCHAR,
    company VARCHAR,
    location VARCHAR,
    description TEXT,
    score FLOAT,
    score_reasons TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    last_seen DATETIME,
    times_seen INTEGER,
    included_in_digest BOOLEAN,
    digest_sent_at DATETIME,
    immediate_alert_sent BOOLEAN,
    alert_sent_at DATETIME
);
```

That table is enough for alerts, digests, and deduping.

## Experimental table (`src/unified_database.py`)

When I need richer data (salary, seniority, job board name, etc.) I use the `unifiedjob` table. It keeps all the legacy fields and adds optional columns for things like work arrangement, salary bands, and skills. Everything is still stored in SQLite so it stays easy to ship.

If you want to play with the extended schema, write to both tables during development so nothing breaks for existing users:

```python
from src.database import save_job
from src.unified_database import save_unified_job

save_job(job_data, score)
save_unified_job(job_data, score)
```

JSON-ish fields are stored as strings because SQLite doesn’t have a native array type. Convert to and from `json.dumps`/`json.loads` at the edges.

Questions about migrations or data retention? Open an issue and I’m happy to walk through it.
