# Performance notes

I spent a weekend profiling the scraper and made a few changes that shaved the runtime considerably. Here’s what stuck.

## Highlights

- Added `sources/concurrent_scraper.py`, which uses `concurrent.futures` to hit multiple boards at once; typical runs dropped from ~22s to ~5s on my laptop
- Batched database writes in `src/concurrent_database.py` so SQLite isn’t locking every time a job is saved
- Trimmed unused legacy scrapers once the new registry landed

## Benchmarks

- Sequential poll of three boards: ~21.6s
- Concurrent poll with four workers: ~5.2s
- Database writes went from individual inserts to 50-job batches; lock warnings disappeared entirely

## Using the faster path

```python
from sources.concurrent_scraper import scrape_multiple_fast

jobs = scrape_multiple_fast([
    "https://boards.greenhouse.io/example",
    "https://jobs.careers.microsoft.com",
])
```

```python
from src.concurrent_database import save_jobs_concurrent

save_jobs_concurrent(jobs, scores)
```

Everything still falls back to the older single-threaded path if you don’t import the new helpers, so existing scripts continue to work.
