//! Creates and verifies durable same-device update recovery snapshots using the migration backup owner.

use super::Database;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{File, OpenOptions},
    io::{Read, Write},
    path::PathBuf,
};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateSnapshot {
    pub schema: String,
    pub operation_id: String,
    pub database_identity: String,
    pub database_schema: u64,
    pub migration_sequence: u64,
    pub sha256: String,
}

fn failure() -> sqlx::Error {
    sqlx::Error::Protocol("Update recovery snapshot verification failed".into())
}

impl Database {
    /// Authenticate a journal-bound snapshot without changing the primary or recovery state.
    pub(super) async fn verify_update_snapshot_passphrase(
        path: &std::path::Path,
        expected: &UpdateSnapshot,
        key: &str,
    ) -> Result<(), sqlx::Error> {
        let (snapshot, input) = open_snapshot_candidate(path, expected)?;
        let pool = crate::encryption::connect_encrypted_read_only_pool(&snapshot, key).await?;
        let verifier = Self {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: Some(path.to_path_buf()),
            _owner_lock: None,
        };
        let outcome = async {
            let mut connection = verifier.pool.acquire().await?;
            Self::require_supported_v3(&mut connection).await?;
            drop(connection);
            if verifier
                .inspect_update_snapshot(
                    Uuid::parse_str(&expected.operation_id).map_err(|_| failure())?,
                )
                .await?
                != *expected
                || !jobsentinel_platform::opened_file_matches_path(&input, &snapshot)
            {
                return Err(failure());
            }
            Ok(())
        }
        .await;
        verifier.pool.close().await;
        outcome
    }
    /// Recovers an interrupted target without opening its potentially corrupt primary database.
    /// The caller must hold the primary database owner reservation throughout this operation.
    pub(super) async fn restore_update_snapshot_at(
        path: &std::path::Path,
        expected: &UpdateSnapshot,
    ) -> Result<(), sqlx::Error> {
        let (snapshot, input) = open_snapshot_candidate(path, expected)?;
        let key = crate::encryption::load_or_create_database_key().await?;
        let pool = crate::encryption::connect_encrypted_read_only_pool(&snapshot, &key).await?;
        let verifier = Self {
            pool,
            migration_lock: tokio::sync::Mutex::new(()),
            db_path: Some(path.to_path_buf()),
            _owner_lock: None,
        };
        let result = async {
            if !jobsentinel_platform::opened_file_matches_path(&input, &snapshot) {
                return Err(failure());
            }
            verifier.restore_update_snapshot(expected).await
        }
        .await;
        verifier.pool.close().await;
        result
    }

    /// The caller retains the database owner and excludes all writers through restart.
    pub(super) async fn restore_update_snapshot(
        &self,
        expected: &UpdateSnapshot,
    ) -> Result<(), sqlx::Error> {
        let id = Uuid::parse_str(&expected.operation_id).map_err(|_| failure())?;
        if self.inspect_update_snapshot(id).await? != *expected {
            return Err(failure());
        }
        let path = self.db_path.as_deref().ok_or_else(failure)?;
        let directory = self.update_snapshot_directory(id)?;
        let snapshot = directory.join("snapshot.db");
        let mut input = open_snapshot_file(&snapshot)?;
        let mut temporary = tempfile::NamedTempFile::new_in(path.parent().ok_or_else(failure)?)?;
        jobsentinel_platform::ensure_private_file(temporary.path())?;
        std::io::copy(&mut input, &mut temporary)?;
        temporary.as_file().sync_all()?;
        if digest(temporary.path())? != expected.sha256
            || !jobsentinel_platform::opened_file_matches_path(&input, &snapshot)
        {
            return Err(failure());
        }
        self.pool.close().await;
        // Preserve the complete failed target before replacing data or discarding sidecars.
        super::portable_restore_bundle::preserve_remaining_bundle(
            path,
            &directory.join(format!("failed-{}.db", Uuid::new_v4())),
        )?;
        super::portable_restore::remove_sqlite_sidecars_checked(path)?;
        #[cfg(windows)]
        let file = jobsentinel_platform::persist_file_write_through(temporary, path)?;
        #[cfg(not(windows))]
        let file = temporary.persist(path).map_err(|error| error.error)?;
        if !jobsentinel_platform::opened_file_matches_path(&file, path) {
            return Err(failure());
        }
        file.sync_all()?;
        #[cfg(unix)]
        File::open(path.parent().ok_or_else(failure)?)?.sync_all()?;
        Ok(())
    }

    pub(super) fn update_database_identity(path: &std::path::Path) -> Result<String, sqlx::Error> {
        match std::fs::symlink_metadata(path) {
            Ok(metadata) if !metadata.is_file() => return Err(failure()),
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(error.into()),
            _ => {}
        }
        let identity = path
            .parent()
            .ok_or_else(failure)?
            .canonicalize()?
            .join(path.file_name().ok_or_else(failure)?);
        Ok(hex::encode(Sha256::digest(
            identity.as_os_str().as_encoded_bytes(),
        )))
    }

    fn update_snapshot_directory(&self, id: Uuid) -> Result<PathBuf, sqlx::Error> {
        let parent = self
            .db_path
            .as_deref()
            .and_then(|path| path.parent())
            .filter(|path| !path.as_os_str().is_empty())
            .ok_or_else(failure)?;
        Ok(parent.join(format!(".update-snapshot-{id}")))
    }

    /// Caller must quiesce writers before treating this consistent SQLite snapshot as its update boundary.
    /// This snapshot retains source encryption and local credentials; it is not a portable backup.
    pub async fn create_update_snapshot(&self) -> Result<UpdateSnapshot, sqlx::Error> {
        let (database_schema, migration_sequence) = self.update_schema_inventory().await?;
        let operation_id = Uuid::new_v4();
        let directory = self.update_snapshot_directory(operation_id)?;
        let mut builder = std::fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        builder.create(&directory)?;
        let mut pending = PendingSnapshot(Some(directory.clone()));
        jobsentinel_platform::ensure_private_dir(&directory)?;
        let snapshot_path = directory.join("snapshot.db");
        Self::create_verified_snapshot(&self.pool, &snapshot_path)
            .await
            .map_err(|_| failure())?;
        let snapshot_file = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&snapshot_path)?;
        if !jobsentinel_platform::opened_file_matches_path(&snapshot_file, &snapshot_path) {
            return Err(failure());
        }
        snapshot_file.sync_all()?;
        drop(snapshot_file);
        let snapshot = UpdateSnapshot {
            schema: "jobsentinel.update-snapshot.v1".into(),
            operation_id: operation_id.to_string(),
            database_identity: Self::update_database_identity(
                self.db_path.as_deref().ok_or_else(failure)?,
            )?,
            database_schema,
            migration_sequence,
            sha256: digest(&snapshot_path)?,
        };
        let bytes = serde_json::to_vec(&snapshot).map_err(|_| failure())?;
        let receipt_path = directory.join("receipt.json");
        let mut receipt = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&receipt_path)?;
        jobsentinel_platform::ensure_private_file(&receipt_path)?;
        receipt.write_all(&bytes)?;
        receipt.sync_all()?;
        #[cfg(unix)]
        {
            File::open(&directory)?.sync_all()?;
            File::open(directory.parent().ok_or_else(failure)?)?.sync_all()?;
        }
        let verified = self.inspect_update_snapshot(operation_id).await?;
        pending.0 = None;
        Ok(verified)
    }

    /// Reopens only an application-generated snapshot ID; malformed or modified snapshots fail closed.
    pub async fn inspect_update_snapshot(&self, id: Uuid) -> Result<UpdateSnapshot, sqlx::Error> {
        let directory = self.update_snapshot_directory(id)?;
        let meta = std::fs::symlink_metadata(&directory)?;
        if !meta.is_dir() || meta.file_type().is_symlink() {
            return Err(failure());
        }
        let receipt_path = directory.join("receipt.json");
        let mut file = open_snapshot_file(&receipt_path)?;
        if file.metadata()?.len() > 4096 {
            return Err(failure());
        }
        let mut bytes = Vec::new();
        Read::by_ref(&mut file).take(4097).read_to_end(&mut bytes)?;
        if bytes.len() > 4096 {
            return Err(failure());
        }
        let receipt: UpdateSnapshot = serde_json::from_slice(&bytes).map_err(|_| failure())?;
        let snapshot = directory.join("snapshot.db");
        if receipt.schema != "jobsentinel.update-snapshot.v1"
            || receipt.database_identity
                != Self::update_database_identity(self.db_path.as_deref().ok_or_else(failure)?)?
            || receipt.operation_id != id.to_string()
            || receipt.database_schema == 0
            || receipt.migration_sequence == 0
            || receipt.sha256 != digest(&snapshot)?
        {
            return Err(failure());
        }
        Self::verify_pre_migration_backup(&self.pool, snapshot.to_str().ok_or_else(failure)?)
            .await?;
        let mut connection = Self::snapshot_connection(&self.pool).await?;
        sqlx::query("ATTACH DATABASE ? AS update_snapshot_check")
            .bind(super::backups::read_only_snapshot_uri(&snapshot)?)
            .execute(&mut *connection)
            .await?;
        let checked = async {
            let schema: i64 = sqlx::query_scalar("PRAGMA update_snapshot_check.user_version")
                .fetch_one(&mut *connection)
                .await?;
            let sequence: i64 = sqlx::query_scalar(
                "SELECT MAX(version) FROM update_snapshot_check._sqlx_migrations WHERE success = 1",
            )
            .fetch_one(&mut *connection)
            .await?;
            if u64::try_from(schema).ok() != Some(receipt.database_schema)
                || u64::try_from(sequence).ok() != Some(receipt.migration_sequence)
            {
                return Err(failure());
            }
            Ok(())
        }
        .await;
        let detached = sqlx::query("DETACH DATABASE update_snapshot_check")
            .execute(&mut *connection)
            .await;
        checked?;
        detached?;
        if receipt.sha256 != digest(&snapshot)? {
            return Err(failure());
        }
        Ok(receipt)
    }
}

fn open_snapshot_candidate(
    path: &std::path::Path,
    expected: &UpdateSnapshot,
) -> Result<(PathBuf, File), sqlx::Error> {
    let id = Uuid::parse_str(&expected.operation_id).map_err(|_| failure())?;
    let snapshot = path
        .parent()
        .ok_or_else(failure)?
        .join(format!(".update-snapshot-{id}"))
        .join("snapshot.db");
    let metadata = std::fs::symlink_metadata(snapshot.parent().ok_or_else(failure)?)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(failure());
    }
    let input = open_snapshot_file(&snapshot)?;
    Ok((snapshot, input))
}

fn digest(path: &std::path::Path) -> Result<String, sqlx::Error> {
    let mut file = open_snapshot_file(path)?;
    let mut hash = Sha256::new();
    let mut bytes = [0; 8192];
    loop {
        let count = file.read(&mut bytes)?;
        if count == 0 {
            break;
        }
        hash.update(&bytes[..count]);
    }
    if !jobsentinel_platform::opened_file_matches_path(&file, path) {
        return Err(failure());
    }
    Ok(hex::encode(hash.finalize()))
}

struct PendingSnapshot(Option<PathBuf>);
impl Drop for PendingSnapshot {
    fn drop(&mut self) {
        if let Some(path) = &self.0 {
            for name in ["receipt.json", "snapshot.db"] {
                let _ = std::fs::remove_file(path.join(name));
            }
            let _ = std::fs::remove_dir(path);
        }
    }
}

#[cfg(test)]
mod tests;

fn open_snapshot_file(path: &std::path::Path) -> Result<File, sqlx::Error> {
    let file = jobsentinel_platform::open_private_file(path)?.ok_or_else(failure)?;
    if !jobsentinel_platform::opened_file_matches_path(&file, path) {
        return Err(failure());
    }
    Ok(file)
}
