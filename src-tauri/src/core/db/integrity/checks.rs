//! Database integrity checking operations

use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::Row;

use super::types::{CheckResult, ForeignKeyViolation};
use super::DatabaseIntegrity;

impl DatabaseIntegrity {
    /// Quick integrity check (PRAGMA quick_check)
    pub(super) async fn quick_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA quick_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result.eq_ignore_ascii_case("ok"),
            message: result,
        })
    }

    /// Full integrity check (PRAGMA integrity_check)
    pub(super) async fn full_integrity_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA integrity_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result.eq_ignore_ascii_case("ok"),
            message: result,
        })
    }

    /// Check for foreign key violations
    pub(super) async fn foreign_key_check(&self) -> Result<Vec<ForeignKeyViolation>> {
        let rows = sqlx::query("PRAGMA foreign_key_check")
            .fetch_all(&self.db)
            .await?;

        let mut violations = Vec::new();
        for row in rows {
            violations.push(ForeignKeyViolation {
                table: row.try_get(0)?,
                rowid: row.try_get(1)?,
                parent: row.try_get(2)?,
                fkid: row.try_get(3)?,
            });
        }

        Ok(violations)
    }

    /// Determine if full check is needed (run weekly)
    pub(super) async fn should_run_full_check(&self) -> Result<bool> {
        let last_check: Option<String> = sqlx::query_scalar(
            "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
        )
        .fetch_optional(&self.db)
        .await?;

        if let Some(last_check_str) = last_check {
            // Parse the RFC3339 timestamp string
            if let Ok(last_check_time) = DateTime::parse_from_rfc3339(&last_check_str) {
                let days_since = (Utc::now() - last_check_time.with_timezone(&Utc)).num_days();
                Ok(days_since >= 7) // Run weekly
            } else {
                Ok(true) // Invalid timestamp, run check
            }
        } else {
            Ok(true) // Never run before
        }
    }

    /// Update last full check timestamp
    pub(super) async fn update_last_full_check(&self) -> Result<()> {
        sqlx::query(
            "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        )
        .bind("last_full_integrity_check")
        .bind(Utc::now().to_rfc3339())
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Log integrity check to database
    pub(super) async fn log_check(
        &self,
        check_type: &str,
        status: &str,
        details: Option<&str>,
        duration: std::time::Duration,
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO integrity_check_log (check_type, status, details, duration_ms) VALUES (?, ?, ?, ?)",
        )
        .bind(check_type)
        .bind(status)
        .bind(details)
        .bind(duration.as_millis() as i64)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}
