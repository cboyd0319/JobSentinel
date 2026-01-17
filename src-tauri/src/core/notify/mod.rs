//! Notification Services
//!
//! Sends alerts via multiple channels: Slack, Email, Discord, Telegram, Teams, and Desktop.
//!
//! Credentials are stored securely in the OS keyring and fetched at runtime.

use crate::core::{
    config::Config,
    credentials::{CredentialKey, CredentialStore},
    db::Job,
    scoring::JobScore,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod discord;
pub mod email;
pub mod slack;
pub mod teams;
pub mod telegram;

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
    ///
    /// Credentials are fetched from OS keyring at runtime (not stored in config).
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()> {
        let mut errors = Vec::new();

        // Send to Slack if enabled
        if self.config.alerts.slack.enabled {
            match CredentialStore::retrieve(CredentialKey::SlackWebhook) {
                Ok(Some(webhook_url)) => {
                    if let Err(e) = slack::send_slack_notification(&webhook_url, notification).await
                    {
                        tracing::error!("Failed to send Slack notification: {}", e);
                        errors.push(format!("Slack: {}", e));
                    } else {
                        tracing::info!("✓ Sent Slack notification for: {}", notification.job.title);
                    }
                }
                Ok(None) => {
                    tracing::warn!("Slack enabled but webhook not configured in keyring");
                    errors.push("Slack: Webhook not configured".to_string());
                }
                Err(e) => {
                    tracing::error!("Failed to retrieve Slack webhook from keyring: {}", e);
                    errors.push(format!("Slack: {}", e));
                }
            }
        }

        // Send to Email if enabled
        if self.config.alerts.email.enabled {
            match CredentialStore::retrieve(CredentialKey::SmtpPassword) {
                Ok(Some(smtp_password)) => {
                    // Create config with password from keyring
                    let email_config = crate::core::config::EmailConfig {
                        enabled: self.config.alerts.email.enabled,
                        smtp_server: self.config.alerts.email.smtp_server.clone(),
                        smtp_port: self.config.alerts.email.smtp_port,
                        smtp_username: self.config.alerts.email.smtp_username.clone(),
                        smtp_password,
                        from_email: self.config.alerts.email.from_email.clone(),
                        to_emails: self.config.alerts.email.to_emails.clone(),
                        use_starttls: self.config.alerts.email.use_starttls,
                    };
                    if let Err(e) = email::send_email_notification(&email_config, notification).await
                    {
                        tracing::error!("Failed to send email notification: {}", e);
                        errors.push(format!("Email: {}", e));
                    } else {
                        tracing::info!("✓ Sent email notification for: {}", notification.job.title);
                    }
                }
                Ok(None) => {
                    tracing::warn!("Email enabled but SMTP password not configured in keyring");
                    errors.push("Email: SMTP password not configured".to_string());
                }
                Err(e) => {
                    tracing::error!("Failed to retrieve SMTP password from keyring: {}", e);
                    errors.push(format!("Email: {}", e));
                }
            }
        }

        // Send to Discord if enabled
        if self.config.alerts.discord.enabled {
            match CredentialStore::retrieve(CredentialKey::DiscordWebhook) {
                Ok(Some(webhook_url)) => {
                    // Create config with webhook from keyring
                    let discord_config = crate::core::config::DiscordConfig {
                        enabled: self.config.alerts.discord.enabled,
                        webhook_url,
                        user_id_to_mention: self.config.alerts.discord.user_id_to_mention.clone(),
                    };
                    if let Err(e) =
                        discord::send_discord_notification(&discord_config, notification).await
                    {
                        tracing::error!("Failed to send Discord notification: {}", e);
                        errors.push(format!("Discord: {}", e));
                    } else {
                        tracing::info!(
                            "✓ Sent Discord notification for: {}",
                            notification.job.title
                        );
                    }
                }
                Ok(None) => {
                    tracing::warn!("Discord enabled but webhook not configured in keyring");
                    errors.push("Discord: Webhook not configured".to_string());
                }
                Err(e) => {
                    tracing::error!("Failed to retrieve Discord webhook from keyring: {}", e);
                    errors.push(format!("Discord: {}", e));
                }
            }
        }

        // Send to Telegram if enabled
        if self.config.alerts.telegram.enabled {
            match CredentialStore::retrieve(CredentialKey::TelegramBotToken) {
                Ok(Some(bot_token)) => {
                    // Create config with bot token from keyring
                    let telegram_config = crate::core::config::TelegramConfig {
                        enabled: self.config.alerts.telegram.enabled,
                        bot_token,
                        chat_id: self.config.alerts.telegram.chat_id.clone(),
                    };
                    if let Err(e) =
                        telegram::send_telegram_notification(&telegram_config, notification).await
                    {
                        tracing::error!("Failed to send Telegram notification: {}", e);
                        errors.push(format!("Telegram: {}", e));
                    } else {
                        tracing::info!(
                            "✓ Sent Telegram notification for: {}",
                            notification.job.title
                        );
                    }
                }
                Ok(None) => {
                    tracing::warn!("Telegram enabled but bot token not configured in keyring");
                    errors.push("Telegram: Bot token not configured".to_string());
                }
                Err(e) => {
                    tracing::error!("Failed to retrieve Telegram bot token from keyring: {}", e);
                    errors.push(format!("Telegram: {}", e));
                }
            }
        }

        // Send to Teams if enabled
        if self.config.alerts.teams.enabled {
            match CredentialStore::retrieve(CredentialKey::TeamsWebhook) {
                Ok(Some(webhook_url)) => {
                    if let Err(e) = teams::send_teams_notification(&webhook_url, notification).await
                    {
                        tracing::error!("Failed to send Teams notification: {}", e);
                        errors.push(format!("Teams: {}", e));
                    } else {
                        tracing::info!("✓ Sent Teams notification for: {}", notification.job.title);
                    }
                }
                Ok(None) => {
                    tracing::warn!("Teams enabled but webhook not configured in keyring");
                    errors.push("Teams: Webhook not configured".to_string());
                }
                Err(e) => {
                    tracing::error!("Failed to retrieve Teams webhook from keyring: {}", e);
                    errors.push(format!("Teams: {}", e));
                }
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
            ]
            .iter()
            .filter(|&&e| e)
            .count();

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
        config::{
            AlertConfig, DiscordConfig, EmailConfig, SlackConfig, TeamsConfig, TelegramConfig,
        },
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
                ghost_score: None,
                ghost_reasons: None,
                first_seen: None,
                repost_count: 0,
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
        use crate::core::config::{
            AutoRefreshConfig, IndeedConfig, LinkedInConfig, LocationPreferences,
        };

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
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
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
        let json =
            serde_json::to_string(&notification).expect("Should serialize with missing fields");

        // Verify JSON was created
        assert!(!json.is_empty(), "JSON should not be empty");

        // Deserialize to verify round-trip works
        let deserialized: Notification =
            serde_json::from_str(&json).expect("Should deserialize with missing fields");
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

        let sum = breakdown.skills
            + breakdown.salary
            + breakdown.location
            + breakdown.company
            + breakdown.recency;

        // Should sum to approximately the total score (allowing for floating point precision)
        // Note: breakdown doesn't necessarily sum to 1.0, but to the total score
        assert!(
            (sum - notification.score.total).abs() < 0.001,
            "Breakdown should sum to total score {}, got {}",
            notification.score.total,
            sum
        );
    }

    #[test]
    fn test_score_reasons_not_empty() {
        let notification = create_test_notification();

        assert!(
            !notification.score.reasons.is_empty(),
            "Score reasons should not be empty"
        );
        assert!(
            notification.score.reasons.len() >= 1,
            "Should have at least one reason"
        );
    }

    #[test]
    fn test_job_hash_uniqueness() {
        let notification1 = create_test_notification();
        let mut notification2 = create_test_notification();
        notification2.job.hash = "different_hash".to_string();

        assert_ne!(
            notification1.job.hash, notification2.job.hash,
            "Different jobs should have different hashes"
        );
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
        assert!(
            url::Url::parse(&notification.job.url).is_ok(),
            "Job URL should be valid"
        );
    }

    #[test]
    fn test_notification_timestamps_logical() {
        let notification = create_test_notification();

        // created_at should be <= updated_at
        assert!(notification.job.created_at <= notification.job.updated_at);

        // last_seen should be >= created_at
        assert!(notification.job.last_seen >= notification.job.created_at);
    }

    #[tokio::test]
    async fn test_send_immediate_alert_all_channels_disabled() {
        let config = create_disabled_config();
        let service = NotificationService::new(config);
        let notification = create_test_notification();

        // Should succeed when no channels are enabled (nothing to do)
        let result = service.send_immediate_alert(&notification).await;
        assert!(result.is_ok(), "Should succeed when all channels disabled");
    }

    #[test]
    fn test_enabled_channel_counting_all_disabled() {
        let config = create_disabled_config();

        let enabled_count = [
            config.alerts.slack.enabled,
            config.alerts.email.enabled,
            config.alerts.discord.enabled,
            config.alerts.telegram.enabled,
            config.alerts.teams.enabled,
        ]
        .iter()
        .filter(|&&e| e)
        .count();

        assert_eq!(enabled_count, 0, "All channels should be disabled");
    }

    #[test]
    fn test_enabled_channel_counting_slack_only() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.slack.enabled = true;

        let enabled_count = [
            config.alerts.slack.enabled,
            config.alerts.email.enabled,
            config.alerts.discord.enabled,
            config.alerts.telegram.enabled,
            config.alerts.teams.enabled,
        ]
        .iter()
        .filter(|&&e| e)
        .count();

        assert_eq!(enabled_count, 1, "Only Slack should be enabled");
    }

    #[test]
    fn test_enabled_channel_counting_multiple() {
        let mut config = create_disabled_config();
        let config_mut = Arc::get_mut(&mut config).unwrap();
        config_mut.alerts.slack.enabled = true;
        config_mut.alerts.discord.enabled = true;
        config_mut.alerts.teams.enabled = true;

        let enabled_count = [
            config.alerts.slack.enabled,
            config.alerts.email.enabled,
            config.alerts.discord.enabled,
            config.alerts.telegram.enabled,
            config.alerts.teams.enabled,
        ]
        .iter()
        .filter(|&&e| e)
        .count();

        assert_eq!(enabled_count, 3, "Three channels should be enabled");
    }

    #[test]
    fn test_enabled_channel_counting_all_enabled() {
        let mut config = create_disabled_config();
        let config_mut = Arc::get_mut(&mut config).unwrap();
        config_mut.alerts.slack.enabled = true;
        config_mut.alerts.email.enabled = true;
        config_mut.alerts.discord.enabled = true;
        config_mut.alerts.telegram.enabled = true;
        config_mut.alerts.teams.enabled = true;

        let enabled_count = [
            config.alerts.slack.enabled,
            config.alerts.email.enabled,
            config.alerts.discord.enabled,
            config.alerts.telegram.enabled,
            config.alerts.teams.enabled,
        ]
        .iter()
        .filter(|&&e| e)
        .count();

        assert_eq!(enabled_count, 5, "All five channels should be enabled");
    }

    #[test]
    fn test_notification_service_config_immutability() {
        let config = create_disabled_config();
        let service = NotificationService::new(config.clone());

        // Service should hold a reference to the same config
        assert_eq!(
            service.config.immediate_alert_threshold,
            config.immediate_alert_threshold
        );
        assert_eq!(service.config.salary_floor_usd, config.salary_floor_usd);
    }

    #[test]
    fn test_notification_service_checks_slack_enabled() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.slack.enabled = true;

        let service = NotificationService::new(config);

        assert!(
            service.config.alerts.slack.enabled,
            "Slack should be enabled"
        );
        assert!(
            !service.config.alerts.email.enabled,
            "Email should remain disabled"
        );
    }

    #[test]
    fn test_notification_service_checks_email_enabled() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.email.enabled = true;

        let service = NotificationService::new(config);

        assert!(
            service.config.alerts.email.enabled,
            "Email should be enabled"
        );
        assert!(
            !service.config.alerts.slack.enabled,
            "Slack should remain disabled"
        );
    }

    #[test]
    fn test_notification_service_checks_discord_enabled() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.discord.enabled = true;

        let service = NotificationService::new(config);

        assert!(
            service.config.alerts.discord.enabled,
            "Discord should be enabled"
        );
        assert!(
            !service.config.alerts.telegram.enabled,
            "Telegram should remain disabled"
        );
    }

    #[test]
    fn test_notification_service_checks_telegram_enabled() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.telegram.enabled = true;

        let service = NotificationService::new(config);

        assert!(
            service.config.alerts.telegram.enabled,
            "Telegram should be enabled"
        );
        assert!(
            !service.config.alerts.teams.enabled,
            "Teams should remain disabled"
        );
    }

    #[test]
    fn test_notification_service_checks_teams_enabled() {
        let mut config = create_disabled_config();
        Arc::get_mut(&mut config).unwrap().alerts.teams.enabled = true;

        let service = NotificationService::new(config);

        assert!(
            service.config.alerts.teams.enabled,
            "Teams should be enabled"
        );
        assert!(
            !service.config.alerts.slack.enabled,
            "Slack should remain disabled"
        );
    }

    #[test]
    fn test_error_message_format_single_channel() {
        let errors = vec!["Slack: Connection timeout".to_string()];
        let error_msg = format!("All notification channels failed: {}", errors.join("; "));

        assert!(error_msg.contains("Slack"));
        assert!(error_msg.contains("Connection timeout"));
        assert!(
            !error_msg.contains(";;"),
            "Should not have double semicolons"
        );
    }

    #[test]
    fn test_error_message_format_multiple_channels() {
        let errors = vec![
            "Slack: Connection timeout".to_string(),
            "Email: SMTP auth failed".to_string(),
            "Discord: Invalid webhook".to_string(),
        ];
        let error_msg = format!("All notification channels failed: {}", errors.join("; "));

        assert!(error_msg.contains("Slack"));
        assert!(error_msg.contains("Email"));
        assert!(error_msg.contains("Discord"));
        assert!(error_msg.contains("; "), "Should have semicolon separators");
        assert_eq!(
            error_msg.matches("; ").count(),
            2,
            "Should have exactly 2 separators for 3 errors"
        );
    }

    #[test]
    fn test_error_collection_empty() {
        let errors: Vec<String> = Vec::new();

        assert!(errors.is_empty(), "Error collection should start empty");
        assert_eq!(errors.len(), 0, "Length should be zero");
    }

    #[test]
    fn test_error_collection_accumulation() {
        let mut errors: Vec<String> = Vec::new();

        errors.push("Slack: Error 1".to_string());
        assert_eq!(errors.len(), 1);

        errors.push("Email: Error 2".to_string());
        assert_eq!(errors.len(), 2);

        errors.push("Discord: Error 3".to_string());
        assert_eq!(errors.len(), 3);
    }

    #[test]
    fn test_partial_failure_condition() {
        let errors = vec!["Slack: Error".to_string()];
        let enabled_count = 3; // Slack, Email, Discord enabled

        // Partial failure (1 error out of 3 enabled channels)
        let is_total_failure = errors.len() == enabled_count;
        assert!(
            !is_total_failure,
            "Should not be total failure when only 1 of 3 failed"
        );
    }

    #[test]
    fn test_total_failure_condition() {
        let errors = vec![
            "Slack: Error".to_string(),
            "Email: Error".to_string(),
            "Discord: Error".to_string(),
        ];
        let enabled_count = 3;

        // Total failure (all 3 enabled channels failed)
        let is_total_failure = errors.len() == enabled_count;
        assert!(
            is_total_failure,
            "Should be total failure when all enabled channels failed"
        );
    }

    #[test]
    fn test_notification_with_high_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.98;

        assert!(notification.score.total > 0.9, "Should be high-scoring job");
        assert!(
            notification.score.total <= 1.0,
            "Should not exceed maximum score"
        );
    }

    #[test]
    fn test_notification_with_threshold_score() {
        let mut notification = create_test_notification();
        let config = create_disabled_config();

        notification.score.total = config.immediate_alert_threshold;

        assert_eq!(
            notification.score.total, config.immediate_alert_threshold,
            "Score should exactly match threshold"
        );
    }

    #[test]
    fn test_notification_above_threshold() {
        let mut notification = create_test_notification();
        let config = create_disabled_config();

        notification.score.total = config.immediate_alert_threshold + 0.01;

        assert!(
            notification.score.total > config.immediate_alert_threshold,
            "Score should be above threshold"
        );
    }

    #[test]
    fn test_notification_below_threshold() {
        let mut notification = create_test_notification();
        let config = create_disabled_config();

        notification.score.total = config.immediate_alert_threshold - 0.01;

        assert!(
            notification.score.total < config.immediate_alert_threshold,
            "Score should be below threshold"
        );
    }

    #[test]
    fn test_webhook_url_empty_when_disabled() {
        let config = create_disabled_config();

        assert!(!config.alerts.slack.enabled);
        assert!(config.alerts.slack.webhook_url.is_empty());

        assert!(!config.alerts.discord.enabled);
        assert!(config.alerts.discord.webhook_url.is_empty());

        assert!(!config.alerts.teams.enabled);
        assert!(config.alerts.teams.webhook_url.is_empty());
    }

    #[test]
    fn test_job_source_validation() {
        let notification = create_test_notification();

        // Source should be a known scraper
        let valid_sources = ["greenhouse", "lever", "linkedin", "indeed", "jobswithgpt"];
        assert!(
            valid_sources.contains(&notification.job.source.as_str()),
            "Job source should be a known scraper"
        );
    }

    #[test]
    fn test_notification_job_not_hidden() {
        let notification = create_test_notification();

        assert!(
            !notification.job.hidden,
            "High-scoring jobs for alerts should not be hidden"
        );
    }

    #[test]
    fn test_notification_alert_not_sent_initially() {
        let notification = create_test_notification();

        assert!(
            !notification.job.immediate_alert_sent,
            "New job should not have alert sent yet"
        );
    }

    #[test]
    fn test_notification_times_seen_positive() {
        let notification = create_test_notification();

        assert!(
            notification.job.times_seen > 0,
            "Job should have been seen at least once"
        );
    }

    #[test]
    fn test_notification_company_not_empty() {
        let notification = create_test_notification();

        assert!(
            !notification.job.company.is_empty(),
            "Company name should not be empty"
        );
    }

    #[test]
    fn test_notification_title_not_empty() {
        let notification = create_test_notification();

        assert!(
            !notification.job.title.is_empty(),
            "Job title should not be empty"
        );
    }

    // Note: Tests for actual HTTP notification sending are in the individual modules
    // (slack.rs, discord.rs, teams.rs, telegram.rs, email.rs) as they require
    // mocking HTTP clients or integration testing with real endpoints.
    //
    // The NotificationService::send_immediate_alert method's HTTP orchestration would require:
    // - Mock HTTP servers (wiremock/mockito crates)
    // - Integration tests with test webhooks
    // - Testing the error handling with simulated failures
    //
    // These are better suited for integration tests rather than unit tests.
}
