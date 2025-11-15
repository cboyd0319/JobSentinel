-- Market Intelligence Dashboard Tables
-- Tracks job market trends, skill demand, salary movements, and geographic distribution

-- ============================================================================
-- SKILL DEMAND TRENDS
-- ============================================================================

-- Track skill mentions over time (daily aggregation)
CREATE TABLE IF NOT EXISTS skill_demand_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT NOT NULL,
    date DATE NOT NULL,
    mention_count INTEGER NOT NULL DEFAULT 0,
    job_count INTEGER NOT NULL DEFAULT 0,  -- How many jobs mentioned this skill
    avg_salary INTEGER,                     -- Average salary for jobs with this skill
    median_salary INTEGER,
    top_company TEXT,                       -- Company posting most jobs with this skill
    top_location TEXT,                      -- Location with most jobs for this skill
    created_at TIMESTAMP DEFAULT (datetime('now')),

    UNIQUE(skill_name, date)
);

CREATE INDEX idx_skill_demand_skill ON skill_demand_trends(skill_name, date DESC);
CREATE INDEX idx_skill_demand_date ON skill_demand_trends(date DESC);

-- ============================================================================
-- SALARY TRENDS
-- ============================================================================

-- Track salary changes over time by role and location
CREATE TABLE IF NOT EXISTS salary_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title_normalized TEXT NOT NULL,
    location_normalized TEXT NOT NULL,
    date DATE NOT NULL,
    min_salary INTEGER NOT NULL,
    p25_salary INTEGER NOT NULL,
    median_salary INTEGER NOT NULL,
    p75_salary INTEGER NOT NULL,
    max_salary INTEGER NOT NULL,
    avg_salary INTEGER NOT NULL,
    sample_size INTEGER NOT NULL,           -- Number of jobs in this aggregate
    salary_growth_pct REAL,                 -- % change from previous period
    created_at TIMESTAMP DEFAULT (datetime('now')),

    UNIQUE(job_title_normalized, location_normalized, date)
);

CREATE INDEX idx_salary_trends_title ON salary_trends(job_title_normalized, date DESC);
CREATE INDEX idx_salary_trends_location ON salary_trends(location_normalized, date DESC);
CREATE INDEX idx_salary_trends_date ON salary_trends(date DESC);

-- ============================================================================
-- COMPANY HIRING VELOCITY
-- ============================================================================

-- Track how many jobs companies are posting over time
CREATE TABLE IF NOT EXISTS company_hiring_velocity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    date DATE NOT NULL,
    jobs_posted_count INTEGER NOT NULL DEFAULT 0,
    jobs_filled_count INTEGER NOT NULL DEFAULT 0,    -- Based on jobs no longer active
    jobs_active_count INTEGER NOT NULL DEFAULT 0,    -- Currently open positions
    avg_days_to_fill REAL,                          -- Average time from posting to fill
    top_role TEXT,                                  -- Most common job title
    top_location TEXT,                              -- Most common location
    is_actively_hiring BOOLEAN DEFAULT 1,           -- Hiring velocity > 0
    hiring_trend TEXT CHECK(hiring_trend IN ('increasing', 'stable', 'decreasing')),
    created_at TIMESTAMP DEFAULT (datetime('now')),

    UNIQUE(company_name, date)
);

CREATE INDEX idx_company_velocity_company ON company_hiring_velocity(company_name, date DESC);
CREATE INDEX idx_company_velocity_active ON company_hiring_velocity(is_actively_hiring, jobs_posted_count DESC);
CREATE INDEX idx_company_velocity_date ON company_hiring_velocity(date DESC);

-- ============================================================================
-- LOCATION JOB DENSITY
-- ============================================================================

-- Geographic distribution of jobs (heatmap data)
CREATE TABLE IF NOT EXISTS location_job_density (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_normalized TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    date DATE NOT NULL,
    job_count INTEGER NOT NULL DEFAULT 0,
    remote_job_count INTEGER NOT NULL DEFAULT 0,
    avg_salary INTEGER,
    median_salary INTEGER,
    top_skill TEXT,                                 -- Most demanded skill in this location
    top_company TEXT,                               -- Top hiring company
    top_role TEXT,                                  -- Most common job title
    latitude REAL,                                  -- For mapping (optional)
    longitude REAL,                                 -- For mapping (optional)
    created_at TIMESTAMP DEFAULT (datetime('now')),

    UNIQUE(location_normalized, date)
);

CREATE INDEX idx_location_density_location ON location_job_density(location_normalized, date DESC);
CREATE INDEX idx_location_density_state ON location_job_density(state, date DESC);
CREATE INDEX idx_location_density_date ON location_job_density(date DESC);
CREATE INDEX idx_location_density_count ON location_job_density(job_count DESC);

-- ============================================================================
-- MARKET SNAPSHOTS (Daily Aggregates)
-- ============================================================================

-- Overall market statistics (daily snapshot)
CREATE TABLE IF NOT EXISTS market_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    new_jobs_today INTEGER NOT NULL DEFAULT 0,
    jobs_filled_today INTEGER NOT NULL DEFAULT 0,
    avg_salary INTEGER,
    median_salary INTEGER,
    remote_job_percentage REAL,
    top_skill TEXT,
    top_company TEXT,
    top_location TEXT,
    total_companies_hiring INTEGER,
    market_sentiment TEXT CHECK(market_sentiment IN ('bullish', 'neutral', 'bearish')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX idx_market_snapshots_date ON market_snapshots(date DESC);

-- ============================================================================
-- ROLE DEMAND TRENDS
-- ============================================================================

-- Track demand for specific job roles over time
CREATE TABLE IF NOT EXISTS role_demand_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title_normalized TEXT NOT NULL,
    date DATE NOT NULL,
    job_count INTEGER NOT NULL DEFAULT 0,
    avg_salary INTEGER,
    median_salary INTEGER,
    top_company TEXT,
    top_location TEXT,
    avg_experience_years REAL,
    remote_percentage REAL,                         -- % of these roles that are remote
    demand_trend TEXT CHECK(demand_trend IN ('rising', 'stable', 'falling')),
    created_at TIMESTAMP DEFAULT (datetime('now')),

    UNIQUE(job_title_normalized, date)
);

CREATE INDEX idx_role_demand_title ON role_demand_trends(job_title_normalized, date DESC);
CREATE INDEX idx_role_demand_date ON role_demand_trends(date DESC);
CREATE INDEX idx_role_demand_count ON role_demand_trends(job_count DESC);

-- ============================================================================
-- MARKET ALERTS
-- ============================================================================

-- Store notable market events/alerts
CREATE TABLE IF NOT EXISTS market_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL CHECK(alert_type IN (
        'skill_surge',           -- Skill demand suddenly increased
        'salary_spike',          -- Salaries jumped significantly
        'hiring_freeze',         -- Company stopped hiring
        'hiring_spree',          -- Company hiring aggressively
        'location_boom',         -- New hot location
        'role_obsolete'          -- Role demand declining
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    related_entity TEXT,                            -- Skill name, company, location, etc.
    related_entity_type TEXT CHECK(related_entity_type IN ('skill', 'company', 'location', 'role')),
    metric_value REAL,                              -- The metric that triggered alert
    metric_change_pct REAL,                         -- % change from baseline
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX idx_market_alerts_type ON market_alerts(alert_type, created_at DESC);
CREATE INDEX idx_market_alerts_unread ON market_alerts(is_read, created_at DESC);
CREATE INDEX idx_market_alerts_entity ON market_alerts(related_entity_type, related_entity);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Latest market snapshot view
CREATE VIEW latest_market_snapshot AS
SELECT *
FROM market_snapshots
ORDER BY date DESC
LIMIT 1;

-- Top trending skills (last 30 days)
CREATE VIEW trending_skills AS
SELECT
    skill_name,
    SUM(job_count) as total_jobs,
    AVG(avg_salary) as avg_salary,
    COUNT(DISTINCT date) as days_tracked,
    (
        SELECT mention_count
        FROM skill_demand_trends sdt2
        WHERE sdt2.skill_name = sdt.skill_name
        ORDER BY date DESC
        LIMIT 1
    ) as latest_mentions
FROM skill_demand_trends sdt
WHERE date >= date('now', '-30 days')
GROUP BY skill_name
ORDER BY total_jobs DESC;

-- Companies hiring most actively
CREATE VIEW most_active_companies AS
SELECT
    company_name,
    SUM(jobs_posted_count) as total_posted,
    AVG(jobs_active_count) as avg_active,
    hiring_trend,
    MAX(date) as last_updated
FROM company_hiring_velocity
WHERE date >= date('now', '-30 days')
GROUP BY company_name
ORDER BY total_posted DESC;

-- Hottest job markets by location
CREATE VIEW hottest_locations AS
SELECT
    location_normalized,
    city,
    state,
    SUM(job_count) as total_jobs,
    AVG(median_salary) as avg_median_salary,
    MAX(date) as last_updated
FROM location_job_density
WHERE date >= date('now', '-30 days')
GROUP BY location_normalized
ORDER BY total_jobs DESC;
