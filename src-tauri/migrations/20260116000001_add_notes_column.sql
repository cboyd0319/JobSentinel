-- Add notes column for user personal notes on jobs
ALTER TABLE jobs ADD COLUMN notes TEXT;

-- Full-text search on notes for finding jobs with specific notes
CREATE INDEX IF NOT EXISTS idx_jobs_has_notes ON jobs(notes) WHERE notes IS NOT NULL;
