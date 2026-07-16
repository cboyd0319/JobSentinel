//! Notification Services
//!
//! Sends alerts via multiple channels: Slack, Email, Discord, Telegram, Teams, and Desktop.
//!
//! Credentials are stored in the encrypted local vault and fetched at runtime.

use crate::{
    config::Config,
    credentials::{
        decode_smtp_password_for_binding, CredentialKey, CredentialService, SmtpCredentialBinding,
    },
};
use anyhow::{anyhow, Result};
use std::sync::Arc;

pub use jobsentinel_notifications::{validate_email_config, validate_slack_webhook, Notification};

#[cfg(test)]
use jobsentinel_notifications::notification_job_href;

/// Notification service
pub struct NotificationService {
    config: Arc<Config>,
    credentials: Arc<CredentialService>,
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

impl NotificationService {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            credentials: Arc::new(CredentialService::compatibility_keyring()),
        }
    }

    pub fn with_credentials(config: Arc<Config>, credentials: Arc<CredentialService>) -> Self {
        Self {
            config,
            credentials,
        }
    }

    /// Send immediate alert for high-scoring job across all enabled channels
    ///
    /// Credentials are fetched from secure storage at runtime (not stored in config).
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()> {
        let mut errors = Vec::new();

        // Send to Slack if enabled
        if self.config.alerts.slack.enabled {
            match self.credentials.retrieve(CredentialKey::SlackWebhook).await {
                Ok(Some(webhook_url)) => {
                    if let Err(_e) = jobsentinel_notifications::send_slack_notification(
                        &webhook_url,
                        notification,
                    )
                    .await
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
            match resolve_smtp_password_for_email_config(
                &self.config.alerts.email,
                &self.credentials,
            )
            .await
            {
                Ok(smtp_password) => {
                    // Create config with password from secure storage.
                    let email_config = crate::config::EmailConfig {
                        enabled: self.config.alerts.email.enabled,
                        smtp_server: self.config.alerts.email.smtp_server.clone(),
                        smtp_port: self.config.alerts.email.smtp_port,
                        smtp_username: self.config.alerts.email.smtp_username.clone(),
                        smtp_password,
                        from_email: self.config.alerts.email.from_email.clone(),
                        to_emails: self.config.alerts.email.to_emails.clone(),
                        use_starttls: self.config.alerts.email.use_starttls,
                    };
                    if let Err(_e) = jobsentinel_notifications::send_email_notification(
                        &email_config,
                        notification,
                    )
                    .await
                    {
                        record_notification_delivery_failure(&mut errors, "Email");
                    } else {
                        log_notification_sent("email", notification);
                    }
                }
                Err(_e) => {
                    record_notification_credential_failure(&mut errors, "Email");
                }
            }
        }

        // Send to Discord if enabled
        if self.config.alerts.discord.enabled {
            match self
                .credentials
                .retrieve(CredentialKey::DiscordWebhook)
                .await
            {
                Ok(Some(webhook_url)) => {
                    // Create config with webhook from secure storage.
                    let discord_config = crate::config::DiscordConfig {
                        enabled: self.config.alerts.discord.enabled,
                        webhook_url,
                        user_id_to_mention: self.config.alerts.discord.user_id_to_mention.clone(),
                    };
                    if let Err(_e) = jobsentinel_notifications::send_discord_notification(
                        &discord_config,
                        notification,
                    )
                    .await
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
            match self
                .credentials
                .retrieve(CredentialKey::TelegramBotToken)
                .await
            {
                Ok(Some(bot_token)) => {
                    // Create config with bot token from secure storage.
                    let telegram_config = crate::config::TelegramConfig {
                        enabled: self.config.alerts.telegram.enabled,
                        bot_token,
                        chat_id: self.config.alerts.telegram.chat_id.clone(),
                    };
                    if let Err(_e) = jobsentinel_notifications::send_telegram_notification(
                        &telegram_config,
                        notification,
                    )
                    .await
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
            match self.credentials.retrieve(CredentialKey::TeamsWebhook).await {
                Ok(Some(webhook_url)) => {
                    if let Err(_e) = jobsentinel_notifications::send_teams_notification(
                        &webhook_url,
                        notification,
                    )
                    .await
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

async fn resolve_smtp_password_for_email_config(
    email_config: &crate::config::EmailConfig,
    credentials: &CredentialService,
) -> Result<String> {
    let stored = credentials
        .retrieve(CredentialKey::SmtpPassword)
        .await
        .map_err(|_| anyhow!("Stored email password is unavailable"))?
        .ok_or_else(|| anyhow!("Stored email password is missing"))?;
    let binding = SmtpCredentialBinding::new(
        &email_config.smtp_server,
        email_config.smtp_port,
        &email_config.smtp_username,
    );

    decode_smtp_password_for_binding(&stored, &binding).map_err(anyhow::Error::msg)
}

#[cfg(test)]
mod tests;
