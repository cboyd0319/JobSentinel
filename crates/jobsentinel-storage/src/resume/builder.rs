use crate::sqlite_time::parse_sqlite_datetime;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use jobsentinel_documents::{
    ResumeCertification, ResumeEducation, ResumeExperience, ResumePersonalInfo, ResumeProject,
    ResumeSkill, StructuredResume,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

mod deserialization;
mod serialization;

use deserialization::string_from_value;
use serialization::group_skills;

/// Persisted resume metadata wrapped around the canonical document model.
#[derive(Debug, Clone)]
pub struct ResumeDraft {
    pub id: i64,
    pub resume: StructuredResume,
    experience_ids: Vec<i64>,
    education_ids: Vec<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Persistence identifier paired with canonical experience content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftExperience {
    #[serde(default)]
    pub id: i64,
    #[serde(flatten)]
    pub experience: ResumeExperience,
}

/// Persistence identifier paired with canonical education content.
#[derive(Debug, Clone)]
pub struct DraftEducation {
    pub id: i64,
    pub education: ResumeEducation,
}

/// Flat builder payload paired with the canonical skill content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftSkill {
    #[serde(default, deserialize_with = "string_from_value")]
    pub category: String,
    #[serde(flatten)]
    pub skill: ResumeSkill,
}

impl ResumeDraft {
    fn empty() -> Self {
        let now = Utc::now();
        Self {
            id: 0,
            resume: StructuredResume::default(),
            experience_ids: Vec::new(),
            education_ids: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }
}

/// Resume builder for creating and managing drafts.
pub struct ResumeBuilder {
    pool: SqlitePool,
}

impl ResumeBuilder {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_resume(&self) -> Result<i64> {
        let data_json = serde_json::to_string(&ResumeDraft::empty())
            .context("Failed to serialize empty resume data")?;
        let result = sqlx::query(
            "INSERT INTO resume_drafts (data, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))",
        )
        .bind(&data_json)
        .execute(&self.pool)
        .await
        .context("Failed to create resume draft")?;
        Ok(result.last_insert_rowid())
    }

    pub async fn get_resume(&self, resume_id: i64) -> Result<Option<ResumeDraft>> {
        use sqlx::Row;
        let row =
            sqlx::query("SELECT data, created_at, updated_at FROM resume_drafts WHERE id = ?")
                .bind(resume_id)
                .fetch_optional(&self.pool)
                .await
                .context("Failed to fetch resume")?;
        let Some(row) = row else {
            return Ok(None);
        };
        let data: String = row.try_get("data").context("Failed to get data column")?;
        let mut draft: ResumeDraft =
            serde_json::from_str(&data).context("Failed to deserialize resume data")?;
        draft.id = resume_id;
        draft.created_at = parse_sqlite_datetime(row.try_get("created_at")?)?;
        draft.updated_at = parse_sqlite_datetime(row.try_get("updated_at")?)?;
        Ok(Some(draft))
    }

    pub async fn update_contact(&self, resume_id: i64, contact: ResumePersonalInfo) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.resume.personal = contact;
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn update_summary(&self, resume_id: i64, summary: String) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.resume.summary = Some(summary);
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn add_experience(&self, resume_id: i64, entry: DraftExperience) -> Result<i64> {
        let mut draft = self.require_resume(resume_id).await?;
        let new_id = draft.experience_ids.iter().copied().max().unwrap_or(0) + 1;
        draft.experience_ids.push(new_id);
        draft.resume.experience.push(entry.experience);
        self.save_updated(resume_id, &mut draft).await?;
        Ok(new_id)
    }

    pub async fn update_experience(&self, resume_id: i64, entry: DraftExperience) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        let index = draft
            .experience_ids
            .iter()
            .position(|id| *id == entry.id)
            .context("Experience entry not found")?;
        draft.resume.experience[index] = entry.experience;
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn delete_experience(&self, resume_id: i64, entry_id: i64) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        let index = draft
            .experience_ids
            .iter()
            .position(|id| *id == entry_id)
            .context("Experience entry not found")?;
        draft.experience_ids.remove(index);
        draft.resume.experience.remove(index);
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn add_education(&self, resume_id: i64, entry: DraftEducation) -> Result<i64> {
        let mut draft = self.require_resume(resume_id).await?;
        let new_id = draft.education_ids.iter().copied().max().unwrap_or(0) + 1;
        draft.education_ids.push(new_id);
        draft.resume.education.push(entry.education);
        self.save_updated(resume_id, &mut draft).await?;
        Ok(new_id)
    }

    pub async fn update_education(&self, resume_id: i64, entry: DraftEducation) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        let index = draft
            .education_ids
            .iter()
            .position(|id| *id == entry.id)
            .context("Education entry not found")?;
        draft.resume.education[index] = entry.education;
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn delete_education(&self, resume_id: i64, entry_id: i64) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        let index = draft
            .education_ids
            .iter()
            .position(|id| *id == entry_id)
            .context("Education entry not found")?;
        draft.education_ids.remove(index);
        draft.resume.education.remove(index);
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn set_skills(&self, resume_id: i64, skills: Vec<DraftSkill>) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.resume.skills = group_skills(skills);
        self.save_updated(resume_id, &mut draft).await
    }

    pub(super) async fn replace_content(
        &self,
        resume_id: i64,
        resume: StructuredResume,
    ) -> Result<()> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.experience_ids = (1..=resume.experience.len() as i64).collect();
        draft.education_ids = (1..=resume.education.len() as i64).collect();
        draft.resume = resume;
        self.save_updated(resume_id, &mut draft).await
    }

    pub async fn add_certification(
        &self,
        resume_id: i64,
        certification: ResumeCertification,
    ) -> Result<i64> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.resume.certifications.push(certification);
        let id = draft.resume.certifications.len() as i64;
        self.save_updated(resume_id, &mut draft).await?;
        Ok(id)
    }

    pub async fn add_project(&self, resume_id: i64, project: ResumeProject) -> Result<i64> {
        let mut draft = self.require_resume(resume_id).await?;
        draft.resume.projects.push(project);
        let id = draft.resume.projects.len() as i64;
        self.save_updated(resume_id, &mut draft).await?;
        Ok(id)
    }

    pub async fn delete_resume(&self, resume_id: i64) -> Result<()> {
        let result = sqlx::query("DELETE FROM resume_drafts WHERE id = ?")
            .bind(resume_id)
            .execute(&self.pool)
            .await
            .context("Failed to delete resume")?;
        if result.rows_affected() == 0 {
            anyhow::bail!("Resume not found");
        }
        Ok(())
    }

    async fn require_resume(&self, resume_id: i64) -> Result<ResumeDraft> {
        self.get_resume(resume_id)
            .await?
            .context("Resume not found")
    }

    async fn save_updated(&self, resume_id: i64, draft: &mut ResumeDraft) -> Result<()> {
        draft.updated_at = Utc::now();
        self.save_resume(resume_id, draft).await
    }

    async fn save_resume(&self, resume_id: i64, draft: &ResumeDraft) -> Result<()> {
        let data_json = serde_json::to_string(draft).context("Failed to serialize resume data")?;
        let result = sqlx::query(
            "UPDATE resume_drafts SET data = ?, updated_at = datetime('now') WHERE id = ?",
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
