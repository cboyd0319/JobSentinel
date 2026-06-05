//! Linux-Specific Implementation
//!
//! This module contains Linux-specific directory handling for JobSentinel using
//! the XDG base directory conventions.

use std::path::PathBuf;

use crate::core::logging::path_label_for_logging;

/// Get Linux data directory (XDG_DATA_HOME)
///
/// Returns: ~/.local/share/jobsentinel
pub fn get_data_dir() -> PathBuf {
    if let Ok(xdg_data_home) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(xdg_data_home).join("jobsentinel")
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("jobsentinel")
    }
}

/// Get Linux configuration directory (XDG_CONFIG_HOME)
///
/// Returns: ~/.config/jobsentinel
pub fn get_config_dir() -> PathBuf {
    if let Ok(xdg_config_home) = std::env::var("XDG_CONFIG_HOME") {
        PathBuf::from(xdg_config_home).join("jobsentinel")
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".config").join("jobsentinel")
    }
}

/// Initialize Linux-specific features
pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // Create data directory if it doesn't exist
    let data_dir = get_data_dir();
    crate::platforms::ensure_private_dir_tree(&data_dir)?;

    // Create config directory if it doesn't exist
    let config_dir = get_config_dir();
    crate::platforms::ensure_private_dir_tree(&config_dir)?;

    tracing::info!("Linux platform initialized");
    tracing::info!(data_dir = %path_label_for_logging(&data_dir), "Data directory ready");
    tracing::info!(config_dir = %path_label_for_logging(&config_dir), "Config directory ready");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains("jobsentinel"));
    }

    #[test]
    fn test_get_config_dir() {
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().contains("jobsentinel"));
    }
}
