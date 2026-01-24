//! User-friendly error messages for Tauri commands
//!
//! Converts internal errors to actionable user-facing messages.

use std::fmt::Display;

/// Categories of errors with user-friendly descriptions
#[derive(Debug, Clone, Copy)]
pub enum ErrorCategory {
    /// Database connection or query errors
    Database,
    /// Network or HTTP errors
    Network,
    /// File system errors (read/write/permissions)
    FileSystem,
    /// Configuration or settings errors
    Configuration,
    /// Browser automation errors
    Browser,
    /// Resource not found
    NotFound,
    /// Input validation errors
    Validation,
    /// Unknown/unexpected errors
    Unknown,
}

impl ErrorCategory {
    /// Get user-friendly title for this error category
    pub fn title(&self) -> &'static str {
        match self {
            Self::Database => "Database Error",
            Self::Network => "Connection Error",
            Self::FileSystem => "File Error",
            Self::Configuration => "Configuration Error",
            Self::Browser => "Browser Error",
            Self::NotFound => "Not Found",
            Self::Validation => "Invalid Input",
            Self::Unknown => "Unexpected Error",
        }
    }

    /// Get recovery suggestion for this error category
    pub fn recovery_hint(&self) -> &'static str {
        match self {
            Self::Database => "Try restarting the app. If the issue persists, your database may need repair.",
            Self::Network => "Check your internet connection and try again.",
            Self::FileSystem => "Check file permissions and available disk space.",
            Self::Configuration => "Check your settings or try resetting to defaults.",
            Self::Browser => "Make sure Chrome is installed and try again.",
            Self::NotFound => "The requested item may have been deleted or moved.",
            Self::Validation => "Please check your input and try again.",
            Self::Unknown => "Try again. If the issue persists, restart the app.",
        }
    }
}

/// Classify an error string into a category
pub fn categorize_error(error: &str) -> ErrorCategory {
    let lower = error.to_lowercase();

    // Database errors
    if lower.contains("database")
        || lower.contains("sqlite")
        || lower.contains("sqlx")
        || lower.contains("query")
        || lower.contains("pool")
        || lower.contains("connection")
        || lower.contains("locked")
        || lower.contains("busy")
        || lower.contains("constraint")
        || lower.contains("foreign key")
    {
        return ErrorCategory::Database;
    }

    // Network errors
    if lower.contains("network")
        || lower.contains("timeout")
        || lower.contains("http")
        || lower.contains("request")
        || lower.contains("dns")
        || lower.contains("ssl")
        || lower.contains("tls")
        || lower.contains("certificate")
        || lower.contains("connect")
        || lower.contains("refused")
    {
        return ErrorCategory::Network;
    }

    // File system errors
    if lower.contains("file")
        || lower.contains("permission")
        || lower.contains("access denied")
        || lower.contains("no such file")
        || lower.contains("directory")
        || lower.contains("disk")
        || lower.contains("io error")
        || lower.contains("read")
        || lower.contains("write")
    {
        return ErrorCategory::FileSystem;
    }

    // Browser errors
    if lower.contains("browser")
        || lower.contains("chrome")
        || lower.contains("chromium")
        || lower.contains("webdriver")
        || lower.contains("page")
        || lower.contains("navigation")
        || lower.contains("element")
        || lower.contains("selector")
    {
        return ErrorCategory::Browser;
    }

    // Not found
    if lower.contains("not found")
        || lower.contains("no such")
        || lower.contains("does not exist")
        || lower.contains("missing")
    {
        return ErrorCategory::NotFound;
    }

    // Validation
    if lower.contains("invalid")
        || lower.contains("malformed")
        || lower.contains("parse")
        || lower.contains("format")
        || lower.contains("required")
    {
        return ErrorCategory::Validation;
    }

    // Configuration
    if lower.contains("config")
        || lower.contains("setting")
        || lower.contains("preference")
    {
        return ErrorCategory::Configuration;
    }

    ErrorCategory::Unknown
}

/// Format an error with user-friendly message
pub fn user_friendly_error<E: Display>(context: &str, error: E) -> String {
    let error_str = error.to_string();
    let category = categorize_error(&error_str);

    // For common errors, provide specific guidance
    let specific_hint = get_specific_hint(&error_str);

    if let Some(hint) = specific_hint {
        format!("{}: {}", context, hint)
    } else {
        format!("{}: {} {}", context, category.title(), category.recovery_hint())
    }
}

/// Get specific hints for common error patterns
fn get_specific_hint(error: &str) -> Option<&'static str> {
    let lower = error.to_lowercase();

    // SQLite specific
    if lower.contains("database is locked") || lower.contains("busy") {
        return Some("Database is busy. Close other apps using JobSentinel and try again.");
    }
    if lower.contains("disk i/o error") || lower.contains("disk full") {
        return Some("Your disk may be full. Free up some space and try again.");
    }
    if lower.contains("corrupt") || lower.contains("malformed") {
        return Some("Database may be corrupted. Go to Settings > Database > Restore from backup.");
    }

    // Network specific
    if lower.contains("timeout") {
        return Some("Request timed out. The server may be slow or your connection unstable.");
    }
    if lower.contains("connection refused") {
        return Some("Could not connect. Check if the service is available.");
    }
    if lower.contains("certificate") || lower.contains("ssl") {
        return Some("SSL certificate error. Check your system clock and network settings.");
    }

    // Browser specific
    if lower.contains("chrome not found") || lower.contains("chromium not found") {
        return Some("Chrome browser not found. Please install Chrome to use Quick Apply.");
    }
    if lower.contains("page crash") || lower.contains("target closed") {
        return Some("Browser page crashed. Please try again.");
    }
    if lower.contains("navigation") {
        return Some("Could not load the page. The URL may be invalid or blocked.");
    }

    // Profile specific
    if lower.contains("no application profile") || lower.contains("profile not") {
        return Some("Please set up your application profile first in Settings > One-Click Apply.");
    }

    None
}

/// Macro to simplify error mapping in commands
#[macro_export]
macro_rules! map_err_friendly {
    ($context:expr) => {
        |e| $crate::commands::errors::user_friendly_error($context, e)
    };
}
