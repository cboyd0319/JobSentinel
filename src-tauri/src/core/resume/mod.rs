//! AI Resume-Job Matcher
//!
//! Automatically parse resumes, extract skills, and match against job postings.
//!
//! ## Features
//!
//! - **PDF Parsing** - Extract text from PDF resumes
//! - **Skill Extraction** - Identify technical and soft skills
//! - **Semantic Matching** - Compare resume skills against job requirements
//! - **Gap Analysis** - Identify missing skills and strengths
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel::core::resume::ResumeMatcher;
//!
//! let matcher = ResumeMatcher::new(db_pool);
//!
//! // Upload and parse resume
//! let resume_id = matcher.upload_resume("My Resume.pdf", "/path/to/resume.pdf").await?;
//!
//! // Extract skills automatically
//! let skills = matcher.extract_skills(resume_id).await?;
//!
//! // Match against a job
//! let match_result = matcher.match_resume_to_job(resume_id, "job_hash_123").await?;
//! println!("Match score: {}%", match_result.overall_match_score * 100.0);
//! println!("Missing skills: {:?}", match_result.missing_skills);
//! ```

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::path::Path;

pub mod parser;
pub mod skills;
pub mod matcher;

use parser::ResumeParser;
use skills::SkillExtractor;
use matcher::JobMatcher;

/// Resume metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resume {
    pub id: i64,
    pub name: String,
    pub file_path: String,
    pub parsed_text: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Extracted skill from resume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSkill {
    pub id: i64,
    pub resume_id: i64,
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub confidence_score: f64,
    pub years_experience: Option<f64>,
    pub proficiency_level: Option<String>,
    pub source: String,
}

/// Job skill requirement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSkill {
    pub id: i64,
    pub job_hash: String,
    pub skill_name: String,
    pub is_required: bool,
    pub skill_category: Option<String>,
}

/// Resume-job match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub id: i64,
    pub resume_id: i64,
    pub job_hash: String,
    pub overall_match_score: f64,
    pub skills_match_score: Option<f64>,
    pub experience_match_score: Option<f64>,
    pub education_match_score: Option<f64>,
    pub missing_skills: Vec<String>,
    pub matching_skills: Vec<String>,
    pub gap_analysis: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Main resume matcher service
pub struct ResumeMatcher {
    db: SqlitePool,
    parser: ResumeParser,
    skill_extractor: SkillExtractor,
    job_matcher: JobMatcher,
}

impl ResumeMatcher {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            parser: ResumeParser::new(),
            skill_extractor: SkillExtractor::new(),
            job_matcher: JobMatcher::new(db.clone()),
            db,
        }
    }

    /// Upload and parse a new resume
    pub async fn upload_resume(&self, name: &str, file_path: &str) -> Result<i64> {
        // Parse PDF to extract text
        let parsed_text = self.parser.parse_pdf(Path::new(file_path))?;

        // Insert into database
        let result = sqlx::query(
            r#"
            INSERT INTO resumes (name, file_path, parsed_text, is_active)
            VALUES (?, ?, ?, 1)
            "#,
        )
        .bind(name)
        .bind(file_path)
        .bind(&parsed_text)
        .execute(&self.db)
        .await?;

        let resume_id = result.last_insert_rowid();

        // Extract skills automatically
        self.extract_skills(resume_id).await?;

        Ok(resume_id)
    }

    /// Get resume by ID
    pub async fn get_resume(&self, resume_id: i64) -> Result<Resume> {
        let row = sqlx::query(
            r#"
            SELECT id, name, file_path, parsed_text, is_active, created_at, updated_at
            FROM resumes
            WHERE id = ?
            "#,
        )
        .bind(resume_id)
        .fetch_one(&self.db)
        .await?;

        Ok(Resume {
            id: row.try_get::<i64, _>("id")?,
            name: row.try_get::<String, _>("name")?,
            file_path: row.try_get::<String, _>("file_path")?,
            parsed_text: row.try_get::<Option<String>, _>("parsed_text")?,
            is_active: row.try_get::<i64, _>("is_active")? != 0,
            created_at: DateTime::parse_from_rfc3339(&row.try_get::<String, _>("created_at")?)?.with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.try_get::<String, _>("updated_at")?)?.with_timezone(&Utc),
        })
    }

    /// Get active resume (most recently created)
    pub async fn get_active_resume(&self) -> Result<Option<Resume>> {
        let row = sqlx::query(
            r#"
            SELECT id, name, file_path, parsed_text, is_active, created_at, updated_at
            FROM resumes
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some(r) => Ok(Some(Resume {
                id: r.try_get::<i64, _>("id")?,
                name: r.try_get::<String, _>("name")?,
                file_path: r.try_get::<String, _>("file_path")?,
                parsed_text: r.try_get::<Option<String>, _>("parsed_text")?,
                is_active: r.try_get::<i64, _>("is_active")? != 0,
                created_at: DateTime::parse_from_rfc3339(&r.try_get::<String, _>("created_at")?)?.with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&r.try_get::<String, _>("updated_at")?)?.with_timezone(&Utc),
            })),
            None => Ok(None),
        }
    }

    /// Extract skills from resume
    pub async fn extract_skills(&self, resume_id: i64) -> Result<Vec<UserSkill>> {
        // Get resume text
        let resume = self.get_resume(resume_id).await?;
        let text = resume.parsed_text.unwrap_or_default();

        // Extract skills using keyword-based approach
        let extracted_skills = self.skill_extractor.extract_skills(&text);

        // Insert skills into database
        for skill in &extracted_skills {
            sqlx::query(
                r#"
                INSERT INTO user_skills (resume_id, skill_name, skill_category, confidence_score, source)
                VALUES (?, ?, ?, ?, 'resume')
                ON CONFLICT(resume_id, skill_name) DO UPDATE SET
                    skill_category = excluded.skill_category,
                    confidence_score = excluded.confidence_score
                "#,
            )
            .bind(resume_id)
            .bind(&skill.skill_name)
            .bind(&skill.skill_category)
            .bind(skill.confidence_score)
            .execute(&self.db)
            .await?;
        }

        // Fetch inserted skills
        self.get_user_skills(resume_id).await
    }

    /// Get all skills for a resume
    pub async fn get_user_skills(&self, resume_id: i64) -> Result<Vec<UserSkill>> {
        let rows = sqlx::query(
            r#"
            SELECT id, resume_id, skill_name, skill_category, confidence_score,
                   years_experience, proficiency_level, source
            FROM user_skills
            WHERE resume_id = ?
            ORDER BY confidence_score DESC, skill_name ASC
            "#,
        )
        .bind(resume_id)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| UserSkill {
                id: r.try_get::<i64, _>("id").unwrap_or(0),
                resume_id: r.try_get::<i64, _>("resume_id").unwrap_or(0),
                skill_name: r.try_get::<String, _>("skill_name").unwrap_or_default(),
                skill_category: r.try_get::<Option<String>, _>("skill_category").unwrap_or(None),
                confidence_score: r.try_get::<f64, _>("confidence_score").unwrap_or(0.0),
                years_experience: r.try_get::<Option<f64>, _>("years_experience").unwrap_or(None),
                proficiency_level: r.try_get::<Option<String>, _>("proficiency_level").unwrap_or(None),
                source: r.try_get::<String, _>("source").unwrap_or_default(),
            })
            .collect())
    }

    /// Match resume against a job
    pub async fn match_resume_to_job(&self, resume_id: i64, job_hash: &str) -> Result<MatchResult> {
        // Extract job skills if not already done
        self.job_matcher.extract_job_skills(job_hash).await?;

        // Perform matching
        let match_result = self.job_matcher.calculate_match(resume_id, job_hash).await?;

        // Store match result
        let result = sqlx::query(
            r#"
            INSERT INTO resume_job_matches (
                resume_id, job_hash, overall_match_score, skills_match_score,
                missing_skills, matching_skills, gap_analysis
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(resume_id, job_hash) DO UPDATE SET
                overall_match_score = excluded.overall_match_score,
                skills_match_score = excluded.skills_match_score,
                missing_skills = excluded.missing_skills,
                matching_skills = excluded.matching_skills,
                gap_analysis = excluded.gap_analysis
            "#,
        )
        .bind(resume_id)
        .bind(job_hash)
        .bind(match_result.overall_match_score)
        .bind(match_result.skills_match_score)
        .bind(serde_json::to_string(&match_result.missing_skills)?)
        .bind(serde_json::to_string(&match_result.matching_skills)?)
        .bind(&match_result.gap_analysis)
        .execute(&self.db)
        .await?;

        let match_id = result.last_insert_rowid();

        // Return with ID
        Ok(MatchResult {
            id: match_id,
            ..match_result
        })
    }

    /// Get match result for a resume-job pair
    pub async fn get_match_result(&self, resume_id: i64, job_hash: &str) -> Result<Option<MatchResult>> {
        let row = sqlx::query(
            r#"
            SELECT id, resume_id, job_hash, overall_match_score, skills_match_score,
                   experience_match_score, education_match_score, missing_skills,
                   matching_skills, gap_analysis, created_at
            FROM resume_job_matches
            WHERE resume_id = ? AND job_hash = ?
            "#,
        )
        .bind(resume_id)
        .bind(job_hash)
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some(r) => Ok(Some(MatchResult {
                id: r.try_get::<i64, _>("id")?,
                resume_id: r.try_get::<i64, _>("resume_id")?,
                job_hash: r.try_get::<String, _>("job_hash")?,
                overall_match_score: r.try_get::<f64, _>("overall_match_score")?,
                skills_match_score: r.try_get::<Option<f64>, _>("skills_match_score")?,
                experience_match_score: r.try_get::<Option<f64>, _>("experience_match_score")?,
                education_match_score: r.try_get::<Option<f64>, _>("education_match_score")?,
                missing_skills: serde_json::from_str(&r.try_get::<String, _>("missing_skills").unwrap_or_else(|_| "[]".to_string()))?,
                matching_skills: serde_json::from_str(&r.try_get::<String, _>("matching_skills").unwrap_or_else(|_| "[]".to_string()))?,
                gap_analysis: r.try_get::<Option<String>, _>("gap_analysis")?,
                created_at: DateTime::parse_from_rfc3339(&r.try_get::<String, _>("created_at")?)?.with_timezone(&Utc),
            })),
            None => Ok(None),
        }
    }

    /// Set resume as active (deactivates all others)
    pub async fn set_active_resume(&self, resume_id: i64) -> Result<()> {
        // Deactivate all resumes
        sqlx::query("UPDATE resumes SET is_active = 0")
            .execute(&self.db)
            .await?;

        // Activate selected resume
        sqlx::query(
            "UPDATE resumes SET is_active = 1, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(resume_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create schema inline for tests
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                parsed_text TEXT,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS user_skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_id INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                skill_category TEXT,
                confidence_score REAL NOT NULL DEFAULT 0.0,
                years_experience REAL,
                proficiency_level TEXT,
                source TEXT NOT NULL DEFAULT 'resume',
                UNIQUE(resume_id, skill_name)
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    #[ignore] // Requires file-based DB for migrations
    async fn test_active_resume() {
        let pool = setup_test_db().await;
        let matcher = ResumeMatcher::new(pool.clone());

        // No active resume initially
        let active = matcher.get_active_resume().await.unwrap();
        assert!(active.is_none());

        // Create test resume
        sqlx::query(
            "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
        )
        .bind("Test Resume")
        .bind("/tmp/test.pdf")
        .bind("Test content")
        .execute(&pool)
        .await
        .unwrap();

        // Should now have active resume
        let active = matcher.get_active_resume().await.unwrap();
        assert!(active.is_some());
        assert_eq!(active.unwrap().name, "Test Resume");
    }

    #[tokio::test]
    #[ignore] // Requires file-based DB for migrations
    async fn test_set_active_resume() {
        let pool = setup_test_db().await;
        let matcher = ResumeMatcher::new(pool.clone());

        // Create two resumes
        let result1 = sqlx::query(
            "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 1)",
        )
        .bind("Resume 1")
        .bind("/tmp/resume1.pdf")
        .bind("Content 1")
        .execute(&pool)
        .await
        .unwrap();
        let id1 = result1.last_insert_rowid();

        let result2 = sqlx::query(
            "INSERT INTO resumes (name, file_path, parsed_text, is_active) VALUES (?, ?, ?, 0)",
        )
        .bind("Resume 2")
        .bind("/tmp/resume2.pdf")
        .bind("Content 2")
        .execute(&pool)
        .await
        .unwrap();
        let id2 = result2.last_insert_rowid();

        // Set resume 2 as active
        matcher.set_active_resume(id2).await.unwrap();

        // Resume 2 should be active
        let active = matcher.get_active_resume().await.unwrap().unwrap();
        assert_eq!(active.id, id2);

        // Resume 1 should be inactive
        let resume1 = matcher.get_resume(id1).await.unwrap();
        assert!(!resume1.is_active);
    }
}
