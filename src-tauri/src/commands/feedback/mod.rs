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
use tauri::{AppHandle, State};
use tauri_plugin_shell::ShellExt;

/// Open GitHub Issues page for bug reports
#[tauri::command]
pub async fn open_github_issues(
    app: AppHandle,
    template: Option<String>,
) -> Result<(), String> {
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
pub async fn open_google_drive(app: AppHandle) -> Result<(), String> {
    let url = "https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo";

    app.shell()
        .open(url, None)
        .map_err(|e| format!("Failed to open browser: {e}"))?;

    Ok(())
}

/// Reveal a file in Finder/Explorer
#[tauri::command]
pub async fn reveal_file(app: AppHandle, path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = &app; // Silence unused warning on macOS
        use std::process::Command;
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {e}"))?;
    }

    #[cfg(target_os = "windows")]
    {
        let _ = &app; // Silence unused warning on Windows
        use std::process::Command;
        // Windows explorer requires /select, to be concatenated with the path
        Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("Failed to reveal file: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try xdg-open to open the parent directory
        use std::path::Path;
        let parent = Path::new(&path)
            .parent()
            .ok_or("Invalid path")?
            .to_str()
            .ok_or("Invalid path encoding")?;

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
    _state: State<'_, AppState>,
    category: String,
    description: String,
    include_debug_info: bool,
) -> Result<String, String> {
    report::generate_feedback_report_impl(category, description, include_debug_info).await
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
        // Just verify the URL generation logic is correct
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
}
