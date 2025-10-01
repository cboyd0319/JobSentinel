# Database Schema & Storage

The project uses SQLite for local storage. All data stays on your machine unless you deploy to cloud (where it uses Cloud Storage for backups).

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

---

## User Profile Storage

User preferences and profile data are stored in two places:

- **Primary:** `data/jobs_unified.sqlite` in the `UserProfile` table (SQLModel/SQLite)
- **Backup:** `config/user_profile.json` for version control and manual editing

```python
profile = load_user_profile()      # reads from SQLite
dump_user_profile(profile)         # writes JSON backup
```

The SQLite table stores: name, email, skills, seniority, salary range, work preferences, and notification thresholds. JSON mirrors these fields for easy editing.

**Why two copies?**
- SQLite: Fast lookups for the matcher
- JSON: Human-readable, easy to backup/sync

**Privacy:** Everything stays local. No cloud sync. Delete both files anytime for a fresh start.

---

Questions about migrations or data retention? Open an issue.
