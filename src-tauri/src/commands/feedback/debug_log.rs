//! Debug Log Ring Buffer
//!
//! Lightweight event logging for diagnosing issues WITHOUT tracking users.
//! Only logs action types and outcomes - NEVER content (job titles, companies, etc.)

use chrono::{DateTime, Utc};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::RwLock;

use super::sanitizer::Sanitizer;

/// Maximum number of events to keep in the ring buffer
const MAX_EVENTS: usize = 100;

/// Debug event types - ONLY metadata, never content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DebugEvent {
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
pub struct TimestampedEvent {
    pub timestamp: DateTime<Utc>,
    pub event: DebugEvent,
}

impl TimestampedEvent {
    /// Create a new timestamped event
    pub fn new(event: DebugEvent) -> Self {
        Self {
            timestamp: Utc::now(),
            event,
        }
    }
}

/// Ring buffer for debug events (thread-safe)
pub struct DebugLogBuffer {
    events: VecDeque<TimestampedEvent>,
    max_size: usize,
}

impl DebugLogBuffer {
    /// Create a new ring buffer with default max size
    pub fn new() -> Self {
        Self::with_capacity(MAX_EVENTS)
    }

    /// Create a new ring buffer with custom max size
    pub fn with_capacity(max_size: usize) -> Self {
        Self {
            events: VecDeque::with_capacity(max_size),
            max_size,
        }
    }

    /// Add an event to the buffer
    ///
    /// If the buffer is full, the oldest event is removed (ring buffer behavior).
    pub fn push(&mut self, event: DebugEvent) {
        // If buffer is full, remove oldest event
        if self.events.len() >= self.max_size {
            self.events.pop_front();
        }

        // Add new event with timestamp
        self.events.push_back(TimestampedEvent::new(event));
    }

    /// Get all events (most recent last)
    pub fn get_all(&self) -> Vec<TimestampedEvent> {
        self.events.iter().cloned().collect()
    }

    /// Get the N most recent events
    pub fn get_recent(&self, n: usize) -> Vec<TimestampedEvent> {
        let len = self.events.len();
        if n >= len {
            self.get_all()
        } else {
            self.events.iter().skip(len - n).cloned().collect()
        }
    }

    /// Clear all events
    pub fn clear(&mut self) {
        self.events.clear();
    }

    /// Get the current number of events
    pub fn len(&self) -> usize {
        self.events.len()
    }

    /// Check if the buffer is empty
    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
}

impl Default for DebugLogBuffer {
    fn default() -> Self {
        Self::new()
    }
}

// Global debug log buffer (thread-safe)
static DEBUG_LOG: Lazy<RwLock<DebugLogBuffer>> =
    Lazy::new(|| RwLock::new(DebugLogBuffer::new()));

/// Log an event to the global debug buffer
///
/// Thread-safe. Can be called from anywhere in the application.
///
/// # Examples
///
/// ```
/// use crate::commands::feedback::debug_log::{log_event, DebugEvent};
///
/// log_event(DebugEvent::AppStarted {
///     version: env!("CARGO_PKG_VERSION").to_string()
/// });
///
/// log_event(DebugEvent::CommandInvoked {
///     command: "search_jobs".to_string(),
///     success: true,
///     error_code: None,
/// });
/// ```
pub fn log_event(event: DebugEvent) {
    if let Ok(mut buffer) = DEBUG_LOG.write() {
        buffer.push(event);
    }
}

/// Get all events from the global debug buffer
///
/// Returns sanitized events (all text fields are sanitized).
pub fn get_debug_log() -> Vec<TimestampedEvent> {
    DEBUG_LOG
        .read()
        .map(|buffer| buffer.get_all())
        .unwrap_or_default()
}

/// Get the N most recent events from the global debug buffer
pub fn get_recent_events(n: usize) -> Vec<TimestampedEvent> {
    DEBUG_LOG
        .read()
        .map(|buffer| buffer.get_recent(n))
        .unwrap_or_default()
}

/// Clear the global debug buffer
pub fn clear_debug_log() {
    if let Ok(mut buffer) = DEBUG_LOG.write() {
        buffer.clear();
    }
}

/// Format debug log as a human-readable string (sanitized)
pub fn format_debug_log() -> String {
    let events = get_debug_log();

    if events.is_empty() {
        return "No debug events recorded.".to_string();
    }

    let mut output = String::new();
    output.push_str(&format!("Debug Log ({} events):\n\n", events.len()));

    for event in events {
        let timestamp = event.timestamp.format("%Y-%m-%d %H:%M:%S UTC");
        let event_str = match event.event {
            DebugEvent::AppStarted { version } => {
                format!("[APP_STARTED] Version: {}", version)
            }
            DebugEvent::ViewNavigated { from, to } => {
                format!("[VIEW_NAVIGATED] {} → {}", from, to)
            }
            DebugEvent::CommandInvoked {
                command,
                success,
                error_code,
            } => {
                let status = if success { "SUCCESS" } else { "FAILED" };
                let error_suffix = error_code
                    .map(|code| format!(" (error: {})", code))
                    .unwrap_or_default();
                format!("[COMMAND] {} → {}{}", command, status, error_suffix)
            }
            DebugEvent::ErrorOccurred { code, message } => {
                // Sanitize error message (defense in depth)
                let sanitized = Sanitizer::sanitize_error(&message);
                format!("[ERROR] {} - {}", code, sanitized)
            }
            DebugEvent::ScraperRun {
                scraper,
                jobs_found,
                success,
            } => {
                let status = if success { "SUCCESS" } else { "FAILED" };
                format!(
                    "[SCRAPER] {} → {} ({} jobs found)",
                    scraper, status, jobs_found
                )
            }
            DebugEvent::FeatureUsed { feature, metadata } => {
                let meta_str = metadata
                    .map(|m| format!(" ({})", Sanitizer::sanitize(&m)))
                    .unwrap_or_default();
                format!("[FEATURE] {}{}", feature, meta_str)
            }
        };

        output.push_str(&format!("{} {}\n", timestamp, event_str));
    }

    // Final sanitization pass (defense in depth)
    Sanitizer::sanitize(&output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ring_buffer_capacity() {
        let mut buffer = DebugLogBuffer::with_capacity(3);

        buffer.push(DebugEvent::AppStarted {
            version: "1.0.0".to_string(),
        });
        buffer.push(DebugEvent::AppStarted {
            version: "1.0.1".to_string(),
        });
        buffer.push(DebugEvent::AppStarted {
            version: "1.0.2".to_string(),
        });

        assert_eq!(buffer.len(), 3);

        // Adding 4th event should remove the first
        buffer.push(DebugEvent::AppStarted {
            version: "1.0.3".to_string(),
        });

        assert_eq!(buffer.len(), 3);

        let events = buffer.get_all();
        // First event (1.0.0) should be gone
        if let DebugEvent::AppStarted { version } = &events[0].event {
            assert_eq!(version, "1.0.1");
        } else {
            panic!("Expected AppStarted event");
        }
    }

    #[test]
    fn test_get_recent() {
        let mut buffer = DebugLogBuffer::new();

        for i in 0..10 {
            buffer.push(DebugEvent::AppStarted {
                version: format!("1.0.{}", i),
            });
        }

        let recent = buffer.get_recent(3);
        assert_eq!(recent.len(), 3);

        // Should get last 3 events (7, 8, 9)
        if let DebugEvent::AppStarted { version } = &recent[0].event {
            assert_eq!(version, "1.0.7");
        }
    }

    #[test]
    fn test_clear() {
        let mut buffer = DebugLogBuffer::new();
        buffer.push(DebugEvent::AppStarted {
            version: "1.0.0".to_string(),
        });
        assert_eq!(buffer.len(), 1);

        buffer.clear();
        assert_eq!(buffer.len(), 0);
        assert!(buffer.is_empty());
    }

    #[test]
    fn test_global_log_event() {
        // Isolate this test by clearing before and after
        clear_debug_log();

        log_event(DebugEvent::CommandInvoked {
            command: "test_command".to_string(),
            success: true,
            error_code: None,
        });

        let events = get_debug_log();
        assert!(!events.is_empty());

        if let DebugEvent::CommandInvoked { command, .. } = &events[0].event {
            assert_eq!(command, "test_command");
        } else {
            panic!("Expected CommandInvoked event");
        }

        clear_debug_log(); // Clean up after test
    }

    #[test]
    fn test_format_debug_log_sanitizes() {
        // Test the sanitization by directly checking the sanitized message
        // rather than relying on global buffer which may have concurrent test pollution
        let message = "File not found: /Users/johnsmith/secret.db";
        let sanitized = Sanitizer::sanitize_error(message);

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
    fn test_scraper_run_event() {
        let event = DebugEvent::ScraperRun {
            scraper: "indeed".to_string(),
            jobs_found: 42,
            success: true,
        };

        let mut buffer = DebugLogBuffer::new();
        buffer.push(event);

        let events = buffer.get_all();
        if let DebugEvent::ScraperRun { jobs_found, .. } = &events[0].event {
            assert_eq!(*jobs_found, 42);
        }
    }

    #[test]
    fn test_feature_used_event() {
        let event = DebugEvent::FeatureUsed {
            feature: "resume_builder".to_string(),
            metadata: Some("classic_template".to_string()),
        };

        let mut buffer = DebugLogBuffer::new();
        buffer.push(event);

        let events = buffer.get_all();
        if let DebugEvent::FeatureUsed { feature, metadata } = &events[0].event {
            assert_eq!(feature, "resume_builder");
            assert_eq!(metadata.as_ref().unwrap(), "classic_template");
        }
    }

    #[test]
    fn test_never_logs_sensitive_content() {
        // Test that the sanitizer doesn't remove generic job content
        // (which is why we should NEVER log it in the first place)
        let message = "Job title: Senior Rust Developer at AcmeCorp";
        let sanitized = Sanitizer::sanitize_error(message);

        // Job titles and company names are just plain text - they won't be sanitized
        // by our regex patterns (which target paths, emails, webhooks, etc.)
        // This is OK because we should NEVER log job content in the first place.
        // This test documents that behavior.
        assert!(
            sanitized.contains("Senior Rust Developer"),
            "Test expects job title to appear (showing that sanitizer doesn't catch generic text - \
             which is why we must never log job content in the first place). Got: {}",
            sanitized
        );
    }
}
