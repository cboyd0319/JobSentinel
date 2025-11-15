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
