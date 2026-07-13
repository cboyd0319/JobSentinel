//! Notification Services
//!
//! Sends alerts via multiple channels: Slack, Email, Discord, Telegram, Teams, and Desktop.
//!
//! Credentials are stored in the encrypted local vault and fetched at runtime.

use crate::core::{
    config::Config,
    credentials::{
        decode_smtp_password_for_binding, CredentialKey, CredentialService, SmtpCredentialBinding,
    },
    scoring::JobScore,
    url_security::{canonicalize_user_supplied_job_url, resolve_external_https_url_for_fetch},
    Job,
};
use anyhow::{anyhow, Result};
use reqwest::redirect::Policy;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

mod discord;
mod email;
mod slack;
mod teams;
mod telegram;

pub use email::validate_email_config;
pub use slack::validate_webhook as validate_slack_webhook;

/// Notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub job: Job,
    pub score: JobScore,
}

pub(crate) const LOCAL_MATCH_DETAILS_MESSAGE: &str =
    "Open JobSentinel to review match details saved on this computer.";
pub(crate) const LOCAL_JOB_LINK_MESSAGE: &str = "Open JobSentinel to view the saved job link.";
const NOTIFICATION_HTTP_TIMEOUT: Duration = Duration::from_secs(10);

pub(crate) fn notification_job_href(url: &str) -> Option<String> {
    canonicalize_user_supplied_job_url(url).ok()
}

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

pub(crate) async fn notification_http_client_for_url(
    url: &str,
) -> Result<(reqwest::Client, url::Url)> {
    let target = resolve_external_https_url_for_fetch(url)
        .await
        .map_err(|reason| anyhow!("Blocked notification destination: {reason}"))?;
    let mut builder = reqwest::Client::builder()
        .redirect(Policy::none())
        .timeout(NOTIFICATION_HTTP_TIMEOUT);

    if let Some((host, addrs)) = target.dns_override() {
        builder = builder.resolve_to_addrs(host, addrs);
    }

    let client = builder.build()?;
    Ok((client, target.into_url()))
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
            match resolve_smtp_password_for_email_config(
                &self.config.alerts.email,
                &self.credentials,
            )
            .await
            {
                Ok(smtp_password) => {
                    // Create config with password from secure storage.
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
            match self
                .credentials
                .retrieve(CredentialKey::TelegramBotToken)
                .await
            {
                Ok(Some(bot_token)) => {
                    // Create config with bot token from secure storage.
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
            match self.credentials.retrieve(CredentialKey::TeamsWebhook).await {
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

async fn resolve_smtp_password_for_email_config(
    email_config: &crate::core::config::EmailConfig,
    credentials: &CredentialService,
) -> Result<String> {
    let stored = credentials
        .retrieve(CredentialKey::SmtpPassword)
        .await
        .map_err(|_| anyhow!("Stored email password is unavailable"))?
        .ok_or_else(|| anyhow!("Stored email password is missing"))?;
    let binding = SmtpCredentialBinding::from_email_config(email_config);

    decode_smtp_password_for_binding(&stored, &binding).map_err(anyhow::Error::msg)
}

#[cfg(test)]
mod tests;
