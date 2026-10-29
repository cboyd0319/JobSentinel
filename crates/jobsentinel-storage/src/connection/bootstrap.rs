//! Publishes fresh encrypted stores atomically and validates supported-v3 primary identity.

use super::{Database, MIGRATOR};
use crate::encryption::{
    connect_encrypted_pool, load_or_create_database_key, probe_encrypted_user_version,
    probe_plaintext_user_version,
};
use sqlx::{migrate::Migrator, SqliteConnection};
use std::{fs::File, path::Path};
use zeroize::Zeroizing;

// Historical names are read only at supported-v3 pre-migration boundaries.
#[derive(Clone, Copy)]
pub(crate) enum StorageLayout {
    Baseline,
    Current,
}

impl StorageLayout {
    pub(super) const fn metadata_table(self) -> &'static str {
        match self {
            Self::Baseline => "v3_compatibility_metadata",
            Self::Current => "compatibility_metadata",
        }
    }
    pub(super) const fn recovery_table(self) -> &'static str {
        match self {
            Self::Baseline => "v3_recovery_operations",
            Self::Current => "recovery_operations",
        }
    }
}

#[cfg(test)]
tokio::task_local! { pub(super) static BOOTSTRAP_CRASH_POINT: u8; }

impl Database {
    /// Classify only an absent primary with no data/recovery evidence as a new profile.
    pub fn portable_primary_is_new(path: &Path) -> Result<bool, sqlx::Error> {
        match std::fs::symlink_metadata(path) {
            Ok(_) => return Ok(false),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        let parent = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        let entries = match std::fs::read_dir(parent) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(true),
            Err(error) => return Err(error.into()),
        };
        let owner = Self::sibling_path(path, ".owner.lock");
        for entry in entries {
            let entry = entry?;
            if entry.path() != owner || !entry.file_type()?.is_file() {
                return Ok(false);
            }
        }
        Ok(true)
    }

    /// Authenticate without opening writers or authorizing any restore/update transition.
    pub async fn verify_portable_passphrase(
        path: &Path,
        passphrase: &str,
    ) -> Result<(), sqlx::Error> {
        validate_portable_primary_passphrase(passphrase)?;
        if Self::portable_primary_is_new(path)? {
            return Ok(());
        }
        if std::fs::symlink_metadata(path).is_ok_and(|metadata| metadata.file_type().is_file()) {
            let verified = async {
                Self::refuse_plaintext_primary(path).await?;
                probe_encrypted_user_version(path, passphrase)
                    .await
                    .map(|_| ())
            }
            .await;
            if verified.is_ok() {
                return verified;
            }
        }
        let update = super::update_journal::read_journal(path)?;
        let restore = super::portable_restore::read_restore_request(path)?;
        if update.is_some() && restore.is_some() {
            return Err(sqlx::Error::Protocol(
                "Conflicting local recovery artifacts require review".into(),
            ));
        }
        if let Some(journal) = update {
            return Self::verify_update_snapshot_passphrase(path, &journal.snapshot, passphrase)
                .await;
        }
        if let Some(request) = restore {
            return super::portable_restore_bundle::verify_restore_passphrase(
                path, passphrase, &request,
            )
            .await;
        }
        Err(sqlx::Error::Protocol(
            "Portable profile could not be authenticated; existing data requires recovery".into(),
        ))
    }

    /// Open a portable primary using its passphrase, without accessing device key storage.
    /// Passphrase errors and unsupported data are refused before any database writer opens.
    #[cfg(test)]
    pub(super) async fn connect_portable(
        path: &Path,
        passphrase: &str,
    ) -> Result<Self, sqlx::Error> {
        validate_portable_primary_passphrase(passphrase)?;
        Self::ensure_database_parent(path)?;
        let owner = Self::acquire_owner_lock(path)?;
        Self::connect_owned_with_passphrase(path, &owner, Some(passphrase)).await
    }

    pub(super) async fn connect_owned(path: &Path, owner: &File) -> Result<Self, sqlx::Error> {
        Self::connect_owned_with_passphrase(path, owner, None).await
    }

    async fn connect_owned_with_passphrase(
        path: &Path,
        owner: &File,
        passphrase: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        let owner_lock = owner.try_clone()?;
        Self::refuse_missing_primary(path)?;

        if path.exists() {
            Self::refuse_plaintext_primary(path).await?;
        }

        let key = match passphrase {
            Some(passphrase) => Zeroizing::new(passphrase.to_owned()),
            None => load_or_create_database_key().await?,
        };
        if path.exists() {
            probe_encrypted_user_version(path, &key).await?;
        } else {
            Self::bootstrap_database(path, &key, &MIGRATOR).await?;
        }
        let pool = connect_encrypted_pool(path, &key, false).await?;

        jobsentinel_platform::ensure_private_sqlite_files(path).map_err(sqlx::Error::Io)?;

        Ok(Database {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: Some(path.to_path_buf()),
            _owner_lock: Some(owner_lock),
        })
    }

    async fn refuse_plaintext_primary(path: &Path) -> Result<(), sqlx::Error> {
        if let Some(version) = probe_plaintext_user_version(path).await? {
            Self::refuse_unsupported_database(version)?;
            return Err(sqlx::Error::Protocol(
                "Plaintext local database is unsupported; requires recovery".into(),
            ));
        }
        Ok(())
    }

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
    ) -> Result<StorageLayout, sqlx::Error> {
        let generation: i64 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut *connection)
            .await?;
        Self::refuse_unsupported_database(generation)?;
        Self::refuse_future_data(connection).await?;
        let tables: (i64, i64, i64) = sqlx::query_as(
            "SELECT
                EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'),
                EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='v3_compatibility_metadata'),
                EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='compatibility_metadata')",
        ).fetch_one(&mut *connection).await?;
        let inconsistent = || {
            sqlx::Error::Protocol(
                "Local database compatibility metadata is inconsistent; requires recovery".into(),
            )
        };
        if tables.1 + tables.2 == 0 {
            let v3_ledger: i64 = if tables.0 != 0 {
                sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE version >= 11")
                    .fetch_one(&mut *connection)
                    .await?
            } else {
                0
            };
            return Err(if v3_ledger == 0 {
                sqlx::Error::Protocol(
                    "Pre-v3 or unmarked local database is unsupported; requires recovery".into(),
                )
            } else {
                inconsistent()
            });
        }
        if tables.0 == 0 || tables.1 + tables.2 != 1 {
            return Err(inconsistent());
        }
        let applied: i64 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations WHERE success = 1",
        )
        .fetch_one(&mut *connection)
        .await?;
        let renamed = Self::has_identity_migration(connection, 33).await?;
        let layout = if renamed {
            StorageLayout::Current
        } else {
            StorageLayout::Baseline
        };
        if (renamed && tables.2 != 1) || (!renamed && (applied >= 33 || tables.1 != 1)) {
            return Err(inconsistent());
        }
        Self::require_physical_table_layout(connection, applied).await?;
        let query = format!(
            "SELECT singleton, schema, compatibility_line, database_schema, migration_version FROM {}",
            layout.metadata_table(),
        );
        let metadata: Vec<(i64, String, i64, i64, i64)> =
            sqlx::query_as(sqlx::AssertSqlSafe(query))
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
            || metadata.4 > applied
            || (renamed != (metadata.4 >= 33))
            || !Self::has_identity_migration(connection, 11).await?
        {
            return Err(inconsistent());
        }
        Ok(layout)
    }

    async fn require_physical_table_layout(
        connection: &mut SqliteConnection,
        applied: i64,
    ) -> Result<(), sqlx::Error> {
        let tables: std::collections::BTreeSet<String> =
            sqlx::query_scalar("SELECT name FROM sqlite_master WHERE type='table'")
                .fetch_all(connection)
                .await?
                .into_iter()
                .collect();
        // Introduction and physical rename sequences come from immutable migrations11–33.
        for (table, introduced, renamed) in [
            ("compatibility_metadata", 11, 33),
            ("job_events", 11, 33),
            ("privacy_receipts", 11, 33),
            ("source_policies", 11, 33),
            ("recovery_operations", 12, 33),
            ("source_policy_ledger", 13, 33),
            ("source_consent_events", 13, 33),
            ("outside_ai_operations", 14, 33),
            ("source_manifests", 15, 33),
            ("local_vectors", 21, 32),
            ("evidence_packets", 22, 33),
            ("evidence_packet_evidence", 22, 33),
            ("evidence_packet_boundaries", 22, 33),
            ("pack_publishers", 23, 33),
            ("pack_releases", 23, 33),
            ("pack_streams", 23, 33),
        ] {
            let current = applied >= renamed;
            let present = applied >= introduced;
            if tables.contains(table) != (present && current)
                || tables.contains(&format!("v3_{table}")) != (present && !current)
            {
                return Err(sqlx::Error::Protocol(
                    "Local database compatibility metadata is inconsistent; requires recovery"
                        .into(),
                ));
            }
        }
        Ok(())
    }

    async fn has_identity_migration(
        connection: &mut SqliteConnection,
        version: i64,
    ) -> Result<bool, sqlx::Error> {
        let applied: Option<(bool, Vec<u8>)> =
            sqlx::query_as("SELECT success, checksum FROM _sqlx_migrations WHERE version = ?")
                .bind(version)
                .fetch_optional(connection)
                .await?;
        let Some((success, checksum)) = applied else {
            return Ok(false);
        };
        let compiled = MIGRATOR
            .iter()
            .find(|migration| migration.version == version);
        if !success || compiled.is_none_or(|migration| checksum != migration.checksum.as_ref()) {
            return Err(sqlx::Error::Protocol(
                "Local database compatibility metadata is inconsistent; requires recovery".into(),
            ));
        }
        Ok(true)
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

fn validate_portable_primary_passphrase(passphrase: &str) -> Result<(), sqlx::Error> {
    if passphrase.len() > 1024 || passphrase.trim().chars().count() < 16 {
        return Err(sqlx::Error::Protocol("Portable profile passphrase requires at least 16 trimmed characters and at most 1024 bytes".into()));
    }
    Ok(())
}
