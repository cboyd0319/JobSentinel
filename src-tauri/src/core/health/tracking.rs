//! Run tracking - record scraper execution history.
//!
//! Provides functions to track the lifecycle of scraper executions:
//! - Starting runs
//! - Completing successful runs
//! - Recording failures and timeouts
//! - Incrementing retry counters
//!
//! All functions write to the `scraper_runs` table which is used for
//! health metrics calculation and historical analysis.

use crate::core::Database;
use anyhow::Result;
use chrono::Utc;

use super::types::{RunStatus, ScraperRun};

/// Start a new scraper run and return its database ID.
///
/// Creates a new record in `scraper_runs` with status `Running`.
/// This ID should be used in subsequent tracking calls.
///
/// # Arguments
///
/// * `db` - Database connection
/// * `scraper_name` - Scraper identifier (e.g. "greenhouse")
///
/// # Returns
///
/// Database ID of the new run record.
///
/// # Examples
///
/// ```no_run
/// # use job_sentinel::core::Database;
/// # use job_sentinel::core::health::tracking;
/// # async fn example(db: &Database) -> anyhow::Result<()> {
/// let run_id = tracking::start_run(db, "linkedin").await?;
/// // ... perform scraping ...
/// tracking::complete_run(db, run_id, 5000, 50, 10).await?;
/// # Ok(())
/// # }
/// ```
pub async fn start_run(db: &Database, scraper_name: &str) -> Result<i64> {
    let now = Utc::now();
    let result = sqlx::query!(
        r#"
        INSERT INTO scraper_runs (scraper_name, started_at, status)
        VALUES (?, ?, 'running')
        RETURNING id
        "#,
        scraper_name,
        now,
    )
    .fetch_one(db.pool())
    .await?;

    Ok(result.id)
}

/// Mark a run as successfully completed.
///
/// Updates the run record with completion time, duration, and job counts.
/// Sets status to `Success`.
///
/// # Arguments
///
/// * `db` - Database connection
/// * `run_id` - Run ID from `start_run`
/// * `duration_ms` - Total execution time in milliseconds
/// * `jobs_found` - Total jobs scraped (including duplicates)
/// * `jobs_new` - New jobs added to database
pub async fn complete_run(
    db: &Database,
    run_id: i64,
    duration_ms: i64,
    jobs_found: usize,
    jobs_new: usize,
) -> Result<()> {
    let now = Utc::now();
    let jobs_found = jobs_found as i32;
    let jobs_new = jobs_new as i32;

    sqlx::query!(
        r#"
        UPDATE scraper_runs
        SET finished_at = ?,
            duration_ms = ?,
            status = 'success',
            jobs_found = ?,
            jobs_new = ?
        WHERE id = ?
        "#,
        now,
        duration_ms,
        jobs_found,
        jobs_new,
        run_id,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Record a failed run with error details.
///
/// Updates the run record with failure status, error message, and optional error code.
/// Error codes are typically HTTP status codes (e.g. "429", "503") or error types.
///
/// # Arguments
///
/// * `db` - Database connection
/// * `run_id` - Run ID from `start_run`
/// * `duration_ms` - Execution time before failure
/// * `error_message` - Human-readable error message
/// * `error_code` - Optional error code (HTTP status, error type)
pub async fn fail_run(
    db: &Database,
    run_id: i64,
    duration_ms: i64,
    error_message: &str,
    error_code: Option<&str>,
) -> Result<()> {
    let now = Utc::now();

    sqlx::query!(
        r#"
        UPDATE scraper_runs
        SET finished_at = ?,
            duration_ms = ?,
            status = 'failure',
            error_message = ?,
            error_code = ?
        WHERE id = ?
        "#,
        now,
        duration_ms,
        error_message,
        error_code,
        run_id,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Record a timeout failure.
///
/// Updates the run record with timeout status and duration.
///
/// # Arguments
///
/// * `db` - Database connection
/// * `run_id` - Run ID from `start_run`
/// * `duration_ms` - Time elapsed before timeout
pub async fn timeout_run(db: &Database, run_id: i64, duration_ms: i64) -> Result<()> {
    let now = Utc::now();

    sqlx::query!(
        r#"
        UPDATE scraper_runs
        SET finished_at = ?,
            duration_ms = ?,
            status = 'timeout',
            error_message = 'Request timed out'
        WHERE id = ?
        "#,
        now,
        duration_ms,
        run_id,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Increment the retry attempt counter for a run.
///
/// Used when retrying a failed run with exponential backoff.
///
/// # Arguments
///
/// * `db` - Database connection
/// * `run_id` - Run ID to update
pub async fn increment_retry(db: &Database, run_id: i64) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE scraper_runs
        SET retry_attempt = retry_attempt + 1
        WHERE id = ?
        "#,
        run_id,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Retrieve recent execution history for a scraper.
///
/// Returns runs ordered by start time (newest first).
///
/// # Arguments
///
/// * `db` - Database connection
/// * `scraper_name` - Scraper identifier
/// * `limit` - Maximum number of runs to return
///
/// # Returns
///
/// Vector of run records with all fields populated.
pub async fn get_scraper_runs(
    db: &Database,
    scraper_name: &str,
    limit: i32,
) -> Result<Vec<ScraperRun>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, scraper_name, started_at, finished_at, duration_ms,
               status, jobs_found, jobs_new, error_message, error_code, retry_attempt
        FROM scraper_runs
        WHERE scraper_name = ?
        ORDER BY started_at DESC
        LIMIT ?
        "#,
        scraper_name,
        limit,
    )
    .fetch_all(db.pool())
    .await?;

    let runs = rows
        .into_iter()
        .map(|row| ScraperRun {
            id: row.id.unwrap_or(0),
            scraper_name: row.scraper_name,
            started_at: row.started_at.and_utc(),
            finished_at: row.finished_at.map(|dt| dt.and_utc()),
            duration_ms: row.duration_ms,
            status: RunStatus::from_str(&row.status),
            jobs_found: row.jobs_found.unwrap_or(0) as i32,
            jobs_new: row.jobs_new.unwrap_or(0) as i32,
            error_message: row.error_message,
            error_code: row.error_code,
            retry_attempt: row.retry_attempt.unwrap_or(0) as i32,
        })
        .collect();

    Ok(runs)
}
