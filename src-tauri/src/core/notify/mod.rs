//! Notification Services
//!
//! Sends alerts via Slack (v1.0) and Email (v2.0).

use crate::core::{config::Config, db::Job, scoring::JobScore};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub mod slack;

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

    /// Send immediate alert for high-scoring job
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()> {
        if self.config.alerts.slack.enabled {
            slack::send_slack_notification(&self.config.alerts.slack.webhook_url, notification)
                .await?;
        }

        Ok(())
    }
}
