-- Local metadata ledger for optional external source requests.
-- Stores only minimized request categories, never raw saved titles, locations,
-- notes, resumes, salary floors, or full source links.

CREATE TABLE IF NOT EXISTS source_request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    endpoint_host TEXT,
    title_count INTEGER NOT NULL DEFAULT 0,
    has_location INTEGER NOT NULL DEFAULT 0 CHECK(has_location IN (0, 1)),
    remote_only INTEGER NOT NULL DEFAULT 0 CHECK(remote_only IN (0, 1)),
    result_limit INTEGER NOT NULL DEFAULT 0,
    outcome TEXT NOT NULL DEFAULT 'started' CHECK(outcome IN ('started', 'success', 'failure', 'timeout')),
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_source_request_log_source_time
    ON source_request_log(source, sent_at DESC);
