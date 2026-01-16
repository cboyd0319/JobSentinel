-- Fix interviews table schema to match ATS code expectations
-- The original migration (20251115010000) created columns that don't match the code

-- Add missing columns
ALTER TABLE interviews ADD COLUMN interviewer_name TEXT;
ALTER TABLE interviews ADD COLUMN interviewer_title TEXT;
ALTER TABLE interviews ADD COLUMN notes TEXT;
ALTER TABLE interviews ADD COLUMN outcome TEXT;
ALTER TABLE interviews ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Copy data from old columns to new ones where applicable
UPDATE interviews SET interviewer_name = interviewer_names WHERE interviewer_names IS NOT NULL;
UPDATE interviews SET notes = COALESCE(preparation_notes, '') || CASE WHEN feedback_notes IS NOT NULL THEN char(10) || feedback_notes ELSE '' END;

-- Create indexes matching the ATS code expectations
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at, completed);
