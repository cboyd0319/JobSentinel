//! Feedback Report Generator
//!
//! Generates fully anonymized feedback reports for beta testers.
//! Reports follow the beta feedback workflow in docs/plans/completed/beta-feedback-system.md.

use chrono::{DateTime, Local, Utc};
use serde::Serialize;
use tauri::State;

use super::debug_log::{format_event_for_support, get_recent_events};
use super::sanitizer::{ConfigSummary, Sanitizer};
use super::system_info::{summarize_config, SystemInfo};
use crate::commands::AppState;

/// Feedback category
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FeedbackCategory {
    Bug,
    Feature,
    Question,
}

impl FeedbackCategory {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Bug => "Problem Report",
            Self::Feature => "Improvement Idea",
            Self::Question => "General Feedback",
        }
    }
}

/// Generate a complete feedback report (implementation)
///
/// This is the main report generation function. All output is sanitized.
/// Called by the Tauri command wrapper in mod.rs.
pub(super) async fn generate_feedback_report_impl(
    state: State<'_, AppState>,
    category: String,
    description: String,
    include_debug_info: bool,
) -> Result<String, String> {
    // Parse category
    let category_enum = match category.as_str() {
        "bug" => FeedbackCategory::Bug,
        "feature" | "idea" => FeedbackCategory::Feature,
        "question" | "other" => FeedbackCategory::Question,
        _ => FeedbackCategory::Question,
    };

    // Get system info
    let system_info = SystemInfo::current();

    // Get config summary (if debug info requested)
    let config_summary = if include_debug_info {
        Some(summarize_config(&state.config))
    } else {
        None
    };

    // Get debug log (if requested)
    let debug_events = if include_debug_info {
        get_recent_events(20) // Last 20 events
    } else {
        vec![]
    };

    // Generate report
    let report = format_feedback_report(
        &category_enum,
        &description,
        &system_info,
        config_summary.as_ref(),
        &debug_events,
    );

    Ok(report)
}

/// Format a feedback report as plain text
fn format_feedback_report(
    category: &FeedbackCategory,
    description: &str,
    system_info: &SystemInfo,
    config_summary: Option<&ConfigSummary>,
    debug_events: &[super::debug_log::TimestampedEvent],
) -> String {
    let now: DateTime<Local> = Local::now();
    let now_utc: DateTime<Utc> = Utc::now();

    let mut report = String::new();

    // Header
    report.push_str("═══════════════════════════════════════════════════════════════════════\n");
    report.push_str("                    JOBSENTINEL SAFE SUPPORT REPORT\n");
    report.push_str("═══════════════════════════════════════════════════════════════════════\n");
    report.push_str("\n");

    report.push_str(&format!("Report type: {}\n", category.as_str()));
    report.push_str(&format!(
        "Created: {}\n",
        now.format("%B %d, %Y at %I:%M %p")
    ));
    report.push_str("\n");

    // User feedback
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("WHAT YOU WROTE\n");
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("\n");
    report.push_str(&Sanitizer::sanitize(description));
    report.push_str("\n\n");

    // System information
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("APP AND DEVICE (private details removed)\n");
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("\n");
    report.push_str(&format!("App version: {}\n", system_info.app_version));
    report.push_str(&format!(
        "Device: {} {}\n",
        system_info.platform, system_info.os_version
    ));
    report.push_str(&format!("System type: {}\n", system_info.architecture));
    report.push_str("\n");

    // Config summary (if provided)
    if let Some(summary) = config_summary {
        report
            .push_str("───────────────────────────────────────────────────────────────────────\n");
        report.push_str("JOBSENTINEL SETUP (counts only)\n");
        report
            .push_str("───────────────────────────────────────────────────────────────────────\n");
        report.push_str("\n");
        report.push_str(&format!(
            "Job sources turned on: {}\n",
            summary.scrapers_enabled
        ));
        report.push_str(&format!("Search words saved: {}\n", summary.keywords_count));
        report.push_str(&format!(
            "Location preferences: {}\n",
            if summary.has_location_prefs {
                "configured"
            } else {
                "not set"
            }
        ));
        report.push_str(&format!(
            "Salary preferences: {}\n",
            if summary.has_salary_prefs {
                "configured"
            } else {
                "not set"
            }
        ));
        if summary.has_company_blocklist || summary.has_company_allowlist {
            let blocklist_str = if summary.has_company_blocklist {
                "blocklist"
            } else {
                ""
            };
            let allowlist_str = if summary.has_company_allowlist {
                "allowlist"
            } else {
                ""
            };
            let both = if summary.has_company_blocklist && summary.has_company_allowlist {
                ", "
            } else {
                ""
            };
            report.push_str(&format!(
                "Company preferences: {}{}{}\n",
                blocklist_str, both, allowlist_str
            ));
        }
        report.push_str(&format!(
            "Notifications: {} channel(s)\n",
            summary.notifications_configured
        ));
        report.push_str("\n");
    }

    // Debug events (if provided)
    if !debug_events.is_empty() {
        report
            .push_str("───────────────────────────────────────────────────────────────────────\n");
        report.push_str("RECENT APP ACTIVITY (private details removed)\n");
        report
            .push_str("───────────────────────────────────────────────────────────────────────\n");
        report.push_str("\n");

        for event in debug_events {
            let time_str = event.timestamp.format("%H:%M:%S");
            report.push_str(&format!(
                "[{}] {}\n",
                time_str,
                format_event_for_support(&event.event)
            ));
        }
        report.push_str("\n");
    }

    // Support summary (JSON)
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("SUPPORT SUMMARY\n");
    report.push_str("───────────────────────────────────────────────────────────────────────\n");
    report.push_str("\n");
    report.push_str("```json\n");

    // Generate structured JSON
    let structured = serde_json::json!({
        "schema_version": "1.0",
        "app_version": system_info.app_version,
        "category": match category {
            FeedbackCategory::Bug => "bug",
            FeedbackCategory::Feature => "feature",
            FeedbackCategory::Question => "question",
        },
        "timestamp": now_utc.to_rfc3339(),
        "platform": {
            "os": system_info.platform,
            "os_version": system_info.os_version,
            "arch": system_info.architecture,
        },
        "config_summary": config_summary,
        "debug_events_count": debug_events.len(),
    });

    if let Ok(json_str) = serde_json::to_string_pretty(&structured) {
        report.push_str(&json_str);
    }

    report.push_str("\n```\n");
    report.push_str("\n");

    // Footer
    report.push_str("═══════════════════════════════════════════════════════════════════════\n");
    report.push_str("                    END OF SAFE SUPPORT REPORT\n");
    report.push_str("═══════════════════════════════════════════════════════════════════════\n");

    report
}

/// Generate suggested filename for feedback report (implementation)
pub(super) fn get_feedback_filename_impl() -> String {
    let now = Local::now();
    format!("jobsentinel-feedback-{}.txt", now.format("%Y-%m-%d-%H%M"))
}

// Note: save_feedback_file command moved to mod.rs

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::feedback::debug_log::{DebugEvent, TimestampedEvent};
    use chrono::Utc;

    #[test]
    fn test_format_feedback_report_minimal() {
        let category = FeedbackCategory::Bug;
        let description = "Test bug description";
        let system_info = SystemInfo {
            app_version: "2.6.3".to_string(),
            platform: "macos".to_string(),
            os_version: "14.0".to_string(),
            architecture: "arm64".to_string(),
        };

        let report = format_feedback_report(&category, description, &system_info, None, &[]);

        // Should contain all required sections
        assert!(report.contains("JOBSENTINEL SAFE SUPPORT REPORT"));
        assert!(report.contains("Report type: Problem Report"));
        assert!(report.contains("WHAT YOU WROTE"));
        assert!(report.contains("Test bug description"));
        assert!(report.contains("APP AND DEVICE"));
        assert!(report.contains("App version: 2.6.3"));
        assert!(report.contains("Device: macos 14.0"));
        assert!(report.contains("System type: arm64"));
        assert!(report.contains("SUPPORT SUMMARY"));
        assert!(report.contains("END OF SAFE SUPPORT REPORT"));
    }

    #[test]
    fn test_format_feedback_report_with_config() {
        let category = FeedbackCategory::Feature;
        let description = "Add dark mode";
        let system_info = SystemInfo::current();
        let config_summary = ConfigSummary {
            scrapers_enabled: 3,
            keywords_count: 5,
            has_location_prefs: true,
            has_salary_prefs: true,
            has_company_blocklist: false,
            has_company_allowlist: true,
            notifications_configured: 2,
            has_resume: true,
        };

        let report = format_feedback_report(
            &category,
            description,
            &system_info,
            Some(&config_summary),
            &[],
        );

        assert!(report.contains("JOBSENTINEL SETUP"));
        assert!(report.contains("Job sources turned on: 3"));
        assert!(report.contains("Search words saved: 5"));
        assert!(report.contains("Location preferences: configured"));
        assert!(report.contains("Salary preferences: configured"));
        assert!(report.contains("Notifications: 2 channel(s)"));
    }

    #[test]
    fn test_format_feedback_report_with_debug_events() {
        let category = FeedbackCategory::Bug;
        let description = "Scraper failed";
        let system_info = SystemInfo::current();

        let events = vec![
            TimestampedEvent {
                timestamp: Utc::now(),
                event: DebugEvent::ViewNavigated {
                    from: "Jobs".to_string(),
                    to: "Dashboard".to_string(),
                },
            },
            TimestampedEvent {
                timestamp: Utc::now(),
                event: DebugEvent::ScraperRun {
                    scraper: "indeed".to_string(),
                    jobs_found: 0,
                    success: false,
                },
            },
        ];

        let report = format_feedback_report(&category, description, &system_info, None, &events);

        assert!(report.contains("RECENT APP ACTIVITY"));
        assert!(report.contains("Screen changed: Jobs to Dashboard"));
        assert!(report.contains("Job source checked: indeed; Result: failed; Jobs found: 0"));
        assert!(report.contains("indeed"));
        assert!(!report.contains("ViewNavigated"));
        assert!(!report.contains("ScraperRun"));
    }

    #[test]
    fn test_report_sanitizes_description() {
        let category = FeedbackCategory::Bug;
        let description = concat!(
            "Error at /Users/johnsmith/file.txt with email john@example.com\n",
            "Salary floor: $125,000\n",
            "Resume text: Led retention project for oncology team\n",
            "Private note: laid off last month\n"
        );
        let system_info = SystemInfo::current();

        let report = format_feedback_report(&category, description, &system_info, None, &[]);

        // Should sanitize PII in description
        assert!(report.contains("/[USER_PATH]/file.txt"));
        assert!(report.contains("[EMAIL]"));
        assert!(report.contains("Salary floor: [JOB_SEARCH_DETAIL_REDACTED]"));
        assert!(report.contains("Resume text: [JOB_SEARCH_DETAIL_REDACTED]"));
        assert!(report.contains("Private note: [JOB_SEARCH_DETAIL_REDACTED]"));
        assert!(!report.contains("johnsmith"));
        assert!(!report.contains("john@example.com"));
        assert!(!report.contains("$125,000"));
        assert!(!report.contains("oncology team"));
        assert!(!report.contains("laid off"));
    }

    #[test]
    fn test_feedback_category_as_str() {
        assert_eq!(FeedbackCategory::Bug.as_str(), "Problem Report");
        assert_eq!(FeedbackCategory::Feature.as_str(), "Improvement Idea");
        assert_eq!(FeedbackCategory::Question.as_str(), "General Feedback");
    }
}
