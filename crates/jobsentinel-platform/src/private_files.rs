use std::io::{self, Write};
use std::path::Path;

/// Atomically replace a local file and apply owner-only permissions where supported.
pub fn write_file_atomic_private(path: &Path, content: &str) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::other("Atomic write requires a parent directory"))?;
    super::ensure_private_dir(parent)
        .map_err(|_| io::Error::other("Failed to create parent directory"))?;

    let mut temp_file = tempfile::NamedTempFile::new_in(parent)?;
    temp_file.write_all(content.as_bytes())?;
    temp_file.as_file().sync_all()?;
    temp_file
        .into_temp_path()
        .persist(path)
        .map_err(|error| error.error)?;
    super::ensure_private_file(path)?;
    sync_parent_dir(parent);
    Ok(())
}

#[cfg(unix)]
fn sync_parent_dir(parent: &Path) {
    let _ = std::fs::File::open(parent).and_then(|directory| directory.sync_all());
}

#[cfg(not(unix))]
fn sync_parent_dir(_parent: &Path) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn atomic_write_replaces_existing_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        std::fs::write(&path, "{\"old\":true}").unwrap();

        write_file_atomic_private(&path, "{\"new\":true}").unwrap();

        assert_eq!(std::fs::read_to_string(path).unwrap(), "{\"new\":true}");
    }
}
