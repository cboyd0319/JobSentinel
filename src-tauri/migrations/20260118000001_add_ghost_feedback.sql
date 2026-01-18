-- Ghost Job User Feedback
-- Allows users to correct/confirm ghost detection results
-- Future enhancement: use this data to improve the ghost detection algorithm

CREATE TABLE IF NOT EXISTS ghost_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_verdict TEXT NOT NULL CHECK(user_verdict IN ('real', 'ghost')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id)
);

-- Index for fast lookups by job_id
CREATE INDEX IF NOT EXISTS idx_ghost_feedback_job_id ON ghost_feedback(job_id);

-- Index for analytics (count verdicts by type)
CREATE INDEX IF NOT EXISTS idx_ghost_feedback_verdict ON ghost_feedback(user_verdict);
