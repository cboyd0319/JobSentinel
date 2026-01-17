-- Saved Searches table
-- Migrated from localStorage: jobsentinel_saved_searches
-- No 10-item cap like localStorage version had
CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    -- Filter settings stored as JSON for flexibility
    sort_by TEXT NOT NULL DEFAULT 'score-desc',
    score_filter TEXT NOT NULL DEFAULT 'all',
    source_filter TEXT NOT NULL DEFAULT 'all',
    remote_filter TEXT NOT NULL DEFAULT 'all',
    bookmark_filter TEXT NOT NULL DEFAULT 'all',
    notes_filter TEXT NOT NULL DEFAULT 'all',
    posted_date_filter TEXT DEFAULT 'all',
    salary_min_filter INTEGER,
    salary_max_filter INTEGER,
    ghost_filter TEXT DEFAULT 'all',
    text_search TEXT,
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);

-- Index for sorting by last used
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used ON saved_searches(last_used_at DESC);

-- Search History table (for autocomplete)
-- Migrated from localStorage: jobsentinel_search_history
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL UNIQUE,
    use_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast autocomplete
CREATE INDEX IF NOT EXISTS idx_search_history_last_used ON search_history(last_used_at DESC);
