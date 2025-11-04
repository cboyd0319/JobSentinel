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

    /// Insert or update a job (based on hash)
    pub async fn upsert_job(&self, job: &Job) -> Result<i64, sqlx::Error> {
        // TODO: Implement upsert logic
        // If job with this hash exists, update times_seen and last_seen
        // Otherwise, insert new job
        Ok(0)
    }

    /// Get recent jobs
    pub async fn get_recent_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?"
        )
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

    /// Get default database path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_data_dir().join("jobs.db")
    }
}
