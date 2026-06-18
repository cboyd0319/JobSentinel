use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{de, Deserialize, Deserializer, Serialize};
use serde_json::Value;
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

fn optional_string_from_value<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<Value>::deserialize(deserializer)?;
    value_to_optional_string(value).map_err(de::Error::custom)
}

fn optional_lowercase_string_from_value<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(optional_string_from_value(deserializer)?.map(|value| value.to_ascii_lowercase()))
}

fn string_from_value<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(optional_string_from_value(deserializer)?.unwrap_or_default())
}

fn string_vec_from_value<'de, D>(deserializer: D) -> std::result::Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<Value>::deserialize(deserializer)?;
    let Some(value) = value else {
        return Ok(Vec::new());
    };

    match value {
        Value::Null => Ok(Vec::new()),
        Value::String(value) => Ok(split_legacy_honors_string(&value)),
        Value::Array(values) => values
            .into_iter()
            .filter_map(|value| match value_to_optional_string(Some(value)) {
                Ok(Some(value)) => Some(Ok(value)),
                Ok(None) => None,
                Err(error) => Some(Err(error)),
            })
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(de::Error::custom),
        other => value_to_optional_string(Some(other))
            .map(|value| value.into_iter().collect())
            .map_err(de::Error::custom),
    }
}

fn split_legacy_honors_string(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn value_to_optional_string(value: Option<Value>) -> std::result::Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };

    match value {
        Value::Null => Ok(None),
        Value::String(value) => Ok(Some(value)),
        Value::Number(value) => Ok(Some(value.to_string())),
        Value::Bool(value) => Ok(Some(value.to_string())),
        Value::Array(_) | Value::Object(_) => Err("expected string-compatible value".to_string()),
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
            name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: Some("+1-555-0100".to_string()),
            linkedin: Some("linkedin.com/in/jordan-lee".to_string()),
            github: None,
            location: Some("Portland, OR".to_string()),
            website: Some("jordanlee.example.com".to_string()),
        };

        builder
            .update_contact(resume_id, contact.clone())
            .await
            .unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.contact.name, "Jordan Lee");
        assert_eq!(resume.contact.email, "jordan@example.com");
        assert_eq!(resume.contact.phone.unwrap(), "+1-555-0100");
    }

    #[tokio::test]
    async fn test_add_experience() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let exp = Experience {
            id: 0, // Will be assigned
            company: "Harbor Community Services".to_string(),
            title: "Program Operations Lead".to_string(),
            location: Some("Remote".to_string()),
            start_date: "2020-01".to_string(),
            end_date: None,
            is_current: true,
            achievements: vec![
                "Coordinated a 5-person intake team".to_string(),
                "Reduced client intake turnaround by 30%".to_string(),
            ],
        };

        let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
        assert_eq!(exp_id, 1);

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.experience.len(), 1);
        assert_eq!(resume.experience[0].company, "Harbor Community Services");
        assert_eq!(resume.experience[0].achievements.len(), 2);
    }

    #[tokio::test]
    async fn test_delete_experience() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let exp = Experience {
            id: 0,
            company: "Harbor Community Services".to_string(),
            title: "Program Operations Lead".to_string(),
            location: None,
            start_date: "2020-01".to_string(),
            end_date: None,
            is_current: true,
            achievements: vec![],
        };

        let exp_id = builder.add_experience(resume_id, exp).await.unwrap();
        builder.delete_experience(resume_id, exp_id).await.unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.experience.len(), 0);
    }

    #[tokio::test]
    async fn test_delete_missing_experience_returns_error() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();
        let result = builder.delete_experience(resume_id, 999).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_set_skills() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();

        let skills = vec![
            SkillEntry {
                name: "Rust".to_string(),
                category: "Programming Language".to_string(),
                proficiency: Some("expert".to_string()),
                years_experience: Some(5.0),
            },
            SkillEntry {
                name: "Tokio".to_string(),
                category: "Framework".to_string(),
                proficiency: Some("advanced".to_string()),
                years_experience: Some(3.0),
            },
        ];

        builder.set_skills(resume_id, skills).await.unwrap();

        let resume = builder.get_resume(resume_id).await.unwrap().unwrap();
        assert_eq!(resume.skills.len(), 2);
        assert_eq!(resume.skills[0].name, "Rust");
    }

    #[test]
    fn test_builder_deserializes_frontend_resume_payload_shapes() {
        let experience: Experience = serde_json::from_value(serde_json::json!({
            "id": 0,
            "title": "Program Coordinator",
            "company": "Community Clinic",
            "location": "Portland, OR",
            "start_date": "2022-01",
            "end_date": null,
            "achievements": ["Improved intake scheduling"]
        }))
        .expect("frontend experience payload should deserialize");

        assert_eq!(experience.achievements, vec!["Improved intake scheduling"]);

        let education: Education = serde_json::from_value(serde_json::json!({
            "id": 0,
            "degree": "BA",
            "institution": "Metro College",
            "location": "Portland, OR",
            "graduation_date": "2020",
            "gpa": "3.8",
            "honors": ["Dean's List"]
        }))
        .expect("frontend education payload should deserialize");

        assert_eq!(education.graduation_date.as_deref(), Some("2020"));
        assert_eq!(education.honors, vec!["Dean's List"]);

        let skill: SkillEntry = serde_json::from_value(serde_json::json!({
            "name": "Patient Intake",
            "category": "Operations",
            "proficiency": "advanced"
        }))
        .expect("frontend skill payload should deserialize");

        assert_eq!(skill.category, "Operations");
        assert_eq!(skill.proficiency.as_deref(), Some("advanced"));
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

    #[tokio::test]
    async fn test_delete_missing_education_returns_error() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let resume_id = builder.create_resume().await.unwrap();
        let result = builder.delete_education(resume_id, 999).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_missing_resume_returns_error() {
        let pool = setup_test_db().await;
        let builder = ResumeBuilder::new(pool);

        let result = builder.delete_resume(999).await;

        assert!(result.is_err());
    }
}
