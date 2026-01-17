-- Notification Preferences table
-- Migrated from localStorage: jobsentinel_notification_preferences
-- Single-row table for user preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
    -- Global settings
    global_enabled INTEGER NOT NULL DEFAULT 1,
    quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
    quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
    -- Source-specific settings stored as JSON
    source_configs TEXT NOT NULL DEFAULT '{}',
    -- Advanced filters stored as JSON
    advanced_filters TEXT NOT NULL DEFAULT '{}',
    -- Timestamps
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default preferences if not exists
INSERT OR IGNORE INTO notification_preferences (
    id,
    global_enabled,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    source_configs,
    advanced_filters
) VALUES (
    1,
    1,
    0,
    '22:00',
    '08:00',
    '{"linkedin":{"enabled":true,"minScoreThreshold":70,"soundEnabled":true},"indeed":{"enabled":true,"minScoreThreshold":70,"soundEnabled":true},"greenhouse":{"enabled":true,"minScoreThreshold":80,"soundEnabled":true},"lever":{"enabled":true,"minScoreThreshold":80,"soundEnabled":true},"jobswithgpt":{"enabled":true,"minScoreThreshold":75,"soundEnabled":true}}',
    '{"includeKeywords":[],"excludeKeywords":[],"minSalary":null,"remoteOnly":false,"companyWhitelist":[],"companyBlacklist":[]}'
);
