//! Database Layer (SQLite)
//!
//! Handles all database operations using SQLx with async support.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, FromRow};
use std::path::PathBuf;

/// Job model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Job {
    pub id: i64,

    /// SHA-256 hash for deduplication (company + title + location + url)
    pub hash: String,

    pub title: String,
    pub company: String,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Match score (0.0 - 1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,

    /// JSON object with score breakdown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_reasons: Option<String>,

    /// Source scraper (e.g., "greenhouse", "lever", "jobswithgpt")
    pub source: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_min: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_max: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,

    /// Number of times this job has been seen (for tracking repostings)
    pub times_seen: i64,

    /// Whether an immediate alert was sent for this job
    pub immediate_alert_sent: bool,

    /// Whether this job was included in a digest email
    pub included_in_digest: bool,
}

/// Database handle
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Connect to SQLite database
    pub async fn connect(path: &PathBuf) -> Result<Self, sqlx::Error> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let url = format!("sqlite://{}", path.display());
        let pool = SqlitePool::connect(&url).await?;

        Ok(Database { pool })
    }

    /// Run database migrations
    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::migrate!("./migrations").run(&self.pool).await?;
        Ok(())
    }

    /// Connect to in-memory SQLite database (for testing)
    #[cfg(test)]
    pub async fn connect_memory() -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect("sqlite::memory:").await?;
        Ok(Database { pool })
    }

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
    pub async fn upsert_job(&self, job: &Job) -> Result<i64, sqlx::Error> {
        // Check if job with this hash already exists
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM jobs WHERE hash = ?")
            .bind(&job.hash)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(existing_id) = existing {
            // Job exists - update it
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
                    times_seen = times_seen + 1
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
            .bind(job.remote.map(|r| r as i64))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(Utc::now())
            .bind(Utc::now())
            .bind(existing_id)
            .execute(&self.pool)
            .await?;

            Ok(existing_id)
        } else {
            // New job - insert it
            let result = sqlx::query(
                r#"
                INSERT INTO jobs (
                    hash, title, company, url, location, description,
                    score, score_reasons, source, remote,
                    salary_min, salary_max, currency,
                    created_at, updated_at, last_seen, times_seen,
                    immediate_alert_sent, included_in_digest
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            .bind(job.remote.map(|r| r as i64))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(&job.created_at)
            .bind(&job.updated_at)
            .bind(&job.last_seen)
            .bind(job.times_seen)
            .bind(job.immediate_alert_sent as i64)
            .bind(job.included_in_digest as i64)
            .execute(&self.pool)
            .await?;

            Ok(result.last_insert_rowid())
        }
    }

    /// Mark job as having sent immediate alert
    pub async fn mark_alert_sent(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET immediate_alert_sent = 1 WHERE id = ?")
            .bind(job_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Get recent jobs
    pub async fn get_recent_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        Ok(jobs)
    }

    /// Get jobs by minimum score
    pub async fn get_jobs_by_score(
        &self,
        min_score: f64,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE score >= ? ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(min_score)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Get jobs by source
    pub async fn get_jobs_by_source(
        &self,
        source: &str,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE source = ? ORDER BY created_at DESC LIMIT ?",
        )
        .bind(source)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Get job by ID
    pub async fn get_job_by_id(&self, id: i64) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(job)
    }

    /// Get job by hash
    pub async fn get_job_by_hash(&self, hash: &str) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE hash = ?")
            .bind(hash)
            .fetch_optional(&self.pool)
            .await?;

        Ok(job)
    }

    /// Full-text search on title and description
    pub async fn search_jobs(&self, query: &str, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        // Use FTS5 virtual table for fast full-text search
        let job_ids: Vec<i64> =
            sqlx::query_scalar("SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ? LIMIT ?")
                .bind(query)
                .bind(limit)
                .fetch_all(&self.pool)
                .await?;

        if job_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Fetch full job records
        let placeholders = job_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("SELECT * FROM jobs WHERE id IN ({})", placeholders);

        let mut query_builder = sqlx::query_as::<_, Job>(&sql);
        for id in job_ids {
            query_builder = query_builder.bind(id);
        }

        let jobs = query_builder.fetch_all(&self.pool).await?;
        Ok(jobs)
    }

    /// Get statistics
    pub async fn get_statistics(&self) -> Result<Statistics, sqlx::Error> {
        let total_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
            .fetch_one(&self.pool)
            .await?;

        let high_matches: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE score >= 0.9")
            .fetch_one(&self.pool)
            .await?;

        let average_score: Option<f64> =
            sqlx::query_scalar("SELECT AVG(score) FROM jobs WHERE score IS NOT NULL")
                .fetch_one(&self.pool)
                .await?;

        let jobs_today: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE DATE(created_at) = DATE('now')")
                .fetch_one(&self.pool)
                .await?;

        Ok(Statistics {
            total_jobs,
            high_matches,
            average_score: average_score.unwrap_or(0.0),
            jobs_today,
        })
    }

    /// Get default database path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_data_dir().join("jobs.db")
    }
}

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub total_jobs: i64,
    pub high_matches: i64,
    pub average_score: f64,
    pub jobs_today: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_connection() {
        // Use in-memory database for testing
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Database is created successfully (implicitly verified by unwrap)
        assert!(true);
    }

    #[tokio::test]
    async fn test_upsert_job() {
        // Use in-memory database for testing
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = Job {
            id: 0,
            hash: "test_hash_123".to_string(),
            title: "Test Job".to_string(),
            company: "Test Company".to_string(),
            url: "https://example.com".to_string(),
            location: Some("Remote".to_string()),
            description: None,
            score: Some(0.95),
            score_reasons: None,
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(150000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        };

        // First insert
        let id1 = db.upsert_job(&job).await.unwrap();
        assert!(id1 > 0);

        // Second insert (should update, not insert)
        let id2 = db.upsert_job(&job).await.unwrap();
        assert_eq!(id1, id2);

        // Verify times_seen was incremented
        let fetched = db.get_job_by_id(id1).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 2);

        // In-memory database is automatically cleaned up when dropped
    }
}
