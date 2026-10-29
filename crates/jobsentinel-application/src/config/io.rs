//! Validates current config inputs and persists private settings atomically.

use super::types::Config;
use super::validation::validate_config;
use std::io;
use std::path::{Path, PathBuf};

pub(crate) fn write_file_atomic_private(path: &Path, content: &str) -> io::Result<()> {
    jobsentinel_platform::write_file_atomic_private(path, content)
}

impl Config {
    pub(crate) fn from_json(content: &str) -> Result<Self, Box<dyn std::error::Error>> {
        reject_retired_company_keys(&serde_json::from_str(content)?)?;
        // Preserve typed serde rejection of duplicate known fields in the original text.
        let config: Config = serde_json::from_str(content)?;
        validate_config(&config)?;
        Ok(config)
    }

    /// Decode current command input and validate it before any persistent or runtime change.
    pub fn from_value(value: serde_json::Value) -> Result<Self, Box<dyn std::error::Error>> {
        reject_retired_company_keys(&value)?;
        let config: Self = serde_json::from_value(value)?;
        validate_config(&config)?;
        Ok(config)
    }

    /// Load configuration from file
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        Self::from_json(&content)
    }

    /// Save configuration to file
    pub fn save(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        // Validate before saving
        validate_config(self)?;

        let content = serde_json::to_string_pretty(self)?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            jobsentinel_platform::ensure_private_dir(parent)
                .map_err(|_e| std::io::Error::other("Failed to create config directory"))?;
        }

        write_file_atomic_private(path, &content)?;
        Ok(())
    }

    /// Get default configuration file path
    pub fn default_path() -> PathBuf {
        jobsentinel_platform::get_config_dir().join("config.json")
    }
}

fn reject_retired_company_keys(value: &serde_json::Value) -> io::Result<()> {
    if ["company_whitelist", "company_blacklist"]
        .iter()
        .any(|key| value.get(key).is_some())
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Retired company preference keys are unsupported",
        ));
    }
    Ok(())
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
