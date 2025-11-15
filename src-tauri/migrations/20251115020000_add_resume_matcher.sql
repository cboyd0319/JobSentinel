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
