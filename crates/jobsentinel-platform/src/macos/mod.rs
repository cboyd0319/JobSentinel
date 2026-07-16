//! macOS-Specific Implementation (macOS 13+)
//!
//! This module contains macOS-specific code for JobSentinel.
//! It owns local directory paths and macOS environment checks.

use std::path::PathBuf;

use jobsentinel_security::path_label_for_logging;

pub(crate) const PACKAGE_SMOKE_ROOT_ENV: &str = "JOBSENTINEL_MACOS_PACKAGE_SMOKE_ROOT";

/// Get macOS application support directory
///
/// Returns: ~/Library/Application Support/JobSentinel
///
/// This follows Apple's File System Programming Guide recommendations:
/// https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/
pub(crate) fn get_data_dir() -> PathBuf {
    if let Some(root) = package_smoke_root() {
        return smoke_home_dir(root)
            .join("Library")
            .join("Application Support")
            .join("JobSentinel");
    }

    // Try HOME first, then fall back to ~ expansion
    let home = std::env::var("HOME").unwrap_or_else(|_| {
        // Fallback: try to get from tilde expansion
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    });

    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("JobSentinel")
}

/// Get macOS configuration directory
///
/// Returns: ~/.config/jobsentinel
///
/// Uses XDG Base Directory Specification for cross-platform consistency:
/// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
pub(crate) fn get_config_dir() -> PathBuf {
    if let Some(root) = package_smoke_root() {
        return root.join("xdg").join("jobsentinel");
    }

    // Check XDG_CONFIG_HOME first (for advanced users)
    if let Ok(xdg_config) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(xdg_config).join("jobsentinel");
    }

    // Default: ~/.config/jobsentinel
    let home = std::env::var("HOME").unwrap_or_else(|_| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    });

    PathBuf::from(home).join(".config").join("jobsentinel")
}

/// Initialize macOS-specific features
///
/// - Creates application data directories
/// - Sets up macOS notifications (future)
/// - Registers launch agent (future)
pub(crate) fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // Create data directory if it doesn't exist
    let data_dir = get_data_dir();
    let data_dir_existed = data_dir.exists();
    crate::ensure_private_dir_tree(&data_dir)?;
    if !data_dir_existed {
        tracing::info!(
            data_dir = %path_label_for_logging(&data_dir),
            "Created data directory"
        );
    }

    // Create config directory if it doesn't exist
    let config_dir = get_config_dir();
    let config_dir_existed = config_dir.exists();
    crate::ensure_private_dir_tree(&config_dir)?;
    if !config_dir_existed {
        tracing::info!(
            config_dir = %path_label_for_logging(&config_dir),
            "Created config directory"
        );
    }

    tracing::info!("macOS platform initialized");
    tracing::info!(data_dir = %path_label_for_logging(&data_dir), "Data directory ready");
    tracing::info!(config_dir = %path_label_for_logging(&config_dir), "Config directory ready");

    // Check if running on supported macOS version
    let version = get_macos_version();
    tracing::info!("macOS version: {}", version);

    Ok(())
}

/// Get macOS version information
///
/// Returns a string like "macOS 14.2" or "macOS (unknown)"
pub(crate) fn get_macos_version() -> String {
    // Try to read macOS version from system
    if let Ok(output) = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
    {
        if let Ok(version) = String::from_utf8(output.stdout) {
            return format!("macOS {}", version.trim());
        }
    }

    "macOS (unknown)".to_string()
}

/// Get the appropriate cache directory for macOS
///
/// Returns: ~/Library/Caches/JobSentinel
pub(crate) fn get_cache_dir() -> PathBuf {
    if let Some(root) = package_smoke_root() {
        return smoke_home_dir(root)
            .join("Library")
            .join("Caches")
            .join("JobSentinel");
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    });

    PathBuf::from(home)
        .join("Library")
        .join("Caches")
        .join("JobSentinel")
}

pub(crate) fn package_smoke_root() -> Option<PathBuf> {
    let root = PathBuf::from(std::env::var(PACKAGE_SMOKE_ROOT_ENV).ok()?);
    package_smoke_root_from(root, std::env::temp_dir())
}

fn package_smoke_root_from(root: PathBuf, temp_dir: PathBuf) -> Option<PathBuf> {
    if !root.starts_with(&temp_dir) {
        return None;
    }

    let is_smoke_root = root.components().any(|component| {
        component
            .as_os_str()
            .to_string_lossy()
            .starts_with("jobsentinel-macos-smoke-")
    });
    is_smoke_root.then_some(root)
}

fn smoke_home_dir(root: PathBuf) -> PathBuf {
    root.join("home")
}

#[cfg(test)]
mod tests;
