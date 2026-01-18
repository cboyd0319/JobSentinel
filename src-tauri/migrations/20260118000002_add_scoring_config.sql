-- Scoring Configuration table
-- Single-row table for user-configurable scoring weights
CREATE TABLE IF NOT EXISTS scoring_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
    -- Weight values (must sum to ~1.0)
    skills_weight REAL NOT NULL DEFAULT 0.40,
    salary_weight REAL NOT NULL DEFAULT 0.25,
    location_weight REAL NOT NULL DEFAULT 0.20,
    company_weight REAL NOT NULL DEFAULT 0.10,
    recency_weight REAL NOT NULL DEFAULT 0.05,
    -- Timestamps
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default weights if not exists
INSERT OR IGNORE INTO scoring_config (
    id,
    skills_weight,
    salary_weight,
    location_weight,
    company_weight,
    recency_weight
) VALUES (
    1,
    0.40,  -- Skills: 40%
    0.25,  -- Salary: 25%
    0.20,  -- Location: 20%
    0.10,  -- Company: 10%
    0.05   -- Recency: 5%
);
