# Schema Mismatch Issue

**Discovered:** October 13, 2025  
**Severity:** HIGH - Blocks FastAPI router testing  
**Status:** NEEDS FIX

## Problem

The FastAPI jobs router (`src/jsa/fastapi_app/routers/jobs.py`) expects Job fields that don't exist in the database model (`src/database.py`):

### Missing Fields in Database:
- `source` (str) - Job board source
- `remote` (bool) - Whether job is remote
- `salary_min` (int) - Minimum salary
- `salary_max` (int) - Maximum salary
- `currency` (str) - Salary currency

### Current Database Schema:
```python
class Job(SQLModel, table=True):
    id: int | None
    hash: str
    title: str
    url: str
    company: str
    location: str
    description: str | None
    score: float
    score_reasons: str | None
    created_at: datetime
    updated_at: datetime
    last_seen: datetime
    times_seen: int
    included_in_digest: bool
    digest_sent_at: datetime | None
    immediate_alert_sent: bool
    alert_sent_at: datetime | None
```

### Router Expectations:
```python
class JobCreate(BaseModel):
    # ... existing fields ...
    source: str = Field(default="manual", max_length=50)
    remote: bool = Field(default=False)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", max_length=3)
```

## Impact

- **FastAPI jobs router cannot be tested** - database queries will fail
- **Router may fail in production** if it tries to access these fields
- **Data loss** - job board scrapers may collect this data but can't persist it

## Solution Options

### Option 1: Update Database Schema (Recommended)
Add missing fields to `src/database.py`:
```python
class Job(SQLModel, table=True):
    # ... existing fields ...
    source: str = Field(default="manual", max_length=50)
    remote: bool = Field(default=False)
    salary_min: int | None = Field(default=None)
    salary_max: int | None = Field(default=None)
    currency: str = Field(default="USD", max_length=3)
```

Then create migration:
```bash
# If using alembic:
alembic revision --autogenerate -m "Add source, remote, and salary fields to Job"
alembic upgrade head

# Or for testing:
# Drop and recreate tables (DESTRUCTIVE)
```

### Option 2: Update Router to Match Database
Remove fields from router models, but this loses functionality.

### Option 3: Hybrid Approach
Store extra fields in `score_reasons` JSON field temporarily.

## Recommended Action

**UPDATE DATABASE SCHEMA** - These are critical fields for job search functionality.

## Next Steps

1. Add fields to `Job` model in `src/database.py`
2. Create database migration
3. Update FastAPI router tests
4. Verify all scrapers populate new fields
5. Test end-to-end workflow

## Related Files
- `src/database.py` - Database model
- `src/jsa/fastapi_app/routers/jobs.py` - FastAPI router
- `tests/unit_jsa/test_fastapi_jobs.py` - Test file (currently failing)
