-- Add post_interview_notes column to interviews table
-- This stores notes taken after an interview is completed (reflections, feedback received, etc.)

ALTER TABLE interviews ADD COLUMN post_interview_notes TEXT;
