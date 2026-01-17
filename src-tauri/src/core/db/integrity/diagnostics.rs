//! Database optimization and diagnostic operations

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::Row;

use super::types::{DatabaseHealth, PragmaDiagnostics, WalCheckpointResult};
use super::DatabaseIntegrity;

impl DatabaseIntegrity {
    /// Optimize database (VACUUM, ANALYZE)
    pub async fn optimize(&self) -> Result<()> {
        tracing::info!("🔧 Optimizing database...");
        let start_time = std::time::Instant::now();

        // VACUUM: Rebuild database file (compact, defragment)
        sqlx::query("VACUUM")
            .execute(&self.db)
            .await
            .context("VACUUM failed")?;

        // ANALYZE: Update query planner statistics
        sqlx::query("ANALYZE")
            .execute(&self.db)
            .await
            .context("ANALYZE failed")?;

        let duration = start_time.elapsed();
        tracing::info!("✅ Database optimized (took {:?})", duration);
        Ok(())
    }

    /// Get comprehensive database health metrics
    pub async fn get_health_metrics(&self) -> Result<DatabaseHealth> {
        let mut health = DatabaseHealth::default();

        // Get database file size
        if let Ok(row) = sqlx::query("PRAGMA page_count").fetch_one(&self.db).await {
            let page_count: i64 = row.try_get(0)?;
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.database_size_bytes = page_count * page_size;
        }

        // Get freelist size (unused space)
        if let Ok(row) = sqlx::query("PRAGMA freelist_count")
            .fetch_one(&self.db)
            .await
        {
            let freelist_count: i64 = row.try_get(0)?;
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.freelist_size_bytes = freelist_count * page_size;
        }

        // Get WAL file size
        if let Ok(row) = sqlx::query("PRAGMA wal_checkpoint(PASSIVE)")
            .fetch_one(&self.db)
            .await
        {
            // WAL checkpoint returns (busy, log_size, checkpointed_frames)
            let wal_frames: i64 = row.try_get(1).unwrap_or(0);
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.wal_size_bytes = wal_frames * page_size;
        }

        // Get schema version
        if let Ok(row) = sqlx::query("PRAGMA user_version").fetch_one(&self.db).await {
            health.schema_version = row.try_get(0)?;
        }

        // Get application ID
        if let Ok(row) = sqlx::query("PRAGMA application_id")
            .fetch_one(&self.db)
            .await
        {
            health.application_id = row.try_get(0)?;
        }

        // Check if integrity check is overdue
        let last_check: Option<String> = sqlx::query_scalar(
            "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
        )
        .fetch_optional(&self.db)
        .await?;

        if let Some(last_check_str) = last_check {
            if let Ok(last_check_time) = chrono::DateTime::parse_from_rfc3339(&last_check_str) {
                let days_since = (Utc::now() - last_check_time.with_timezone(&Utc)).num_days();
                health.integrity_check_overdue = days_since > 7;
                health.days_since_last_integrity_check = days_since;
            }
        }

        // Check if backup is overdue
        let last_backup: Option<String> =
            sqlx::query_scalar("SELECT value FROM app_metadata WHERE key = 'last_backup'")
                .fetch_optional(&self.db)
                .await?;

        if let Some(last_backup_str) = last_backup {
            if let Ok(last_backup_time) = chrono::DateTime::parse_from_rfc3339(&last_backup_str) {
                let hours_since = (Utc::now() - last_backup_time.with_timezone(&Utc)).num_hours();
                health.backup_overdue = hours_since > 24;
                health.hours_since_last_backup = hours_since;
            }
        }

        // Get table row counts
        health.total_jobs = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

        // Get total integrity checks performed
        health.total_integrity_checks =
            sqlx::query_scalar("SELECT COUNT(*) FROM integrity_check_log")
                .fetch_one(&self.db)
                .await
                .unwrap_or(0);

        // Get failed check count
        health.failed_integrity_checks =
            sqlx::query_scalar("SELECT COUNT(*) FROM integrity_check_log WHERE status = 'failed'")
                .fetch_one(&self.db)
                .await
                .unwrap_or(0);

        // Get total backups
        health.total_backups = sqlx::query_scalar("SELECT COUNT(*) FROM backup_log")
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

        // Calculate fragmentation percentage
        if health.database_size_bytes > 0 {
            health.fragmentation_percent =
                (health.freelist_size_bytes as f64 / health.database_size_bytes as f64) * 100.0;
        }

        Ok(health)
    }

    /// Run PRAGMA optimize to update query statistics
    pub async fn optimize_query_planner(&self) -> Result<()> {
        tracing::info!("🔧 Optimizing query planner statistics...");
        sqlx::query("PRAGMA optimize").execute(&self.db).await?;
        tracing::info!("✅ Query planner optimized");
        Ok(())
    }

    /// Perform WAL checkpoint (flush WAL to main database)
    pub async fn checkpoint_wal(&self) -> Result<WalCheckpointResult> {
        tracing::info!("🔄 Performing WAL checkpoint...");

        let row = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .fetch_one(&self.db)
            .await?;

        let result = WalCheckpointResult {
            busy: row.try_get(0)?,
            log_frames: row.try_get(1)?,
            checkpointed_frames: row.try_get(2)?,
        };

        if result.busy == 0 {
            tracing::info!(
                "✅ WAL checkpoint complete ({} frames checkpointed)",
                result.checkpointed_frames
            );
        } else {
            tracing::warn!("⚠️ WAL checkpoint partially complete (database was busy)");
        }

        Ok(result)
    }

    /// Get detailed PRAGMA information for diagnostics
    pub async fn get_pragma_diagnostics(&self) -> Result<PragmaDiagnostics> {
        let mut diag = PragmaDiagnostics::default();

        // Journal mode
        if let Ok(row) = sqlx::query("PRAGMA journal_mode").fetch_one(&self.db).await {
            diag.journal_mode = row.try_get(0)?;
        }

        // Synchronous mode
        if let Ok(row) = sqlx::query("PRAGMA synchronous").fetch_one(&self.db).await {
            diag.synchronous = row.try_get(0)?;
        }

        // Cache size
        if let Ok(row) = sqlx::query("PRAGMA cache_size").fetch_one(&self.db).await {
            diag.cache_size = row.try_get(0)?;
        }

        // Page size
        if let Ok(row) = sqlx::query("PRAGMA page_size").fetch_one(&self.db).await {
            diag.page_size = row.try_get(0)?;
        }

        // Auto vacuum
        if let Ok(row) = sqlx::query("PRAGMA auto_vacuum").fetch_one(&self.db).await {
            diag.auto_vacuum = row.try_get(0)?;
        }

        // Foreign keys
        if let Ok(row) = sqlx::query("PRAGMA foreign_keys").fetch_one(&self.db).await {
            diag.foreign_keys = row.try_get::<i64, _>(0)? == 1;
        }

        // Temp store
        if let Ok(row) = sqlx::query("PRAGMA temp_store").fetch_one(&self.db).await {
            diag.temp_store = row.try_get(0)?;
        }

        // Locking mode
        if let Ok(row) = sqlx::query("PRAGMA locking_mode").fetch_one(&self.db).await {
            diag.locking_mode = row.try_get(0)?;
        }

        // Secure delete
        if let Ok(row) = sqlx::query("PRAGMA secure_delete")
            .fetch_one(&self.db)
            .await
        {
            diag.secure_delete = row.try_get(0)?;
        }

        // Cell size check
        if let Ok(row) = sqlx::query("PRAGMA cell_size_check")
            .fetch_one(&self.db)
            .await
        {
            diag.cell_size_check = row.try_get::<i64, _>(0)? == 1;
        }

        // SQLite version
        if let Ok(row) = sqlx::query("SELECT sqlite_version()")
            .fetch_one(&self.db)
            .await
        {
            diag.sqlite_version = row.try_get(0)?;
        }

        Ok(diag)
    }
}
