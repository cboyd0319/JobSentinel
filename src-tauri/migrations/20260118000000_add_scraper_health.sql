-- Scraper Health Monitoring System
-- Track scraper execution history, health metrics, and credential status

-- ============================================================================
-- SCRAPER RUN HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraper_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scraper_name TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    finished_at TIMESTAMP,
    duration_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'success', 'failure', 'timeout')),
    jobs_found INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    error_message TEXT,
    error_code TEXT,
    retry_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_name_time ON scraper_runs(scraper_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status, started_at DESC);

-- ============================================================================
-- SCRAPER CONFIGURATION & STATUS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraper_config (
    scraper_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    requires_auth BOOLEAN DEFAULT 0,
    auth_type TEXT,
    scraper_type TEXT CHECK(scraper_type IN ('api', 'html', 'rss', 'graphql')),
    rate_limit_per_hour INTEGER DEFAULT 1000,
    selector_health TEXT DEFAULT 'unknown' CHECK(selector_health IN ('healthy', 'degraded', 'broken', 'unknown')),
    last_selector_check TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT (datetime('now')),
    updated_at TIMESTAMP DEFAULT (datetime('now'))
);

-- Seed initial scraper configuration
INSERT OR IGNORE INTO scraper_config (scraper_name, display_name, requires_auth, auth_type, scraper_type, rate_limit_per_hour) VALUES
    ('greenhouse', 'Greenhouse', 0, NULL, 'api', 1000),
    ('lever', 'Lever', 0, NULL, 'api', 1000),
    ('linkedin', 'LinkedIn', 1, 'cookie', 'api', 100),
    ('indeed', 'Indeed', 0, NULL, 'html', 500),
    ('remoteok', 'RemoteOK', 0, NULL, 'api', 500),
    ('wellfound', 'Wellfound', 0, NULL, 'html', 300),
    ('weworkremotely', 'We Work Remotely', 0, NULL, 'rss', 500),
    ('builtin', 'BuiltIn', 0, NULL, 'html', 300),
    ('hn_hiring', 'HN Who''s Hiring', 0, NULL, 'api', 500),
    ('jobswithgpt', 'JobsWithGPT', 0, NULL, 'api', 10000),
    ('dice', 'Dice', 0, NULL, 'html', 300),
    ('yc_startup', 'YC Startup Jobs', 0, NULL, 'html', 300),
    ('ziprecruiter', 'ZipRecruiter', 0, NULL, 'rss', 300);

-- ============================================================================
-- CREDENTIAL HEALTH (LinkedIn cookie tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS credential_health (
    credential_key TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    last_validated TIMESTAMP,
    expires_at TIMESTAMP,
    validation_status TEXT DEFAULT 'unknown' CHECK(validation_status IN ('valid', 'expiring', 'expired', 'unknown')),
    warning_sent_at TIMESTAMP,
    notes TEXT
);

-- ============================================================================
-- SMOKE TEST RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraper_smoke_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scraper_name TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK(test_type IN ('connectivity', 'selector', 'auth', 'rate_limit')),
    started_at TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    duration_ms INTEGER,
    status TEXT NOT NULL CHECK(status IN ('pass', 'fail', 'skip')),
    details TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_smoke_tests_name ON scraper_smoke_tests(scraper_name, started_at DESC);

-- ============================================================================
-- VIEW: Current health status for all scrapers
-- ============================================================================

CREATE VIEW IF NOT EXISTS scraper_health_status AS
SELECT
    sc.scraper_name,
    sc.display_name,
    sc.is_enabled,
    sc.requires_auth,
    sc.scraper_type,
    sc.selector_health,
    sc.rate_limit_per_hour,
    -- Success rate in last 24 hours
    COALESCE(
        CAST((SELECT COUNT(*) FROM scraper_runs sr
              WHERE sr.scraper_name = sc.scraper_name
              AND sr.status = 'success'
              AND sr.started_at >= datetime('now', '-24 hours')) AS REAL) * 100.0 /
        NULLIF((SELECT COUNT(*) FROM scraper_runs sr2
                WHERE sr2.scraper_name = sc.scraper_name
                AND sr2.started_at >= datetime('now', '-24 hours')), 0),
        0
    ) as success_rate_24h,
    -- Average duration in last 7 days
    (SELECT AVG(duration_ms) FROM scraper_runs sr
     WHERE sr.scraper_name = sc.scraper_name
     AND sr.status = 'success'
     AND sr.started_at >= datetime('now', '-7 days')) as avg_duration_ms,
    -- Last successful run
    (SELECT MAX(finished_at) FROM scraper_runs sr
     WHERE sr.scraper_name = sc.scraper_name
     AND sr.status = 'success') as last_success,
    -- Last error message
    (SELECT error_message FROM scraper_runs sr
     WHERE sr.scraper_name = sc.scraper_name
     AND sr.status = 'failure'
     ORDER BY started_at DESC LIMIT 1) as last_error,
    -- Total runs in 24h
    (SELECT COUNT(*) FROM scraper_runs sr
     WHERE sr.scraper_name = sc.scraper_name
     AND sr.started_at >= datetime('now', '-24 hours')) as total_runs_24h,
    -- Jobs found in 24h
    (SELECT COALESCE(SUM(jobs_found), 0) FROM scraper_runs sr
     WHERE sr.scraper_name = sc.scraper_name
     AND sr.status = 'success'
     AND sr.started_at >= datetime('now', '-24 hours')) as jobs_found_24h,
    -- Health status calculation
    CASE
        WHEN sc.is_enabled = 0 THEN 'disabled'
        WHEN (SELECT MAX(finished_at) FROM scraper_runs sr
              WHERE sr.scraper_name = sc.scraper_name
              AND sr.status = 'success') >= datetime('now', '-24 hours') THEN 'healthy'
        WHEN (SELECT MAX(finished_at) FROM scraper_runs sr
              WHERE sr.scraper_name = sc.scraper_name
              AND sr.status = 'success') >= datetime('now', '-7 days') THEN 'degraded'
        WHEN (SELECT COUNT(*) FROM scraper_runs sr
              WHERE sr.scraper_name = sc.scraper_name) = 0 THEN 'unknown'
        ELSE 'down'
    END as health_status
FROM scraper_config sc;
