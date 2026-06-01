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
            Self::Database => "Local data problem",
            Self::Network => "Connection problem",
            Self::FileSystem => "File access problem",
            Self::Configuration => "Saved settings problem",
            Self::Browser => "Browser problem",
            Self::NotFound => "Item not found",
            Self::Validation => "Information needs review",
            Self::Unknown => "Something went wrong",
        }
    }

    /// Get recovery suggestion for this error category
    pub fn recovery_hint(&self) -> &'static str {
        match self {
            Self::Database => {
                "Restart JobSentinel. If this keeps happening, save a safe support report before changing local data."
            }
            Self::Network => "Check your internet connection and try again.",
            Self::FileSystem => "Choose a file you can open, or check available disk space.",
            Self::Configuration => "Open Settings, review the saved values, and save again.",
            Self::Browser => "Open the job page in your browser and try again.",
            Self::NotFound => "The requested item may have been deleted or moved.",
            Self::Validation => "Check the information and try again.",
            Self::Unknown => "Try again. If this keeps happening, save a safe support report.",
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
    if lower.contains("config") || lower.contains("setting") || lower.contains("preference") {
        return ErrorCategory::Configuration;
    }

    ErrorCategory::Unknown
}

/// Format an error with user-friendly message
pub fn user_friendly_error<E: Display>(context: &str, error: E) -> String {
    let error_str = error.to_string();
    let category = categorize_error(&error_str);
    let context = plain_context(context);

    // For common errors, provide specific guidance
    let specific_hint = get_specific_hint(&error_str);

    if let Some(hint) = specific_hint {
        format!("{}: {}", context, hint)
    } else {
        format!(
            "{}: {} {}",
            context,
            category.title(),
            category.recovery_hint()
        )
    }
}

/// Get specific hints for common error patterns
fn get_specific_hint(error: &str) -> Option<&'static str> {
    let lower = error.to_lowercase();

    // SQLite specific
    if lower.contains("database is locked") || lower.contains("busy") {
        return Some("JobSentinel is still writing local data. Wait a moment and try again.");
    }
    if lower.contains("disk i/o error") || lower.contains("disk full") {
        return Some("Your disk may be full. Free up some space and try again.");
    }
    if lower.contains("corrupt") || lower.contains("malformed") {
        return Some("JobSentinel could not read local data. Restart JobSentinel. If this keeps happening, save a safe support report and restore from a backup if you have one.");
    }

    // Network specific
    if lower.contains("timeout") {
        return Some("Request timed out. The server may be slow or your connection unstable.");
    }
    if lower.contains("connection refused") {
        return Some("Could not connect. Check if the service is available.");
    }
    if lower.contains("certificate") || lower.contains("ssl") {
        return Some("Secure connection problem. Check your system clock and network settings.");
    }

    // Browser specific
    if lower.contains("chrome not found") || lower.contains("chromium not found") {
        return Some("Chrome browser not found. Please install Chrome to use Prepare Form.");
    }
    if lower.contains("page crash") || lower.contains("target closed") {
        return Some("Browser page crashed. Please try again.");
    }
    if lower.contains("navigation") {
        return Some("Could not load the page. The web address may be wrong or unavailable.");
    }

    // Profile specific
    if lower.contains("no application profile") || lower.contains("profile not") {
        return Some(
            "Open Application Assist from the sidebar and save your profile details first.",
        );
    }

    None
}

fn plain_context(context: &str) -> &str {
    match context {
        "Database operation failed" => "Could not update local job data",
        "Invalid configuration" => "Saved settings need attention",
        "Failed to serialize config"
        | "Failed to serialize stats"
        | "Failed to serialize snapshot"
        | "Failed to serialize benchmark"
        | "Failed to serialize result"
        | "Failed to serialize ghost config" => "Could not prepare app data",
        _ => context,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_friendly_error_uses_plain_local_data_copy() {
        let message = user_friendly_error(
            "Database operation failed",
            "database is locked; SELECT * FROM jobs WHERE token = 'secret'",
        );

        assert!(message.contains("Could not update local job data"));
        assert!(message.contains("JobSentinel is still writing local data"));
        assert!(!message.contains(&["Database", "Error"].join(" ")));
        assert!(!message.contains("database is locked"));
        assert!(!message.contains("SELECT"));
        assert!(!message.contains("secret"));
    }

    #[test]
    fn category_fallbacks_avoid_technical_labels() {
        let message = user_friendly_error(
            "Invalid configuration",
            "invalid config format in saved settings",
        );

        assert!(message.contains("Saved settings need attention"));
        assert!(message.contains("Information needs review"));
        assert!(!message.contains(&["Configuration", "Error"].join(" ")));
        assert!(!message.contains(&["Invalid", "Input"].join(" ")));
    }

    #[test]
    fn connection_and_secure_connection_copy_stays_plain() {
        let timeout = user_friendly_error("Failed to refresh jobs", "request timeout");
        let certificate =
            user_friendly_error("Failed to refresh jobs", "ssl certificate verify failed");

        assert!(timeout.contains("Request timed out"));
        assert!(certificate.contains("Secure connection problem"));
        assert!(!certificate.contains(&["SSL", "certificate", "error"].join(" ")));
        assert!(!timeout.contains(&["Connection", "Error"].join(" ")));
    }
}

/// Macro to simplify error mapping in commands
#[macro_export]
macro_rules! map_err_friendly {
    ($context:expr) => {
        |e| $crate::commands::errors::user_friendly_error($context, e)
    };
}
