//! AI Resume-Job Matcher
//!
//! Automatically parse resumes, extract skills, and match against job postings.
//!
//! ## Features
//!
//! - **Local Resume Parsing** - Extract text from PDF, DOCX, TXT, and Markdown resumes
//! - **Skill Extraction** - Identify technical, workplace, and role-specific skills
//! - **Semantic Matching** - Compare resume skills against job requirements
//! - **Gap Analysis** - Identify missing skills and strengths
//! - **Application-readable Templates** - 5 professional resume templates
//! - **Resume Builder** - Interactive resume creation with CRUD operations
//! - **Resume Readability Analyzer** - job-word extraction and format clarity checks
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel::core::resume::ResumeMatcher;
//!
//! let matcher = ResumeMatcher::new(db_pool);
//!
//! // Upload and parse resume
//! let resume_id = matcher.upload_resume("My Resume.docx", "/path/to/resume.docx").await?;
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
use chrono::{DateTime, TimeZone, Utc};
use sqlx::{Row, SqlitePool};
use std::path::Path;

// Module declarations
pub mod ats_analyzer;
pub mod builder;
pub mod export;
pub mod json_resume;
pub mod matcher;
pub mod parser;
pub mod skills;
pub mod templates;
pub mod types;

use matcher::JobMatcher;
use parser::ResumeParser;
use skills::SkillExtractor;
use types::NullableFieldUpdate;

// Re-export ATS analyzer types
pub use ats_analyzer::{
    AtsAnalysisResult, AtsAnalyzer, AtsSuggestion, FormatIssue, IssueSeverity, KeywordImportance,
    KeywordMatch, MissingKeyword, SuggestionCategory,
};

// Re-export builder types
pub use builder::{
    Certification as BuilderCertification, ContactInfo as BuilderContactInfo,
    Education as BuilderEducation, Experience as BuilderExperience, Proficiency, Project,
    ResumeBuilder, ResumeData as BuilderResumeData, SkillCategory as BuilderSkillCategory,
    SkillEntry,
};

// Re-export export types
pub use export::{
    Certification as ExportCertification, EducationEntry, ExperienceEntry, PersonalInfo,
    Project as ExportProject, ResumeData as ExportResumeData, ResumeExporter,
    SkillCategory as ExportSkillCategory, TemplateId as ExportTemplateId,
};

// Re-export JSON Resume types
pub use json_resume::JsonResume;

// Re-export template rendering types
pub use templates::{
    Certification, ContactInfo, Education, Experience, ResumeData, SkillCategory, Template,
    TemplateId, TemplateRenderer,
};

// Re-export core types
pub use types::{
    ContactInfo as AtsContactInfo, DegreeLevel, Education as AtsEducation, EducationRequirement,
    Experience as AtsExperience, ExperienceRequirement, JobSkill, MatchResult, MatchResultWithJob,
    NewSkill, Resume, ResumeData as AtsResumeData, Skill, SkillUpdate, UserSkill,
};

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
        // Parse local resume file to extract readable text.
        let parsed_text = self.parser.parse_resume(Path::new(file_path))?;

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

        let created_str = row.try_get::<String, _>("created_at")?;
        let updated_str = row.try_get::<String, _>("updated_at")?;

        // Try RFC3339 first, then fall back to SQLite format
        let created_at = DateTime::parse_from_rfc3339(&created_str)
            .map(|dt| dt.with_timezone(&Utc))
            .or_else(|_| {
                chrono::NaiveDateTime::parse_from_str(&created_str, "%Y-%m-%d %H:%M:%S")
                    .map(|dt| Utc.from_utc_datetime(&dt))
            })?;

        let updated_at = DateTime::parse_from_rfc3339(&updated_str)
            .map(|dt| dt.with_timezone(&Utc))
            .or_else(|_| {
                chrono::NaiveDateTime::parse_from_str(&updated_str, "%Y-%m-%d %H:%M:%S")
                    .map(|dt| Utc.from_utc_datetime(&dt))
            })?;

        Ok(Resume {
            id: row.try_get::<i64, _>("id")?,
            name: row.try_get::<String, _>("name")?,
            file_path: row.try_get::<String, _>("file_path")?,
            parsed_text: row.try_get::<Option<String>, _>("parsed_text")?,
            is_active: row.try_get::<i64, _>("is_active")? != 0,
            created_at,
            updated_at,
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
            Some(r) => {
                let created_str = r.try_get::<String, _>("created_at")?;
                let updated_str = r.try_get::<String, _>("updated_at")?;

                // Try RFC3339 first, then fall back to SQLite format
                let created_at = DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .or_else(|_| {
                        chrono::NaiveDateTime::parse_from_str(&created_str, "%Y-%m-%d %H:%M:%S")
                            .map(|dt| Utc.from_utc_datetime(&dt))
                    })?;

                let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .or_else(|_| {
                        chrono::NaiveDateTime::parse_from_str(&updated_str, "%Y-%m-%d %H:%M:%S")
                            .map(|dt| Utc.from_utc_datetime(&dt))
                    })?;

                Ok(Some(Resume {
                    id: r.try_get::<i64, _>("id")?,
                    name: r.try_get::<String, _>("name")?,
                    file_path: r.try_get::<String, _>("file_path")?,
                    parsed_text: r.try_get::<Option<String>, _>("parsed_text")?,
                    is_active: r.try_get::<i64, _>("is_active")? != 0,
                    created_at,
                    updated_at,
                }))
            }
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
                skill_category: r
                    .try_get::<Option<String>, _>("skill_category")
                    .unwrap_or(None),
                confidence_score: r.try_get::<f64, _>("confidence_score").unwrap_or(0.0),
                years_experience: r
                    .try_get::<Option<f64>, _>("years_experience")
                    .unwrap_or(None),
                proficiency_level: r
                    .try_get::<Option<String>, _>("proficiency_level")
                    .unwrap_or(None),
                source: r.try_get::<String, _>("source").unwrap_or_default(),
            })
            .collect())
    }

    /// Match resume against a job
    pub async fn match_resume_to_job(&self, resume_id: i64, job_hash: &str) -> Result<MatchResult> {
        // Extract job skills if not already done
        self.job_matcher.extract_job_skills(job_hash).await?;

        // Perform matching
        let match_result = self
            .job_matcher
            .calculate_match(resume_id, job_hash)
            .await?;

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
    pub async fn get_match_result(
        &self,
        resume_id: i64,
        job_hash: &str,
    ) -> Result<Option<MatchResult>> {
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
            Some(r) => {
                let created_str = r.try_get::<String, _>("created_at")?;

                // Try RFC3339 first, then fall back to SQLite format
                let created_at = DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .or_else(|_| {
                        chrono::NaiveDateTime::parse_from_str(&created_str, "%Y-%m-%d %H:%M:%S")
                            .map(|dt| Utc.from_utc_datetime(&dt))
                    })?;

                // Handle missing_skills and matching_skills JSON with proper NULL handling
                let missing_skills_str = r
                    .try_get::<Option<String>, _>("missing_skills")
                    .unwrap_or(None)
                    .unwrap_or_else(|| "[]".to_string());
                let matching_skills_str = r
                    .try_get::<Option<String>, _>("matching_skills")
                    .unwrap_or(None)
                    .unwrap_or_else(|| "[]".to_string());

                Ok(Some(MatchResult {
                    id: r.try_get::<i64, _>("id")?,
                    resume_id: r.try_get::<i64, _>("resume_id")?,
                    job_hash: r.try_get::<String, _>("job_hash")?,
                    overall_match_score: r.try_get::<f64, _>("overall_match_score")?,
                    skills_match_score: r.try_get::<Option<f64>, _>("skills_match_score")?,
                    experience_match_score: r
                        .try_get::<Option<f64>, _>("experience_match_score")?,
                    education_match_score: r.try_get::<Option<f64>, _>("education_match_score")?,
                    missing_skills: serde_json::from_str(&missing_skills_str)?,
                    matching_skills: serde_json::from_str(&matching_skills_str)?,
                    gap_analysis: r.try_get::<Option<String>, _>("gap_analysis")?,
                    created_at,
                }))
            }
            None => Ok(None),
        }
    }

    /// Get recent match results for a resume with job titles
    pub async fn get_recent_matches(
        &self,
        resume_id: i64,
        limit: i64,
    ) -> Result<Vec<MatchResultWithJob>> {
        let rows = sqlx::query(
            r#"
            SELECT m.id, m.resume_id, m.job_hash, m.overall_match_score, m.skills_match_score,
                   m.experience_match_score, m.education_match_score,
                   m.missing_skills, m.matching_skills, m.gap_analysis, m.created_at,
                   j.title as job_title, j.company
            FROM resume_job_matches m
            LEFT JOIN jobs j ON m.job_hash = j.hash
            WHERE m.resume_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
            "#,
        )
        .bind(resume_id)
        .bind(limit)
        .fetch_all(&self.db)
        .await?;

        let mut results = Vec::new();
        for r in rows {
            let created_str = r.try_get::<String, _>("created_at")?;

            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .or_else(|_| {
                    chrono::NaiveDateTime::parse_from_str(&created_str, "%Y-%m-%d %H:%M:%S")
                        .map(|dt| Utc.from_utc_datetime(&dt))
                })?;

            let missing_skills_str = r
                .try_get::<Option<String>, _>("missing_skills")
                .unwrap_or(None)
                .unwrap_or_else(|| "[]".to_string());
            let matching_skills_str = r
                .try_get::<Option<String>, _>("matching_skills")
                .unwrap_or(None)
                .unwrap_or_else(|| "[]".to_string());

            results.push(MatchResultWithJob {
                id: r.try_get::<i64, _>("id")?,
                resume_id: r.try_get::<i64, _>("resume_id")?,
                job_hash: r.try_get::<String, _>("job_hash")?,
                job_title: r
                    .try_get::<Option<String>, _>("job_title")?
                    .unwrap_or_else(|| "Unknown Job".to_string()),
                company: r
                    .try_get::<Option<String>, _>("company")?
                    .unwrap_or_else(|| "Unknown Company".to_string()),
                overall_match_score: r.try_get::<f64, _>("overall_match_score")?,
                skills_match_score: r.try_get::<Option<f64>, _>("skills_match_score")?,
                experience_match_score: r.try_get::<Option<f64>, _>("experience_match_score")?,
                education_match_score: r.try_get::<Option<f64>, _>("education_match_score")?,
                missing_skills: serde_json::from_str(&missing_skills_str)?,
                matching_skills: serde_json::from_str(&matching_skills_str)?,
                gap_analysis: r.try_get::<Option<String>, _>("gap_analysis")?,
                created_at,
            });
        }

        Ok(results)
    }

    /// Set resume as active (deactivates all others)
    pub async fn set_active_resume(&self, resume_id: i64) -> Result<()> {
        let result = sqlx::query(
            r#"
            UPDATE resumes
            SET
                is_active = CASE WHEN id = ? THEN 1 ELSE 0 END,
                updated_at = CASE WHEN id = ? THEN datetime('now') ELSE updated_at END
            WHERE EXISTS (SELECT 1 FROM resumes WHERE id = ?)
            "#,
        )
        .bind(resume_id)
        .bind(resume_id)
        .bind(resume_id)
        .execute(&self.db)
        .await?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Resume with id {} not found", resume_id);
        }

        Ok(())
    }

    // ========================================================================
    // Skill CRUD Operations (Phase 1: Skill Validation UI)
    // ========================================================================

    /// Update an existing user skill
    pub async fn update_user_skill(
        &self,
        skill_id: i64,
        updates: types::SkillUpdate,
    ) -> Result<()> {
        if updates.skill_name.is_none()
            && updates.skill_category.is_unset()
            && updates.proficiency_level.is_unset()
            && updates.years_experience.is_unset()
        {
            return Ok(());
        }

        ensure_user_skill_exists(&self.db, skill_id).await?;

        if let Some(name) = updates.skill_name {
            let name = normalize_skill_name(&name)?;
            sqlx::query("UPDATE user_skills SET skill_name = ? WHERE id = ?")
                .bind(name)
                .bind(skill_id)
                .execute(&self.db)
                .await?;
        }
        if !updates.skill_category.is_unset() {
            let category = match updates.skill_category {
                NullableFieldUpdate::Unset => unreachable!(),
                NullableFieldUpdate::Clear => None,
                NullableFieldUpdate::Set(category) => normalize_optional_skill_text(Some(category)),
            };
            sqlx::query("UPDATE user_skills SET skill_category = ? WHERE id = ?")
                .bind(category)
                .bind(skill_id)
                .execute(&self.db)
                .await?;
        }
        if !updates.proficiency_level.is_unset() {
            let level = match updates.proficiency_level {
                NullableFieldUpdate::Unset => unreachable!(),
                NullableFieldUpdate::Clear => None,
                NullableFieldUpdate::Set(level) => normalize_optional_skill_text(Some(level)),
            };
            sqlx::query("UPDATE user_skills SET proficiency_level = ? WHERE id = ?")
                .bind(level)
                .bind(skill_id)
                .execute(&self.db)
                .await?;
        }
        if !updates.years_experience.is_unset() {
            let years = match updates.years_experience {
                NullableFieldUpdate::Unset => unreachable!(),
                NullableFieldUpdate::Clear => None,
                NullableFieldUpdate::Set(years) => validate_skill_years(Some(years))?,
            };
            sqlx::query("UPDATE user_skills SET years_experience = ? WHERE id = ?")
                .bind(years)
                .bind(skill_id)
                .execute(&self.db)
                .await?;
        }

        tracing::info!("Updated skill {}", skill_id);
        Ok(())
    }

    /// Delete a user skill
    pub async fn delete_user_skill(&self, skill_id: i64) -> Result<()> {
        let result = sqlx::query("DELETE FROM user_skills WHERE id = ?")
            .bind(skill_id)
            .execute(&self.db)
            .await?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Skill with id {} not found", skill_id);
        }

        tracing::info!("Deleted skill {}", skill_id);
        Ok(())
    }

    /// Add a new skill manually
    pub async fn add_user_skill(&self, resume_id: i64, skill: types::NewSkill) -> Result<i64> {
        let skill_name = normalize_skill_name(&skill.skill_name)?;
        let skill_category = normalize_optional_skill_text(skill.skill_category);
        let proficiency_level = normalize_optional_skill_text(skill.proficiency_level);
        let years_experience = validate_skill_years(skill.years_experience)?;

        let result = sqlx::query(
            r#"
            INSERT INTO user_skills (
                resume_id, skill_name, skill_category, confidence_score,
                proficiency_level, years_experience, source
            )
            VALUES (?, ?, ?, 1.0, ?, ?, 'user_input')
            "#,
        )
        .bind(resume_id)
        .bind(&skill_name)
        .bind(&skill_category)
        .bind(&proficiency_level)
        .bind(years_experience)
        .execute(&self.db)
        .await?;

        let skill_id = result.last_insert_rowid();
        tracing::info!(
            resume_id,
            skill_id,
            skill_name_chars = skill_name.chars().count(),
            "Added manual skill"
        );

        Ok(skill_id)
    }

    // ========================================================================
    // Resume Library Operations (Phase 2)
    // ========================================================================

    /// List all resumes
    pub async fn list_all_resumes(&self) -> Result<Vec<Resume>> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, file_path, parsed_text, is_active, created_at, updated_at
            FROM resumes
            ORDER BY is_active DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        let mut resumes = Vec::new();
        for row in rows {
            let created_str = row.try_get::<String, _>("created_at")?;
            let updated_str = row.try_get::<String, _>("updated_at")?;

            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .or_else(|_| {
                    chrono::NaiveDateTime::parse_from_str(&created_str, "%Y-%m-%d %H:%M:%S")
                        .map(|dt| Utc.from_utc_datetime(&dt))
                })?;

            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .or_else(|_| {
                    chrono::NaiveDateTime::parse_from_str(&updated_str, "%Y-%m-%d %H:%M:%S")
                        .map(|dt| Utc.from_utc_datetime(&dt))
                })?;

            resumes.push(Resume {
                id: row.try_get::<i64, _>("id")?,
                name: row.try_get::<String, _>("name")?,
                file_path: row.try_get::<String, _>("file_path")?,
                parsed_text: row.try_get::<Option<String>, _>("parsed_text")?,
                is_active: row.try_get::<i64, _>("is_active")? != 0,
                created_at,
                updated_at,
            });
        }

        Ok(resumes)
    }

    /// Delete a resume and its associated skills
    pub async fn delete_resume(&self, resume_id: i64) -> Result<()> {
        // Delete associated skills first
        sqlx::query("DELETE FROM user_skills WHERE resume_id = ?")
            .bind(resume_id)
            .execute(&self.db)
            .await?;

        // Delete associated matches
        sqlx::query("DELETE FROM resume_job_matches WHERE resume_id = ?")
            .bind(resume_id)
            .execute(&self.db)
            .await?;

        // Delete the resume
        let result = sqlx::query("DELETE FROM resumes WHERE id = ?")
            .bind(resume_id)
            .execute(&self.db)
            .await?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Resume with id {} not found", resume_id);
        }

        tracing::info!("Deleted resume {} and associated data", resume_id);
        Ok(())
    }

    // ========================================================================
    // JSON Resume Import Operations
    // ========================================================================

    /// Import a resume from JSON Resume format
    ///
    /// Parses a JSON Resume string, converts it to JobSentinel's internal format,
    /// and creates a new resume draft in the database.
    ///
    /// # Arguments
    /// * `name` - Name for the imported resume
    /// * `json_string` - JSON Resume formatted string
    ///
    /// # Returns
    /// The ID of the newly created resume draft
    ///
    /// # Errors
    /// Returns an error if JSON parsing fails or database insertion fails
    pub async fn import_json_resume(&self, _name: String, json_string: &str) -> Result<i64> {
        use anyhow::Context;

        // Parse JSON Resume
        let json_resume = json_resume::JsonResume::from_json(json_string)
            .context("Failed to parse JSON Resume")?;

        // Convert to JobSentinel ResumeData (which has different field names than builder)
        let json_data = json_resume
            .to_resume_data()
            .context("Failed to convert JSON Resume to internal format")?;

        // Create resume draft using ResumeBuilder
        let builder = builder::ResumeBuilder::new(self.db.clone());
        let resume_id = builder.create_resume().await?;

        // Convert JSON Resume types to builder types and populate the draft
        let contact = builder::ContactInfo {
            name: json_data.contact_info.name,
            email: json_data.contact_info.email,
            phone: Some(json_data.contact_info.phone),
            linkedin: json_data.contact_info.linkedin,
            github: json_data.contact_info.github,
            location: Some(json_data.contact_info.location),
            website: json_data.contact_info.website,
        };

        builder.update_contact(resume_id, contact).await?;
        builder.update_summary(resume_id, json_data.summary).await?;

        // Add experience entries - convert from json_resume types to builder types
        for exp in json_data.experience {
            let builder_exp = builder::Experience {
                id: 0, // Will be assigned by database
                company: exp.company,
                title: exp.title,
                location: Some(exp.location),
                start_date: exp.start_date,
                end_date: if exp.current {
                    None
                } else {
                    Some(exp.end_date)
                },
                is_current: exp.current,
                bullets: exp.achievements,
            };
            builder.add_experience(resume_id, builder_exp).await?;
        }

        // Add education entries
        for edu in json_data.education {
            let builder_edu = builder::Education {
                id: 0, // Will be assigned by database
                institution: edu.institution,
                degree: edu.degree,
                field_of_study: None,
                graduation_year: edu.graduation_date.parse::<i32>().ok(),
                gpa: edu.gpa,
                honors: Some(edu.honors.join(", ")),
            };
            builder.add_education(resume_id, builder_edu).await?;
        }

        // Set skills - convert from json_resume types to builder types
        let builder_skills: Vec<builder::SkillEntry> = json_data
            .skills
            .into_iter()
            .map(|s| builder::SkillEntry {
                name: s.name,
                category: builder::SkillCategory::Other, // Default category
                proficiency: s.proficiency.unwrap_or(builder::Proficiency::Intermediate),
                years_experience: None,
            })
            .collect();

        builder.set_skills(resume_id, builder_skills).await?;

        // Add certifications
        for cert in json_data.certifications {
            let builder_cert = builder::Certification {
                name: cert.name,
                issuer: cert.issuer,
                date_obtained: Some(cert.date),
                expiration_date: None,
                credential_id: None,
            };
            builder.add_certification(resume_id, builder_cert).await?;
        }

        tracing::info!("Imported JSON Resume as draft {}", resume_id);
        Ok(resume_id)
    }
}

fn normalize_skill_name(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        anyhow::bail!("Skill name is required");
    }
    Ok(trimmed.to_string())
}

async fn ensure_user_skill_exists(db: &SqlitePool, skill_id: i64) -> Result<()> {
    let row = sqlx::query("SELECT id FROM user_skills WHERE id = ?")
        .bind(skill_id)
        .fetch_optional(db)
        .await?;

    if row.is_none() {
        anyhow::bail!("Skill with id {} not found", skill_id);
    }

    Ok(())
}

fn normalize_optional_skill_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn validate_skill_years(value: Option<f64>) -> Result<Option<f64>> {
    match value {
        Some(years) if !years.is_finite() => anyhow::bail!("Skill years must be a number"),
        Some(years) if !(0.0..=50.0).contains(&years) => {
            anyhow::bail!("Skill years must be between 0 and 50")
        }
        other => Ok(other),
    }
}

#[cfg(test)]
mod tests;
