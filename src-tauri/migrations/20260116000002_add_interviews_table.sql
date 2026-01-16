-- Add interviews table for tracking interview schedules
CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    interview_type TEXT NOT NULL DEFAULT 'phone', -- phone, technical, onsite, behavioral, final
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT, -- For in-person or video link
    interviewer_name TEXT,
    interviewer_title TEXT,
    notes TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    outcome TEXT, -- passed, failed, pending
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Index for efficient querying of upcoming interviews
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at, completed);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
