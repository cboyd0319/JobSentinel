-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash for deduplication (company + title + location + url)
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    url TEXT NOT NULL,
    location TEXT,
    description TEXT,
    score REAL,  -- Match score (0.0 - 1.0)
    score_reasons TEXT,  -- JSON object with score breakdown
    source TEXT NOT NULL,  -- Source scraper ("greenhouse", "lever", "jobswithgpt")
    remote INTEGER,  -- Boolean: 1 = remote, 0 = not remote, NULL = unknown
    salary_min INTEGER,
    salary_max INTEGER,
    currency TEXT DEFAULT 'USD',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    times_seen INTEGER NOT NULL DEFAULT 1,  -- Number of times this job has been seen
    immediate_alert_sent INTEGER NOT NULL DEFAULT 0,  -- Boolean: 1 = alert sent, 0 = no alert
    included_in_digest INTEGER NOT NULL DEFAULT 0  -- Boolean: 1 = included in digest, 0 = not included
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_hash ON jobs(hash);
CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- Create full-text search index for title and description
CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
    title,
    description,
    content=jobs,
    content_rowid=id
);

-- Trigger to keep FTS index in sync with jobs table
CREATE TRIGGER IF NOT EXISTS jobs_ai AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS jobs_au AFTER UPDATE ON jobs BEGIN
    UPDATE jobs_fts
    SET title = new.title, description = new.description
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS jobs_ad AFTER DELETE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.id;
END;
