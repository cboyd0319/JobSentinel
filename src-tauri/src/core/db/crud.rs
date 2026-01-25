//! CRUD operations for jobs
//!
//! Create, Read, Update, and Delete operations for job records.

use super::connection::Database;
use super::types::Job;
use chrono::Utc;
use sqlx;

impl Database {
    /// Insert or update a job (based on hash)
    ///
    /// If a job with the same hash exists:
    /// - Increments `times_seen`
    /// - Updates `last_seen` to now
    /// - Updates other fields (title, description, etc.)
    ///
    /// If job is new:
    /// - Inserts as new row
    ///
    /// Returns the job ID.
    #[must_use]
    #[tracing::instrument(skip(self, job), fields(job_hash = %job.hash, job_title = %job.title, job_company = %job.company))]
    pub async fn upsert_job(&self, job: &Job) -> Result<i64, sqlx::Error> {
        // Validate job field lengths to prevent database bloat
        const MAX_TITLE_LENGTH: usize = 500;
        const MAX_COMPANY_LENGTH: usize = 200;
        const MAX_URL_LENGTH: usize = 2000;
        const MAX_LOCATION_LENGTH: usize = 200;
        const MAX_DESCRIPTION_LENGTH: usize = 50000;

        if job.title.len() > MAX_TITLE_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Job title too long: {} chars (max: {})",
                job.title.len(),
                MAX_TITLE_LENGTH
            )));
        }

        if job.company.len() > MAX_COMPANY_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Company name too long: {} chars (max: {})",
                job.company.len(),
                MAX_COMPANY_LENGTH
            )));
        }

        if job.url.len() > MAX_URL_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Job URL too long: {} chars (max: {})",
                job.url.len(),
                MAX_URL_LENGTH
            )));
        }

        // Security: Validate URL protocol to prevent javascript: and other dangerous protocols
        if !job.url.starts_with("https://") && !job.url.starts_with("http://") {
            return Err(sqlx::Error::Protocol(format!(
                "Invalid URL protocol. Job URLs must use http:// or https:// (got: {})",
                job.url.chars().take(50).collect::<String>()
            )));
        }

        if let Some(location) = &job.location {
            if location.len() > MAX_LOCATION_LENGTH {
                return Err(sqlx::Error::Protocol(format!(
                    "Location too long: {} chars (max: {})",
                    location.len(),
                    MAX_LOCATION_LENGTH
                )));
            }
        }

        if let Some(description) = &job.description {
            if description.len() > MAX_DESCRIPTION_LENGTH {
                return Err(sqlx::Error::Protocol(format!(
                    "Description too long: {} chars (max: {})",
                    description.len(),
                    MAX_DESCRIPTION_LENGTH
                )));
            }
        }
        // Check if job with this hash already exists
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM jobs WHERE hash = ?")
            .bind(&job.hash)
            .fetch_optional(self.pool())
            .await?;

        if let Some(existing_id) = existing {
            // Job exists - update it (preserve first_seen, increment repost_count)
            tracing::debug!("Updating existing job with id={}", existing_id);
            sqlx::query(
                r#"
                UPDATE jobs SET
                    title = ?,
                    company = ?,
                    url = ?,
                    location = ?,
                    description = ?,
                    score = ?,
                    score_reasons = ?,
                    source = ?,
                    remote = ?,
                    salary_min = ?,
                    salary_max = ?,
                    currency = ?,
                    updated_at = ?,
                    last_seen = ?,
                    times_seen = times_seen + 1,
                    ghost_score = ?,
                    ghost_reasons = ?,
                    repost_count = ?
                WHERE id = ?
                "#,
            )
            .bind(&job.title)
            .bind(&job.company)
            .bind(&job.url)
            .bind(&job.location)
            .bind(&job.description)
            .bind(job.score)
            .bind(&job.score_reasons)
            .bind(&job.source)
            .bind(job.remote.map(|r| if r { 1i64 } else { 0i64 }))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(Utc::now())
            .bind(Utc::now())
            .bind(job.ghost_score)
            .bind(&job.ghost_reasons)
            .bind(job.repost_count)
            .bind(existing_id)
            .execute(self.pool())
            .await?;

            tracing::info!("Updated job id={}, times_seen incremented", existing_id);
            Ok(existing_id)
        } else {
            // New job - insert it
            tracing::info!("Inserting new job from source={}", job.source);
            let result = sqlx::query(
                r#"
                INSERT INTO jobs (
                    hash, title, company, url, location, description,
                    score, score_reasons, source, remote,
                    salary_min, salary_max, currency,
                    created_at, updated_at, last_seen, times_seen,
                    immediate_alert_sent, included_in_digest,
                    ghost_score, ghost_reasons, first_seen, repost_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&job.hash)
            .bind(&job.title)
            .bind(&job.company)
            .bind(&job.url)
            .bind(&job.location)
            .bind(&job.description)
            .bind(job.score)
            .bind(&job.score_reasons)
            .bind(&job.source)
            .bind(job.remote.map(|r| if r { 1i64 } else { 0i64 }))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(job.created_at)
            .bind(job.updated_at)
            .bind(job.last_seen)
            .bind(job.times_seen)
            .bind(if job.immediate_alert_sent { 1i64 } else { 0i64 })
            .bind(if job.included_in_digest { 1i64 } else { 0i64 })
            .bind(job.ghost_score)
            .bind(&job.ghost_reasons)
            .bind(job.first_seen)
            .bind(job.repost_count)
            .execute(self.pool())
            .await?;

            Ok(result.last_insert_rowid())
        }
    }

    /// Get job by ID
    pub async fn get_job_by_id(&self, id: i64) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.pool())
            .await?;

        Ok(job)
    }

    /// Get job by hash
    pub async fn get_job_by_hash(&self, hash: &str) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE hash = ?")
            .bind(hash)
            .fetch_optional(self.pool())
            .await?;

        Ok(job)
    }

    /// Mark job as having sent immediate alert
    pub async fn mark_alert_sent(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET immediate_alert_sent = 1 WHERE id = ?")
            .bind(job_id)
            .execute(self.pool())
            .await?;
        Ok(())
    }

    /// Merge duplicate jobs: hide all duplicates except the primary one
    ///
    /// OPTIMIZATION: Single UPDATE with IN clause instead of loop with N queries.
    /// Reduces round-trips from N to 1 for batch hiding duplicates.
    #[tracing::instrument(skip(self), fields(primary_id, dup_count = duplicate_ids.len()))]
    pub async fn merge_duplicates(
        &self,
        primary_id: i64,
        duplicate_ids: &[i64],
    ) -> Result<(), sqlx::Error> {
        if duplicate_ids.is_empty() {
            return Ok(());
        }

        tracing::info!(
            "Merging {} duplicate jobs into primary job",
            duplicate_ids.len()
        );

        // Filter out primary_id and build batch update
        let ids_to_hide: Vec<i64> = duplicate_ids
            .iter()
            .filter(|&&id| id != primary_id)
            .copied()
            .collect();

        if ids_to_hide.is_empty() {
            return Ok(());
        }

        // Batch hide all duplicates in single query
        let placeholders = ids_to_hide.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("UPDATE jobs SET hidden = 1 WHERE id IN ({})", placeholders);

        let mut query = sqlx::query(&sql);
        for id in &ids_to_hide {
            query = query.bind(id);
        }
        query.execute(self.pool()).await?;

        tracing::info!(
            "Batch hid {} duplicate jobs in single query",
            ids_to_hide.len()
        );
        Ok(())
    }
}
