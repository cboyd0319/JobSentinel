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
