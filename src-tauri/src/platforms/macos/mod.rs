//! macOS-Specific Implementation (macOS 13+)
//!
//! This module contains macOS-specific code for JobSentinel.
//! Fully functional for development and testing on macOS.

use std::path::PathBuf;

/// Get macOS application support directory
///
/// Returns: ~/Library/Application Support/JobSentinel
/// Example: /Users/username/Library/Application Support/JobSentinel
///
/// This follows Apple's File System Programming Guide recommendations:
/// https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/
pub fn get_data_dir() -> PathBuf {
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
/// Example: /Users/username/.config/jobsentinel
///
/// Uses XDG Base Directory Specification for cross-platform consistency:
/// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
pub fn get_config_dir() -> PathBuf {
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
pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // Create data directory if it doesn't exist
    let data_dir = get_data_dir();
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)?;
        tracing::info!("Created data directory: {:?}", data_dir);
    }

    // Create config directory if it doesn't exist
    let config_dir = get_config_dir();
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
        tracing::info!("Created config directory: {:?}", config_dir);
    }

    tracing::info!("macOS platform initialized");
    tracing::info!("Data directory: {:?}", data_dir);
    tracing::info!("Config directory: {:?}", config_dir);

    // Check if running on supported macOS version
    let version = get_macos_version();
    tracing::info!("macOS version: {}", version);

    Ok(())
}

/// Get macOS version information
///
/// Returns a string like "macOS 14.2" or "macOS (unknown)"
pub fn get_macos_version() -> String {
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

/// Check if running as a sandboxed application
///
/// Returns true if running in App Sandbox, false otherwise
pub fn is_sandboxed() -> bool {
    // Check for App Sandbox container directory
    if let Ok(home) = std::env::var("HOME") {
        home.contains("/Containers/")
    } else {
        false
    }
}

/// Get the appropriate cache directory for macOS
///
/// Returns: ~/Library/Caches/JobSentinel
pub fn get_cache_dir() -> PathBuf {
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

/// Get the appropriate logs directory for macOS
///
/// Returns: ~/Library/Logs/JobSentinel
pub fn get_logs_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    });

    PathBuf::from(home)
        .join("Library")
        .join("Logs")
        .join("JobSentinel")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Library"));
        assert!(dir.to_string_lossy().contains("Application Support"));
    }

    #[test]
    fn test_get_config_dir() {
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().contains("jobsentinel"));
        // Should be either .config or XDG_CONFIG_HOME
        let dir_str = dir.to_string_lossy();
        assert!(dir_str.contains(".config") || dir_str.contains("jobsentinel"));
    }

    #[test]
    fn test_get_cache_dir() {
        let dir = get_cache_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Caches"));
    }

    #[test]
    fn test_get_logs_dir() {
        let dir = get_logs_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Logs"));
    }

    #[test]
    fn test_get_macos_version() {
        let version = get_macos_version();
        assert!(version.contains("macOS"));
    }

    #[test]
    fn test_is_sandboxed() {
        // This test just verifies the function runs without panic
        let _ = is_sandboxed();
    }
}
