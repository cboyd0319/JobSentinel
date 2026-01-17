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
    use std::env;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Library"));
        assert!(dir.to_string_lossy().contains("Application Support"));
    }

    #[test]
    fn test_get_data_dir_structure() {
        let dir = get_data_dir();
        let path_str = dir.to_string_lossy();

        // Verify full path structure: ~/Library/Application Support/JobSentinel
        assert!(path_str.ends_with("Library/Application Support/JobSentinel"));
    }

    #[test]
    fn test_get_data_dir_with_home_env() {
        // Save original HOME
        let original_home = env::var("HOME").ok();

        // Set custom HOME
        env::set_var("HOME", "/custom/home");
        let dir = get_data_dir();

        assert_eq!(
            dir,
            PathBuf::from("/custom/home/Library/Application Support/JobSentinel")
        );

        // Restore original HOME
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
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
    fn test_get_config_dir_default_path() {
        // Save original env vars
        let original_home = env::var("HOME").ok();
        let original_xdg = env::var("XDG_CONFIG_HOME").ok();

        // Clear XDG_CONFIG_HOME and set known HOME
        env::remove_var("XDG_CONFIG_HOME");
        env::set_var("HOME", "/test/home");

        let dir = get_config_dir();
        assert_eq!(dir, PathBuf::from("/test/home/.config/jobsentinel"));

        // Restore original env vars
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
        match original_xdg {
            Some(xdg) => env::set_var("XDG_CONFIG_HOME", xdg),
            None => env::remove_var("XDG_CONFIG_HOME"),
        }
    }

    #[test]
    fn test_get_config_dir_with_xdg_config_home() {
        // Save original env vars
        let original_xdg = env::var("XDG_CONFIG_HOME").ok();

        // Set XDG_CONFIG_HOME
        env::set_var("XDG_CONFIG_HOME", "/custom/config");

        let dir = get_config_dir();
        assert_eq!(dir, PathBuf::from("/custom/config/jobsentinel"));

        // Restore original env var
        match original_xdg {
            Some(xdg) => env::set_var("XDG_CONFIG_HOME", xdg),
            None => env::remove_var("XDG_CONFIG_HOME"),
        }
    }

    #[test]
    fn test_get_cache_dir() {
        let dir = get_cache_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Caches"));
    }

    #[test]
    fn test_get_cache_dir_structure() {
        let dir = get_cache_dir();
        let path_str = dir.to_string_lossy();

        // Verify full path structure: ~/Library/Caches/JobSentinel
        assert!(path_str.ends_with("Library/Caches/JobSentinel"));
    }

    #[test]
    fn test_get_cache_dir_with_home_env() {
        // Save original HOME
        let original_home = env::var("HOME").ok();

        // Set custom HOME
        env::set_var("HOME", "/custom/home");
        let dir = get_cache_dir();

        assert_eq!(
            dir,
            PathBuf::from("/custom/home/Library/Caches/JobSentinel")
        );

        // Restore original HOME
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
    }

    #[test]
    fn test_get_logs_dir() {
        let dir = get_logs_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
        assert!(dir.to_string_lossy().contains("Logs"));
    }

    #[test]
    fn test_get_logs_dir_structure() {
        let dir = get_logs_dir();
        let path_str = dir.to_string_lossy();

        // Verify full path structure: ~/Library/Logs/JobSentinel
        assert!(path_str.ends_with("Library/Logs/JobSentinel"));
    }

    #[test]
    fn test_get_logs_dir_with_home_env() {
        // Save original HOME
        let original_home = env::var("HOME").ok();

        // Set custom HOME
        env::set_var("HOME", "/custom/home");
        let dir = get_logs_dir();

        assert_eq!(dir, PathBuf::from("/custom/home/Library/Logs/JobSentinel"));

        // Restore original HOME
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
    }

    #[test]
    fn test_get_macos_version() {
        let version = get_macos_version();
        assert!(version.contains("macOS"));
    }

    #[test]
    fn test_get_macos_version_format() {
        let version = get_macos_version();

        // Should either be "macOS X.Y" or "macOS (unknown)"
        assert!(
            version.starts_with("macOS "),
            "Version should start with 'macOS ': {}",
            version
        );
    }

    #[test]
    fn test_is_sandboxed() {
        // This test just verifies the function runs without panic
        let _ = is_sandboxed();
    }

    #[test]
    fn test_is_sandboxed_detection() {
        // Save original HOME
        let original_home = env::var("HOME").ok();

        // Test non-sandboxed environment
        env::set_var("HOME", "/Users/testuser");
        assert!(!is_sandboxed());

        // Test sandboxed environment
        env::set_var(
            "HOME",
            "/Users/testuser/Library/Containers/com.example.app/Data",
        );
        assert!(is_sandboxed());

        // Restore original HOME
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
    }

    #[test]
    fn test_is_sandboxed_no_home_env() {
        // Save original HOME
        let original_home = env::var("HOME").ok();

        // Remove HOME environment variable
        env::remove_var("HOME");

        // Should return false when HOME is not set
        assert!(!is_sandboxed());

        // Restore original HOME
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
    }

    #[test]
    fn test_initialize_creates_directories() {
        use tempfile::TempDir;

        // Create temporary home directory
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let temp_home = temp_dir.path();

        // Save original env vars
        let original_home = env::var("HOME").ok();
        let original_xdg = env::var("XDG_CONFIG_HOME").ok();

        // Set HOME to temp directory and clear XDG_CONFIG_HOME
        env::set_var("HOME", temp_home);
        env::remove_var("XDG_CONFIG_HOME");

        // Run initialize
        let result = initialize();
        assert!(result.is_ok());

        // Verify directories were created
        let data_dir = get_data_dir();
        let config_dir = get_config_dir();

        assert!(
            data_dir.exists(),
            "Data directory should exist: {:?}",
            data_dir
        );
        assert!(
            config_dir.exists(),
            "Config directory should exist: {:?}",
            config_dir
        );

        // Restore original env vars
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
        match original_xdg {
            Some(xdg) => env::set_var("XDG_CONFIG_HOME", xdg),
            None => env::remove_var("XDG_CONFIG_HOME"),
        }
    }

    #[test]
    fn test_initialize_existing_directories() {
        use std::fs;
        use tempfile::TempDir;

        // Create temporary home directory
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let temp_home = temp_dir.path();

        // Save original env vars
        let original_home = env::var("HOME").ok();
        let original_xdg = env::var("XDG_CONFIG_HOME").ok();

        // Set HOME to temp directory and clear XDG_CONFIG_HOME
        env::set_var("HOME", temp_home);
        env::remove_var("XDG_CONFIG_HOME");

        // Pre-create directories
        let data_dir = get_data_dir();
        let config_dir = get_config_dir();
        fs::create_dir_all(&data_dir).expect("Failed to create data dir");
        fs::create_dir_all(&config_dir).expect("Failed to create config dir");

        // Run initialize (should not fail on existing directories)
        let result = initialize();
        assert!(result.is_ok());

        // Verify directories still exist
        assert!(data_dir.exists());
        assert!(config_dir.exists());

        // Restore original env vars
        match original_home {
            Some(home) => env::set_var("HOME", home),
            None => env::remove_var("HOME"),
        }
        match original_xdg {
            Some(xdg) => env::set_var("XDG_CONFIG_HOME", xdg),
            None => env::remove_var("XDG_CONFIG_HOME"),
        }
    }

    #[test]
    fn test_path_consistency() {
        // All path functions should use consistent logic for path construction
        let data_dir = get_data_dir();
        let config_dir = get_config_dir();
        let cache_dir = get_cache_dir();
        let logs_dir = get_logs_dir();

        // All paths should be absolute
        assert!(data_dir.is_absolute());
        assert!(config_dir.is_absolute());
        assert!(cache_dir.is_absolute());
        assert!(logs_dir.is_absolute());

        // Verify macOS-specific paths use Library
        assert!(data_dir.to_string_lossy().contains("Library"));
        assert!(cache_dir.to_string_lossy().contains("Library"));
        assert!(logs_dir.to_string_lossy().contains("Library"));

        // Config typically uses .config (unless XDG_CONFIG_HOME is set)
        let config_str = config_dir.to_string_lossy();
        assert!(config_str.contains("jobsentinel"));
    }

    #[test]
    fn test_directory_names_are_correct() {
        let data_dir = get_data_dir();
        let config_dir = get_config_dir();
        let cache_dir = get_cache_dir();
        let logs_dir = get_logs_dir();

        // Verify final component is correct
        assert_eq!(data_dir.file_name().unwrap(), "JobSentinel");
        assert_eq!(config_dir.file_name().unwrap(), "jobsentinel");
        assert_eq!(cache_dir.file_name().unwrap(), "JobSentinel");
        assert_eq!(logs_dir.file_name().unwrap(), "JobSentinel");
    }

    #[test]
    fn test_data_dir_follows_apple_guidelines() {
        let dir = get_data_dir();
        let path_str = dir.to_string_lossy();

        // Should follow macOS convention: ~/Library/Application Support/AppName
        assert!(path_str.contains("Library/Application Support"));
    }

    #[test]
    fn test_config_dir_follows_xdg_spec() {
        // Save original env vars
        let original_xdg = env::var("XDG_CONFIG_HOME").ok();

        // Test default behavior (no XDG_CONFIG_HOME)
        env::remove_var("XDG_CONFIG_HOME");
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().contains(".config/jobsentinel"));

        // Restore original env var
        match original_xdg {
            Some(xdg) => env::set_var("XDG_CONFIG_HOME", xdg),
            None => env::remove_var("XDG_CONFIG_HOME"),
        }
    }
}
