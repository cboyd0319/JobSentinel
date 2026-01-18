use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
    pub id: i64,
    pub company: String,
    pub title: String,
    pub location: Option<String>,
    pub start_date: String,       // "2020-01" format
    pub end_date: Option<String>, // None means current
    pub is_current: bool,
    pub bullets: Vec<String>, // Action-verb bullet points
}

/// Education entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Education {
    pub id: i64,
    pub institution: String,
    pub degree: String,
    pub field_of_study: Option<String>,
    pub graduation_year: Option<i32>,
    pub gpa: Option<f64>,
    pub honors: Option<String>,
}

/// Skill entry with categorization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillEntry {
    pub name: String,
    pub category: SkillCategory,
    pub proficiency: Proficiency,
    pub years_experience: Option<f64>,
}

/// Skill category enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Proficiency {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
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

        // Try RFC3339 first, then fall back to SQLite datetime format
        resume.created_at = DateTime::parse_from_rfc3339(&created_at)
            .map(|dt| dt.with_timezone(&Utc))
            .or_else(|_| {
                chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%d %H:%M:%S")
                    .map(|dt| chrono::TimeZone::from_utc_datetime(&Utc, &dt))
            })
            .context("Failed to parse created_at")?;

        resume.updated_at = DateTime::parse_from_rfc3339(&updated_at)
            .map(|dt| dt.with_timezone(&Utc))
            .or_else(|_| {
                chrono::NaiveDateTime::parse_from_str(&updated_at, "%Y-%m-%d %H:%M:%S")
                    .map(|dt| chrono::TimeZone::from_utc_datetime(&Utc, &dt))
            })
            .context("Failed to parse updated_at")?;

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
        sqlx::query(
            r#"
            DELETE FROM resume_drafts
            WHERE id = ?
            "#,
        )
        .bind(resume_id)
        .execute(&self.pool)
        .await
        .context("Failed to delete resume")?;

        Ok(())
    }

    /// Internal helper to save resume data
    async fn save_resume(&self, resume_id: i64, resume: &ResumeData) -> Result<()> {
        let data_json = serde_json::to_string(resume).context("Failed to serialize resume data")?;

        sqlx::query(
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

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Create resume_drafts table
        sqlx::query(
            r#"
            CREATE TABLE resume_drafts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_resume() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();
        assert!(resume_id > 0);

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.id, resume_id);
        assert!(resume.contact.name.is_empty());
        assert!(resume.summary.is_empty());
    }

    #[tokio::test]
    async fn test_update_contact() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let contact = ContactInfo {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            phone: Some("+1-555-0100".to_string()),
            linkedin: Some("linkedin.com/in/johndoe".to_string()),
            github: Some("github.com/johndoe".to_string()),
            location: Some("San Francisco, CA".to_string()),
            website: Some("johndoe.com".to_string()),
        };

        builder
            .update_contact(resume_id, contact.clone())
            .await
            .unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.contact.name, "John Doe");
        assert_eq!(resume.contact.email, "john@example.com");
        assert_eq!(resume.contact.phone.unwrap(), "+1-555-0100");
    }

    #[tokio::test]
    async fn test_add_experience() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let exp = Experience {
            id: 0, // Will be assigned
            company: "TechCorp".to_string(),
            title: "Senior Engineer".to_string(),
            location: Some("Remote".to_string()),
            start_date: "2020-01".to_string(),
            end_date: None,
            is_current: true,
            bullets: vec![
                "Led team of 5 engineers".to_string(),
                "Shipped 3 major features".to_string(),
            ],
        };

        let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
        assert_eq!(exp_id, 1);

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.experience.len(), 1);
        assert_eq!(resume.experience[0].company, "TechCorp");
        assert_eq!(resume.experience[0].bullets.len(), 2);
    }

    #[tokio::test]
    async fn test_delete_experience() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let exp = Experience {
            id: 0,
            company: "TechCorp".to_string(),
            title: "Senior Engineer".to_string(),
            location: None,
            start_date: "2020-01".to_string(),
            end_date: None,
            is_current: true,
            bullets: vec![],
        };

        let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
        builder.delete_experience(resume_id, exp_id).await.unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.experience.len(), 0);
    }

    #[tokio::test]
    async fn test_set_skills() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let skills = vec![
            SkillEntry {
                name: "Rust".to_string(),
                category: SkillCategory::ProgrammingLanguage,
                proficiency: Proficiency::Expert,
                years_experience: Some(5.0),
            },
            SkillEntry {
                name: "Tokio".to_string(),
                category: SkillCategory::Framework,
                proficiency: Proficiency::Advanced,
                years_experience: Some(3.0),
            },
        ];

        builder.set_skills(resume_id, skills).await.unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.skills.len(), 2);
        assert_eq!(resume.skills[0].name, "Rust");
    }

    #[tokio::test]
    async fn test_delete_resume() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();
        builder.delete_resume(resume_id).await.unwrap();

        let result = builder.get_resume(resume_id).await.unwrap();
        assert!(result.is_none());
    }
}
