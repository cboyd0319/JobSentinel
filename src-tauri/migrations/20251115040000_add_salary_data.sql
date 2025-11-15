-- Salary Negotiation AI Migration
-- Adds salary benchmarking and offer tracking capabilities

-- H1B Salary Data (imported from public DOL database)
-- Source: https://www.flcdatacenter.com/
CREATE TABLE IF NOT EXISTS h1b_salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title TEXT NOT NULL,
    employer_name TEXT,
    wage_rate_of_pay_from INTEGER, -- Annual salary in USD
    wage_rate_of_pay_to INTEGER,   -- Upper bound if range
    wage_unit TEXT,  -- 'Year', 'Hour', 'Week', 'Month'
    work_city TEXT,
    work_state TEXT,
    work_postal_code TEXT,
    soc_code TEXT,  -- Standard Occupational Classification
    soc_title TEXT,
    naics_code TEXT, -- North American Industry Classification
    case_status TEXT, -- 'Certified', 'Denied', 'Withdrawn'
    decision_date TEXT, -- ISO 8601 date
    submit_date TEXT,   -- ISO 8601 date
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Aggregated salary benchmarks (computed from H1B data)
CREATE TABLE IF NOT EXISTS salary_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title_normalized TEXT NOT NULL, -- Normalized title (e.g., "Software Engineer")
    location_normalized TEXT NOT NULL,  -- Normalized location (e.g., "San Francisco, CA")
    seniority_level TEXT CHECK(seniority_level IN ('entry', 'mid', 'senior', 'staff', 'principal', 'unknown')),
    min_salary INTEGER NOT NULL,
    p25_salary INTEGER NOT NULL, -- 25th percentile
    median_salary INTEGER NOT NULL,
    p75_salary INTEGER NOT NULL, -- 75th percentile
    max_salary INTEGER NOT NULL,
    average_salary INTEGER NOT NULL,
    sample_size INTEGER NOT NULL, -- Number of data points
    data_source TEXT DEFAULT 'h1b', -- 'h1b', 'user_reported', 'scraped'
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(job_title_normalized, location_normalized, seniority_level, data_source)
);

-- User-reported salaries (crowdsourced from JobSentinel users)
CREATE TABLE IF NOT EXISTS user_reported_salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title TEXT NOT NULL,
    company TEXT,
    location TEXT NOT NULL,
    base_salary INTEGER NOT NULL,
    bonus INTEGER,
    equity_value INTEGER, -- Annual equity value (RSUs, options)
    total_compensation INTEGER NOT NULL,
    years_of_experience INTEGER,
    seniority_level TEXT,
    is_remote INTEGER DEFAULT 0, -- Boolean
    is_verified INTEGER DEFAULT 0, -- Boolean: verified through offer letter
    reported_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Salary predictions for jobs
CREATE TABLE IF NOT EXISTS job_salary_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL UNIQUE,
    predicted_min INTEGER,
    predicted_max INTEGER,
    predicted_median INTEGER,
    confidence_score REAL, -- 0.0-1.0
    prediction_method TEXT, -- 'h1b_match', 'ml_model', 'benchmark'
    data_points_used INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE
);

-- Offer history (extends existing offers table from ATS migration)
-- Note: The offers table already exists in 20251115010000_add_application_tracking.sql
-- We'll add a view to augment it with salary benchmarks

-- Negotiation templates
CREATE TABLE IF NOT EXISTS negotiation_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL UNIQUE,
    scenario TEXT NOT NULL, -- 'initial_offer', 'counter_offer', 'competing_offer', 'equity_focused'
    template_text TEXT NOT NULL,
    placeholders TEXT, -- JSON array of placeholder names: ["company", "current_offer", "target_salary"]
    is_default INTEGER DEFAULT 0, -- Boolean
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Negotiation history (user's negotiation attempts)
CREATE TABLE IF NOT EXISTS negotiation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL,
    negotiation_round INTEGER DEFAULT 1,
    initial_offer INTEGER NOT NULL,
    counter_offer INTEGER,
    final_offer INTEGER,
    outcome TEXT CHECK(outcome IN ('accepted', 'declined', 'pending', 'withdrawn')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_h1b_salaries_title ON h1b_salaries(job_title);
CREATE INDEX IF NOT EXISTS idx_h1b_salaries_state ON h1b_salaries(work_state);
CREATE INDEX IF NOT EXISTS idx_h1b_salaries_status ON h1b_salaries(case_status);
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_title ON salary_benchmarks(job_title_normalized);
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_location ON salary_benchmarks(location_normalized);
CREATE INDEX IF NOT EXISTS idx_user_reported_salaries_title ON user_reported_salaries(job_title);
CREATE INDEX IF NOT EXISTS idx_user_reported_salaries_location ON user_reported_salaries(location);
CREATE INDEX IF NOT EXISTS idx_job_salary_predictions_job_hash ON job_salary_predictions(job_hash);

-- View: Offer with salary benchmarks
CREATE VIEW IF NOT EXISTS offers_with_benchmarks AS
SELECT
    o.*,
    b.median_salary as market_median,
    b.p75_salary as market_p75,
    b.average_salary as market_average,
    CASE
        WHEN o.base_salary >= b.p75_salary THEN 'above_market'
        WHEN o.base_salary >= b.median_salary THEN 'at_market'
        ELSE 'below_market'
    END as market_position
FROM offers o
LEFT JOIN salary_benchmarks b ON
    b.job_title_normalized = (
        SELECT job_title_normalized
        FROM job_salary_predictions jp
        JOIN jobs j ON j.hash = jp.job_hash
        WHERE j.hash = (SELECT job_hash FROM applications WHERE id = o.application_id)
        LIMIT 1
    );

-- Default negotiation templates
INSERT OR IGNORE INTO negotiation_templates (template_name, scenario, template_text, placeholders, is_default) VALUES
(
    'Initial Offer Response',
    'initial_offer',
    'Thank you for the offer! I''m excited about the opportunity to join {{company}}. Based on my research of market rates for this role in {{location}} and my {{years_experience}} years of experience, I was hoping for a compensation package in the range of {{target_min}}-{{target_max}}. Is there any flexibility in the current offer of {{current_offer}}?',
    '["company", "location", "years_experience", "target_min", "target_max", "current_offer"]',
    1
),
(
    'Counter Offer',
    'counter_offer',
    'I appreciate you considering my request. After reviewing the updated offer of {{revised_offer}}, I''m getting closer to accepting. However, given my skills in {{key_skills}} and the value I can bring to {{company}}, I believe {{counter_offer}} would be more appropriate. Can we meet somewhere in the middle?',
    '["revised_offer", "key_skills", "company", "counter_offer"]',
    1
),
(
    'Competing Offer Leverage',
    'competing_offer',
    'I wanted to be transparent with you - I''ve received another offer from {{competing_company}} at {{competing_offer}}. However, {{company}} remains my top choice because of {{reasons}}. Is there any way we could adjust the compensation to {{target_salary}} to make this an easy decision for me?',
    '["competing_company", "competing_offer", "company", "reasons", "target_salary"]',
    1
),
(
    'Equity Focused',
    'equity_focused',
    'Thank you for the breakdown. While the base salary of {{base_salary}} is competitive, I''m particularly interested in the long-term potential at {{company}}. Would it be possible to increase the equity component from {{current_equity}} to {{target_equity}}? I''m committed to the company''s success and would love to have more skin in the game.',
    '["base_salary", "company", "current_equity", "target_equity"]',
    1
);
