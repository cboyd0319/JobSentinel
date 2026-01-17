-- Ghost Job Detection
-- Adds scoring for fake, stale, or misleading job listings

-- Add ghost detection columns to jobs table
ALTER TABLE jobs ADD COLUMN ghost_score REAL;  -- 0.0 (likely real) to 1.0 (likely ghost)
ALTER TABLE jobs ADD COLUMN ghost_reasons TEXT;  -- JSON array of detection reasons
ALTER TABLE jobs ADD COLUMN first_seen TEXT;  -- First time this job was discovered
ALTER TABLE jobs ADD COLUMN repost_count INTEGER DEFAULT 0;  -- Number of times job has been reposted

-- Create index for ghost score filtering
CREATE INDEX IF NOT EXISTS idx_jobs_ghost_score ON jobs(ghost_score) WHERE ghost_score IS NOT NULL;

-- Track job repost history (same title+company from same source appearing multiple times)
-- This helps detect "evergreen" job postings that are always open
CREATE TABLE IF NOT EXISTS job_repost_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,  -- Current job hash
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    repost_count INTEGER NOT NULL DEFAULT 1,
    -- Unique constraint: one entry per company+title+source combination
    UNIQUE(company, title, source)
);

-- Indexes for repost history queries
CREATE INDEX IF NOT EXISTS idx_repost_company_title ON job_repost_history(company, title);
CREATE INDEX IF NOT EXISTS idx_repost_source ON job_repost_history(source);
CREATE INDEX IF NOT EXISTS idx_repost_count ON job_repost_history(repost_count DESC);

-- Backfill first_seen from created_at for existing jobs
UPDATE jobs SET first_seen = created_at WHERE first_seen IS NULL;
