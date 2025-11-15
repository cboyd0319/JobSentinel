-- Add metadata tables for database integrity tracking and backup management

-- App metadata table for storing integrity check history and configuration
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track integrity check history
CREATE TABLE IF NOT EXISTS integrity_check_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_type TEXT NOT NULL CHECK(check_type IN ('quick', 'full', 'foreign_key')),
    status TEXT NOT NULL CHECK(status IN ('passed', 'failed', 'warning')),
    details TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track backup history
CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_path TEXT NOT NULL,
    reason TEXT,
    size_bytes INTEGER,
    success INTEGER NOT NULL DEFAULT 1, -- Boolean: 1 = success, 0 = failed
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrity_check_log_created_at ON integrity_check_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_log_created_at ON backup_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_metadata_key ON app_metadata(key);

-- Insert initial metadata
INSERT OR IGNORE INTO app_metadata (key, value) VALUES
    ('database_version', '2'),
    ('first_initialized', datetime('now')),
    ('last_integrity_check', datetime('now'));
