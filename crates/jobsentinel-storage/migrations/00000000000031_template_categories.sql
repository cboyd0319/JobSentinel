-- Preserves templates while accepting every supported cover-letter and email category.
ALTER TABLE cover_letter_templates RENAME TO cover_letter_templates_before_categories;
CREATE TABLE cover_letter_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
        'general', 'tech', 'creative', 'finance', 'healthcare', 'sales', 'custom',
        'thankyou', 'followup', 'withdrawal'
    )),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO cover_letter_templates (id, name, content, category, created_at, updated_at)
SELECT id, name, content, category, created_at, updated_at
FROM cover_letter_templates_before_categories;
DROP TABLE cover_letter_templates_before_categories;
CREATE INDEX idx_cover_letter_templates_category ON cover_letter_templates(category);
UPDATE v3_compatibility_metadata SET migration_version = 31 WHERE singleton = 1;
