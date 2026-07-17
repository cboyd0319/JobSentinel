//! SQL-backed source health history and metrics.

mod metrics;
mod tracking;
mod types;

pub use metrics::*;
pub use tracking::*;
pub use types::*;

use crate::Database;
use anyhow::Result;

/// Persist a smoke-test result without exposing SQLx to the caller.
pub async fn record_smoke_test(db: &Database, result: &SmokeTestResult) -> Result<()> {
    let test_type = result.test_type.as_str();
    let status = if result.passed { "pass" } else { "fail" };
    let details = result
        .details
        .as_ref()
        .map(|details| serde_json::to_string(details).unwrap_or_default());

    sqlx::query(
        r#"
        INSERT INTO scraper_smoke_tests (scraper_name, test_type, duration_ms, status, details, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&result.scraper_name)
    .bind(test_type)
    .bind(result.duration_ms)
    .bind(status)
    .bind(details)
    .bind(&result.error)
    .execute(db.pool())
    .await?;

    Ok(())
}
