-- JobSentinel v2.5.1 - Consolidated Schema
-- This is the complete database schema. No migrations needed.
-- Generated: 2026-01-18

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash for deduplication (company + title + location + url)
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    url TEXT NOT NULL,
    location TEXT,
    description TEXT,
    score REAL,  -- Match score (0.0 - 1.0)
    score_reasons TEXT,  -- JSON object with score breakdown
    source TEXT NOT NULL,  -- Source scraper ("greenhouse", "lever", "jobswithgpt")
    remote INTEGER,  -- Boolean: 1 = remote, 0 = not remote, NULL = unknown
    salary_min INTEGER,
    salary_max INTEGER,
    currency TEXT DEFAULT 'USD',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    times_seen INTEGER NOT NULL DEFAULT 1,  -- Number of times this job has been seen
    immediate_alert_sent INTEGER NOT NULL DEFAULT 0,  -- Boolean: 1 = alert sent, 0 = no alert
    included_in_digest INTEGER NOT NULL DEFAULT 0  -- Boolean: 1 = included in digest, 0 = not included
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_hash ON jobs(hash);
CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- Create full-text search index for title and description
CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
    title,
    description,
    content=jobs,
    content_rowid=id
);

-- Trigger to keep FTS index in sync with jobs table
CREATE TRIGGER IF NOT EXISTS jobs_ai AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER IF NOT EXISTS jobs_au AFTER UPDATE ON jobs BEGIN
    UPDATE jobs_fts
    SET title = new.title, description = new.description
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS jobs_ad AFTER DELETE ON jobs BEGIN
    DELETE FROM jobs_fts WHERE rowid = old.id;
END;
-- Add metadata tables for database integrity tracking and backup management

-- App metadata table for storing integrity check history and configuration
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track integrity check history
CREATE TABLE IF NOT EXISTS integrity_check_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_type TEXT NOT NULL CHECK(check_type IN ('quick', 'full', 'foreign_key')),
    status TEXT NOT NULL CHECK(status IN ('passed', 'failed', 'warning')),
    details TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Track backup history
CREATE TABLE IF NOT EXISTS backup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_path TEXT NOT NULL,
    reason TEXT,
    size_bytes INTEGER,
    success INTEGER NOT NULL DEFAULT 1, -- Boolean: 1 = success, 0 = failed
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrity_check_log_created_at ON integrity_check_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_log_created_at ON backup_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_metadata_key ON app_metadata(key);

-- Insert initial metadata
INSERT OR IGNORE INTO app_metadata (key, value) VALUES
    ('database_version', '2'),
    ('first_initialized', datetime('now')),
    ('last_integrity_check', datetime('now'));
-- Application Tracking System (ATS) Migration
-- Adds comprehensive application tracking with Kanban board support

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN (
        'to_apply',
        'applied',
        'screening_call',
        'phone_interview',
        'technical_interview',
        'onsite_interview',
        'offer_received',
        'offer_accepted',
        'offer_rejected',
        'rejected',
        'ghosted',
        'withdrawn'
    )) DEFAULT 'to_apply',
    applied_at TEXT, -- ISO 8601 timestamp
    last_contact TEXT, -- ISO 8601 timestamp
    next_followup TEXT, -- ISO 8601 timestamp
    notes TEXT,
    resume_version_id INTEGER,
    cover_letter_text TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    recruiter_phone TEXT,
    salary_expectation INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    UNIQUE(job_hash) -- Can't apply to same job twice
);

-- Application timeline events (audit trail)
CREATE TABLE IF NOT EXISTS application_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN (
        'status_change',
        'email_received',
        'email_sent',
        'phone_call',
        'interview_scheduled',
        'note_added',
        'reminder_set'
    )),
    event_data TEXT, -- JSON string for flexible schema
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Reminders and follow-ups
CREATE TABLE IF NOT EXISTS application_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    reminder_type TEXT NOT NULL, -- 'follow_up', 'interview_prep', 'custom'
    reminder_time TEXT NOT NULL, -- ISO 8601 timestamp
    message TEXT,
    completed INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = pending, 1 = completed
    completed_at TEXT, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Interview details
CREATE TABLE IF NOT EXISTS interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    interview_type TEXT CHECK(interview_type IN (
        'screening_call',
        'phone_interview',
        'technical_interview',
        'system_design',
        'behavioral',
        'onsite',
        'final_round'
    )),
    scheduled_at TEXT NOT NULL, -- ISO 8601 timestamp
    duration_minutes INTEGER,
    interviewer_names TEXT,
    location TEXT, -- Physical address or "Zoom", "Google Meet", etc.
    meeting_link TEXT,
    preparation_notes TEXT,
    feedback_notes TEXT, -- User's notes after interview
    completed INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = upcoming, 1 = completed
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Offers received
CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    base_salary INTEGER,
    currency TEXT DEFAULT 'USD',
    equity_shares INTEGER,
    equity_percentage REAL,
    signing_bonus INTEGER,
    annual_bonus INTEGER,
    benefits_summary TEXT,
    start_date TEXT, -- ISO 8601 date
    offer_received_at TEXT, -- ISO 8601 timestamp
    offer_expires_at TEXT, -- ISO 8601 timestamp
    accepted INTEGER, -- Boolean: NULL = pending, 0 = rejected, 1 = accepted
    decision_made_at TEXT, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    UNIQUE(application_id) -- One offer per application
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_job_hash ON applications(job_hash);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_last_contact ON applications(last_contact DESC);
CREATE INDEX IF NOT EXISTS idx_application_events_application_id ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_application_events_created_at ON application_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_reminders_application_id ON application_reminders(application_id);
CREATE INDEX IF NOT EXISTS idx_application_reminders_time ON application_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_application_reminders_completed ON application_reminders(completed);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_application_id ON offers(application_id);
-- AI Resume-Job Matcher Migration
-- Adds resume parsing, skill extraction, and semantic matching

-- Resume storage and versioning
CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    parsed_text TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, -- Boolean: 0 = inactive, 1 = active
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Extracted skills from user resume
CREATE TABLE IF NOT EXISTS user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    skill_category TEXT, -- 'programming_language', 'framework', 'tool', 'soft_skill'
    confidence_score REAL DEFAULT 1.0 CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
    years_experience REAL,
    proficiency_level TEXT CHECK(proficiency_level IN ('beginner', 'intermediate', 'expert', NULL)),
    source TEXT DEFAULT 'resume' CHECK(source IN ('resume', 'user_input', 'inferred')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    UNIQUE(resume_id, skill_name)
);

-- Job skill requirements extracted from job descriptions
CREATE TABLE IF NOT EXISTS job_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1, -- Boolean: 0 = preferred, 1 = required
    skill_category TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    UNIQUE(job_hash, skill_name)
);

-- Resume-job match analysis with gap analysis
CREATE TABLE IF NOT EXISTS resume_job_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    job_hash TEXT NOT NULL,
    overall_match_score REAL NOT NULL CHECK(overall_match_score >= 0.0 AND overall_match_score <= 1.0),
    skills_match_score REAL CHECK(skills_match_score >= 0.0 AND skills_match_score <= 1.0),
    experience_match_score REAL CHECK(experience_match_score >= 0.0 AND experience_match_score <= 1.0),
    education_match_score REAL CHECK(education_match_score >= 0.0 AND education_match_score <= 1.0),
    missing_skills TEXT, -- JSON array: ["TypeScript", "Docker"]
    matching_skills TEXT, -- JSON array: ["Python", "React"]
    gap_analysis TEXT, -- Human-readable gap analysis
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    UNIQUE(resume_id, job_hash)
);

-- User education history
CREATE TABLE IF NOT EXISTS user_education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    degree TEXT,
    field_of_study TEXT,
    institution TEXT,
    graduation_year INTEGER,
    gpa REAL CHECK(gpa >= 0.0 AND gpa <= 4.0 OR gpa IS NULL),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- User work experience
CREATE TABLE IF NOT EXISTS user_experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id INTEGER NOT NULL,
    company TEXT,
    title TEXT,
    start_date TEXT, -- ISO 8601 date
    end_date TEXT, -- ISO 8601 date (NULL if current)
    description TEXT,
    is_current INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = past, 1 = current
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resumes_is_active ON resumes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_skills_resume_id ON user_skills(resume_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_name ON user_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_job_skills_job_hash ON job_skills(job_hash);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_name ON job_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_resume_id ON resume_job_matches(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_job_hash ON resume_job_matches(job_hash);
CREATE INDEX IF NOT EXISTS idx_resume_job_matches_score ON resume_job_matches(overall_match_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_education_resume_id ON user_education(resume_id);
CREATE INDEX IF NOT EXISTS idx_user_experience_resume_id ON user_experience(resume_id);
-- Application Automation Migration (One-Click Apply)
-- Foundation for automated job application submission

-- User application profile (contact info, resume, preferences)
CREATE TABLE IF NOT EXISTS application_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    website_url TEXT,
    default_resume_id INTEGER,
    resume_file_path TEXT, -- Path to resume file for upload (DOCX/PDF)
    default_cover_letter_template TEXT,
    -- Work authorization
    us_work_authorized INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = no, 1 = yes
    requires_sponsorship INTEGER NOT NULL DEFAULT 0, -- Boolean
    -- Preferences
    max_applications_per_day INTEGER DEFAULT 10,
    require_manual_approval INTEGER DEFAULT 1, -- Boolean: require user approval before submit
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (default_resume_id) REFERENCES resumes(id)
);

-- Pre-configured screening question answers
CREATE TABLE IF NOT EXISTS screening_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_pattern TEXT NOT NULL, -- Regex pattern to match questions
    answer TEXT NOT NULL,
    answer_type TEXT CHECK(answer_type IN ('text', 'boolean', 'multiple_choice', 'number')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(question_pattern)
);

-- Application automation attempts log
CREATE TABLE IF NOT EXISTS application_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,
    application_id INTEGER, -- Links to applications table if created
    status TEXT NOT NULL CHECK(status IN (
        'pending',        -- Queued for automation
        'in_progress',    -- Currently being processed
        'awaiting_approval', -- Needs user approval
        'submitted',      -- Successfully submitted
        'failed',         -- Failed (see error_message)
        'cancelled'       -- User cancelled
    )),
    ats_platform TEXT CHECK(ats_platform IN (
        'greenhouse',
        'lever',
        'workday',
        'taleo',
        'icims',
        'bamboohr',
        'ashbyhq',
        'unknown'
    )),
    error_message TEXT,
    screenshot_path TEXT,
    confirmation_screenshot_path TEXT,
    automation_duration_ms INTEGER,
    user_approved INTEGER DEFAULT 0, -- Boolean
    submitted_at TEXT, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

-- CAPTCHA challenges encountered during automation
CREATE TABLE IF NOT EXISTS captcha_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_attempt_id INTEGER NOT NULL,
    challenge_type TEXT CHECK(challenge_type IN (
        'recaptcha_v2',
        'recaptcha_v3',
        'hcaptcha',
        'funcaptcha',
        'cloudflare_turnstile',
        'unknown'
    )),
    challenge_url TEXT,
    solved INTEGER DEFAULT 0, -- Boolean
    solved_at TEXT, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_attempt_id) REFERENCES application_attempts(id) ON DELETE CASCADE
);

-- Detected form fields from ATS platforms (learning mechanism)
CREATE TABLE IF NOT EXISTS ats_form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ats_platform TEXT NOT NULL,
    form_url_pattern TEXT NOT NULL, -- Regex pattern to match URLs
    field_name TEXT NOT NULL,
    field_type TEXT, -- 'text', 'email', 'phone', 'select', 'file', 'textarea', 'checkbox'
    field_label TEXT,
    css_selector TEXT,
    is_required INTEGER DEFAULT 0, -- Boolean
    confidence_score REAL DEFAULT 1.0, -- How confident we are in this mapping
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ats_platform, form_url_pattern, field_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_attempts_job_hash ON application_attempts(job_hash);
CREATE INDEX IF NOT EXISTS idx_application_attempts_status ON application_attempts(status);
CREATE INDEX IF NOT EXISTS idx_application_attempts_ats_platform ON application_attempts(ats_platform);
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_attempt_id ON captcha_challenges(application_attempt_id);
CREATE INDEX IF NOT EXISTS idx_ats_form_fields_platform ON ats_form_fields(ats_platform);

-- Default screening answers (common questions)
INSERT OR IGNORE INTO screening_answers (question_pattern, answer, answer_type, notes) VALUES
('(?i)authorized.*work.*(united states|us|usa)', 'Yes', 'boolean', 'US work authorization'),
('(?i)require.*sponsor.*work', 'No', 'boolean', 'Sponsorship requirement'),
('(?i)require.*sponsor.*(now|future)', 'No', 'boolean', 'Future sponsorship'),
('(?i)18.*years.*age', 'Yes', 'boolean', 'Age requirement'),
('(?i)drug.*test', 'Yes', 'boolean', 'Willing to take drug test'),
('(?i)background.*check', 'Yes', 'boolean', 'Willing to undergo background check'),
('(?i)security.*clearance', 'No', 'boolean', 'Security clearance (default no)'),
('(?i)willing.*relocate', 'Yes', 'boolean', 'Willing to relocate'),
('(?i)notice.*period', '2 weeks', 'text', 'Notice period for current job'),
('(?i)salary.*expectation', '0', 'number', 'Salary expectation (0 = open to discussion)');
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
    avg_salary_offered INTEGER,                     -- Average salary from job postings
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
-- Add hidden column for user-dismissed jobs
ALTER TABLE jobs ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

-- Index for filtering out hidden jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_hidden ON jobs(hidden);
-- Add bookmarked column for user-favorited jobs
ALTER TABLE jobs ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0;

-- Index for filtering bookmarked jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_bookmarked ON jobs(bookmarked) WHERE bookmarked = 1;
-- Add notes column for user personal notes on jobs
ALTER TABLE jobs ADD COLUMN notes TEXT;

-- Full-text search on notes for finding jobs with specific notes
CREATE INDEX IF NOT EXISTS idx_jobs_has_notes ON jobs(notes) WHERE notes IS NOT NULL;
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
-- Add post_interview_notes column to interviews table
-- This stores notes taken after an interview is completed (reflections, feedback received, etc.)

ALTER TABLE interviews ADD COLUMN post_interview_notes TEXT;
-- Ghost Job Detection
-- Adds scoring for fake, stale, or misleading job listings

-- Add ghost detection columns to jobs table
ALTER TABLE jobs ADD COLUMN ghost_score REAL;  -- 0.0 (likely real) to 1.0 (likely ghost)
ALTER TABLE jobs ADD COLUMN ghost_reasons TEXT;  -- JSON array of detection reasons
ALTER TABLE jobs ADD COLUMN first_seen TEXT;  -- First time this job was discovered
ALTER TABLE jobs ADD COLUMN repost_count INTEGER DEFAULT 0;  -- Number of times job has been reposted

-- Create index for ghost score filtering
CREATE INDEX IF NOT EXISTS idx_jobs_ghost_score ON jobs(ghost_score) WHERE ghost_score IS NOT NULL;

-- Track job repost history (same title+company from same source appearing multiple times)
-- This helps detect "evergreen" job postings that are always open
CREATE TABLE IF NOT EXISTS job_repost_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_hash TEXT NOT NULL,  -- Current job hash
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    repost_count INTEGER NOT NULL DEFAULT 1,
    -- Unique constraint: one entry per company+title+source combination
    UNIQUE(company, title, source)
);

-- Indexes for repost history queries
CREATE INDEX IF NOT EXISTS idx_repost_company_title ON job_repost_history(company, title);
CREATE INDEX IF NOT EXISTS idx_repost_source ON job_repost_history(source);
CREATE INDEX IF NOT EXISTS idx_repost_count ON job_repost_history(repost_count DESC);

-- Backfill first_seen from created_at for existing jobs
UPDATE jobs SET first_seen = created_at WHERE first_seen IS NULL;
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
-- Interview Prep Checklists table
-- Migrated from localStorage: jobsentinel_interview_prep_{id}
CREATE TABLE IF NOT EXISTS interview_prep_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL CHECK (item_id IN ('research', 'review_jd', 'prepare_questions', 'star_stories', 'tech_review')),
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    UNIQUE(interview_id, item_id)
);

-- Index for fast lookup by interview
CREATE INDEX IF NOT EXISTS idx_interview_prep_interview_id ON interview_prep_checklists(interview_id);

-- Interview Follow-up Reminders table
-- Migrated from localStorage: jobsentinel_interview_followups
CREATE TABLE IF NOT EXISTS interview_followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
    thank_you_sent INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT
);

-- Index for fast lookup by interview
CREATE INDEX IF NOT EXISTS idx_interview_followups_interview_id ON interview_followups(interview_id);
-- Saved Searches table
-- Migrated from localStorage: jobsentinel_saved_searches
-- No 10-item cap like localStorage version had
CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    -- Filter settings stored as JSON for flexibility
    sort_by TEXT NOT NULL DEFAULT 'score-desc',
    score_filter TEXT NOT NULL DEFAULT 'all',
    source_filter TEXT NOT NULL DEFAULT 'all',
    remote_filter TEXT NOT NULL DEFAULT 'all',
    bookmark_filter TEXT NOT NULL DEFAULT 'all',
    notes_filter TEXT NOT NULL DEFAULT 'all',
    posted_date_filter TEXT DEFAULT 'all',
    salary_min_filter INTEGER,
    salary_max_filter INTEGER,
    ghost_filter TEXT DEFAULT 'all',
    text_search TEXT,
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
);

-- Index for sorting by last used
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_used ON saved_searches(last_used_at DESC);

-- Search History table (for autocomplete)
-- Migrated from localStorage: jobsentinel_search_history
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL UNIQUE,
    use_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast autocomplete
CREATE INDEX IF NOT EXISTS idx_search_history_last_used ON search_history(last_used_at DESC);
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
-- Resume drafts table for the interactive resume builder
-- Stores JSON serialized resume data with full CRUD support

CREATE TABLE IF NOT EXISTS resume_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- JSON serialized ResumeData containing all sections
    data TEXT NOT NULL,
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_resume_drafts_updated ON resume_drafts(updated_at DESC);
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
-- Ghost Job User Feedback
-- Allows users to correct/confirm ghost detection results
-- Future enhancement: use this data to improve the ghost detection algorithm

CREATE TABLE IF NOT EXISTS ghost_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_verdict TEXT NOT NULL CHECK(user_verdict IN ('real', 'ghost')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id)
);

-- Index for fast lookups by job_id
CREATE INDEX IF NOT EXISTS idx_ghost_feedback_job_id ON ghost_feedback(job_id);

-- Index for analytics (count verdicts by type)
CREATE INDEX IF NOT EXISTS idx_ghost_feedback_verdict ON ghost_feedback(user_verdict);
-- Scoring Configuration table
-- Single-row table for user-configurable scoring weights
CREATE TABLE IF NOT EXISTS scoring_config (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
    -- Weight values (must sum to ~1.0)
    skills_weight REAL NOT NULL DEFAULT 0.40,
    salary_weight REAL NOT NULL DEFAULT 0.25,
    location_weight REAL NOT NULL DEFAULT 0.20,
    company_weight REAL NOT NULL DEFAULT 0.10,
    recency_weight REAL NOT NULL DEFAULT 0.05,
    -- Timestamps
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default weights if not exists
INSERT OR IGNORE INTO scoring_config (
    id,
    skills_weight,
    salary_weight,
    location_weight,
    company_weight,
    recency_weight
) VALUES (
    1,
    0.40,  -- Skills: 40%
    0.25,  -- Salary: 25%
    0.20,  -- Location: 20%
    0.10,  -- Company: 10%
    0.05   -- Recency: 5%
);

-- ============================================================================
-- QUERY OPTIMIZATION: Composite Indexes
-- ============================================================================
-- These composite indexes optimize common query patterns by covering multiple
-- columns used together in WHERE clauses and ORDER BY.

-- Optimize queries filtering by hidden + ordering by score/created_at
-- Used by: get_recent_jobs, get_jobs_by_score, get_bookmarked_jobs
CREATE INDEX IF NOT EXISTS idx_jobs_hidden_score_created ON jobs(hidden, score DESC, created_at DESC)
WHERE hidden = 0;

-- Optimize queries filtering by hidden + source + ordering
-- Used by: get_jobs_by_source
CREATE INDEX IF NOT EXISTS idx_jobs_hidden_source_created ON jobs(hidden, source, created_at DESC)
WHERE hidden = 0;

-- Optimize bookmarked job queries (filter + order)
-- Used by: get_bookmarked_jobs
CREATE INDEX IF NOT EXISTS idx_jobs_bookmarked_score_created ON jobs(bookmarked, score DESC, created_at DESC)
WHERE bookmarked = 1 AND hidden = 0;

-- Optimize ghost score filtering + ordering
-- Used by: get_ghost_jobs, get_recent_jobs_filtered
CREATE INDEX IF NOT EXISTS idx_jobs_ghost_score_desc ON jobs(ghost_score DESC, hidden)
WHERE ghost_score IS NOT NULL AND hidden = 0;

-- Optimize duplicate detection by normalized title+company
-- Used by: find_duplicate_groups (window function partitioning)
CREATE INDEX IF NOT EXISTS idx_jobs_normalized_title_company ON jobs(LOWER(title), LOWER(company), score DESC, created_at ASC)
WHERE hidden = 0;

-- Optimize application attempts queries by job_hash + status
-- Used by: get_attempts_for_job, get_pending_attempts
CREATE INDEX IF NOT EXISTS idx_attempts_job_hash_created ON application_attempts(job_hash, created_at DESC);

-- Optimize pending attempts query (status + user_approved filter)
-- Used by: get_pending_attempts, get_automation_stats
CREATE INDEX IF NOT EXISTS idx_attempts_status_approved ON application_attempts(status, user_approved, created_at ASC)
WHERE user_approved = 1;

-- Optimize application queries joining with jobs
-- Used by: get_applications_by_status, interview queries
CREATE INDEX IF NOT EXISTS idx_applications_updated_desc ON applications(updated_at DESC);
