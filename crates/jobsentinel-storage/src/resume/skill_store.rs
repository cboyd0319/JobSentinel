use anyhow::Result;
use sqlx::SqlitePool;

use super::{types, ResumeMatcher};
use types::NullableFieldUpdate;

impl ResumeMatcher {
    /// Return the normalized skill names stored for a job.
    pub async fn get_job_skill_names(&self, job_hash: &str) -> Result<Vec<String>> {
        self.job_matcher.get_job_skills(job_hash).await
    }

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
