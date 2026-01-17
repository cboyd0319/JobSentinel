//! Database Integrity and Backup Management
//!
//! Provides comprehensive integrity checking, automated backups,
//! and corruption detection/recovery for SQLite database.

mod backups;
mod checks;
mod diagnostics;
pub mod types;

#[cfg(test)]
mod tests;

use anyhow::Result;
use sqlx::SqlitePool;
use std::path::PathBuf;

pub use types::*;

/// Database integrity manager
pub struct DatabaseIntegrity {
    db: SqlitePool,
    backup_dir: PathBuf,
}

impl DatabaseIntegrity {
    /// Create new integrity manager
    pub fn new(db: SqlitePool, backup_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&backup_dir).ok();
        Self { db, backup_dir }
    }

    /// Run full integrity check on startup
    pub async fn startup_check(&self) -> Result<IntegrityStatus> {
        tracing::info!("🔍 Running database integrity check...");
        let start_time = std::time::Instant::now();

        // 1. Quick check first (fast)
        let quick_result = self.quick_check().await?;
        if !quick_result.is_ok {
            tracing::error!("❌ Quick check failed: {}", quick_result.message);
            self.log_check(
                "quick",
                "failed",
                Some(&quick_result.message),
                start_time.elapsed(),
            )
            .await?;
            return Ok(IntegrityStatus::Corrupted(quick_result.message));
        }

        // 2. Foreign key check
        let fk_violations = self.foreign_key_check().await?;
        if !fk_violations.is_empty() {
            tracing::warn!(
                "⚠️  Foreign key violations detected: {} issues",
                fk_violations.len()
            );
            self.log_check(
                "foreign_key",
                "warning",
                Some(&format!("{} violations", fk_violations.len())),
                start_time.elapsed(),
            )
            .await?;
            return Ok(IntegrityStatus::ForeignKeyViolations(fk_violations));
        }

        // 3. Full integrity check (only if needed based on schedule)
        if self.should_run_full_check().await? {
            tracing::info!("Running full integrity check (weekly schedule)...");
            let full_result = self.full_integrity_check().await?;
            if !full_result.is_ok {
                tracing::error!("❌ Full integrity check failed: {}", full_result.message);
                self.log_check(
                    "full",
                    "failed",
                    Some(&full_result.message),
                    start_time.elapsed(),
                )
                .await?;
                return Ok(IntegrityStatus::Corrupted(full_result.message));
            }

            // Update last full check timestamp
            self.update_last_full_check().await?;
        }

        self.log_check("quick", "passed", None, start_time.elapsed())
            .await?;
        tracing::info!(
            "✅ Database integrity check passed ({:?})",
            start_time.elapsed()
        );
        Ok(IntegrityStatus::Healthy)
    }
}
