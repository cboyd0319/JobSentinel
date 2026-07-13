-- Align screening answer answer_type values with the current UI.
--
-- Older schema allowed boolean, multiple_choice, and number. The UI now uses
-- yes_no, select, textarea, and text. SQLite cannot drop CHECK constraints in
-- place, so recreate the table and preserve all existing usage metrics.

PRAGMA foreign_keys = OFF;

CREATE TABLE screening_answers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_pattern TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_type TEXT CHECK(answer_type IN ('text', 'yes_no', 'textarea', 'select')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    times_used INTEGER NOT NULL DEFAULT 0,
    times_modified INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    confidence_score REAL NOT NULL DEFAULT 1.0 CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
    UNIQUE(question_pattern)
);

INSERT INTO screening_answers_new (
    id,
    question_pattern,
    answer,
    answer_type,
    notes,
    created_at,
    updated_at,
    times_used,
    times_modified,
    last_used_at,
    confidence_score
)
SELECT
    id,
    question_pattern,
    answer,
    CASE answer_type
        WHEN 'boolean' THEN 'yes_no'
        WHEN 'multiple_choice' THEN 'select'
        WHEN 'number' THEN 'text'
        WHEN 'yes_no' THEN 'yes_no'
        WHEN 'textarea' THEN 'textarea'
        WHEN 'select' THEN 'select'
        ELSE 'text'
    END,
    notes,
    created_at,
    updated_at,
    times_used,
    times_modified,
    last_used_at,
    confidence_score
FROM screening_answers;

DROP TABLE screening_answers;
ALTER TABLE screening_answers_new RENAME TO screening_answers;

CREATE INDEX IF NOT EXISTS idx_screening_answers_confidence_score
    ON screening_answers(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_screening_answers_last_used_at
    ON screening_answers(last_used_at DESC);

PRAGMA foreign_keys = ON;
