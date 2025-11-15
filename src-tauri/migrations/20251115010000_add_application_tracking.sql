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
