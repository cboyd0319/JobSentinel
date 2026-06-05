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
    url_security::canonicalize_user_supplied_job_url,
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
pub(crate) const LOCAL_JOB_LINK_MESSAGE: &str = "Open JobSentinel to view the saved job link.";

pub(crate) fn notification_job_href(url: &str) -> Option<String> {
    canonicalize_user_supplied_job_url(url).ok()
}

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
mod tests;
