use super::*;

impl JobMatcher {
    /// Get user's education level from their resume
    pub(super) async fn get_user_education(&self, resume_id: i64) -> Result<Option<DegreeLevel>> {
        // Try to get education from parsed resume text
        let Some(row) = sqlx::query(
            r#"
            SELECT parsed_text
            FROM resumes
            WHERE id = ?
            "#,
        )
        .bind(resume_id)
        .fetch_optional(&self.db)
        .await
        .with_context(|| format!("failed to read education data for resume {resume_id}"))?
        else {
            return Ok(None);
        };

        let parsed_text: Option<String> = row
            .try_get("parsed_text")
            .with_context(|| format!("failed to decode parsed_text for resume {resume_id}"))?;

        // Extract education level from resume text
        Ok(parsed_text.as_deref().and_then(DegreeLevel::from_text))
    }

    /// Get job by hash
    pub(super) async fn get_job(&self, job_hash: &str) -> Result<JobInfo> {
        let row = sqlx::query(
            r#"
            SELECT title, description
            FROM jobs
            WHERE hash = ?
            "#,
        )
        .bind(job_hash)
        .fetch_one(&self.db)
        .await?;

        Ok(JobInfo {
            title: row.try_get("title")?,
            description: row
                .try_get::<Option<String>, _>("description")?
                .unwrap_or_default(),
        })
    }

    /// Get user skills for resume
    pub(super) async fn get_user_skills(&self, resume_id: i64) -> Result<Vec<UserSkill>> {
        let rows = sqlx::query(
            r#"
            SELECT id, resume_id, skill_name, skill_category, confidence_score,
                   years_experience, proficiency_level, source
            FROM user_skills
            WHERE resume_id = ?
            ORDER BY confidence_score DESC
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

    /// Get job skills
    pub(super) async fn get_job_skills(&self, job_hash: &str) -> Result<Vec<String>> {
        let rows = sqlx::query(
            r#"
            SELECT skill_name
            FROM job_skills
            WHERE job_hash = ?
            ORDER BY is_required DESC, skill_name ASC
            "#,
        )
        .bind(job_hash)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| r.try_get::<String, _>("skill_name").unwrap_or_default())
            .collect())
    }
}
