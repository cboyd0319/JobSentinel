-- Add hidden column for user-dismissed jobs
ALTER TABLE jobs ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

-- Index for filtering out hidden jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_hidden ON jobs(hidden);
