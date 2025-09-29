# Database Schema Evolution Guide

## Overview

The database schema has been enhanced to support rich metadata from multiple job board platforms while maintaining backward compatibility with existing applications.

## Schema Evolution

### Legacy Schema (`src/database.py`)

**Basic job tracking with essential fields:**

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

### Enhanced Schema (`src/enhanced_database.py`)

**Added fields for Greenhouse job boards:**

- Department and team information
- Salary ranges and compensation
- Technical skills and requirements
- Employment type and work arrangement

### Unified Schema (`src/unified_database.py`)

**Comprehensive schema supporting all job board types:**

```sql
CREATE TABLE unifiedjob (
    -- Core fields (backward compatible)
    id INTEGER PRIMARY KEY,
    hash VARCHAR UNIQUE,
    title VARCHAR,
    url VARCHAR,
    company VARCHAR,
    location VARCHAR,
    description TEXT,
    score FLOAT DEFAULT 0.0,
    score_reasons TEXT,

    -- Timestamps
    created_at DATETIME,
    updated_at DATETIME,
    last_seen DATETIME,
    times_seen INTEGER DEFAULT 1,

    -- Notifications
    included_in_digest BOOLEAN DEFAULT FALSE,
    digest_sent_at DATETIME,
    immediate_alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at DATETIME,

    -- Job Board Identification
    job_board VARCHAR,              -- "greenhouse", "microsoft_api", "spacex_api"
    external_job_id VARCHAR,        -- Job ID from source system
    requisition_id VARCHAR,         -- Posting/requisition ID

    -- Job Categorization
    department VARCHAR,             -- "Engineering", "Sales", "Marketing"
    team VARCHAR,                   -- Specific team within department
    seniority_level VARCHAR,        -- "Junior", "Senior", "Staff", "Principal"

    -- Employment Details
    employment_type VARCHAR,        -- "Full-time", "Part-time", "Contract"
    work_arrangement VARCHAR,       -- "Remote", "Hybrid", "On-site"
    experience_required VARCHAR,    -- "2-5 years", "5+ years"

    -- Compensation
    salary_min INTEGER,             -- Minimum salary
    salary_max INTEGER,             -- Maximum salary
    salary_currency VARCHAR,        -- "USD", "EUR", "GBP"
    salary_frequency VARCHAR,       -- "yearly", "monthly", "hourly"
    equity_offered BOOLEAN,         -- Stock options available
    benefits_summary TEXT,          -- JSON string of benefits

    -- Skills and Requirements
    required_skills TEXT,           -- JSON array of required skills
    preferred_skills TEXT,          -- JSON array of preferred skills
    technologies TEXT,              -- JSON array of technologies
    education_required VARCHAR,     -- Education requirements
    certifications TEXT,            -- Required certifications

    -- Source Metadata
    posting_date DATETIME,          -- When originally posted
    last_updated_source DATETIME,   -- Last updated at source
    application_deadline DATETIME,
    is_featured BOOLEAN,            -- Sponsored/featured listing

    -- Application Process
    application_url VARCHAR,        -- Direct application link
    requires_cover_letter BOOLEAN,
    requires_portfolio BOOLEAN,
    application_process TEXT,       -- Process description
    contact_email VARCHAR           -- Hiring contact
);
```

## Field Mapping by Platform

### Greenhouse Jobs (Fivetran, Klaviyo, etc.)

| Field | Source | Example |
|-------|--------|---------|
| `job_board` | Fixed | "greenhouse" |
| `external_job_id` | `job.id` | "7185237003" |
| `requisition_id` | `job.requisition_id` | "JR101670" |
| `department` | `job.departments[0].name` | "Engineering Department" |
| `work_arrangement` | Derived from `job.offices` | "Remote", "Hybrid" |
| `seniority_level` | Derived from `job.title` | "Senior", "Staff" |

### Microsoft API Jobs

| Field | Source | Example |
|-------|--------|---------|
| `job_board` | Fixed | "microsoft_api" |
| `external_job_id` | `job.jobId` | "1860821" |
| `title` | `job.title` | "Senior Product Manager - Azure Storage" |
| `location` | `job.location` | "Redmond, WA" |
| `seniority_level` | Derived from title | "Senior" |

### SpaceX API Jobs

| Field | Source | Example |
|-------|--------|---------|
| `job_board` | Fixed | "spacex_api" |
| `external_job_id` | `job.greenhouseId` | "7647367002" |
| `department` | `job.discipline` | "Production" |
| `title` | `job.title` | "Production Engineer (Starship Electronics)" |
| `location` | `job.location` | "Hawthorne, CA" |

## Data Types and Storage

### JSON Fields

Several fields store JSON arrays as strings for database compatibility:

```python
# Skills storage
required_skills = '["Python", "AWS", "Kubernetes"]'
preferred_skills = '["React", "Docker"]'
technologies = '["Python", "AWS", "Kubernetes", "React", "Docker"]'

# Benefits storage
benefits_summary = '["Health Insurance", "401k", "Unlimited PTO"]'
```

### Datetime Fields

All datetime fields use UTC timezone:

```python
from datetime import datetime, timezone

posting_date = datetime.now(timezone.utc)
```

## Migration Strategy

### Phase 1: Parallel Databases

Run both old and new schemas in parallel:

```python
# Save to both databases during transition
from src.database import save_job as save_legacy_job
from src.unified_database import save_unified_job

# Save to legacy database (existing code)
save_legacy_job(job_data, score)

# Save to unified database (new enhanced data)
save_unified_job(job_data, score)
```

### Phase 2: Data Migration

Migrate existing jobs to unified schema:

```python
from src.unified_database import migrate_legacy_jobs

# One-time migration
migrated_count = migrate_legacy_jobs()
print(f"Migrated {migrated_count} jobs")
```

### Phase 3: Full Transition

Switch to unified database exclusively:

```python
# Update main application code
from src.unified_database import save_unified_job, UnifiedJob
```

## Backward Compatibility

The `UnifiedJob` model provides legacy conversion:

```python
unified_job = UnifiedJob(...)
legacy_data = unified_job.to_legacy_job()
```

## Usage Examples

### Saving Enhanced Job Data

```python
from src.unified_database import save_unified_job, init_unified_db

# Initialize database
init_unified_db()

# Save job with enhanced fields
job_data = {
    'hash': 'abc123',
    'title': 'Senior Software Engineer',
    'company': 'example',
    'job_board': 'greenhouse',
    'seniority_level': 'Senior',
    'department': 'Engineering',
    'salary_min': 120000,
    'salary_max': 150000,
    'salary_currency': 'USD',
    'required_skills': '["Python", "AWS"]'
}

saved_job = save_unified_job(job_data, score=8.5)
```

### Querying Enhanced Data

```python
from src.unified_database import get_jobs_by_board, get_job_board_stats

# Get all Microsoft jobs
microsoft_jobs = get_jobs_by_board("microsoft_api")

# Get platform statistics
stats = get_job_board_stats()
print(f"Job boards: {stats}")
# Output: {'greenhouse': 150, 'microsoft_api': 25, 'spacex_api': 75}
```

### Filtering by Enhanced Fields

```python
from src.unified_database import UnifiedJob, unified_engine
from sqlmodel import Session, select

with Session(unified_engine) as session:
    # Find senior engineering jobs with high salaries
    high_paying_senior_jobs = session.exec(
        select(UnifiedJob).where(
            UnifiedJob.seniority_level == "Senior",
            UnifiedJob.department.contains("Engineering"),
            UnifiedJob.salary_min >= 120000
        )
    ).all()
```

## Performance Considerations

### Indexes

Key indexes for performance:

```sql
CREATE INDEX idx_job_board ON unifiedjob(job_board);
CREATE INDEX idx_seniority ON unifiedjob(seniority_level);
CREATE INDEX idx_department ON unifiedjob(department);
CREATE INDEX idx_salary_range ON unifiedjob(salary_min, salary_max);
CREATE INDEX idx_posting_date ON unifiedjob(posting_date);
```

### Query Optimization

- Use specific indexes for common queries
- Consider partitioning by job_board for large datasets
- Archive old jobs to keep tables manageable

## Future Schema Considerations

### Potential Additions

As new job boards are integrated:

- **Remote work policies**: Detailed remote work arrangements
- **Interview process**: Multi-stage interview descriptions
- **Team composition**: Team size and structure information
- **Growth path**: Career progression opportunities
- **Company metrics**: Company size, funding stage, culture scores

### Extensibility

The schema supports adding new fields without breaking existing code:

```python
# Adding new fields is non-breaking
class UnifiedJob(SQLModel, table=True):
    # ... existing fields ...

    # New fields (always optional)
    company_size: Optional[str] = None
    funding_stage: Optional[str] = None
    culture_score: Optional[float] = None
```