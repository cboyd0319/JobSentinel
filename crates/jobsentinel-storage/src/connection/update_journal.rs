//! Seals database writers and reconciles durable update preparation before restore or migration.

use super::{Database, PortableRestoreStatus, UpdateSnapshot};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::sqlite::SqlitePoolOptions;
use std::{
    io::{Read, Write},
    path::Path,
};

#[cfg(test)]
tokio::task_local! {
    pub(super) static STARTUP_ADMISSION: (std::sync::Arc<tokio::sync::Notify>, std::sync::Arc<tokio::sync::Notify>);
}

#[cfg(test)]
pub(super) async fn pause_after_journal_check() {
    if let Ok((ready, resume)) = STARTUP_ADMISSION.try_with(Clone::clone) {
        ready.notify_one();
        resume.notified().await;
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PreparedUpdate {
    pub schema: String,
    pub source_version: String,
    pub target_version: String,
    pub package_sha256: String,
    pub snapshot: UpdateSnapshot,
    /// Source-version restart cancelled preparation; this never records installation success.
    pub reconciled_version: Option<String>,
}

fn failure() -> sqlx::Error {
    sqlx::Error::Protocol("Update preparation requires a safe restart or local recovery".into())
}

fn journal_path(database: &Path) -> Result<std::path::PathBuf, sqlx::Error> {
    Ok(database
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(failure)?
        .join(format!(
            ".jobsentinel-update-{}.json",
            hex::encode(Sha256::digest(
                database.file_name().ok_or_else(failure)?.as_encoded_bytes()
            ))
        )))
}

fn valid_version(value: &str) -> bool {
    let parts: Vec<_> = value.split('.').collect();
    parts.len() == 3
        && parts[0] == "3"
        && parts
            .iter()
            .all(|p| p.parse::<u32>().is_ok_and(|n| n.to_string() == *p))
}

fn read_journal(database: &Path) -> Result<Option<PreparedUpdate>, sqlx::Error> {
    let path = journal_path(database)?;
    let metadata = match std::fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if !metadata.is_file() || metadata.len() > 4096 {
        return Err(failure());
    }
    let mut file = jobsentinel_platform::open_private_file(&path)?.ok_or_else(failure)?;
    if !jobsentinel_platform::opened_file_matches_path(&file, &path) {
        return Err(failure());
    }
    let mut bytes = Vec::new();
    Read::by_ref(&mut file).take(4097).read_to_end(&mut bytes)?;
    if bytes.len() > 4096 || !jobsentinel_platform::opened_file_matches_path(&file, &path) {
        return Err(failure());
    }
    let journal: PreparedUpdate = serde_json::from_slice(&bytes).map_err(|_| failure())?;
    if journal.schema != "jobsentinel.prepared-update.v1"
        || journal.snapshot.database_identity != Database::update_database_identity(database)?
        || !valid_version(&journal.source_version)
        || !valid_version(&journal.target_version)
        || journal.package_sha256.len() != 64
        || !journal
            .package_sha256
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        || uuid::Uuid::parse_str(&journal.snapshot.operation_id).is_err()
        || journal
            .reconciled_version
            .as_ref()
            .is_some_and(|v| v != &journal.source_version)
    {
        return Err(failure());
    }
    Ok(Some(journal))
}

fn write_journal(database: &Path, journal: &PreparedUpdate) -> Result<(), sqlx::Error> {
    let path = journal_path(database)?;
    let bytes = serde_json::to_string(journal).map_err(|_| failure())?;
    if let Ok(metadata) = std::fs::symlink_metadata(&path) {
        if !metadata.is_file() {
            return Err(failure());
        }
    }
    let mut temporary = tempfile::NamedTempFile::new_in(path.parent().ok_or_else(failure)?)?;
    jobsentinel_platform::ensure_private_file(temporary.path())?;
    temporary.write_all(bytes.as_bytes())?;
    temporary.as_file().sync_all()?;
    #[cfg(windows)]
    let file = jobsentinel_platform::persist_file_write_through(temporary, &path)?;
    #[cfg(not(windows))]
    let file = temporary
        .persist(&path)
        .map_err(|error| sqlx::Error::Io(error.error))?;
    if !jobsentinel_platform::opened_file_matches_path(&file, &path) {
        return Err(failure());
    }
    file.sync_all()?;
    #[cfg(unix)]
    std::fs::File::open(path.parent().ok_or_else(failure)?)?.sync_all()?;
    Ok(())
}

impl Database {
    /// Closes all shared SQLx handles before snapshotting. The owner lock stays held by `self`.
    /// Caller must exclude filesystem/component writers first and retain `self` through handoff.
    /// Any error after pool closure requires restart; this does not authorize an installer.
    pub async fn prepare_update_snapshot(
        &self,
        source_version: &str,
        target_version: &str,
        package_sha256: &str,
    ) -> Result<PreparedUpdate, sqlx::Error> {
        let _preparation = self.migration_lock.lock().await;
        if self.pool.is_closed() {
            return Err(failure());
        }
        let path = self.db_path.as_deref().ok_or_else(failure)?;
        if source_version != env!("CARGO_PKG_VERSION")
            || !valid_version(source_version)
            || !valid_version(target_version)
            || package_sha256.len() != 64
            || !package_sha256
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
            || read_journal(path)?.is_some_and(|j| j.reconciled_version.is_none())
            || Self::staged_restore_status(path)? != PortableRestoreStatus::None
            || !std::fs::symlink_metadata(path)?.is_file()
        {
            return Err(failure());
        }
        let options = (*self.pool.connect_options())
            .clone()
            .create_if_missing(false);
        self.pool.close().await;
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;
        let maintenance = Self {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: Some(path.to_path_buf()),
            _owner_lock: None,
        };
        let result = async {
            let snapshot = maintenance.create_update_snapshot().await?;
            let journal = PreparedUpdate {
                schema: "jobsentinel.prepared-update.v1".into(),
                source_version: source_version.into(),
                target_version: target_version.into(),
                package_sha256: package_sha256.into(),
                snapshot,
                reconciled_version: None,
            };
            write_journal(path, &journal)?;
            Ok(journal)
        }
        .await;
        maintenance.pool.close().await;
        result
    }

    /// Runs before staged restore promotion and migrations. Unknown versions fail closed.
    pub(super) async fn reconcile_prepared_update(
        path: &Path,
        owner: &std::fs::File,
    ) -> Result<Option<Self>, sqlx::Error> {
        Self::reconcile_prepared_update_owned(path, env!("CARGO_PKG_VERSION"), owner).await
    }

    #[cfg(test)]
    async fn reconcile_prepared_update_for_version(
        path: &Path,
        version: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        let owner = Self::acquire_owner_lock(path)?;
        Self::reconcile_prepared_update_owned(path, version, &owner).await
    }

    async fn reconcile_prepared_update_owned(
        path: &Path,
        version: &str,
        owner: &std::fs::File,
    ) -> Result<Option<Self>, sqlx::Error> {
        let Some(mut journal) = read_journal(path)? else {
            return Ok(None);
        };
        if journal.reconciled_version.is_some() {
            return Ok(None);
        }
        if version != journal.source_version
            || Self::staged_restore_status(path)? != PortableRestoreStatus::None
            || !std::fs::symlink_metadata(path)?.is_file()
        {
            return Err(failure());
        }
        let database = Self::connect_owned(path, owner).await?;
        let reconciled = async {
            database.verify_integrity().await?;
            let id =
                uuid::Uuid::parse_str(&journal.snapshot.operation_id).map_err(|_| failure())?;
            if database.inspect_update_snapshot(id).await? != journal.snapshot {
                return Err(failure());
            }
            database.migrate().await?;
            journal.reconciled_version = Some(version.into());
            write_journal(path, &journal)?;
            Ok::<(), sqlx::Error>(())
        }
        .await;
        if let Err(error) = reconciled {
            database.pool.close().await;
            return Err(error);
        }
        Ok(Some(database))
    }
}

#[cfg(test)]
mod tests;
