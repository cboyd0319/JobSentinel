-- Smart Screening Answer Learning
-- Adds learning capabilities to track answer usage and improve suggestions over time

-- Add usage tracking columns to existing screening_answers table
ALTER TABLE screening_answers ADD COLUMN times_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE screening_answers ADD COLUMN times_modified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE screening_answers ADD COLUMN last_used_at TEXT;
ALTER TABLE screening_answers ADD COLUMN confidence_score REAL NOT NULL DEFAULT 1.0;

-- History of screening answer usage
-- Tracks every time an answer is used and whether the user modified it
CREATE TABLE IF NOT EXISTS screening_answer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screening_answer_id INTEGER, -- NULL if no pattern matched (manual answer)
    question_text TEXT NOT NULL, -- Original question text as shown to user
    question_normalized TEXT NOT NULL, -- Normalized for fuzzy matching
    answer_filled TEXT NOT NULL, -- Answer that was auto-filled
    was_modified INTEGER NOT NULL DEFAULT 0, -- Boolean: 1 = user changed it, 0 = kept as-is
    modified_to TEXT, -- The modified answer (NULL if not modified)
    job_hash TEXT, -- Which job this was for (optional)
    application_attempt_id INTEGER, -- Link to application attempt (optional)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (screening_answer_id) REFERENCES screening_answers(id) ON DELETE SET NULL,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE SET NULL,
    FOREIGN KEY (application_attempt_id) REFERENCES application_attempts(id) ON DELETE SET NULL
);

-- Learned answers from user modifications
-- When users consistently modify an answer, we can create new patterns
CREATE TABLE IF NOT EXISTS screening_learned_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_pattern TEXT NOT NULL, -- Auto-generated pattern from similar questions
    source_question_texts TEXT NOT NULL, -- JSON array of questions that led to this pattern
    learned_answer TEXT NOT NULL, -- The answer users consistently use
    confidence_score REAL NOT NULL DEFAULT 0.5, -- Lower than manual patterns initially
    times_used INTEGER NOT NULL DEFAULT 0,
    times_modified INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(question_pattern)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_screening_answer_history_question_normalized
    ON screening_answer_history(question_normalized);
CREATE INDEX IF NOT EXISTS idx_screening_answer_history_screening_answer_id
    ON screening_answer_history(screening_answer_id);
CREATE INDEX IF NOT EXISTS idx_screening_answer_history_created_at
    ON screening_answer_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screening_answers_confidence_score
    ON screening_answers(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_screening_answers_last_used_at
    ON screening_answers(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_screening_learned_answers_confidence
    ON screening_learned_answers(confidence_score DESC);

-- Backfill: Set confidence_score = 1.0 for all existing manual answers
-- (Already done by DEFAULT constraint, but this ensures consistency)
UPDATE screening_answers SET confidence_score = 1.0 WHERE confidence_score IS NULL;
