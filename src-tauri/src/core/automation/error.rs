//! Automation Error Types
//!
//! Domain-specific error types for browser automation and form filling
//! with detailed context for better debugging and user-friendly error messages.

use thiserror::Error;

/// Comprehensive error type for automation operations
#[derive(Error, Debug)]
pub enum AutomationError {
    /// Browser launch failed
    #[error("Failed to launch browser: {reason}")]
    BrowserLaunch {
        reason: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },

    /// Browser not running or crashed
    #[error("Browser is not running or has crashed")]
    BrowserNotRunning,

    /// Page navigation failed
    #[error("Failed to navigate to {url}: {reason}")]
    Navigation { url: String, reason: String },

    /// Page load timeout
    #[error("Page load timeout after {timeout_secs}s for {url}")]
    PageLoadTimeout { url: String, timeout_secs: u64 },

    /// Element not found on page
    #[error("Element not found: {selector} on {url}")]
    ElementNotFound { selector: String, url: String },

    /// Element not interactable (hidden, disabled, etc.)
    #[error("Element not interactable: {selector} - {reason}")]
    ElementNotInteractable { selector: String, reason: String },

    /// Form field type mismatch
    #[error("Field type mismatch for {field_name}: expected {expected}, found {actual}")]
    FieldTypeMismatch {
        field_name: String,
        expected: String,
        actual: String,
    },

    /// Failed to fill form field
    #[error("Failed to fill field '{field_name}': {reason}")]
    FillFieldError {
        field_name: String,
        reason: String,
    },

    /// CAPTCHA detected - requires manual intervention
    #[error("CAPTCHA detected on {url} - manual intervention required")]
    CaptchaDetected { url: String },

    /// Multi-factor authentication required
    #[error("MFA required for {platform} - manual intervention required")]
    MfaRequired { platform: String },

    /// Terms of service or consent required
    #[error("Terms acceptance required on {url}")]
    ConsentRequired { url: String },

    /// Application already submitted
    #[error("Application already submitted for job {job_id} on {platform}")]
    AlreadySubmitted { job_id: String, platform: String },

    /// ATS platform not supported
    #[error("ATS platform not supported: {platform}")]
    UnsupportedPlatform { platform: String },

    /// ATS detection failed
    #[error("Failed to detect ATS platform for {url}")]
    AtsDetectionFailed { url: String },

    /// Profile data missing or incomplete
    #[error("Profile data incomplete: missing {}", missing_fields.join(", "))]
    IncompleteProfile { missing_fields: Vec<String> },

    /// Resume file not found or invalid
    #[error("Resume file error: {reason}")]
    ResumeError { reason: String },

    /// File upload failed
    #[error("Failed to upload {file_type}: {reason}")]
    FileUploadError {
        file_type: String, // "resume", "cover_letter"
        reason: String,
    },

    /// JavaScript execution error
    #[error("JavaScript error on {url}: {message}")]
    JavaScriptError { url: String, message: String },

    /// Network error during automation
    #[error("Network error during automation: {source}")]
    Network {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// Screenshot capture failed
    #[error("Failed to capture screenshot: {reason}")]
    ScreenshotError { reason: String },

    /// Database error during automation
    #[error("Database error: {context}")]
    Database {
        context: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// User approval required but not granted
    #[error("User approval required for submission but not granted")]
    ApprovalRequired,

    /// Daily automation limit reached
    #[error("Daily automation limit reached: {current}/{max} applications")]
    DailyLimitReached { current: u32, max: u32 },

    /// Generic automation error with context
    #[error("Automation error: {message}")]
    Generic { message: String },
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
                "Failed to launch browser. Please ensure Chrome is installed and up to date.".to_string()
            }
            Self::BrowserNotRunning => {
                "Browser has stopped running. The automation will restart.".to_string()
            }
            Self::Navigation { url, .. } => {
                format!("Failed to open {}. Please check your internet connection.", Self::sanitize_url(url))
            }
            Self::PageLoadTimeout { url, timeout_secs } => {
                format!("Page took too long to load ({} seconds): {}", timeout_secs, Self::sanitize_url(url))
            }
            Self::ElementNotFound { selector, .. } => {
                format!("Form element '{}' not found. The page layout may have changed.", Self::sanitize_selector(selector))
            }
            Self::CaptchaDetected { .. } => {
                "CAPTCHA detected. Please complete the challenge in your browser and try again.".to_string()
            }
            Self::MfaRequired { platform } => {
                format!("Multi-factor authentication required for {}. Please complete verification.", platform)
            }
            Self::AlreadySubmitted { platform, .. } => {
                format!("You have already applied to this job on {}.", platform)
            }
            Self::UnsupportedPlatform { platform } => {
                format!("Application platform '{}' is not supported yet.", platform)
            }
            Self::IncompleteProfile { missing_fields } => {
                format!("Your profile is incomplete. Please fill in: {}", missing_fields.join(", "))
            }
            Self::ResumeError { reason } => {
                format!("Resume issue: {}", reason)
            }
            Self::FileUploadError { file_type, .. } => {
                format!("Failed to upload {}. Please check the file and try again.", file_type)
            }
            Self::ApprovalRequired => {
                "This application requires your approval before submission.".to_string()
            }
            Self::DailyLimitReached { current, max } => {
                format!("Daily application limit reached ({}/{}). Try again tomorrow.", current, max)
            }
            _ => "An automation error occurred. Please try again.".to_string(),
        }
    }

    /// Sanitize URL for display
    fn sanitize_url(url: &str) -> String {
        // Remove query parameters and truncate if too long
        let base = url.split('?').next().unwrap_or(url);
        if base.len() > 50 {
            format!("{}...", &base[..50])
        } else {
            base.to_string()
        }
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
        let err = AutomationError::incomplete_profile(vec!["email".to_string(), "phone".to_string()]);
        let msg = err.user_message();
        assert!(msg.contains("email"));
        assert!(msg.contains("phone"));

        let err = AutomationError::DailyLimitReached { current: 10, max: 10 };
        let msg = err.user_message();
        assert!(msg.contains("10/10"));
    }

    #[test]
    fn test_sanitize_selector() {
        let selector = "input[name=\"email\"]";
        let sanitized = AutomationError::sanitize_selector(selector);
        assert_eq!(sanitized, "email");
    }
}
