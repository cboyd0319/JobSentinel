use super::*;
use crate::sqlite_time::parse_sqlite_datetime;

impl ResumeMatcher {
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

            let created_at = parse_sqlite_datetime(&created_str)?;

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
            SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END
            WHERE EXISTS (SELECT 1 FROM resumes WHERE id = ?)
            "#,
        )
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

            let created_at = parse_sqlite_datetime(&created_str)?;
            let updated_at = parse_sqlite_datetime(&updated_str)?;

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
}
