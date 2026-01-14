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

use std::path::PathBuf;

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
