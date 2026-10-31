//! Removes only the exact retained installer after authenticated target startup succeeds.

use super::*;

impl Database {
    /// Busy or changed installer files remain recorded for a later target startup retry.
    pub fn cleanup_update_package(&self) -> Result<(), sqlx::Error> {
        let path = self.db_path.as_deref().ok_or_else(failure)?;
        let Some(mut journal) = read_journal(path)? else {
            return Ok(());
        };
        if journal.phase != UpdatePreparationPhase::Reconciled
            || journal.reconciled_version.as_deref() != Some(journal.target_version.as_str())
            || journal.target_version != env!("CARGO_PKG_VERSION")
        {
            return Ok(());
        }
        let Some(package) = &journal.staged_package else {
            return Ok(());
        };
        let directory = path
            .parent()
            .ok_or_else(failure)?
            .join(format!(".update-package-{}", package.operation_id));
        match std::fs::symlink_metadata(&directory) {
            Ok(metadata) if !metadata.is_dir() || metadata.file_type().is_symlink() => {
                return Err(failure())
            }
            Ok(_) => {
                let installer = directory.join(format!("installer.{}", package.extension));
                if let Some(mut file) = jobsentinel_platform::open_private_file(&installer)? {
                    if file.metadata()?.len() > 512 * 1024 * 1024 {
                        return Err(failure());
                    }
                    let mut hash = Sha256::new();
                    let mut buffer = [0; 8192];
                    let mut total = 0u64;
                    loop {
                        let count = file.read(&mut buffer)?;
                        if count == 0 {
                            break;
                        }
                        total += count as u64;
                        if total > 512 * 1024 * 1024 {
                            return Err(failure());
                        }
                        hash.update(&buffer[..count]);
                    }
                    if hex::encode(hash.finalize()) != journal.package_sha256
                        || !jobsentinel_platform::opened_file_matches_path(&file, &installer)
                    {
                        return Err(failure());
                    }
                    drop(file);
                    std::fs::remove_file(installer)?;
                }
                std::fs::remove_dir(directory)?;
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        journal.staged_package = None;
        write_journal(path, &journal)
    }
}
