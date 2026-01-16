//! Notification Services
//!
//! Sends alerts via multiple channels: Slack, Email, Discord, Telegram, Teams, and Desktop.

use crate::core::{config::Config, db::Job, scoring::JobScore};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod slack;
pub mod email;
pub mod discord;
pub mod telegram;
pub mod teams;

/// Notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub job: Job,
    pub score: JobScore,
}

/// Notification service
pub struct NotificationService {
    config: Arc<Config>,
}

impl NotificationService {
    pub fn new(config: Arc<Config>) -> Self {
        Self { config }
    }

    /// Send immediate alert for high-scoring job across all enabled channels
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()> {
        let mut errors = Vec::new();

        // Send to Slack if enabled
        if self.config.alerts.slack.enabled {
            if let Err(e) = slack::send_slack_notification(&self.config.alerts.slack.webhook_url, notification).await {
                tracing::error!("Failed to send Slack notification: {}", e);
                errors.push(format!("Slack: {}", e));
            } else {
                tracing::info!("✓ Sent Slack notification for: {}", notification.job.title);
            }
        }

        // Send to Email if enabled
        if self.config.alerts.email.enabled {
            if let Err(e) = email::send_email_notification(&self.config.alerts.email, notification).await {
                tracing::error!("Failed to send email notification: {}", e);
                errors.push(format!("Email: {}", e));
            } else {
                tracing::info!("✓ Sent email notification for: {}", notification.job.title);
            }
        }

        // Send to Discord if enabled
        if self.config.alerts.discord.enabled {
            if let Err(e) = discord::send_discord_notification(&self.config.alerts.discord, notification).await {
                tracing::error!("Failed to send Discord notification: {}", e);
                errors.push(format!("Discord: {}", e));
            } else {
                tracing::info!("✓ Sent Discord notification for: {}", notification.job.title);
            }
        }

        // Send to Telegram if enabled
        if self.config.alerts.telegram.enabled {
            if let Err(e) = telegram::send_telegram_notification(&self.config.alerts.telegram, notification).await {
                tracing::error!("Failed to send Telegram notification: {}", e);
                errors.push(format!("Telegram: {}", e));
            } else {
                tracing::info!("✓ Sent Telegram notification for: {}", notification.job.title);
            }
        }

        // Send to Teams if enabled
        if self.config.alerts.teams.enabled {
            if let Err(e) = teams::send_teams_notification(&self.config.alerts.teams.webhook_url, notification).await {
                tracing::error!("Failed to send Teams notification: {}", e);
                errors.push(format!("Teams: {}", e));
            } else {
                tracing::info!("✓ Sent Teams notification for: {}", notification.job.title);
            }
        }

        // If all enabled channels failed, return error
        if !errors.is_empty() {
            // Count enabled channels
            let enabled_count = [
                self.config.alerts.slack.enabled,
                self.config.alerts.email.enabled,
                self.config.alerts.discord.enabled,
                self.config.alerts.telegram.enabled,
                self.config.alerts.teams.enabled,
            ].iter().filter(|&&e| e).count();

            if errors.len() == enabled_count {
                return Err(anyhow::anyhow!(
                    "All notification channels failed: {}",
                    errors.join("; ")
                ));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{
        config::{AlertConfig, SlackConfig, DiscordConfig, EmailConfig, TelegramConfig, TeamsConfig},
        db::Job,
        scoring::{JobScore, ScoreBreakdown},
    };
    use chrono::Utc;

    /// Helper to create a test notification
    fn create_test_notification() -> Notification {
        Notification {
            job: Job {
                id: 1,
                hash: "test123".to_string(),
                title: "Senior Rust Engineer".to_string(),
                company: "Awesome Corp".to_string(),
                url: "https://example.com/jobs/123".to_string(),
                location: Some("Remote".to_string()),
                description: Some("Build amazing Rust systems".to_string()),
                score: Some(0.95),
                score_reasons: None,
                source: "greenhouse".to_string(),
                remote: Some(true),
                salary_min: Some(180000),
                salary_max: Some(220000),
                currency: Some("USD".to_string()),
                created_at: Utc::now(),
                updated_at: Utc::now(),
                last_seen: Utc::now(),
                times_seen: 1,
                immediate_alert_sent: false,
                hidden: false,
                bookmarked: false,
                notes: None,
                included_in_digest: false,
            },
            score: JobScore {
                total: 0.95,
                breakdown: ScoreBreakdown {
                    skills: 0.40,
                    salary: 0.25,
                    location: 0.20,
                    company: 0.05,
                    recency: 0.05,
                },
                reasons: vec![
                    "✓ Title matches: Senior Rust Engineer".to_string(),
                    "✓ Has keyword: Rust".to_string(),
                    "✓ Salary >= $150,000".to_string(),
                    "✓ Remote job (matches preference)".to_string(),
                ],
            },
        }
    }

    /// Helper to create a minimal disabled config
    fn create_disabled_config() -> Arc<Config> {
        use crate::core::config::{LocationPreferences, AutoRefreshConfig, LinkedInConfig, IndeedConfig};

        Arc::new(Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            auto_refresh: AutoRefreshConfig {
                enabled: false,
                interval_minutes: 30,
            },
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: false,
                    webhook_url: String::new(),
                },
                email: EmailConfig {
                    enabled: false,
                    smtp_server: String::new(),
                    smtp_port: 587,
                    smtp_username: String::new(),
                    smtp_password: String::new(),
                    from_email: String::new(),
                    to_emails: vec![],
                    use_starttls: true,
                },
                discord: DiscordConfig {
                    enabled: false,
                    webhook_url: String::new(),
                    user_id_to_mention: None,
                },
                telegram: TelegramConfig {
                    enabled: false,
                    bot_token: String::new(),
                    chat_id: String::new(),
                },
                teams: TeamsConfig {
                    enabled: false,
                    webhook_url: String::new(),
                },
                desktop: crate::core::config::DesktopConfig {
                    enabled: false,
                    show_when_focused: false,
                    play_sound: false,
                },
            },
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: LinkedInConfig::default(),
            indeed: IndeedConfig::default(),
        })
    }

    #[test]
    fn test_notification_serialization() {
        let notification = create_test_notification();

        // Test that Notification can be serialized to JSON
        let json = serde_json::to_string(&notification).expect("Should serialize");
        assert!(json.contains("Senior Rust Engineer"));
        assert!(json.contains("Awesome Corp"));

        // Test deserialization
        let deserialized: Notification = serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(deserialized.job.title, notification.job.title);
        assert_eq!(deserialized.score.total, notification.score.total);
    }

    #[test]
    fn test_notification_service_creation() {
        let config = create_disabled_config();
        let _service = NotificationService::new(config.clone());

        // Verify service holds the config
        assert_eq!(Arc::strong_count(&config), 2); // One in service, one in test
    }

    #[test]
    fn test_notification_with_missing_optional_fields() {
        let mut notification = create_test_notification();
        notification.job.location = None;
        notification.job.description = None;
        notification.job.salary_min = None;
        notification.job.salary_max = None;
        notification.job.currency = None;
        notification.job.remote = None;

        // Should serialize without errors
        let json = serde_json::to_string(&notification).expect("Should serialize with missing fields");

        // Verify JSON was created
        assert!(!json.is_empty(), "JSON should not be empty");

        // Deserialize to verify round-trip works
        let deserialized: Notification = serde_json::from_str(&json).expect("Should deserialize with missing fields");
        assert_eq!(deserialized.job.location, None);
        assert_eq!(deserialized.job.description, None);
        assert_eq!(deserialized.job.salary_min, None);
        assert_eq!(deserialized.job.salary_max, None);
        assert_eq!(deserialized.job.currency, None);
        assert_eq!(deserialized.job.remote, None);
    }

    #[test]
    fn test_score_breakdown_sums_correctly() {
        let notification = create_test_notification();
        let breakdown = &notification.score.breakdown;

        let sum = breakdown.skills + breakdown.salary + breakdown.location
                + breakdown.company + breakdown.recency;

        // Should sum to approximately the total score (allowing for floating point precision)
        // Note: breakdown doesn't necessarily sum to 1.0, but to the total score
        assert!((sum - notification.score.total).abs() < 0.001,
                "Breakdown should sum to total score {}, got {}", notification.score.total, sum);
    }

    #[test]
    fn test_score_reasons_not_empty() {
        let notification = create_test_notification();

        assert!(!notification.score.reasons.is_empty(), "Score reasons should not be empty");
        assert!(notification.score.reasons.len() >= 1, "Should have at least one reason");
    }

    #[test]
    fn test_job_hash_uniqueness() {
        let notification1 = create_test_notification();
        let mut notification2 = create_test_notification();
        notification2.job.hash = "different_hash".to_string();

        assert_ne!(notification1.job.hash, notification2.job.hash, "Different jobs should have different hashes");
    }

    #[test]
    fn test_notification_clone() {
        let notification = create_test_notification();
        let cloned = notification.clone();

        assert_eq!(notification.job.title, cloned.job.title);
        assert_eq!(notification.score.total, cloned.score.total);
        assert_eq!(notification.job.hash, cloned.job.hash);
    }

    #[test]
    fn test_notification_debug_format() {
        let notification = create_test_notification();
        let debug_str = format!("{:?}", notification);

        // Debug format should include key fields
        assert!(debug_str.contains("Notification"));
    }

    #[test]
    fn test_salary_range_validation() {
        let notification = create_test_notification();

        if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
            assert!(max >= min, "Max salary should be >= min salary");
        }
    }

    #[test]
    fn test_score_total_in_valid_range() {
        let notification = create_test_notification();

        assert!(notification.score.total >= 0.0, "Score should be >= 0.0");
        assert!(notification.score.total <= 1.0, "Score should be <= 1.0");
    }

    #[test]
    fn test_score_breakdown_in_valid_ranges() {
        let notification = create_test_notification();
        let breakdown = &notification.score.breakdown;

        assert!(breakdown.skills >= 0.0 && breakdown.skills <= 1.0);
        assert!(breakdown.salary >= 0.0 && breakdown.salary <= 1.0);
        assert!(breakdown.location >= 0.0 && breakdown.location <= 1.0);
        assert!(breakdown.company >= 0.0 && breakdown.company <= 1.0);
        assert!(breakdown.recency >= 0.0 && breakdown.recency <= 1.0);
    }

    #[test]
    fn test_notification_with_zero_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.0;
        notification.score.breakdown = ScoreBreakdown {
            skills: 0.0,
            salary: 0.0,
            location: 0.0,
            company: 0.0,
            recency: 0.0,
        };
        notification.score.reasons = vec!["No matches found".to_string()];

        assert_eq!(notification.score.total, 0.0);
        assert!(!notification.score.reasons.is_empty());
    }

    #[test]
    fn test_notification_url_validation() {
        let notification = create_test_notification();

        // URL should be parseable
        assert!(url::Url::parse(&notification.job.url).is_ok(), "Job URL should be valid");
    }

    #[test]
    fn test_notification_timestamps_logical() {
        let notification = create_test_notification();

        // created_at should be <= updated_at
        assert!(notification.job.created_at <= notification.job.updated_at);

        // last_seen should be >= created_at
        assert!(notification.job.last_seen >= notification.job.created_at);
    }

    // Note: Tests for actual HTTP notification sending are in the individual modules
    // (slack.rs, discord.rs, teams.rs, telegram.rs, email.rs) as they require
    // mocking HTTP clients or integration testing with real endpoints.
    //
    // The NotificationService::send_immediate_alert method would require:
    // - Mock HTTP servers (wiremock/mockito crates)
    // - Integration tests with test webhooks
    // - Testing the orchestration logic with multiple channels
    //
    // These are better suited for integration tests rather than unit tests.
}
