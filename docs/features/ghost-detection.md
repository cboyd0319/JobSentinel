# Ghost Job Detection

**Version:** 1.4.0
**Status:** Production Ready
**Last Updated:** January 17, 2026

Ghost jobs are job postings that aren't genuine opportunities - they may be already filled, posted to collect resumes, or simply abandoned. JobSentinel's Ghost Detection feature helps you focus on real opportunities by identifying and flagging suspicious listings.

## Overview

The Ghost Detection system analyzes each job posting against multiple signals to calculate a "ghost score" from 0.0 (definitely real) to 1.0 (likely ghost). Jobs scoring 0.5 or higher are flagged with visual indicators.

## Detection Signals

### 1. Stale Postings (Weight: 0.25)
Jobs posted more than 60 days ago are increasingly likely to be filled or abandoned.

| Age | Score Impact |
|-----|--------------|
| < 30 days | 0.0 |
| 30-60 days | 0.1 |
| 60-90 days | 0.2 |
| > 90 days | 0.25 |

### 2. Frequent Reposts (Weight: 0.2)
Jobs that are repeatedly reposted suggest the company isn't seriously hiring.

| Repost Count | Score Impact |
|--------------|--------------|
| 0-1 | 0.0 |
| 2-3 | 0.1 |
| 4-5 | 0.15 |
| 6+ | 0.2 |

### 3. Generic/Vague Descriptions (Weight: 0.15)
Legitimate job postings typically have detailed, specific descriptions.

**Detected phrases:**
- "Fast-paced environment"
- "Self-starter"
- "Wear many hats"
- "Rockstar" / "Ninja" / "Guru"
- "Competitive salary" (without specifics)
- "Great opportunity"

### 4. Missing Salary Information (Weight: 0.1)
While not definitive, missing salary information can indicate less serious postings.

### 5. Vague Titles (Weight: 0.15)
Overly generic titles often indicate placeholder or mass-posted jobs.

**Flagged patterns:**
- Single-word titles (e.g., "Developer")
- Titles with only "I", "II", "III" suffixes
- "Various Positions"
- "Multiple Openings"

### 6. Excessive Company Openings (Weight: 0.1)
Companies with unusually high numbers of open positions may be posting speculatively.

| Open Positions | Score Impact |
|----------------|--------------|
| < 50 | 0.0 |
| 50-100 | 0.05 |
| 100-200 | 0.08 |
| 200+ | 0.1 |

### 7. Unrealistic Requirements (Weight: 0.15)
Job postings requesting excessive experience for entry-level positions.

**Detected patterns:**
- "10+ years experience" for standard roles
- "Entry level" combined with "5+ years"
- Impossible technology stacks (e.g., "15 years Kubernetes experience")

## Confidence Scoring

The system also tracks confidence in its analysis based on available data:

| Data Available | Base Confidence |
|----------------|-----------------|
| Title only | 0.3 |
| + Description | 0.5 |
| + Salary info | 0.7 |
| + Company history | 0.8 |
| + Repost data | 0.9 |

## User Interface

### Dashboard Filter

The Dashboard includes a ghost filter dropdown with three options:
- **All Jobs** - Show everything (default)
- **Real Jobs Only** - Hide jobs with ghost score >= 0.5
- **Ghost Jobs** - Show only flagged jobs for review

### Ghost Indicator

Flagged jobs display a ghost icon with severity-based coloring:

| Ghost Score | Severity | Color |
|-------------|----------|-------|
| 0.5 - 0.59 | Low | Yellow |
| 0.6 - 0.74 | Medium | Orange |
| 0.75+ | High | Red |

Hovering over the indicator shows a tooltip with:
- Confidence percentage
- Top 3 reasons for the ghost score

### Job Card Integration

Ghost indicators appear in the job card metadata row, positioned before the location.

## Database Schema

### Jobs Table Additions

```sql
ALTER TABLE jobs ADD COLUMN ghost_score REAL;
ALTER TABLE jobs ADD COLUMN ghost_reasons TEXT;  -- JSON array
ALTER TABLE jobs ADD COLUMN first_seen TEXT;
ALTER TABLE jobs ADD COLUMN repost_count INTEGER DEFAULT 0;
```

### Repost History Table

```sql
CREATE TABLE job_repost_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    repost_count INTEGER DEFAULT 1,
    UNIQUE(company, title, source)
);
```

## API Reference

### Tauri Commands

#### `get_ghost_jobs`
Retrieve jobs flagged as potential ghosts.

```typescript
invoke('get_ghost_jobs', {
  threshold: 0.5,  // Optional, default 0.5
  limit: 100       // Optional, default 100
})
```

#### `get_ghost_statistics`
Get aggregate ghost detection statistics.

```typescript
invoke('get_ghost_statistics')
// Returns: { total_analyzed, ghosts, warnings, real, average_score }
```

#### `get_recent_jobs_filtered`
Get recent jobs with optional ghost filtering.

```typescript
invoke('get_recent_jobs_filtered', {
  limit: 50,
  exclude_ghost: true  // Filter out ghost jobs
})
```

### Ghost Reasons Format

The `ghost_reasons` field stores a JSON array:

```json
[
  {
    "category": "stale",
    "description": "Posted 75 days ago",
    "weight": 0.2,
    "severity": "medium"
  },
  {
    "category": "generic_description",
    "description": "Contains vague phrases like 'fast-paced environment'",
    "weight": 0.15,
    "severity": "low"
  }
]
```

## Configuration

Ghost detection runs automatically during each scraping cycle. Currently, thresholds are not user-configurable, but this is planned for a future release.

### Planned Configuration Options (v1.5+)

```json
{
  "ghost_detection": {
    "enabled": true,
    "threshold": 0.5,
    "auto_hide_ghosts": false,
    "stale_days": 60,
    "max_company_openings": 50
  }
}
```

## Performance

- Ghost analysis adds ~2ms per job during scraping
- Repost tracking queries are indexed for fast lookups
- UI filtering is done client-side for instant response

## Limitations

1. **False Positives**: Some legitimate jobs may be flagged, especially from large companies or staffing agencies
2. **Data Dependent**: Accuracy improves with more historical data
3. **Source Variation**: Different job boards provide varying levels of detail

## Best Practices

1. **Don't auto-dismiss**: Use ghost scores as one factor, not the only factor
2. **Review periodically**: Check flagged jobs occasionally for false positives
3. **Trust high scores**: Jobs scoring 0.8+ are very likely ghosts
4. **Consider context**: Staffing agencies naturally have many openings

## Related Documentation

- [Application Tracking System](./application-tracking.md)
- [Job Scrapers](./scrapers.md)
- [Dashboard Guide](../user/QUICK_START.md)
