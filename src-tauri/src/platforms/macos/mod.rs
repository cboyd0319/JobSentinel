//! macOS-Specific Implementation (v2.0 - Coming Soon)
//!
//! This module will contain macOS-specific code for JobSentinel v2.0.
//! Currently a stub implementation to allow compilation on macOS during development.

use std::path::PathBuf;

/// Get macOS application support directory
///
/// Returns: ~/Library/Application Support/JobSentinel
pub fn get_data_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("JobSentinel")
}

/// Get macOS configuration directory
///
/// Returns: ~/.config/jobsentinel
pub fn get_config_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".config")
        .join("jobsentinel")
}

/// Initialize macOS-specific features
pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // Create data directory if it doesn't exist
    let data_dir = get_data_dir();
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)?;
    }

    // Create config directory if it doesn't exist
    let config_dir = get_config_dir();
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
    }

    tracing::info!("macOS platform initialized (v2.0 - limited functionality)");
    tracing::info!("Data directory: {:?}", data_dir);
    tracing::info!("Config directory: {:?}", config_dir);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
    }

    #[test]
    fn test_get_config_dir() {
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().contains("jobsentinel"));
    }
}
