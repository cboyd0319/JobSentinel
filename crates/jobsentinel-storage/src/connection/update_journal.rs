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
    pub staged_package: Option<StagedUpdatePackage>,
    pub phase: UpdatePreparationPhase,
    pub signed_release: Option<SignedUpdateRelease>,
    pub schema: String,
    pub source_version: String,
    pub target_version: String,
    pub package_sha256: String,
    pub snapshot: UpdateSnapshot,
    /// Observed successful database startup; this never records installer completion.
    pub reconciled_version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StagedUpdatePackage {
    pub operation_id: String,
    pub extension: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UpdatePreparationPhase {
    Prepared,
    TargetStarting,
    TargetFailed,
    Reconciled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SignedUpdateRelease {
    pub metadata: String,
    pub signature: String,
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

fn valid_staged_package(package: &StagedUpdatePackage) -> bool {
    uuid::Uuid::parse_str(&package.operation_id)
        .is_ok_and(|id| id.to_string() == package.operation_id)
        && ["dmg", "pkg", "msi", "exe", "deb", "rpm"].contains(&package.extension.as_str())
}

fn valid_version(value: &str) -> bool {
    let parts: Vec<_> = value.split('.').collect();
    parts.len() == 3
        && parts[0] == "3"
        && parts
            .iter()
            .all(|p| p.parse::<u32>().is_ok_and(|n| n.to_string() == *p))
}

pub(super) fn read_journal(database: &Path) -> Result<Option<PreparedUpdate>, sqlx::Error> {
    let path = journal_path(database)?;
    let metadata = match std::fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };
    if !metadata.is_file() || metadata.len() > 144 * 1024 {
        return Err(failure());
    }
    let mut file = jobsentinel_platform::open_private_file(&path)?.ok_or_else(failure)?;
    if !jobsentinel_platform::opened_file_matches_path(&file, &path) {
        return Err(failure());
    }
    let mut bytes = Vec::new();
    Read::by_ref(&mut file)
        .take(144 * 1024 + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() > 144 * 1024 || !jobsentinel_platform::opened_file_matches_path(&file, &path) {
        return Err(failure());
    }
    let journal: PreparedUpdate = serde_json::from_slice(&bytes).map_err(|_| failure())?;
    if journal.source_version == journal.target_version
        || (journal.phase == UpdatePreparationPhase::Reconciled)
            != journal.reconciled_version.is_some()
        || journal
            .staged_package
            .as_ref()
            .is_some_and(|package| !valid_staged_package(package))
        || journal.signed_release.as_ref().is_some_and(|release| {
            release.metadata.len() > 64 * 1024 || release.signature.len() > 128
        })
        || journal.schema != "jobsentinel.prepared-update.v1"
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
            .is_some_and(|v| v != &journal.source_version && v != &journal.target_version)
    {
        return Err(failure());
    }
    Ok(Some(journal))
}

fn write_journal(database: &Path, journal: &PreparedUpdate) -> Result<(), sqlx::Error> {
    let path = journal_path(database)?;
    let bytes = serde_json::to_string(journal).map_err(|_| failure())?;
    if bytes.len() > 144 * 1024 {
        return Err(failure());
    }
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
    /// Inspects a prepared journal without mutation; startup must revalidate any grant under its owner lock.
    pub fn inspect_prepared_update(path: &Path) -> Result<Option<PreparedUpdate>, sqlx::Error> {
        if !journal_path(path)?.try_exists()? {
            return Ok(None);
        }
        let _owner = Self::acquire_owner_lock(path)?;
        read_journal(path)
    }

    /// Closes all shared SQLx handles before snapshotting. The owner lock stays held by `self`.
    /// Caller must exclude filesystem/component writers first and retain `self` through handoff.
    /// Any error after pool closure requires restart; this does not authorize an installer.
    pub async fn prepare_update_snapshot(
        &self,
        source_version: &str,
        target_version: &str,
        package_sha256: &str,
    ) -> Result<PreparedUpdate, sqlx::Error> {
        self.prepare_update_snapshot_inner(
            source_version,
            target_version,
            package_sha256,
            None,
            None,
        )
        .await
    }

    /// Caller supplies release metadata already authenticated against compiled publisher trust.
    pub async fn prepare_signed_update_snapshot(
        &self,
        source_version: &str,
        target_version: &str,
        package_sha256: &str,
        signed_release: SignedUpdateRelease,
        staged_package: StagedUpdatePackage,
    ) -> Result<PreparedUpdate, sqlx::Error> {
        if signed_release.metadata.len() > 64 * 1024 || signed_release.signature.len() > 128 {
            return Err(failure());
        }
        self.prepare_update_snapshot_inner(
            source_version,
            target_version,
            package_sha256,
            Some(signed_release),
            Some(staged_package),
        )
        .await
    }

    async fn prepare_update_snapshot_inner(
        &self,
        source_version: &str,
        target_version: &str,
        package_sha256: &str,
        signed_release: Option<SignedUpdateRelease>,
        staged_package: Option<StagedUpdatePackage>,
    ) -> Result<PreparedUpdate, sqlx::Error> {
        if staged_package
            .as_ref()
            .is_some_and(|package| !valid_staged_package(package))
        {
            return Err(failure());
        }
        let _preparation = self.migration_lock.lock().await;
        if self.pool.is_closed() {
            return Err(failure());
        }
        let path = self.db_path.as_deref().ok_or_else(failure)?;
        if source_version == target_version
            || source_version != env!("CARGO_PKG_VERSION")
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
                phase: UpdatePreparationPhase::Prepared,
                signed_release,
                staged_package,
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
        authorized: Option<&PreparedUpdate>,
    ) -> Result<Option<Self>, sqlx::Error> {
        Self::reconcile_prepared_update_owned(path, env!("CARGO_PKG_VERSION"), owner, authorized)
            .await
    }

    #[cfg(test)]
    async fn reconcile_prepared_update_for_version(
        path: &Path,
        version: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        let owner = Self::acquire_owner_lock(path)?;
        Self::reconcile_prepared_update_owned(path, version, &owner, None).await
    }

    async fn reconcile_prepared_update_owned(
        path: &Path,
        version: &str,
        owner: &std::fs::File,
        authorized: Option<&PreparedUpdate>,
    ) -> Result<Option<Self>, sqlx::Error> {
        let Some(mut journal) = read_journal(path)? else {
            return Ok(None);
        };
        let target = version == journal.target_version;
        let recovering_target = target
            && journal.phase == UpdatePreparationPhase::TargetStarting
            && authorized == Some(&journal);
        match std::fs::symlink_metadata(path) {
            Ok(metadata) if metadata.is_file() => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound && recovering_target => {}
            _ => return Err(failure()),
        }
        if let Some(observed) = &journal.reconciled_version {
            if version == journal.target_version {
                if observed != &journal.target_version || authorized != Some(&journal) {
                    return Err(failure());
                }
            } else if version != journal.source_version {
                return Err(failure());
            }
            return Ok(None);
        }
        if (version != journal.source_version
            && !(version == journal.target_version && authorized == Some(&journal)))
            || Self::staged_restore_status(path)? != PortableRestoreStatus::None
        {
            return Err(failure());
        }
        if (!target && journal.phase == UpdatePreparationPhase::TargetStarting)
            || (target && journal.phase == UpdatePreparationPhase::TargetFailed)
        {
            return Err(failure());
        }
        if target && journal.phase == UpdatePreparationPhase::TargetStarting {
            Self::restore_update_snapshot_at(path, &journal.snapshot).await?;
            journal.phase = UpdatePreparationPhase::TargetFailed;
            write_journal(path, &journal)?;
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
            if target {
                journal.phase = UpdatePreparationPhase::TargetStarting;
                write_journal(path, &journal)?;
            }
            if let Err(error) = database.migrate().await {
                if target {
                    database.restore_update_snapshot(&journal.snapshot).await?;
                    journal.phase = UpdatePreparationPhase::TargetFailed;
                    write_journal(path, &journal)?;
                }
                return Err(error);
            }
            journal.phase = UpdatePreparationPhase::Reconciled;
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

mod cleanup;
#[cfg(test)]
mod tests;
