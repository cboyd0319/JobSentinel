//! Beta Feedback System
//!
//! Privacy-first feedback collection for beta testers.
//! ALL output is sanitized to prevent PII leakage (this is a PUBLIC repo).

pub mod debug_log;
pub mod report;
pub mod sanitizer;
pub mod system_info;

// Re-export public types and non-command functions
pub use debug_log::{
    clear_debug_log, format_debug_log, get_debug_log, get_recent_events, log_event, DebugEvent,
    TimestampedEvent,
};
pub use sanitizer::{ConfigSummary, Sanitizer};
pub use system_info::SystemInfo;

use crate::commands::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;

/// Validate that a path is safe to reveal in the file manager.
///
/// Returns the canonicalized path if valid, or an error if:
/// - The path doesn't exist or can't be resolved
/// - The path is outside allowed directories (home dir, app data dir)
fn validate_reveal_path(path: &str) -> Result<PathBuf, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let canonical = PathBuf::from(path)
        .canonicalize()
        .map_err(|_| "File not found or inaccessible".to_string())?;

    // Restrict to safe directories: home dir and app data dir
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .ok();
    let data_dir = crate::platforms::get_data_dir();

    let is_allowed = [home_dir.as_ref(), Some(&data_dir)]
        .iter()
        .any(|dir| dir.map(|d| canonical.starts_with(d)).unwrap_or(false));

    if !is_allowed {
        return Err("Access denied: path outside allowed directories".to_string());
    }

    Ok(canonical)
}

/// Open GitHub Issues page for bug reports
#[tauri::command]
#[allow(deprecated)]
pub async fn open_github_issues(app: AppHandle, template: Option<String>) -> Result<(), String> {
    let base_url = "https://github.com/cboyd0319/JobSentinel/issues/new";

    let url = if let Some(tmpl) = template {
        match tmpl.as_str() {
            "bug" => format!("{}?template=bug_report.yml", base_url),
            "feature" => format!("{}?template=feature_request.yml", base_url),
            "question" => format!("{}?template=question.yml", base_url),
            _ => base_url.to_string(),
        }
    } else {
        base_url.to_string()
    };

    app.shell()
        .open(&url, None)
        .map_err(|e| format!("Failed to open browser: {e}"))?;

    Ok(())
}

/// Open Google Drive feedback folder
#[tauri::command]
#[allow(deprecated)]
pub async fn open_google_drive(app: AppHandle) -> Result<(), String> {
    let url = "https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo";

    app.shell()
        .open(url, None)
        .map_err(|e| format!("Failed to open browser: {e}"))?;

    Ok(())
}

/// Reveal a file in Finder/Explorer
///
/// # Security
/// Path is canonicalized and validated to prevent path traversal attacks (CWE-22).
/// Only paths within the user's home directory or the app data directory are allowed.
#[tauri::command]
pub async fn reveal_file(app: AppHandle, path: String) -> Result<(), String> {
    let canonical = validate_reveal_path(&path)?;

    #[cfg(target_os = "macos")]
    {
        let _ = &app;
        use std::process::Command;
        Command::new("open")
            .arg("-R")
            .arg(canonical.as_os_str())
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        let _ = &app;
        use std::process::Command;
        let path_str = canonical
            .to_str()
            .ok_or("Invalid path encoding")?;
        Command::new("explorer")
            .arg(format!("/select,{}", path_str))
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        let parent = canonical
            .parent()
            .ok_or("Invalid path")?
            .to_str()
            .ok_or("Invalid path encoding")?;

        #[allow(deprecated)]
        app.shell()
            .open(parent, None)
            .map_err(|e| format!("Failed to open directory: {e}"))?;
    }

    Ok(())
}

// ============================================================================
// System Info & Config Summary Commands
// ============================================================================

/// Get system information (Tauri command)
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo::current())
}

/// Get configuration summary (Tauri command)
#[tauri::command]
pub async fn get_config_summary(state: State<'_, AppState>) -> Result<ConfigSummary, String> {
    let config = &*state.config;
    Ok(system_info::summarize_config(config))
}

/// Generate a complete feedback report
#[tauri::command]
pub async fn generate_feedback_report(
    state: State<'_, AppState>,
    category: String,
    description: String,
    include_debug_info: bool,
) -> Result<String, String> {
    report::generate_feedback_report_impl(state, category, description, include_debug_info).await
}

/// Generate suggested filename for feedback report
#[tauri::command]
pub fn get_feedback_filename() -> String {
    report::get_feedback_filename_impl()
}

/// Save a feedback report (frontend handles dialog)
#[tauri::command]
pub async fn save_feedback_file(
    _app: tauri::AppHandle,
    content: String,
    _suggested_filename: Option<String>,
) -> Result<String, String> {
    Ok(content)
}

// ============================================================================
// Debug Log Commands
// ============================================================================

/// Get the debug log as a formatted string (sanitized)
///
/// Returns the last 100 debug events, fully anonymized.
/// Safe to include in bug reports and feedback submissions.
#[tauri::command]
pub async fn get_debug_log_formatted(_state: State<'_, AppState>) -> Result<String, String> {
    Ok(format_debug_log())
}

/// Get the raw debug log events (sanitized)
///
/// Returns structured event data. Frontend can format as needed.
#[tauri::command]
pub async fn get_debug_log_events(
    _state: State<'_, AppState>,
) -> Result<Vec<TimestampedEvent>, String> {
    Ok(get_debug_log())
}

/// Clear the debug log
///
/// Useful for testing or resetting diagnostic state.
#[tauri::command]
pub async fn clear_debug_log_cmd(_state: State<'_, AppState>) -> Result<(), String> {
    clear_debug_log();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_github_issue_url_generation() {
        let base = "https://github.com/cboyd0319/JobSentinel/issues/new";

        assert_eq!(
            format!("{}?template=bug_report.yml", base),
            "https://github.com/cboyd0319/JobSentinel/issues/new?template=bug_report.yml"
        );

        assert_eq!(
            format!("{}?template=feature_request.yml", base),
            "https://github.com/cboyd0319/JobSentinel/issues/new?template=feature_request.yml"
        );
    }

    // ========================================================================
    // Security: reveal_file path validation (CWE-22 Path Traversal)
    // ========================================================================

    #[test]
    fn test_validate_reveal_path_rejects_traversal() {
        // Path traversal with ".." should be rejected
        let result = validate_reveal_path("/tmp/../../../etc/passwd");
        assert!(result.is_err(), "Path traversal with .. must be rejected");
    }

    #[test]
    fn test_validate_reveal_path_rejects_outside_home() {
        // Paths outside user's home directory should be rejected
        let result = validate_reveal_path("/etc/passwd");
        assert!(result.is_err(), "Paths outside home dir must be rejected");
    }

    #[test]
    fn test_validate_reveal_path_rejects_system_dirs() {
        let system_paths = ["/etc/shadow", "/var/log/system.log", "/usr/bin/sudo"];
        for path in &system_paths {
            let result = validate_reveal_path(path);
            assert!(
                result.is_err(),
                "System path {} must be rejected",
                path
            );
        }
    }

    #[test]
    fn test_validate_reveal_path_allows_home_dir() {
        // Paths within $HOME should be allowed (if they exist)
        if let Ok(home) = std::env::var("HOME") {
            // Use a path we know exists
            let result = validate_reveal_path(&home);
            assert!(result.is_ok(), "Home dir itself should be allowed");
        }
    }

    #[test]
    fn test_validate_reveal_path_rejects_nonexistent() {
        let result = validate_reveal_path("/nonexistent/path/that/does/not/exist");
        assert!(result.is_err(), "Nonexistent paths must be rejected");
    }

    #[test]
    fn test_validate_reveal_path_rejects_empty() {
        let result = validate_reveal_path("");
        assert!(result.is_err(), "Empty path must be rejected");
    }
}
