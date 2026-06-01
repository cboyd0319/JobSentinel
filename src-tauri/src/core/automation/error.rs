//! Automation Error Types
//!
//! Domain-specific error types for browser automation and form filling
//! with detailed context for better debugging and user-friendly error messages.

use crate::core::url_security::sanitize_url_for_logging;
use std::{error::Error, fmt};

/// Comprehensive error type for automation operations
#[derive(Debug)]
pub enum AutomationError {
    /// Browser launch failed
    BrowserLaunch {
        reason: String,
        source: Option<Box<dyn Error + Send + Sync>>,
    },

    /// Browser not running or crashed
    BrowserNotRunning,

    /// Page navigation failed
    Navigation { url: String, reason: String },

    /// Page load timeout
    PageLoadTimeout { url: String, timeout_secs: u64 },

    /// Element not found on page
    ElementNotFound { selector: String, url: String },

    /// Element not interactable (hidden, disabled, etc.)
    ElementNotInteractable { selector: String, reason: String },

    /// Form field type mismatch
    FieldTypeMismatch {
        field_name: String,
        expected: String,
        actual: String,
    },

    /// Failed to fill form field
    FillFieldError { field_name: String, reason: String },

    /// CAPTCHA detected - requires manual intervention
    CaptchaDetected { url: String },

    /// Multi-factor authentication required
    MfaRequired { platform: String },

    /// Terms of service or consent required
    ConsentRequired { url: String },

    /// Application already submitted
    AlreadySubmitted { job_id: String, platform: String },

    /// ATS platform not supported
    UnsupportedPlatform { platform: String },

    /// ATS detection failed
    AtsDetectionFailed { url: String },

    /// Profile data missing or incomplete
    IncompleteProfile { missing_fields: Vec<String> },

    /// Resume file not found or invalid
    ResumeError { reason: String },

    /// File upload failed
    FileUploadError {
        file_type: String, // "resume", "cover_letter"
        reason: String,
    },

    /// JavaScript execution error
    JavaScriptError { url: String, message: String },

    /// Network error during automation
    Network {
        source: Box<dyn Error + Send + Sync>,
    },

    /// Screenshot capture failed
    ScreenshotError { reason: String },

    /// Database error during automation
    Database {
        context: String,
        source: Box<dyn Error + Send + Sync>,
    },

    /// User approval required but not granted
    ApprovalRequired,

    /// Daily automation limit reached
    DailyLimitReached { current: u32, max: u32 },

    /// Generic automation error with context
    Generic { message: String },
}

impl fmt::Display for AutomationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::BrowserLaunch { reason, .. } => {
                write!(f, "Failed to launch browser: {reason}")
            }
            Self::BrowserNotRunning => write!(f, "Browser is not running or has crashed"),
            Self::Navigation { url, reason } => {
                write!(
                    f,
                    "Failed to navigate to {}: {}",
                    Self::sanitize_url(url),
                    reason
                )
            }
            Self::PageLoadTimeout { url, timeout_secs } => {
                write!(
                    f,
                    "Page load timeout after {}s for {}",
                    timeout_secs,
                    Self::sanitize_url(url)
                )
            }
            Self::ElementNotFound { selector, url } => {
                write!(
                    f,
                    "Element not found: {} on {}",
                    selector,
                    Self::sanitize_url(url)
                )
            }
            Self::ElementNotInteractable { selector, reason } => {
                write!(f, "Element not interactable: {selector} - {reason}")
            }
            Self::FieldTypeMismatch {
                field_name,
                expected,
                actual,
            } => {
                write!(
                    f,
                    "Field type mismatch for {field_name}: expected {expected}, found {actual}"
                )
            }
            Self::FillFieldError { field_name, reason } => {
                write!(f, "Failed to fill field '{field_name}': {reason}")
            }
            Self::CaptchaDetected { url } => {
                write!(
                    f,
                    "CAPTCHA detected on {} - manual intervention required",
                    Self::sanitize_url(url)
                )
            }
            Self::MfaRequired { platform } => {
                write!(
                    f,
                    "MFA required for {platform} - manual intervention required"
                )
            }
            Self::ConsentRequired { url } => {
                write!(
                    f,
                    "Terms acceptance required on {}",
                    Self::sanitize_url(url)
                )
            }
            Self::AlreadySubmitted { job_id, platform } => {
                write!(
                    f,
                    "Application already submitted for job {job_id} on {platform}"
                )
            }
            Self::UnsupportedPlatform { platform } => {
                write!(f, "ATS platform not supported: {platform}")
            }
            Self::AtsDetectionFailed { url } => {
                write!(
                    f,
                    "Failed to detect ATS platform for {}",
                    Self::sanitize_url(url)
                )
            }
            Self::IncompleteProfile { missing_fields } => {
                write!(
                    f,
                    "Profile data incomplete: missing {}",
                    missing_fields.join(", ")
                )
            }
            Self::ResumeError { reason } => write!(f, "Resume file error: {reason}"),
            Self::FileUploadError { file_type, reason } => {
                write!(f, "Failed to upload {file_type}: {reason}")
            }
            Self::JavaScriptError { url, message } => {
                write!(
                    f,
                    "JavaScript error on {}: {}",
                    Self::sanitize_url(url),
                    message
                )
            }
            Self::Network { source } => write!(f, "Network error during automation: {source}"),
            Self::ScreenshotError { reason } => write!(f, "Failed to capture screenshot: {reason}"),
            Self::Database { context, .. } => write!(f, "Database error: {context}"),
            Self::ApprovalRequired => {
                write!(f, "User approval required for submission but not granted")
            }
            Self::DailyLimitReached { current, max } => {
                write!(
                    f,
                    "Daily automation limit reached: {current}/{max} applications"
                )
            }
            Self::Generic { message } => write!(f, "Automation error: {message}"),
        }
    }
}

impl Error for AutomationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::BrowserLaunch {
                source: Some(source),
                ..
            }
            | Self::Network { source }
            | Self::Database { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

impl AutomationError {
    /// Create a browser launch error
    pub fn browser_launch(reason: impl Into<String>) -> Self {
        Self::BrowserLaunch {
            reason: reason.into(),
            source: None,
        }
    }

    /// Create a browser launch error with source
    pub fn browser_launch_with_source<E>(reason: impl Into<String>, source: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        Self::BrowserLaunch {
            reason: reason.into(),
            source: Some(Box::new(source)),
        }
    }

    /// Create a navigation error
    pub fn navigation(url: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::Navigation {
            url: url.into(),
            reason: reason.into(),
        }
    }

    /// Create an element not found error
    pub fn element_not_found(selector: impl Into<String>, url: impl Into<String>) -> Self {
        Self::ElementNotFound {
            selector: selector.into(),
            url: url.into(),
        }
    }

    /// Create a fill field error
    pub fn fill_field(field_name: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::FillFieldError {
            field_name: field_name.into(),
            reason: reason.into(),
        }
    }

    /// Create a CAPTCHA detected error
    pub fn captcha(url: impl Into<String>) -> Self {
        Self::CaptchaDetected { url: url.into() }
    }

    /// Create an incomplete profile error
    pub fn incomplete_profile(missing_fields: Vec<String>) -> Self {
        Self::IncompleteProfile { missing_fields }
    }

    /// Check if this is a transient error that can be retried
    #[must_use]
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::PageLoadTimeout { .. }
                | Self::Network { .. }
                | Self::BrowserNotRunning
                | Self::JavaScriptError { .. }
        )
    }

    /// Check if this error requires user intervention
    #[must_use]
    pub fn requires_user_action(&self) -> bool {
        matches!(
            self,
            Self::CaptchaDetected { .. }
                | Self::MfaRequired { .. }
                | Self::ConsentRequired { .. }
                | Self::ApprovalRequired
                | Self::IncompleteProfile { .. }
                | Self::ResumeError { .. }
        )
    }

    /// Get a user-friendly error message (safe to show in UI)
    #[must_use]
    pub fn user_message(&self) -> String {
        match self {
            Self::BrowserLaunch { .. } => {
                "Could not open the browser. Install or update Chrome, then try again.".to_string()
            }
            Self::BrowserNotRunning => {
                "The browser closed. Open Prepare Form again when you are ready.".to_string()
            }
            Self::Navigation { .. } => {
                "Could not open the job page. Check your internet connection and try again."
                    .to_string()
            }
            Self::PageLoadTimeout { .. } => {
                "The page took too long to load. Check your connection, or try again later."
                    .to_string()
            }
            Self::ElementNotFound { .. } => {
                "Could not find a form field. The page may have changed.".to_string()
            }
            Self::CaptchaDetected { .. } => {
                "This site asked for a human check. Complete it in your browser, then try again."
                    .to_string()
            }
            Self::MfaRequired { platform } => {
                format!(
                    "This site needs extra sign-in verification for {}. Complete it in your browser.",
                    platform
                )
            }
            Self::AlreadySubmitted { platform, .. } => {
                format!("You have already applied to this job on {}.", platform)
            }
            Self::UnsupportedPlatform { platform } => {
                format!("Application platform '{}' is not supported yet.", platform)
            }
            Self::IncompleteProfile { missing_fields } => {
                format!(
                    "Your profile is incomplete. Please fill in: {}",
                    missing_fields.join(", ")
                )
            }
            Self::ResumeError { .. } => {
                "Resume details need review before this can continue.".to_string()
            }
            Self::FileUploadError { .. } => {
                "Could not upload the file. Choose a file you can open and try again.".to_string()
            }
            Self::ApprovalRequired => "Review and approve before anything is sent.".to_string(),
            Self::DailyLimitReached { .. } => {
                "Daily Prepare Form limit reached. Try again tomorrow.".to_string()
            }
            _ => "JobSentinel ran into a problem. Please try again.".to_string(),
        }
    }

    /// Sanitize URL for display
    fn sanitize_url(url: &str) -> String {
        sanitize_url_for_logging(url)
    }

    /// Sanitize selector for display (make it human-readable)
    fn sanitize_selector(selector: &str) -> String {
        // Convert CSS selectors to friendly names
        selector
            .replace("input[name=", "")
            .replace("input#", "")
            .replace(".form-", "")
            .replace(']', "")
            .replace('\"', "")
    }
}

/// Result type alias for automation operations
pub type AutomationResult<T> = Result<T, AutomationError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_launch_error() {
        let err = AutomationError::browser_launch("Chrome not found");
        assert!(matches!(err, AutomationError::BrowserLaunch { .. }));
        assert!(err.to_string().contains("Chrome not found"));
    }

    #[test]
    fn test_captcha_error() {
        let err = AutomationError::captcha("https://example.com/apply");
        assert!(matches!(err, AutomationError::CaptchaDetected { .. }));
        assert!(err.requires_user_action());
    }

    #[test]
    fn test_is_retryable() {
        let timeout = AutomationError::PageLoadTimeout {
            url: "https://example.com".to_string(),
            timeout_secs: 30,
        };
        assert!(timeout.is_retryable());

        let captcha = AutomationError::captcha("https://example.com");
        assert!(!captcha.is_retryable());
    }

    #[test]
    fn test_requires_user_action() {
        let incomplete = AutomationError::incomplete_profile(vec!["phone".to_string()]);
        assert!(incomplete.requires_user_action());

        let timeout = AutomationError::PageLoadTimeout {
            url: "test".to_string(),
            timeout_secs: 30,
        };
        assert!(!timeout.requires_user_action());
    }

    #[test]
    fn test_user_message() {
        let err =
            AutomationError::incomplete_profile(vec!["email".to_string(), "phone".to_string()]);
        let msg = err.user_message();
        assert!(msg.contains("email"));
        assert!(msg.contains("phone"));

        let err = AutomationError::DailyLimitReached {
            current: 10,
            max: 10,
        };
        let msg = err.user_message();
        assert!(msg.contains("Daily Prepare Form limit"));
    }

    #[test]
    fn test_user_message_uses_plain_prepare_form_copy() {
        let captcha = AutomationError::CaptchaDetected {
            url: "https://example.com/jobs?token=secret".to_string(),
        };
        let timeout = AutomationError::PageLoadTimeout {
            url: "https://example.com/jobs?token=secret".to_string(),
            timeout_secs: 30,
        };
        let resume = AutomationError::ResumeError {
            reason: "raw private resume parse failure".to_string(),
        };

        let copy = [
            captcha.user_message(),
            timeout.user_message(),
            resume.user_message(),
        ]
        .join("\n");

        assert!(!copy.contains("CAPTCHA"));
        assert!(!copy.contains("token=secret"));
        assert!(!copy.contains("raw private resume"));
        assert!(copy.contains("human check"));
        assert!(copy.contains("page took too long"));
        assert!(copy.contains("Resume details need review"));
    }

    #[test]
    fn test_sanitize_selector() {
        let selector = "input[name=\"email\"]";
        let sanitized = AutomationError::sanitize_selector(selector);
        assert_eq!(sanitized, "email");
    }

    #[test]
    fn test_display_messages_do_not_expose_raw_urls() {
        let raw_url = "https://user:pass@example.com/apply?token=secret123&query=security#private";

        let navigation = AutomationError::navigation(raw_url, "redirect failed");
        let navigation_text = navigation.to_string();
        assert!(navigation_text.contains("https://example.com/apply"));
        assert!(!navigation_text.contains("secret123"));
        assert!(!navigation_text.contains("query=security"));
        assert!(!navigation_text.contains("user"));
        assert!(!navigation_text.contains("pass"));
        assert!(!navigation_text.contains("private"));

        let element = AutomationError::element_not_found("input[name=\"email\"]", raw_url);
        let element_text = element.to_string();
        assert!(element_text.contains("https://example.com/apply"));
        assert!(!element_text.contains("secret123"));
        assert!(!element_text.contains("user"));
        assert!(!element_text.contains("pass"));

        let javascript = AutomationError::JavaScriptError {
            url: raw_url.to_string(),
            message: "script failed".to_string(),
        };
        let javascript_text = javascript.to_string();
        assert!(javascript_text.contains("https://example.com/apply"));
        assert!(!javascript_text.contains("secret123"));
        assert!(!javascript_text.contains("private"));
    }
}
