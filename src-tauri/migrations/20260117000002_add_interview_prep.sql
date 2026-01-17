-- Interview Prep Checklists table
-- Migrated from localStorage: jobsentinel_interview_prep_{id}
CREATE TABLE IF NOT EXISTS interview_prep_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL CHECK (item_id IN ('research', 'review_jd', 'prepare_questions', 'star_stories', 'tech_review')),
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    UNIQUE(interview_id, item_id)
);

-- Index for fast lookup by interview
CREATE INDEX IF NOT EXISTS idx_interview_prep_interview_id ON interview_prep_checklists(interview_id);

-- Interview Follow-up Reminders table
-- Migrated from localStorage: jobsentinel_interview_followups
CREATE TABLE IF NOT EXISTS interview_followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
    thank_you_sent INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT
);

-- Index for fast lookup by interview
CREATE INDEX IF NOT EXISTS idx_interview_followups_interview_id ON interview_followups(interview_id);
