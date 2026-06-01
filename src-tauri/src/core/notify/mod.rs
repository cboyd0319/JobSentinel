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
use anyhow::{anyhow, Result};
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

pub(crate) const LOCAL_MATCH_DETAILS_MESSAGE: &str =
    "Open JobSentinel to review match details saved on this computer.";

/// Notification service
pub struct NotificationService {
    config: Arc<Config>,
}

fn log_notification_sent(channel: &'static str, notification: &Notification) {
    tracing::info!(
        channel,
        job_id = notification.job.id,
        job_hash = %notification.job.hash,
        "Sent notification"
    );
}

fn notification_channel_error(channel: &'static str, reason: &'static str) -> String {
    format!("{}: {}", channel, reason)
}

fn record_notification_delivery_failure(errors: &mut Vec<String>, channel: &'static str) {
    tracing::error!(
        channel,
        failure_kind = "delivery_failed",
        "Notification channel failed"
    );
    errors.push(notification_channel_error(channel, "delivery failed"));
}

fn record_notification_configuration_missing(errors: &mut Vec<String>, channel: &'static str) {
    tracing::warn!(
        channel,
        failure_kind = "credential_not_configured",
        "Notification credential not configured"
    );
    errors.push(notification_channel_error(channel, "not configured"));
}

fn record_notification_credential_failure(errors: &mut Vec<String>, channel: &'static str) {
    tracing::error!(
        channel,
        failure_kind = "credential_unavailable",
        "Notification credential unavailable"
    );
    errors.push(notification_channel_error(
        channel,
        "credential unavailable",
    ));
}

fn format_provider_failure_summary(
    status: reqwest::StatusCode,
    body_chars: Option<usize>,
) -> String {
    match body_chars {
        Some(chars) => format!(
            "status {}; provider error body omitted ({} chars)",
            status, chars
        ),
        None => format!("status {}; provider error body unavailable", status),
    }
}

pub(crate) async fn notification_provider_failure_summary(
    response: reqwest::Response,
    url_label: &str,
) -> String {
    let status = response.status();
    let body_chars = crate::core::http_body::read_text_with_limit(response, url_label)
        .await
        .ok()
        .map(|body| body.chars().count());

    format_provider_failure_summary(status, body_chars)
}

fn validate_webhook_url_security_parts(url: &url::Url) -> Result<()> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err(anyhow!(
            "Remove any sign-in name or password from the connection link, then try again."
        ));
    }

    if let Some(port) = url.port() {
        if port != 443 {
            return Err(anyhow!(
                "Paste the standard connection link from the alert service and try again."
            ));
        }
    }

    Ok(())
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
                    if let Err(_e) =
                        slack::send_slack_notification(&webhook_url, notification).await
                    {
                        record_notification_delivery_failure(&mut errors, "Slack");
                    } else {
                        log_notification_sent("slack", notification);
                    }
                }
                Ok(None) => {
                    record_notification_configuration_missing(&mut errors, "Slack");
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Slack");
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
                    if let Err(_e) =
                        email::send_email_notification(&email_config, notification).await
                    {
                        record_notification_delivery_failure(&mut errors, "Email");
                    } else {
                        log_notification_sent("email", notification);
                    }
                }
                Ok(None) => {
                    record_notification_configuration_missing(&mut errors, "Email");
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Email");
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
                    if let Err(_e) =
                        discord::send_discord_notification(&discord_config, notification).await
                    {
                        record_notification_delivery_failure(&mut errors, "Discord");
                    } else {
                        log_notification_sent("discord", notification);
                    }
                }
                Ok(None) => {
                    record_notification_configuration_missing(&mut errors, "Discord");
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Discord");
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
                    if let Err(_e) =
                        telegram::send_telegram_notification(&telegram_config, notification).await
                    {
                        record_notification_delivery_failure(&mut errors, "Telegram");
                    } else {
                        log_notification_sent("telegram", notification);
                    }
                }
                Ok(None) => {
                    record_notification_configuration_missing(&mut errors, "Telegram");
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Telegram");
                }
            }
        }

        // Send to Teams if enabled
        if self.config.alerts.teams.enabled {
            match CredentialStore::retrieve(CredentialKey::TeamsWebhook) {
                Ok(Some(webhook_url)) => {
                    if let Err(_e) =
                        teams::send_teams_notification(&webhook_url, notification).await
                    {
                        record_notification_delivery_failure(&mut errors, "Teams");
                    } else {
                        log_notification_sent("teams", notification);
                    }
                }
                Ok(None) => {
                    record_notification_configuration_missing(&mut errors, "Teams");
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Teams");
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
                title: "Care Coordinator".to_string(),
                company: "Community Care Network".to_string(),
                url: "https://example.com/jobs/123".to_string(),
                location: Some("Remote".to_string()),
                description: Some("Support patients and families with care planning".to_string()),
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
                    "Title matches: Care Coordinator".to_string(),
                    "Keyword match: case management".to_string(),
                    "Salary 120% of target (100% credit)".to_string(),
                    "Remote job (matches preference)".to_string(),
                ],
            },
        }
    }

    /// Helper to create a minimal disabled config
    fn create_disabled_config() -> Arc<Config> {
        use crate::core::config::{AutoRefreshConfig, LinkedInConfig, LocationPreferences};

        Arc::new(Config {
            title_allowlist: vec!["Care Coordinator".to_string()],
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
            jobswithgpt_endpoint: String::new(),
            jobswithgpt_approval: Default::default(),
            remoteok: Default::default(),
            weworkremotely: Default::default(),
            builtin: Default::default(),
            hn_hiring: Default::default(),
            dice: Default::default(),
            yc_startup: Default::default(),
            usajobs: Default::default(),
            simplyhired: Default::default(),
            glassdoor: Default::default(),
            ghost_config: None,
            company_whitelist: vec![],
            company_blacklist: vec![],
            use_resume_matching: false,
            salary_target_usd: None,
            penalize_missing_salary: false,
        })
    }

    #[test]
    fn test_notification_serialization() {
        let notification = create_test_notification();

        // Test that Notification can be serialized to JSON
        let json = serde_json::to_string(&notification).expect("Should serialize");
        assert!(json.contains("Care Coordinator"));
        assert!(json.contains("Community Care Network"));

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
        let errors = vec!["Slack: delivery failed".to_string()];
        let error_msg = format!("All notification channels failed: {}", errors.join("; "));

        assert!(error_msg.contains("Slack"));
        assert!(error_msg.contains("delivery failed"));
        assert!(
            !error_msg.contains(";;"),
            "Should not have double semicolons"
        );
    }

    #[test]
    fn test_error_message_format_multiple_channels() {
        let errors = vec![
            "Slack: delivery failed".to_string(),
            "Email: credential unavailable".to_string(),
            "Discord: not configured".to_string(),
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

        errors.push("Slack: delivery failed".to_string());
        assert_eq!(errors.len(), 1);

        errors.push("Email: credential unavailable".to_string());
        assert_eq!(errors.len(), 2);

        errors.push("Discord: not configured".to_string());
        assert_eq!(errors.len(), 3);
    }

    #[test]
    fn test_notification_failure_records_are_sanitized() {
        let mut errors = Vec::new();

        record_notification_delivery_failure(&mut errors, "Slack");
        record_notification_configuration_missing(&mut errors, "Telegram");
        record_notification_credential_failure(&mut errors, "Email");

        assert_eq!(
            errors,
            vec![
                "Slack: delivery failed",
                "Telegram: not configured",
                "Email: credential unavailable",
            ]
        );

        let joined = errors.join("; ");
        assert!(!joined.contains("https://"));
        assert!(!joined.contains("token"));
        assert!(!joined.contains("password"));
        assert!(!joined.contains("webhook"));
    }

    #[test]
    fn test_partial_failure_condition() {
        let errors = vec!["Slack: delivery failed".to_string()];
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
            "Slack: delivery failed".to_string(),
            "Email: credential unavailable".to_string(),
            "Discord: not configured".to_string(),
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
        let valid_sources = [
            "greenhouse",
            "lever",
            "linkedin",
            "remoteok",
            "weworkremotely",
            "hn_hiring",
            "yc_startup",
            "dice",
            "builtin",
            "usajobs",
            "jobswithgpt",
        ];
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

    #[test]
    fn test_provider_failure_summary_omits_error_body() {
        let secret_body = "Care Coordinator at Community Care Network https://example.com/jobs/123";
        let summary = format_provider_failure_summary(
            reqwest::StatusCode::BAD_REQUEST,
            Some(secret_body.chars().count()),
        );

        assert!(summary.contains("400 Bad Request"));
        assert!(summary.contains("provider error body omitted"));
        assert!(!summary.contains("Care Coordinator"));
        assert!(!summary.contains("Community Care Network"));
        assert!(!summary.contains("https://example.com/jobs/123"));
    }

    #[test]
    fn test_provider_failure_summary_handles_unreadable_body() {
        let summary = format_provider_failure_summary(reqwest::StatusCode::TOO_MANY_REQUESTS, None);

        assert_eq!(
            summary,
            "status 429 Too Many Requests; provider error body unavailable"
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
