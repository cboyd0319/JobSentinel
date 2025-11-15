-- Company Health Monitoring Tables
-- Tracks company stability, funding, reviews, layoffs, and overall health scores

-- ============================================================================
-- COMPANY PROFILES
-- ============================================================================

-- Core company information
CREATE TABLE IF NOT EXISTS company_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,           -- Lowercase, trimmed
    industry TEXT,
    size_category TEXT CHECK(size_category IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    headquarters_location TEXT,
    founded_year INTEGER,
    website_url TEXT,
    linkedin_url TEXT,
    glassdoor_url TEXT,
    crunchbase_url TEXT,
    is_public BOOLEAN DEFAULT 0,
    stock_symbol TEXT,
    last_updated TIMESTAMP DEFAULT (datetime('now')),
    created_at TIMESTAMP DEFAULT (datetime('now'))
);

CREATE INDEX idx_company_profiles_normalized ON company_profiles(normalized_name);
CREATE INDEX idx_company_profiles_name ON company_profiles(company_name);

-- ============================================================================
-- GLASSDOOR DATA
-- ============================================================================

-- Glassdoor reviews and ratings
CREATE TABLE IF NOT EXISTS glassdoor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    overall_rating REAL CHECK(overall_rating >= 0 AND overall_rating <= 5),
    culture_rating REAL CHECK(culture_rating >= 0 AND culture_rating <= 5),
    work_life_balance_rating REAL CHECK(work_life_balance_rating >= 0 AND work_life_balance_rating <= 5),
    career_opportunities_rating REAL CHECK(career_opportunities_rating >= 0 AND career_opportunities_rating <= 5),
    compensation_benefits_rating REAL CHECK(compensation_benefits_rating >= 0 AND compensation_benefits_rating <= 5),
    senior_management_rating REAL CHECK(senior_management_rating >= 0 AND senior_management_rating <= 5),
    recommend_to_friend_pct REAL,           -- Percentage who'd recommend
    ceo_approval_pct REAL,                  -- CEO approval rating
    total_reviews INTEGER,
    pros_summary TEXT,                      -- Common themes in pros
    cons_summary TEXT,                      -- Common themes in cons
    fetched_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_glassdoor_company ON glassdoor_data(company_id);

-- ============================================================================
-- CRUNCHBASE DATA
-- ============================================================================

-- Crunchbase funding information
CREATE TABLE IF NOT EXISTS crunchbase_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    total_funding_usd BIGINT,               -- Total funding raised
    last_funding_round TEXT CHECK(last_funding_round IN ('seed', 'series_a', 'series_b', 'series_c', 'series_d', 'ipo', 'acquired')),
    last_funding_date DATE,
    last_funding_amount_usd BIGINT,
    num_funding_rounds INTEGER,
    num_investors INTEGER,
    valuation_usd BIGINT,                   -- Company valuation
    employee_count INTEGER,
    is_acquired BOOLEAN DEFAULT 0,
    acquisition_date DATE,
    acquiring_company TEXT,
    fetched_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_crunchbase_company ON crunchbase_data(company_id);

-- ============================================================================
-- LAYOFFS DATA
-- ============================================================================

-- Layoffs.fyi data
CREATE TABLE IF NOT EXISTS layoffs_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    layoff_date DATE NOT NULL,
    num_laid_off INTEGER,
    percentage_laid_off REAL,               -- % of workforce
    reason TEXT,                            -- Cost cutting, restructuring, etc.
    source_url TEXT,                        -- Link to source article
    total_employees_before INTEGER,
    total_employees_after INTEGER,
    severity TEXT CHECK(severity IN ('minor', 'moderate', 'major', 'massive')) DEFAULT 'moderate',
    created_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_layoffs_company ON layoffs_data(company_id, layoff_date DESC);
CREATE INDEX idx_layoffs_date ON layoffs_data(layoff_date DESC);

-- ============================================================================
-- COMPANY NEWS SENTIMENT
-- ============================================================================

-- News sentiment analysis
CREATE TABLE IF NOT EXISTS news_sentiment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    article_title TEXT NOT NULL,
    article_url TEXT,
    published_date DATE,
    source TEXT,                            -- TechCrunch, Bloomberg, etc.
    sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
    sentiment_score REAL,                   -- -1.0 to 1.0 (negative to positive)
    keywords TEXT,                          -- Comma-separated keywords
    summary TEXT,                           -- Brief article summary
    created_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_news_company ON news_sentiment(company_id, published_date DESC);
CREATE INDEX idx_news_sentiment_score ON news_sentiment(sentiment, sentiment_score);

-- ============================================================================
-- LINKEDIN HEADCOUNT TRENDS
-- ============================================================================

-- LinkedIn employee count over time
CREATE TABLE IF NOT EXISTS linkedin_headcount (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    total_employees INTEGER NOT NULL,
    employee_growth_30d INTEGER,            -- Change from 30 days ago
    employee_growth_90d INTEGER,            -- Change from 90 days ago
    employee_growth_1y INTEGER,             -- Change from 1 year ago
    growth_rate_30d REAL,                   -- % change from 30 days ago
    is_hiring BOOLEAN DEFAULT 1,            -- Actively posting jobs
    open_positions_count INTEGER,           -- Number of open positions
    fetched_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
    UNIQUE(company_id, snapshot_date)
);

CREATE INDEX idx_linkedin_company ON linkedin_headcount(company_id, snapshot_date DESC);

-- ============================================================================
-- COMPANY HEALTH SCORES
-- ============================================================================

-- Calculated health scores
CREATE TABLE IF NOT EXISTS company_health_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    calculated_date DATE NOT NULL,
    overall_score REAL CHECK(overall_score >= 0 AND overall_score <= 100),
    grade TEXT CHECK(grade IN ('A', 'B', 'C', 'D', 'F')) NOT NULL,
    financial_health_score REAL,           -- Based on funding, revenue
    employee_satisfaction_score REAL,      -- Based on Glassdoor
    stability_score REAL,                  -- Based on layoffs, growth
    public_perception_score REAL,          -- Based on news sentiment
    growth_score REAL,                     -- Based on headcount, funding
    red_flags_count INTEGER DEFAULT 0,
    green_flags_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
    UNIQUE(company_id, calculated_date)
);

CREATE INDEX idx_health_scores_company ON company_health_scores(company_id, calculated_date DESC);
CREATE INDEX idx_health_scores_grade ON company_health_scores(grade, overall_score DESC);

-- ============================================================================
-- RED FLAGS
-- ============================================================================

-- Company red flags
CREATE TABLE IF NOT EXISTS company_red_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    flag_type TEXT NOT NULL CHECK(flag_type IN (
        'mass_layoffs',              -- >20% workforce reduction
        'frequent_layoffs',          -- Multiple layoffs in short period
        'negative_reviews',          -- Glassdoor <3.0
        'ceo_low_approval',          -- CEO approval <50%
        'funding_drought',           -- No funding in 2+ years
        'declining_headcount',       -- Shrinking for 6+ months
        'negative_news',             -- Persistent negative coverage
        'bankruptcy_risk',           -- Financial distress signals
        'toxic_culture',             -- Culture rating <2.5
        'high_turnover'              -- Estimated high churn
    )),
    severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detected_date DATE DEFAULT (date('now')),
    source_data_id INTEGER,                 -- FK to related table (layoffs, glassdoor, etc.)
    is_resolved BOOLEAN DEFAULT 0,
    resolved_date DATE,
    created_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_red_flags_company ON company_red_flags(company_id, severity, detected_date DESC);
CREATE INDEX idx_red_flags_type ON company_red_flags(flag_type, severity);
CREATE INDEX idx_red_flags_unresolved ON company_red_flags(is_resolved, detected_date DESC);

-- ============================================================================
-- GREEN FLAGS
-- ============================================================================

-- Company green flags (positive indicators)
CREATE TABLE IF NOT EXISTS company_green_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    flag_type TEXT NOT NULL CHECK(flag_type IN (
        'recent_funding',            -- Funding in last 12 months
        'strong_growth',             -- Growing headcount >10% YoY
        'excellent_reviews',         -- Glassdoor >4.0
        'high_ceo_approval',         -- CEO approval >80%
        'positive_news',             -- Recent positive coverage
        'competitive_benefits',      -- High compensation rating
        'great_culture',             -- Culture rating >4.0
        'career_growth',             -- Career opportunities >4.0
        'work_life_balance',         -- WLB rating >4.0
        'stable_long_term'           -- No layoffs in 2+ years
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detected_date DATE DEFAULT (date('now')),
    source_data_id INTEGER,
    created_at TIMESTAMP DEFAULT (datetime('now')),

    FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_green_flags_company ON company_green_flags(company_id, detected_date DESC);
CREATE INDEX idx_green_flags_type ON company_green_flags(flag_type);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Latest health scores view
CREATE VIEW latest_company_health AS
SELECT
    cp.company_name,
    chs.overall_score,
    chs.grade,
    chs.red_flags_count,
    chs.green_flags_count,
    chs.calculated_date
FROM company_health_scores chs
JOIN company_profiles cp ON chs.company_id = cp.id
WHERE chs.calculated_date = (
    SELECT MAX(calculated_date)
    FROM company_health_scores
    WHERE company_id = chs.company_id
)
ORDER BY chs.overall_score DESC;

-- Companies with red flags
CREATE VIEW companies_with_red_flags AS
SELECT
    cp.company_name,
    crf.flag_type,
    crf.severity,
    crf.title,
    crf.detected_date
FROM company_red_flags crf
JOIN company_profiles cp ON crf.company_id = cp.id
WHERE crf.is_resolved = 0
ORDER BY
    CASE crf.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    crf.detected_date DESC;

-- Companies with green flags
CREATE VIEW companies_with_green_flags AS
SELECT
    cp.company_name,
    cgf.flag_type,
    cgf.title,
    cgf.detected_date
FROM company_green_flags cgf
JOIN company_profiles cp ON cgf.company_id = cp.id
ORDER BY cgf.detected_date DESC;
