//! Configuration I/O operations

use super::types::Config;
use super::validation::validate_config;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub(crate) fn write_file_atomic_private(path: &Path, content: &str) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        crate::platforms::ensure_private_dir(parent)
            .map_err(|_| io::Error::other("Failed to create parent directory"))?;
    }

    let parent = path
        .parent()
        .ok_or_else(|| io::Error::other("Atomic write requires a parent directory"))?;
    let mut temp_file = tempfile::NamedTempFile::new_in(parent)?;
    temp_file.write_all(content.as_bytes())?;
    temp_file.as_file().sync_all()?;
    temp_file
        .into_temp_path()
        .persist(path)
        .map_err(|err| err.error)?;
    crate::platforms::ensure_private_file(path)?;
    sync_parent_dir(parent);
    Ok(())
}

#[cfg(unix)]
fn sync_parent_dir(parent: &Path) {
    let _ = std::fs::File::open(parent).and_then(|dir| dir.sync_all());
}

#[cfg(not(unix))]
fn sync_parent_dir(_parent: &Path) {}

impl Config {
    /// Load configuration from file
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;

        // Validate configuration
        validate_config(&config)?;

        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        // Validate before saving
        validate_config(self)?;

        let content = serde_json::to_string_pretty(self)?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            crate::platforms::ensure_private_dir(parent)
                .map_err(|_e| std::io::Error::other("Failed to create config directory"))?;
        }

        write_file_atomic_private(path, &content)?;
        Ok(())
    }

    /// Get default configuration file path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_config_dir().join("config.json")
    }
}

#[cfg(test)]
mod tests {
    use super::write_file_atomic_private;

    #[test]
    fn atomic_write_replaces_existing_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join("config.json");
        std::fs::write(&path, "{\"old\":true}").unwrap();

        write_file_atomic_private(&path, "{\"new\":true}").unwrap();

        assert_eq!(std::fs::read_to_string(path).unwrap(), "{\"new\":true}");
    }
}
