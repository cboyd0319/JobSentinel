//! Publishes fresh encrypted stores atomically and validates supported-v3 primary identity.

use super::{Database, MIGRATOR};
use crate::encryption::connect_encrypted_pool;
use sqlx::{migrate::Migrator, SqliteConnection};
use std::path::Path;

#[cfg(test)]
tokio::task_local! { pub(super) static BOOTSTRAP_CRASH_POINT: u8; }

impl Database {
    pub(super) fn refuse_missing_primary(path: &Path) -> Result<(), sqlx::Error> {
        if !path.exists() {
            for artifact in std::iter::once(path.with_extension("db.sqlcipher-new")).chain(
                ["-wal", "-shm", "-journal"]
                    .map(|suffix| crate::encryption::sqlite_sidecar_path(path, suffix)),
            ) {
                if artifact.try_exists()? {
                    return Err(sqlx::Error::Protocol(
                        "Incomplete local database requires recovery; refusing to create an empty database".into(),
                    ));
                }
            }
        }
        Ok(())
    }

    pub(crate) async fn require_supported_v3(
        connection: &mut SqliteConnection,
    ) -> Result<(), sqlx::Error> {
        let generation: i64 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut *connection)
            .await?;
        Self::refuse_unsupported_database(generation)?;
        Self::refuse_future_data(connection).await?;
        let tables: (i64, i64) = sqlx::query_as(
            "SELECT
                EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'),
                EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'v3_compatibility_metadata')",
        ).fetch_one(&mut *connection).await?;
        if tables.1 == 0 {
            let v3_ledger: i64 = if tables.0 != 0 {
                sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE version >= 11")
                    .fetch_one(&mut *connection)
                    .await?
            } else {
                0
            };
            return Err(sqlx::Error::Protocol(
                if v3_ledger == 0 {
                    "Pre-v3 or unmarked local database is unsupported; requires recovery"
                } else {
                    "Local database compatibility metadata is inconsistent; requires recovery"
                }
                .into(),
            ));
        }
        let inconsistent = || {
            sqlx::Error::Protocol(
                "Local database compatibility metadata is inconsistent; requires recovery".into(),
            )
        };
        if tables.0 == 0 {
            return Err(inconsistent());
        }
        let metadata: Vec<(i64, String, i64, i64, i64)> = sqlx::query_as(
            "SELECT singleton, schema, compatibility_line, database_schema, migration_version
             FROM v3_compatibility_metadata",
        )
        .fetch_all(&mut *connection)
        .await?;
        let [metadata] = metadata.as_slice() else {
            return Err(inconsistent());
        };
        let maximum = MIGRATOR
            .iter()
            .map(|migration| migration.version)
            .max()
            .unwrap_or(0);
        if metadata.0 != 1
            || metadata.1 != "jobsentinel.v3.compatibility.v1"
            || metadata.2 != 3
            || metadata.3 != super::DATABASE_SCHEMA_VERSION
            || !(11..=maximum).contains(&metadata.4)
        {
            return Err(inconsistent());
        }
        let migration = MIGRATOR
            .iter()
            .find(|migration| migration.version == 11)
            .ok_or_else(inconsistent)?;
        let applied: Option<(bool, Vec<u8>)> =
            sqlx::query_as("SELECT success, checksum FROM _sqlx_migrations WHERE version = 11")
                .fetch_optional(&mut *connection)
                .await?;
        if !applied
            .is_some_and(|(success, checksum)| success && checksum == migration.checksum.as_ref())
        {
            return Err(inconsistent());
        }
        let applied: i64 =
            sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations WHERE success = 1")
                .fetch_one(&mut *connection)
                .await?;
        if metadata.4 > applied {
            return Err(inconsistent());
        }
        Ok(())
    }

    pub(super) async fn bootstrap_database(
        path: &Path,
        key: &str,
        migrator: &Migrator,
    ) -> Result<(), sqlx::Error> {
        let parent = path
            .parent()
            .filter(|path| !path.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        let directory = tempfile::Builder::new()
            .prefix(".jobsentinel-bootstrap-")
            .tempdir_in(parent)?;
        let staged = tempfile::NamedTempFile::new_in(directory.path())?;
        let pool = connect_encrypted_pool(staged.path(), key, false).await?;
        let database = Self {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: None,
            _owner_lock: None,
        };
        let result = async {
            #[cfg(test)]
            if BOOTSTRAP_CRASH_POINT
                .try_with(|point| *point == 1)
                .unwrap_or(false)
            {
                MIGRATOR.run_to(10, database.pool()).await?;
                std::process::exit(91);
            }
            database.migrate_with(migrator).await?;
            let (busy, _, _): (i64, i64, i64) = sqlx::query_as("PRAGMA wal_checkpoint(TRUNCATE)")
                .fetch_one(database.pool())
                .await?;
            if busy != 0 {
                return Err(sqlx::Error::Protocol(
                    "Fresh database checkpoint did not finish".into(),
                ));
            }
            Ok::<(), sqlx::Error>(())
        }
        .await;
        database.pool.close().await;
        result?;
        jobsentinel_platform::ensure_private_file(staged.path())?;
        staged.as_file().sync_all()?;
        #[cfg(test)]
        if BOOTSTRAP_CRASH_POINT
            .try_with(|point| *point == 2)
            .unwrap_or(false)
        {
            std::process::exit(92);
        }
        #[cfg(windows)]
        jobsentinel_platform::persist_file_noclobber_write_through(staged, path)?;
        #[cfg(not(windows))]
        staged
            .persist_noclobber(path)
            .map_err(|error| sqlx::Error::Io(error.error))?;
        #[cfg(unix)]
        std::fs::File::open(parent)?.sync_all()?;
        Ok(())
    }
}
