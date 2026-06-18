//! Platform-Specific Code
//!
//! This module contains platform-specific implementations and utilities.
//! Code is conditionally compiled based on the target OS using #[cfg(...)] attributes.
//!
//! ## Supported Platforms
//!
//! - **Windows** (`windows`): Windows 11+ specific features
//!   - System tray integration
//!   - Windows notifications
//!   - Registry integration (if needed)
//!   - Windows-specific paths (%LOCALAPPDATA%, %APPDATA%)
//!
//! - **macOS** (`macos`): macOS 13+ specific features (v2.0)
//!   - Menu bar integration
//!   - macOS notifications
//!   - Keychain integration
//!   - macOS-specific paths (~/.config, ~/Library)
//!
//! - **Linux** (`linux`): Linux-specific features (v2.0)
//!   - Desktop notifications (libnotify)
//!   - XDG directories
//!   - Systemd integration
//!
//! ## Usage Example
//!
//! ```rust,ignore
//! use jobsentinel::platforms;
//!
//! // Get platform-specific data directory
//! let data_dir = platforms::get_data_dir();
//! ```

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

use std::path::{Path, PathBuf};

/// Get the platform-specific application data directory
///
/// - Windows: %LOCALAPPDATA%\JobSentinel
/// - macOS: ~/Library/Application Support/JobSentinel
/// - Linux: ~/.local/share/jobsentinel
pub fn get_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        windows::get_data_dir()
    }

    #[cfg(target_os = "macos")]
    {
        macos::get_data_dir()
    }

    #[cfg(target_os = "linux")]
    {
        linux::get_data_dir()
    }
}

/// Get the platform-specific configuration directory
///
/// - Windows: %APPDATA%\JobSentinel
/// - macOS: ~/.config/jobsentinel
/// - Linux: ~/.config/jobsentinel
pub fn get_config_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        windows::get_config_dir()
    }

    #[cfg(target_os = "macos")]
    {
        macos::get_config_dir()
    }

    #[cfg(target_os = "linux")]
    {
        linux::get_config_dir()
    }
}

/// Get the platform-specific application cache directory.
///
/// - Windows: %LOCALAPPDATA%\JobSentinel\Cache
/// - macOS: ~/Library/Caches/JobSentinel
/// - Linux: ~/.cache/jobsentinel
pub fn get_cache_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        windows::get_cache_dir()
    }

    #[cfg(target_os = "macos")]
    {
        macos::get_cache_dir()
    }

    #[cfg(target_os = "linux")]
    {
        linux::get_cache_dir()
    }
}

/// Initialize platform-specific features
///
/// This should be called once during application startup.
pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    {
        windows::initialize()?;
    }

    #[cfg(target_os = "macos")]
    {
        macos::initialize()?;
    }

    #[cfg(target_os = "linux")]
    {
        linux::initialize()?;
    }

    Ok(())
}

/// Create an app-owned directory and keep it private on Unix platforms.
pub fn ensure_private_dir(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(path)?;
    set_private_dir_permissions(path)?;
    Ok(())
}

/// Create an app-owned directory and keep every existing child private.
///
/// Symlinks are ignored so a user-controlled link inside app storage cannot
/// make startup chmod files outside the app-owned tree.
pub fn ensure_private_dir_tree(path: &Path) -> std::io::Result<()> {
    #[cfg(not(unix))]
    {
        return ensure_private_dir(path);
    }

    #[cfg(unix)]
    {
        ensure_private_dir(path)?;
        tighten_existing_tree(path)
    }
}

#[cfg(unix)]
fn tighten_existing_tree(path: &Path) -> std::io::Result<()> {
    ensure_private_dir(path)?;
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let entry_path = entry.path();

        if file_type.is_dir() {
            set_private_dir_permissions(&entry_path)?;
            tighten_existing_tree(&entry_path)?;
        } else if file_type.is_file() {
            set_private_file_permissions(&entry_path)?;
        }
    }

    Ok(())
}

/// Keep an app-owned file private on Unix platforms.
pub fn ensure_private_file(path: &Path) -> std::io::Result<()> {
    if path.exists() {
        set_private_file_permissions(path)?;
    }
    Ok(())
}

/// Apply private file modes to SQLite sidecar files when they exist.
pub fn ensure_private_sqlite_files(db_path: &Path) -> std::io::Result<()> {
    ensure_private_file(db_path)?;
    for suffix in ["-wal", "-shm"] {
        let sidecar = PathBuf::from(format!("{}{}", db_path.display(), suffix));
        ensure_private_file(&sidecar)?;
    }
    Ok(())
}

#[cfg(unix)]
fn set_private_dir_permissions(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;

    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
}

#[cfg(not(unix))]
fn set_private_dir_permissions(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(unix)]
fn set_private_file_permissions(path: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;

    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
}

#[cfg(not(unix))]
fn set_private_file_permissions(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    #[cfg(unix)]
    use super::*;

    #[cfg(unix)]
    #[test]
    fn ensure_private_dir_tree_tightens_existing_children() {
        use std::os::unix::fs::PermissionsExt;

        let temp_dir = tempfile::tempdir().unwrap();
        let root = temp_dir.path().join("JobSentinel");
        let nested = root.join("backups");
        let db_path = nested.join("backup.db");
        std::fs::create_dir_all(&nested).unwrap();
        std::fs::write(&db_path, b"backup").unwrap();
        std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o755)).unwrap();
        std::fs::set_permissions(&nested, std::fs::Permissions::from_mode(0o755)).unwrap();
        std::fs::set_permissions(&db_path, std::fs::Permissions::from_mode(0o644)).unwrap();

        ensure_private_dir_tree(&root).unwrap();

        assert_eq!(
            std::fs::metadata(&root).unwrap().permissions().mode() & 0o777,
            0o700
        );
        assert_eq!(
            std::fs::metadata(&nested).unwrap().permissions().mode() & 0o777,
            0o700
        );
        assert_eq!(
            std::fs::metadata(&db_path).unwrap().permissions().mode() & 0o777,
            0o600
        );
    }

    #[cfg(unix)]
    #[test]
    fn ensure_private_dir_tree_does_not_follow_symlinks() {
        use std::os::unix::fs::{symlink, PermissionsExt};

        let temp_dir = tempfile::tempdir().unwrap();
        let root = temp_dir.path().join("JobSentinel");
        let external = temp_dir.path().join("external.txt");
        let link = root.join("linked.txt");
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(&external, b"external").unwrap();
        std::fs::set_permissions(&external, std::fs::Permissions::from_mode(0o644)).unwrap();
        symlink(&external, &link).unwrap();

        ensure_private_dir_tree(&root).unwrap();

        assert_eq!(
            std::fs::metadata(&external).unwrap().permissions().mode() & 0o777,
            0o644
        );
        assert!(std::fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
    }
}
