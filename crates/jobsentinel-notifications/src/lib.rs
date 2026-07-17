//! Notification formatting and bounded delivery transports.

mod config;
mod discord;
mod email;
mod slack;
mod teams;
mod telegram;

use jobsentinel_domain::Job;
use jobsentinel_intelligence::JobScore;
use jobsentinel_network::ExternalTextResponse;
use jobsentinel_security::canonicalize_user_supplied_job_url;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub use config::{
    AlertConfig, DesktopConfig, DiscordConfig, EmailConfig, SlackConfig, TeamsConfig,
    TelegramConfig,
};
pub use discord::send_discord_notification;
pub use email::{send_email_notification, validate_email_config};
pub use slack::{send_slack_notification, validate_webhook as validate_slack_webhook};
pub use teams::send_teams_notification;
pub use telegram::send_telegram_notification;

/// A scored job ready for delivery through one or more alert channels.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub job: Job,
    pub score: JobScore,
}

pub(crate) const LOCAL_MATCH_DETAILS_MESSAGE: &str =
    "Open JobSentinel to review match details saved on this computer.";
pub(crate) const LOCAL_JOB_LINK_MESSAGE: &str = "Open JobSentinel to view the saved job link.";
pub(crate) const NOTIFICATION_HTTP_TIMEOUT: Duration = Duration::from_secs(10);

#[must_use]
pub fn notification_job_href(url: &str) -> Option<String> {
    canonicalize_user_supplied_job_url(url).ok()
}

pub(crate) fn notification_provider_failure_summary(response: &ExternalTextResponse) -> String {
    let body_chars = response.body.chars().count();
    format!(
        "status {}; provider error body omitted ({} chars)",
        response.status, body_chars
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_failure_summary_omits_error_body() {
        let secret_body = "Care Coordinator at Community Care Network https://example.com/jobs/123";
        let response = ExternalTextResponse {
            status: 400,
            body: secret_body.to_string(),
            redirect_location: None,
        };

        let summary = notification_provider_failure_summary(&response);

        assert_eq!(
            summary,
            format!(
                "status 400; provider error body omitted ({} chars)",
                secret_body.chars().count()
            )
        );
        assert!(!summary.contains("Care Coordinator"));
        assert!(!summary.contains("Community Care Network"));
    }
}
