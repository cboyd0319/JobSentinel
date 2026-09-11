//! Persists jobs and their validated native evidence projections.

use super::connection::Database;
use super::types::JobRow;
use chrono::Utc;
use jobsentinel_domain::{canonicalize_job_url, Job, JobGeography};
use jobsentinel_security::validate_external_https_url;

struct StoredPay {
    listed_pay: Option<String>,
    salary_min: Option<i64>,
    salary_max: Option<i64>,
    currency: Option<String>,
}

fn canonicalize_job_for_storage(
    job: &Job,
) -> Result<(String, StoredPay, Option<String>), sqlx::Error> {
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

    validate_external_https_url(&job.url)
        .map_err(|reason| sqlx::Error::Protocol(format!("Invalid job URL: {reason}")))?;

    let canonical_job_url = canonicalize_job_url(&job.url)
        .map_err(|reason| sqlx::Error::Protocol(format!("Invalid job URL: {reason}")))?;

    if canonical_job_url.len() > MAX_URL_LENGTH {
        return Err(sqlx::Error::Protocol(format!(
            "Job URL too long after cleanup: {} chars (max: {})",
            canonical_job_url.len(),
            MAX_URL_LENGTH
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

    Ok((
        canonical_job_url,
        project_pay_for_storage(job)?,
        project_geography_for_storage(job.geography.as_ref())?,
    ))
}

fn project_geography_for_storage(
    geography: Option<&JobGeography>,
) -> Result<Option<String>, sqlx::Error> {
    geography
        .map(JobGeography::canonical_json)
        .transpose()
        .map_err(|reason| sqlx::Error::Protocol(format!("Invalid job geography: {reason}")))
}

fn project_pay_for_storage(job: &Job) -> Result<StoredPay, sqlx::Error> {
    let Some(listed_pay) = &job.listed_pay else {
        return Ok(StoredPay {
            listed_pay: None,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            currency: job.currency.clone(),
        });
    };

    let listed_pay_json = listed_pay
        .canonical_json()
        .map_err(|reason| sqlx::Error::Protocol(format!("Invalid listed pay: {reason}")))?;
    let (salary_min, salary_max) = listed_pay.usd_annual_integer_bounds();

    Ok(StoredPay {
        listed_pay: Some(listed_pay_json),
        salary_min,
        salary_max,
        currency: listed_pay.currency.clone(),
    })
}

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
    #[tracing::instrument(
        skip(self, job),
        fields(
            job_hash = %job.hash,
            job_source = %job.source,
            job_score = ?job.score
        ),
        level = "debug"
    )]
    pub async fn upsert_job(&self, job: &Job) -> Result<i64, sqlx::Error> {
        let (canonical_job_url, stored_pay, geography) = canonicalize_job_for_storage(job)?;
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM jobs WHERE hash = ?")
            .bind(&job.hash)
            .fetch_optional(self.pool())
            .await?;

        if let Some(existing_id) = existing {
            return self
                .update_existing_job(
                    existing_id,
                    job,
                    &canonical_job_url,
                    &stored_pay,
                    &geography,
                )
                .await;
        }

        if let Some(job_id) = self
            .insert_job_record(job, &canonical_job_url, &stored_pay, &geography)
            .await?
        {
            return Ok(job_id);
        }

        let existing_id: i64 = sqlx::query_scalar("SELECT id FROM jobs WHERE hash = ?")
            .bind(&job.hash)
            .fetch_one(self.pool())
            .await?;
        self.update_existing_job(
            existing_id,
            job,
            &canonical_job_url,
            &stored_pay,
            &geography,
        )
        .await
    }

    pub async fn insert_job_if_new(&self, job: &Job) -> Result<Option<i64>, sqlx::Error> {
        let (canonical_job_url, stored_pay, geography) = canonicalize_job_for_storage(job)?;
        self.insert_job_record(job, &canonical_job_url, &stored_pay, &geography)
            .await
    }

    async fn update_existing_job(
        &self,
        existing_id: i64,
        job: &Job,
        canonical_job_url: &str,
        stored_pay: &StoredPay,
        geography: &Option<String>,
    ) -> Result<i64, sqlx::Error> {
        tracing::debug!(
            job_id = existing_id,
            "Job already exists, updating and incrementing times_seen"
        );
        sqlx::query(
            r#"
            UPDATE jobs SET
                title = ?, company = ?, url = ?, location = ?, description = ?,
                score = ?, score_reasons = ?, source = ?, remote = ?,
                salary_min = ?, salary_max = ?, currency = ?, listed_pay = ?, geography = COALESCE(?, geography), updated_at = ?,
                last_seen = ?, times_seen = times_seen + 1, ghost_score = ?,
                ghost_reasons = ?, repost_count = ?
            WHERE id = ?
            "#,
        )
        .bind(&job.title)
        .bind(&job.company)
        .bind(canonical_job_url)
        .bind(&job.location)
        .bind(&job.description)
        .bind(job.score)
        .bind(&job.score_reasons)
        .bind(&job.source)
        .bind(job.remote.map(i64::from))
        .bind(stored_pay.salary_min)
        .bind(stored_pay.salary_max)
        .bind(&stored_pay.currency)
        .bind(&stored_pay.listed_pay)
        .bind(geography)
        .bind(Utc::now())
        .bind(Utc::now())
        .bind(job.ghost_score)
        .bind(&job.ghost_reasons)
        .bind(job.repost_count)
        .bind(existing_id)
        .execute(self.pool())
        .await?;

        tracing::debug!(job_id = existing_id, "Job update completed");
        Ok(existing_id)
    }

    async fn insert_job_record(
        &self,
        job: &Job,
        canonical_job_url: &str,
        stored_pay: &StoredPay,
        geography: &Option<String>,
    ) -> Result<Option<i64>, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO jobs (
                hash, title, company, url, location, description,
                score, score_reasons, source, remote,
                salary_min, salary_max, currency, listed_pay, geography,
                created_at, updated_at, last_seen, times_seen,
                immediate_alert_sent, included_in_digest,
                ghost_score, ghost_reasons, first_seen, repost_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(hash) DO NOTHING
            "#,
        )
        .bind(&job.hash)
        .bind(&job.title)
        .bind(&job.company)
        .bind(canonical_job_url)
        .bind(&job.location)
        .bind(&job.description)
        .bind(job.score)
        .bind(&job.score_reasons)
        .bind(&job.source)
        .bind(job.remote.map(i64::from))
        .bind(stored_pay.salary_min)
        .bind(stored_pay.salary_max)
        .bind(&stored_pay.currency)
        .bind(&stored_pay.listed_pay)
        .bind(geography)
        .bind(job.created_at)
        .bind(job.updated_at)
        .bind(job.last_seen)
        .bind(job.times_seen)
        .bind(i64::from(job.immediate_alert_sent))
        .bind(i64::from(job.included_in_digest))
        .bind(job.ghost_score)
        .bind(&job.ghost_reasons)
        .bind(job.first_seen)
        .bind(job.repost_count)
        .execute(self.pool())
        .await?;

        if result.rows_affected() == 0 {
            return Ok(None);
        }

        let job_id = result.last_insert_rowid();
        tracing::info!(job_id, "New job inserted");
        Ok(Some(job_id))
    }

    /// Get job by ID
    #[tracing::instrument(skip(self), fields(job_id = id), level = "debug")]
    pub async fn get_job_by_id(&self, id: i64) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, JobRow>("SELECT * FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.pool())
            .await?
            .map(Job::try_from)
            .transpose()?;

        Ok(job)
    }

    /// Get job by hash
    #[tracing::instrument(skip(self), fields(job_hash = hash), level = "debug")]
    pub async fn get_job_by_hash(&self, hash: &str) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, JobRow>("SELECT * FROM jobs WHERE hash = ?")
            .bind(hash)
            .fetch_optional(self.pool())
            .await?
            .map(Job::try_from)
            .transpose()?;

        Ok(job)
    }

    /// Check if a job exists by hash (faster than get_job_by_hash for existence checks)
    pub async fn job_exists_by_hash(&self, hash: &str) -> Result<bool, sqlx::Error> {
        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM jobs WHERE hash = ? LIMIT 1")
            .bind(hash)
            .fetch_optional(self.pool())
            .await?;
        Ok(exists.is_some())
    }

    /// Mark job as having sent immediate alert
    pub async fn mark_alert_sent(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET immediate_alert_sent = 1 WHERE id = ?")
            .bind(job_id)
            .execute(self.pool())
            .await?;
        Ok(())
    }

    /// Atomically claim immediate alert delivery for a job hash.
    pub async fn claim_immediate_alert(&self, job_hash: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "UPDATE jobs SET immediate_alert_sent = 1 WHERE hash = ? AND immediate_alert_sent = 0",
        )
        .bind(job_hash)
        .execute(self.pool())
        .await?;

        Ok(result.rows_affected() == 1)
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
        let placeholders = ids_to_hide
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!("UPDATE jobs SET hidden = 1 WHERE id IN ({})", placeholders);

        let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
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
