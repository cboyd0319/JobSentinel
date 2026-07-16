use super::*;

impl Database {
    /// Get default database path
    #[must_use]
    pub fn default_path() -> PathBuf {
        jobsentinel_platform::get_data_dir().join("jobs.db")
    }

    /// Get default backup directory path
    #[must_use]
    pub fn default_backup_dir() -> PathBuf {
        jobsentinel_platform::get_data_dir().join("backups")
    }

    /// Create Database from an existing pool (for testing/advanced use cases)
    #[doc(hidden)]
    #[must_use]
    pub fn from_pool(pool: SqlitePool) -> Self {
        Database {
            pool,
            db_path: None,
        }
    }

    /// Run ANALYZE to update query planner statistics
    ///
    /// Should be run periodically (daily or after bulk inserts) to keep
    /// query plans optimal. This helps SQLite choose the best indexes.
    pub async fn analyze(&self) -> Result<(), sqlx::Error> {
        sqlx::query("ANALYZE").execute(&self.pool).await?;
        tracing::info!("Updated query planner statistics");
        Ok(())
    }

    /// Run PRAGMA optimize to maintain database performance
    ///
    /// Should be run periodically (daily) to keep internal structures optimized.
    /// This is a lightweight operation that SQLite uses to maintain performance.
    pub async fn optimize(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA optimize").execute(&self.pool).await?;
        tracing::info!("Optimized database structures");
        Ok(())
    }

    /// Get database size in bytes
    pub async fn database_size(&self) -> Result<i64, sqlx::Error> {
        let size: i64 = sqlx::query_scalar(
            "SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()",
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(size)
    }

    /// Get WAL (Write-Ahead Log) size in pages
    pub async fn wal_size(&self) -> Result<i64, sqlx::Error> {
        let size: i64 = sqlx::query_scalar("PRAGMA wal_checkpoint(PASSIVE)")
            .fetch_one(&self.pool)
            .await?;
        Ok(size)
    }

    /// Checkpoint the WAL to reclaim space
    ///
    /// This merges the WAL file back into the main database file.
    /// Use this periodically if the WAL grows too large.
    pub async fn checkpoint_wal(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&self.pool)
            .await?;
        tracing::info!("Checkpointed WAL file");
        Ok(())
    }
}
