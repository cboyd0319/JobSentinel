//! Owns new encrypted fixtures and bounded update-marker probes without credential-store access.

use super::Database;
use std::{fs::OpenOptions, path::Path};

fn fixture_key() -> String {
    hex::encode([0xDB; 32])
}

impl Database {
    /// Opens a saved fixture snapshot read-only without inheriting writer-only PRAGMAs.
    fn test_fixture_read_options(path: &Path) -> sqlx::sqlite::SqliteConnectOptions {
        sqlx::sqlite::SqliteConnectOptions::new()
            .filename(path)
            .read_only(true)
            .immutable(true)
            .pragma("key", format!("'{}'", fixture_key()))
    }

    /// Shares the fixture pool so tests can hold actual transactions across native operations.
    pub fn test_fixture_pool(&self) -> sqlx::SqlitePool {
        self.pool.clone()
    }

    /// Uses a public fixed test key and refuses every existing destination, including links.
    pub async fn connect_test_fixture(path: &Path) -> Result<Self, sqlx::Error> {
        let created = OpenOptions::new().write(true).create_new(true).open(path)?;
        jobsentinel_platform::ensure_private_file(path)?;
        let owner = Self::acquire_owner_lock(path)?;
        drop(created);
        let key = fixture_key();
        let pool = crate::encryption::connect_encrypted_pool(path, &key, false).await?;
        Ok(Self {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: Some(path.to_path_buf()),
            _owner_lock: Some(owner),
        })
    }
    /// Seeds the synthetic user marker used by native update orchestration tests.
    pub async fn initialize_update_fixture_marker(&self) -> Result<(), sqlx::Error> {
        sqlx::query("CREATE TABLE coordinator_evidence (value TEXT NOT NULL)")
            .execute(&self.pool)
            .await?;
        sqlx::query("INSERT INTO coordinator_evidence VALUES ('original user data')")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Holds a real write transaction until the test commits or rolls it back.
    pub async fn hold_update_fixture_writer(
        &self,
    ) -> Result<sqlx::Transaction<'static, sqlx::Sqlite>, sqlx::Error> {
        let mut transaction = self.pool.begin().await?;
        sqlx::query("UPDATE coordinator_evidence SET value = 'writer committed'")
            .execute(&mut *transaction)
            .await?;
        Ok(transaction)
    }

    pub async fn update_fixture_value(&self) -> Result<String, sqlx::Error> {
        sqlx::query_scalar("SELECT value FROM coordinator_evidence")
            .fetch_one(&self.pool)
            .await
    }

    /// Must fail once native update preparation seals the shared pool.
    pub async fn probe_late_update_fixture_write(&self) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE coordinator_evidence SET value = 'late'")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn read_update_fixture_snapshot(path: &Path) -> Result<String, sqlx::Error> {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(Self::test_fixture_read_options(path))
            .await?;
        let result = sqlx::query_scalar("SELECT value FROM coordinator_evidence")
            .fetch_one(&pool)
            .await;
        pool.close().await;
        result
    }
}
