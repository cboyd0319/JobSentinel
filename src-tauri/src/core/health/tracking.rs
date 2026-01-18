//! Run tracking - record scraper execution history

use crate::core::Database;
use anyhow::Result;
use chrono::Utc;

use super::types::{RunStatus, ScraperRun};

/// Start a new scraper run and return its ID
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

/// Complete a successful run
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

/// Record a failed run
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

/// Record a timeout
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

/// Update retry attempt count
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

/// Get recent runs for a scraper
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
