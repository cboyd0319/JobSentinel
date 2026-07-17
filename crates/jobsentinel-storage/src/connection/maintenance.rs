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

    /// Checkpoint the WAL to reclaim space
    ///
    /// This merges the WAL file back into the main database file.
    /// Use this periodically if the WAL grows too large.
    #[cfg(test)]
    pub(crate) async fn checkpoint_wal(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&self.pool)
            .await?;
        tracing::info!("Checkpointed WAL file");
        Ok(())
    }
}
