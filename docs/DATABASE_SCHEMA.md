# Database Schema Documentation

**Last Updated:** October 14, 2025 - Session 8  
**Database:** PostgreSQL 14+ (asyncpg + psycopg2-binary drivers)

---

## Overview

JobSentinel uses PostgreSQL as the primary database for all job data and tracking. The schema is designed for:

- **Privacy:** All data stored locally on user's machine
- **Performance:** Optimized indexes for common queries
- **Flexibility:** Optional fields and extensible design
- **Referential Integrity:** Foreign key constraints ensure data consistency

---

## Core Tables

### 1. `job` (Primary Job Storage)

**Location:** `src/database.py::Job`  
**Purpose:** Stores all scraped jobs with scoring and tracking metadata

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing job ID |
| `hash` | VARCHAR | UNIQUE, INDEX | Content-based hash for deduplication |
| `title` | VARCHAR | NOT NULL | Job title |
| `company` | VARCHAR | NOT NULL | Company name |
| `location` | VARCHAR | NOT NULL | Job location |
| `url` | VARCHAR | NOT NULL | Job posting URL |
| `description` | TEXT | NULLABLE | Full job description |
| `score` | FLOAT | NOT NULL | Match score (0.0-100.0) |
| `score_reasons` | TEXT | NULLABLE | JSON string of scoring factors |
| **Job Metadata** ||||
| `source` | VARCHAR(50) | INDEX, DEFAULT='unknown' | Source scraper (greenhouse, lever, etc.) |
| `remote` | BOOLEAN | INDEX, DEFAULT=FALSE | Remote work flag |
| `salary_min` | INTEGER | NULLABLE | Minimum salary |
| `salary_max` | INTEGER | NULLABLE | Maximum salary |
| `currency` | VARCHAR(3) | DEFAULT='USD' | Salary currency (ISO 4217) |
| **Timestamps** ||||
| `created_at` | TIMESTAMP | DEFAULT=NOW() | First time job seen |
| `updated_at` | TIMESTAMP | DEFAULT=NOW() | Last time job updated |
| `last_seen` | TIMESTAMP | DEFAULT=NOW() | Last time job observed in scrape |
| `times_seen` | INTEGER | DEFAULT=1 | Number of times job seen |
| **Notification Tracking** ||||
| `included_in_digest` | BOOLEAN | DEFAULT=FALSE | Included in digest email |
| `digest_sent_at` | TIMESTAMP | NULLABLE | When digest was sent |
| `immediate_alert_sent` | BOOLEAN | DEFAULT=FALSE | Immediate alert sent flag |
| `alert_sent_at` | TIMESTAMP | NULLABLE | When alert was sent |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `hash`
- INDEX on `source` (for filtering)
- INDEX on `remote` (for filtering)

**Notes:**
- The `hash` field is computed from `company + title + description[:250]` for deduplication
- Scoring is done by matchers and stored as float (0-100 scale)
- All timestamps use UTC

---

### 2. `tracked_jobs` (Job Application Tracker)

**Location:** `src/jsa/tracker/models.py::TrackedJob`  
**Purpose:** Kanban-style tracking of job applications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing tracker ID |
| `job_id` | INTEGER | FOREIGN KEY → job.id, INDEX | Reference to job table |
| `status` | VARCHAR | INDEX | Application status (see JobStatus enum) |
| `priority` | INTEGER | 0-5 | Priority (0=none, 5=critical) |
| `notes` | TEXT | DEFAULT='' | User notes |
| `added_at` | TIMESTAMP | DEFAULT=NOW() | When added to tracker |
| `updated_at` | TIMESTAMP | DEFAULT=NOW() | Last update |
| `applied_at` | TIMESTAMP | NULLABLE | When application submitted |
| `interview_at` | TIMESTAMP | NULLABLE | Interview date/time |

**JobStatus Enum Values:**
- `bookmarked` - Saved for later
- `applied` - Application submitted
- `interviewing` - In interview process
- `offer` - Offer received
- `rejected` - Application rejected
- `withdrawn` - User withdrew application

**Foreign Keys:**
- `job_id` → `job.id` (CASCADE on delete)

---

### 3. `contacts` (Recruiter/Contact Info)

**Location:** `src/jsa/tracker/models.py::Contact`  
**Purpose:** Store contact information for tracked jobs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing contact ID |
| `job_id` | INTEGER | FOREIGN KEY → tracked_jobs.id, INDEX | Reference to tracked job |
| `name` | VARCHAR | NOT NULL | Contact name |
| `email` | VARCHAR | NULLABLE | Email address |
| `phone` | VARCHAR | NULLABLE | Phone number |
| `role` | VARCHAR | DEFAULT='recruiter' | Role (recruiter, hiring_manager, etc.) |
| `linkedin_url` | VARCHAR | NULLABLE | LinkedIn profile URL |
| `notes` | TEXT | DEFAULT='' | Additional notes |
| `created_at` | TIMESTAMP | DEFAULT=NOW() | When contact added |

**Foreign Keys:**
- `job_id` → `tracked_jobs.id` (CASCADE on delete)

---

### 4. `documents` (Attached Files)

**Location:** `src/jsa/tracker/models.py::Document`  
**Purpose:** Track documents attached to job applications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing document ID |
| `job_id` | INTEGER | FOREIGN KEY → tracked_jobs.id, INDEX | Reference to tracked job |
| `filename` | VARCHAR | NOT NULL | Original filename |
| `doc_type` | VARCHAR | NOT NULL | Document type (resume, cover_letter, etc.) |
| `file_path` | VARCHAR | NOT NULL | Relative path in user's data directory |
| `file_size` | INTEGER | DEFAULT=0 | File size in bytes |
| `uploaded_at` | TIMESTAMP | DEFAULT=NOW() | When document uploaded |

**Foreign Keys:**
- `job_id` → `tracked_jobs.id` (CASCADE on delete)

---

### 5. `activities` (Activity Timeline)

**Location:** `src/jsa/tracker/models.py::Activity`  
**Purpose:** Timeline of activities for tracked jobs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing activity ID |
| `job_id` | INTEGER | FOREIGN KEY → tracked_jobs.id, INDEX | Reference to tracked job |
| `activity_type` | VARCHAR | NOT NULL | Activity type (email_sent, interview_scheduled, etc.) |
| `description` | TEXT | NOT NULL | Activity description |
| `extra_data` | TEXT | DEFAULT='{}' | JSON metadata |
| `created_at` | TIMESTAMP | INDEX, DEFAULT=NOW() | When activity occurred |

**Foreign Keys:**
- `job_id` → `tracked_jobs.id` (CASCADE on delete)

---

### 6. `api_keys` (API Authentication)

**Location:** `src/jsa/web/blueprints/api/auth.py::APIKey`  
**Purpose:** API key authentication for REST API

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing key ID |
| `key` | VARCHAR | UNIQUE, INDEX | API key (jsa_xxxxx format) |
| `name` | VARCHAR | NOT NULL | Descriptive name for key |
| `created_at` | TIMESTAMP | DEFAULT=NOW() | When key created |
| `last_used_at` | TIMESTAMP | NULLABLE | Last time key used |
| `is_active` | BOOLEAN | DEFAULT=TRUE | Whether key is active |

---

## Database Initialization

### Async Initialization

```python
from src.database import init_db

await init_db()
```

This function:
1. Creates async and sync engines
2. Imports all model classes
3. Calls `SQLModel.metadata.create_all()` on both engines
4. Creates tables with proper foreign key constraints

### Model Registration

All models must be imported before calling `init_db()`:

```python
# In src/database.py::init_db()
from jsa.tracker.models import Activity, Contact, Document, TrackedJob
from jsa.web.blueprints.api.auth import APIKey
```

This ensures SQLModel metadata includes all tables.

---

## Database Engines

### Async Engine (Primary)

**Driver:** `asyncpg`  
**URL Format:** `postgresql+asyncpg://user:pass@host:port/dbname`  
**Usage:** All async operations (scrapers, jobs commands)

```python
from src.database import async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

async with AsyncSession(async_engine) as session:
    # async operations
```

### Sync Engine (Secondary)

**Driver:** `psycopg2-binary`  
**URL Format:** `postgresql://user:pass@host:port/dbname`  
**Usage:** Flask web UI, API endpoints

```python
from src.database import sync_engine
from sqlmodel import Session

with Session(sync_engine) as session:
    # sync operations
```

---

## Connection Pooling

### Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_POOL_SIZE` | 10 | Connection pool size |
| `DB_POOL_MAX_OVERFLOW` | 5 | Max overflow connections |
| `DB_POOL_PRE_PING` | true | Test connections before use |

### Pool Classes

- **Async:** `AsyncAdaptedQueuePool` (SQLAlchemy)
- **Sync:** `QueuePool` (SQLAlchemy)

Optimized for single-user local deployment.

---

## Migration Notes

### From SQLite to PostgreSQL

If migrating from SQLite:

1. Export data: `sqlite3 old.db .dump > data.sql`
2. Convert syntax (SQLite → PostgreSQL)
3. Import: `psql -U jobsentinel -d jobsentinel < data.sql`

### Schema Migrations

For schema changes:

1. Update model in `src/database.py` or tracker models
2. Create migration script in `scripts/migrations/`
3. Run migration: `python scripts/migrations/add_field_xxx.py`
4. Update `docs/DATABASE_SCHEMA.md` (this file)

---

## Testing

### Test Database Override

For testing, use in-memory SQLite:

```python
from jsa.db import override_database_url_for_testing

override_database_url_for_testing("sqlite:///:memory:")
```

This function:
- Auto-converts `sqlite://` to `sqlite+aiosqlite://`
- Creates both async and sync engines
- Uses `StaticPool` for in-memory databases
- Creates all tables automatically

---

## Deprecated Modules

### ⚠️ `src/unified_database.py` - DEPRECATED

**Status:** Maintained for backward compatibility only  
**DO NOT USE** for new code

**Issues:**
- UnifiedJob has 30+ fields (too many)
- Caused schema confusion with multiple Job models
- Uses SQLite instead of PostgreSQL

**Migration:**
- Use `src.database.Job` instead
- Use `jsa.tracker.models.TrackedJob` for extended tracking

---

## Best Practices

### 1. Always Use Transactions

```python
async with AsyncSession(async_engine) as session:
    # operations
    await session.commit()
```

### 2. Handle Unique Constraint Violations

```python
from sqlalchemy.exc import IntegrityError

try:
    await add_job(job_data)
except IntegrityError:
    # Job already exists (hash collision)
    logger.debug("Duplicate job, updating instead")
```

### 3. Use Indexes for Filters

- `source` - indexed for filtering by scraper
- `remote` - indexed for filtering remote jobs
- `score` - use for sorting, but not indexed (rare filter)

### 4. Clean Up Old Jobs

Run periodic cleanup:

```python
from src.database import cleanup_old_jobs

await cleanup_old_jobs(days_to_keep=90)
```

---

## Schema Evolution

### Version History

- **v0.5.0:** SQLite with basic Job model (13 fields)
- **v0.6.0:** PostgreSQL with extended Job model (18 fields)
  - Added: source, remote, salary_min, salary_max, currency
  - Added: TrackedJob, Contact, Document, Activity models
  - Added: Foreign key constraints for referential integrity
- **v0.6.0+:** Deprecated unified_database.py

### Future Enhancements

Planned for v0.7.0+:

- [ ] Job tags table (many-to-many)
- [ ] Application attachments (binary storage)
- [ ] Interview scheduling table
- [ ] Offer negotiation tracking
- [ ] Full-text search indexes
- [ ] Materialized views for analytics

---

## Troubleshooting

### Connection Issues

1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Test connection: `psql -U jobsentinel -d jobsentinel`

### Foreign Key Violations

- Ensure parent record exists before creating child
- Use CASCADE on delete for automatic cleanup

### Performance Issues

- Add indexes on frequently filtered columns
- Use EXPLAIN ANALYZE for slow queries
- Increase pool size for concurrent operations

---

**For questions or issues, see:**
- `docs/DOCUMENTATION_INDEX.md` - All documentation
- `docs/BEST_PRACTICES.md` - Coding guidelines
- `docs/TROUBLESHOOTING.md` - Common issues

**Schema maintained by:** @cboyd0319  
**Last reviewed:** October 14, 2025
