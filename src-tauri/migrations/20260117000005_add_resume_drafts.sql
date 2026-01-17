-- Resume drafts table for the interactive resume builder
-- Stores JSON serialized resume data with full CRUD support

CREATE TABLE IF NOT EXISTS resume_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- JSON serialized ResumeData containing all sections
    data TEXT NOT NULL,
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_resume_drafts_updated ON resume_drafts(updated_at DESC);
