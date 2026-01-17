-- Cover Letter Templates table
-- Migrated from localStorage: jobsentinel_cover_letter_templates
CREATE TABLE IF NOT EXISTS cover_letter_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'tech', 'creative', 'finance', 'healthcare', 'sales', 'custom')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_cover_letter_templates_category ON cover_letter_templates(category);

-- Insert default template if table is empty
INSERT OR IGNORE INTO cover_letter_templates (id, name, content, category, created_at, updated_at)
SELECT
    'default-1',
    'General Application',
    'Dear {hiring_manager},

I am writing to express my interest in the {position} position at {company}. With my {years_experience} years of experience in {skill1} and {skill2}, I believe I would be a strong addition to your team.

[Customize this paragraph with specific qualifications]

I am excited about the opportunity to contribute to {company}''s mission at their {location} office and would welcome the chance to discuss how my skills align with your needs.

Thank you for considering my application.

Best regards,
{your_name}

Date: {date}',
    'general',
    datetime('now'),
    datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM cover_letter_templates LIMIT 1);
