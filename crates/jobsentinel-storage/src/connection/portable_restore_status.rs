//! Reports and cancels staged portable restores, preserving invalid markers for review.
use super::{
    portable_restore::{
        path_entry_exists, read_restore_request, remove_owned_database, restore_error,
        restore_request_path, restore_stage_path, sibling_path, PortableRestoreStatus,
        RestorePhase, RestoreRequest, MAX_RESTORE_MARKER_BYTES,
    },
    portable_restore_bundle::sync_parent,
    Database,
};
use crate::encryption::sqlite_sidecar_path;
use std::{io::Read, path::Path};
use uuid::Uuid;

impl Database {
    pub async fn cancel_staged_restore(&self) -> Result<bool, sqlx::Error> {
        let db_path = self
            .db_path
            .as_deref()
            .ok_or_else(|| restore_error("Portable restore requires an on-disk database"))?;
        let (cancelled, request) = revoke_staged_restore(db_path)?;
        if let Some(request) = request {
            self.finish_restore_operation(&request.restore_id, "cancelled", None)
                .await?;
        }
        Ok(cancelled)
    }

    pub fn cancel_staged_restore_at(database_path: &Path) -> Result<bool, sqlx::Error> {
        let _owner = Self::acquire_owner_lock(database_path)?;
        revoke_staged_restore(database_path).map(|(cancelled, _)| cancelled)
    }

    pub fn staged_restore_status(
        database_path: &Path,
    ) -> Result<PortableRestoreStatus, sqlx::Error> {
        let request = match read_restore_request(database_path) {
            Ok(request) => request,
            Err(_) if repairable_invalid_restore_request(database_path)? => {
                return Ok(PortableRestoreStatus::Invalid);
            }
            Err(error) => return Err(error),
        };
        Ok(match request {
            Some(request) => match request.phase {
                RestorePhase::Ready => PortableRestoreStatus::Ready,
                RestorePhase::Promoting => PortableRestoreStatus::Promoting,
                RestorePhase::Promoted => PortableRestoreStatus::Promoted,
            },
            None if path_entry_exists(&restore_stage_path(database_path))? => {
                PortableRestoreStatus::Incomplete
            }
            None => PortableRestoreStatus::None,
        })
    }
}

fn revoke_staged_restore(
    database_path: &Path,
) -> Result<(bool, Option<RestoreRequest>), sqlx::Error> {
    let request = match read_restore_request(database_path) {
        Ok(request) => request,
        Err(_) if repairable_invalid_restore_request(database_path)? => {
            preserve_invalid_restore(database_path)?;
            return Ok((true, None));
        }
        Err(error) => return Err(error),
    };
    let Some(request) = request else {
        let stage = restore_stage_path(database_path);
        if !path_entry_exists(&stage)? {
            return Ok((false, None));
        }
        remove_owned_database(&stage).map_err(sqlx::Error::Io)?;
        return Ok((true, None));
    };
    if request.phase != RestorePhase::Ready {
        return Err(restore_error("Portable restore can no longer be cancelled"));
    }
    std::fs::remove_file(restore_request_path(database_path)).map_err(sqlx::Error::Io)?;
    remove_owned_database(&restore_stage_path(database_path)).map_err(sqlx::Error::Io)?;
    Ok((true, Some(request)))
}

fn repairable_invalid_restore_request(database_path: &Path) -> Result<bool, sqlx::Error> {
    let marker = restore_request_path(database_path);
    let metadata = std::fs::symlink_metadata(&marker).map_err(sqlx::Error::Io)?;
    if !metadata.file_type().is_file() || metadata.len() > MAX_RESTORE_MARKER_BYTES {
        return Ok(false);
    }
    let mut bytes = Vec::new();
    std::fs::File::open(marker)
        .map_err(sqlx::Error::Io)?
        .take(MAX_RESTORE_MARKER_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(sqlx::Error::Io)?;
    Ok(bytes.len() as u64 <= MAX_RESTORE_MARKER_BYTES)
}

fn preserve_invalid_restore(database_path: &Path) -> Result<(), sqlx::Error> {
    let repair_id = Uuid::new_v4();
    let marker = restore_request_path(database_path);
    let stage = restore_stage_path(database_path);
    let mut moves = vec![(
        marker,
        sibling_path(
            database_path,
            &format!(".restore-invalid-{repair_id}.request.json"),
        ),
    )];
    for suffix in ["", "-wal", "-shm", "-journal"] {
        let source = if suffix.is_empty() {
            stage.clone()
        } else {
            sqlite_sidecar_path(&stage, suffix)
        };
        match std::fs::symlink_metadata(&source) {
            Ok(metadata) if metadata.file_type().is_file() => moves.push((
                source,
                sibling_path(
                    database_path,
                    &format!(".restore-invalid-{repair_id}.stage{suffix}"),
                ),
            )),
            Ok(_) => {
                return Err(restore_error("Invalid restore files require manual review"));
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(sqlx::Error::Io(error)),
        }
    }
    for (source, destination) in &moves {
        let metadata = std::fs::symlink_metadata(source).map_err(sqlx::Error::Io)?;
        if !metadata.file_type().is_file() || path_entry_exists(destination)? {
            return Err(restore_error("Invalid restore files require manual review"));
        }
        jobsentinel_platform::ensure_private_file(source).map_err(sqlx::Error::Io)?;
    }
    let mut preserved = Vec::new();
    for (source, destination) in &moves {
        if let Err(error) = std::fs::rename(source, destination) {
            for (source, destination) in preserved.into_iter().rev() {
                let _ = std::fs::rename(destination, source);
            }
            return Err(sqlx::Error::Io(error));
        }
        preserved.push((source, destination));
    }
    sync_parent(database_path);
    Ok(())
}
