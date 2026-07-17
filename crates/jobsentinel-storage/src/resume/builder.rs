use crate::sqlite_time::parse_sqlite_datetime;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

mod deserialization;

use deserialization::{
    optional_lowercase_string_from_value, optional_string_from_value, string_from_value,
    string_vec_from_value,
};
use sqlx::SqlitePool;

/// Complete resume data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeData {
    pub id: i64,
    pub contact: ContactInfo,
    pub summary: String,
    pub experience: Vec<Experience>,
    pub education: Vec<Education>,
    pub skills: Vec<SkillEntry>,
    pub certifications: Vec<Certification>,
    pub projects: Vec<Project>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Contact information section
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin: Option<String>,
    pub github: Option<String>,
    pub location: Option<String>,
    pub website: Option<String>,
}

/// Work experience entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experience {
    #[serde(default)]
    pub id: i64,
    pub company: String,
    pub title: String,
    #[serde(default)]
    pub location: Option<String>,
    pub start_date: String, // "2020-01" format
    #[serde(default)]
    pub end_date: Option<String>, // None means current
    #[serde(default)]
    pub is_current: bool,
    #[serde(default, alias = "bullets")]
    pub achievements: Vec<String>, // Action-verb bullet points
}

/// Education entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    #[serde(default)]
    pub id: i64,
    pub institution: String,
    pub degree: String,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(
        default,
        alias = "graduation_year",
        deserialize_with = "optional_string_from_value"
    )]
    pub graduation_date: Option<String>,
    #[serde(default, deserialize_with = "optional_string_from_value")]
    pub gpa: Option<String>,
    #[serde(default, deserialize_with = "string_vec_from_value")]
    pub honors: Vec<String>,
}

/// Skill entry with categorization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEntry {
    pub name: String,
    #[serde(default, deserialize_with = "string_from_value")]
    pub category: String,
    #[serde(default, deserialize_with = "optional_lowercase_string_from_value")]
    pub proficiency: Option<String>,
    #[serde(default)]
    pub years_experience: Option<f64>,
}

/// Skill category enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SkillCategory {
    ProgrammingLanguage,
    Framework,
    Tool,
    Database,
    CloudPlatform,
    SoftSkill,
    Other,
}

/// Proficiency level enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Proficiency {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

impl Proficiency {
    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            Self::Beginner => "beginner",
            Self::Intermediate => "intermediate",
            Self::Advanced => "advanced",
            Self::Expert => "expert",
        }
    }
}

/// Certification entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Certification {
    pub name: String,
    pub issuer: String,
    pub date_obtained: Option<String>,
    pub expiration_date: Option<String>,
    pub credential_id: Option<String>,
}

/// Project entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub description: String,
    pub technologies: Vec<String>,
    pub url: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Resume builder for creating and managing resumes
pub struct ResumeBuilder {
    pool: SqlitePool,
}

impl ResumeBuilder {
    /// Create a new resume builder
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a new empty resume draft
    pub async fn create_resume(&self) -> Result<i64> {
        let empty_data = ResumeData {
            id: 0, // Will be replaced by database
            contact: ContactInfo {
                name: String::new(),
                email: String::new(),
                phone: None,
                linkedin: None,
                github: None,
                location: None,
                website: None,
            },
            summary: String::new(),
            experience: Vec::new(),
            education: Vec::new(),
            skills: Vec::new(),
            certifications: Vec::new(),
            projects: Vec::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let data_json =
            serde_json::to_string(&empty_data).context("Failed to serialize empty resume data")?;

        let result = sqlx::query(
            r#"
            INSERT INTO resume_drafts (data, created_at, updated_at)
            VALUES (?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(&data_json)
        .execute(&self.pool)
        .await
        .context("Failed to create resume draft")?;

        Ok(result.last_insert_rowid())
    }

    /// Get a resume by ID
    pub async fn get_resume(&self, resume_id: i64) -> Result<Option<ResumeData>> {
        let row = sqlx::query(
            r#"
            SELECT data, created_at, updated_at
            FROM resume_drafts
            WHERE id = ?
            "#,
        )
        .bind(resume_id)
        .fetch_optional(&self.pool)
        .await
        .context("Failed to fetch resume")?;

        let Some(row) = row else {
            return Ok(None);
        };

        use sqlx::Row;
        let data: String = row.try_get("data").context("Failed to get data column")?;
        let created_at: String = row
            .try_get("created_at")
            .context("Failed to get created_at column")?;
        let updated_at: String = row
            .try_get("updated_at")
            .context("Failed to get updated_at column")?;

        let mut resume: ResumeData =
            serde_json::from_str(&data).context("Failed to deserialize resume data")?;

        resume.id = resume_id;

        resume.created_at =
            parse_sqlite_datetime(&created_at).context("Failed to parse created_at")?;
        resume.updated_at =
            parse_sqlite_datetime(&updated_at).context("Failed to parse updated_at")?;

        Ok(Some(resume))
    }

    /// Update contact information
    pub async fn update_contact(&self, resume_id: i64, contact: ContactInfo) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        resume.contact = contact;
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Update professional summary
    pub async fn update_summary(&self, resume_id: i64, summary: String) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        resume.summary = summary;
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Add work experience entry
    pub async fn add_experience(&self, resume_id: i64, mut exp: Experience) -> Result<i64> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        // Generate new ID
        let new_id = resume.experience.iter().map(|e| e.id).max().unwrap_or(0) + 1;

        exp.id = new_id;
        resume.experience.push(exp);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await?;
        Ok(new_id)
    }

    /// Update existing work experience entry
    pub async fn update_experience(&self, resume_id: i64, exp: Experience) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        let entry = resume
            .experience
            .iter_mut()
            .find(|e| e.id == exp.id)
            .context("Experience entry not found")?;

        *entry = exp;
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Delete work experience entry
    pub async fn delete_experience(&self, resume_id: i64, exp_id: i64) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        if !resume.experience.iter().any(|e| e.id == exp_id) {
            anyhow::bail!("Experience entry not found");
        }

        resume.experience.retain(|e| e.id != exp_id);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Add education entry
    pub async fn add_education(&self, resume_id: i64, mut edu: Education) -> Result<i64> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        // Generate new ID
        let new_id = resume.education.iter().map(|e| e.id).max().unwrap_or(0) + 1;

        edu.id = new_id;
        resume.education.push(edu);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await?;
        Ok(new_id)
    }

    /// Update existing education entry
    pub async fn update_education(&self, resume_id: i64, edu: Education) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        let entry = resume
            .education
            .iter_mut()
            .find(|e| e.id == edu.id)
            .context("Education entry not found")?;

        *entry = edu;
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Delete education entry
    pub async fn delete_education(&self, resume_id: i64, edu_id: i64) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        if !resume.education.iter().any(|e| e.id == edu_id) {
            anyhow::bail!("Education entry not found");
        }

        resume.education.retain(|e| e.id != edu_id);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Set skills (replaces all existing skills)
    pub async fn set_skills(&self, resume_id: i64, skills: Vec<SkillEntry>) -> Result<()> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        resume.skills = skills;
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await
    }

    /// Add certification entry
    pub async fn add_certification(&self, resume_id: i64, cert: Certification) -> Result<i64> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        resume.certifications.push(cert);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await?;

        // Return count as pseudo-ID (certifications don't have separate IDs)
        Ok(resume.certifications.len() as i64)
    }

    /// Add project entry
    pub async fn add_project(&self, resume_id: i64, project: Project) -> Result<i64> {
        let mut resume = self
            .get_resume(resume_id)
            .await?
            .context("Resume not found")?;

        resume.projects.push(project);
        resume.updated_at = Utc::now();

        self.save_resume(resume_id, &resume).await?;

        // Return count as pseudo-ID (projects don't have separate IDs)
        Ok(resume.projects.len() as i64)
    }

    /// Delete a resume draft
    pub async fn delete_resume(&self, resume_id: i64) -> Result<()> {
        let result = sqlx::query(
            r#"
            DELETE FROM resume_drafts
            WHERE id = ?
            "#,
        )
        .bind(resume_id)
        .execute(&self.pool)
        .await
        .context("Failed to delete resume")?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Resume not found");
        }

        Ok(())
    }

    /// Internal helper to save resume data
    async fn save_resume(&self, resume_id: i64, resume: &ResumeData) -> Result<()> {
        let data_json = serde_json::to_string(resume).context("Failed to serialize resume data")?;

        let result = sqlx::query(
            r#"
            UPDATE resume_drafts
            SET data = ?, updated_at = datetime('now')
            WHERE id = ?
            "#,
        )
        .bind(&data_json)
        .bind(resume_id)
        .execute(&self.pool)
        .await
        .context("Failed to update resume")?;

        if result.rows_affected() == 0 {
            anyhow::bail!("Resume not found");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests;
