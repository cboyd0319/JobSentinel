-- Add bookmarked column for user-favorited jobs
ALTER TABLE jobs ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0;

-- Index for filtering bookmarked jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_bookmarked ON jobs(bookmarked) WHERE bookmarked = 1;
