//! Debug Log Ring Buffer
//!
//! Lightweight event logging for diagnosing issues WITHOUT tracking users.
//! Only logs action types and outcomes - NEVER content (job titles, companies, etc.)

use super::sanitizer::Sanitizer;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Debug event types - ONLY metadata, never content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub(crate) enum DebugEvent {
    /// App startup event
    AppStarted { version: String },

    /// User navigated between views
    ViewNavigated { from: String, to: String },

    /// Tauri command invoked (success or failure)
    CommandInvoked {
        command: String,
        success: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error_code: Option<String>,
    },

    /// Error occurred (sanitized message only)
    ErrorOccurred {
        code: String,
        message: String, // ALWAYS sanitized before storage
    },

    /// Scraper run completed
    ScraperRun {
        scraper: String,
        jobs_found: usize, // Count only, never actual job data
        success: bool,
    },

    /// Feature usage tracking (anonymous)
    FeatureUsed {
        feature: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<String>, // Optional metadata (sanitized)
    },
}

/// Timestamped event wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct TimestampedEvent {
    pub timestamp: DateTime<Utc>,
    pub event: DebugEvent,
}

/// Return recorded app activity.
///
/// JobSentinel does not collect background activity. The support report keeps
/// this stable empty field so renderer responses remain predictable.
pub(super) fn get_debug_log() -> Vec<TimestampedEvent> {
    Vec::new()
}

/// Return at most the requested number of recorded activity events.
pub(super) fn get_recent_events(_limit: usize) -> Vec<TimestampedEvent> {
    Vec::new()
}

fn readable_debug_value(value: &str) -> String {
    Sanitizer::sanitize(value)
        .replace(['_', '-'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn support_status(success: bool) -> &'static str {
    if success {
        "succeeded"
    } else {
        "failed"
    }
}

pub(super) fn format_event_for_support(event: &DebugEvent) -> String {
    match event {
        DebugEvent::AppStarted { version } => {
            format!("App opened: Version {}", Sanitizer::sanitize(version))
        }
        DebugEvent::ViewNavigated { from, to } => {
            format!(
                "Screen changed: {} to {}",
                readable_debug_value(from),
                readable_debug_value(to)
            )
        }
        DebugEvent::CommandInvoked {
            command,
            success,
            error_code,
        } => {
            let error_suffix = error_code
                .as_ref()
                .map(|code| format!("; Support code: {}", Sanitizer::sanitize(code)))
                .unwrap_or_default();
            format!(
                "App action: {}; Result: {}{}",
                readable_debug_value(command),
                support_status(*success),
                error_suffix
            )
        }
        DebugEvent::ErrorOccurred { code, message } => {
            format!(
                "App problem: {}; Message: {}",
                Sanitizer::sanitize(code),
                Sanitizer::sanitize_error(message)
            )
        }
        DebugEvent::ScraperRun {
            scraper,
            jobs_found,
            success,
        } => {
            format!(
                "Job source checked: {}; Result: {}; Jobs found: {}",
                readable_debug_value(scraper),
                support_status(*success),
                jobs_found
            )
        }
        DebugEvent::FeatureUsed { feature, metadata } => {
            let meta_str = metadata
                .as_ref()
                .map(|m| format!("; Details: {}", readable_debug_value(m)))
                .unwrap_or_default();
            format!(
                "Feature used: {}{}",
                readable_debug_value(feature),
                meta_str
            )
        }
    }
}

/// Clear recorded activity. No background activity is collected.
pub(super) fn clear_debug_log() {}

/// Format debug log as a human-readable string (sanitized)
pub(super) fn format_debug_log() -> String {
    let events = get_debug_log();

    if events.is_empty() {
        return "No app activity recorded.".to_string();
    }

    let mut output = String::new();
    output.push_str(&format!("Safe app activity ({} events):\n\n", events.len()));

    for event in events {
        let timestamp = event.timestamp.format("%Y-%m-%d %H:%M:%S UTC");
        let event_str = format_event_for_support(&event.event);

        output.push_str(&format!("{} {}\n", timestamp, event_str));
    }

    // Final sanitization pass (defense in depth)
    Sanitizer::sanitize(&output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_debug_log_sanitizes() {
        // Test the sanitization by directly checking the sanitized message
        // rather than relying on global buffer which may have concurrent test pollution
        let message = format!("File not found: /{}/johnsmith/secret.db", "Users");
        let sanitized = Sanitizer::sanitize_error(&message);

        // Verify sanitization happened
        assert!(
            !sanitized.contains("johnsmith"),
            "Sanitized message should not contain username 'johnsmith'. Got: {}",
            sanitized
        );
        assert!(
            sanitized.contains("[USER_PATH]"),
            "Sanitized message should contain sanitized path marker '[USER_PATH]'. Got: {}",
            sanitized
        );
    }

    #[test]
    fn background_activity_collection_stays_disabled() {
        assert!(get_debug_log().is_empty());
        assert!(get_recent_events(20).is_empty());
        clear_debug_log();
        assert_eq!(format_debug_log(), "No app activity recorded.");
    }

    #[test]
    fn test_support_event_format_uses_plain_language() {
        let event = DebugEvent::CommandInvoked {
            command: "search_jobs".to_string(),
            success: false,
            error_code: Some("network_error".to_string()),
        };

        let formatted = format_event_for_support(&event);

        assert!(formatted.contains("App action: search jobs"));
        assert!(formatted.contains("Result: failed"));
        assert!(formatted.contains("Support code: network_error"));
        assert!(!formatted.contains("CommandInvoked"));
        assert!(!formatted.contains("search_jobs"));
    }

    #[test]
    fn test_never_logs_sensitive_content() {
        // Test that the sanitizer doesn't remove generic job content
        // (which is why we should NEVER log it in the first place)
        let message = "Job title: Program Coordinator at Acme Services";
        let sanitized = Sanitizer::sanitize_error(message);

        // Job titles and company names are just plain text - they won't be sanitized
        // by our regex patterns (which target paths, emails, webhooks, etc.)
        // This is OK because we should NEVER log job content in the first place.
        // This test documents that behavior.
        assert!(
            sanitized.contains("Program Coordinator"),
            "Test expects job title to appear (showing that sanitizer doesn't catch generic text - \
             which is why we must never log job content in the first place). Got: {}",
            sanitized
        );
    }
}
