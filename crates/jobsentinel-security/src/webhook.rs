use url::Url;

use crate::validate_external_https_url;

/// Supported outbound webhook target contracts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookTarget {
    Slack,
    Discord,
    Teams,
}

/// Parse and validate an HTTPS webhook against its provider-owned target shape.
pub fn validate_webhook_target(value: &str, target: WebhookTarget) -> Result<Url, String> {
    let parsed = validate_external_https_url(value).map_err(|_| invalid_target())?;
    if parsed.port().is_some_and(|port| port != 443) || !target.matches(&parsed) {
        return Err(invalid_target());
    }
    Ok(parsed)
}

impl WebhookTarget {
    fn matches(self, url: &Url) -> bool {
        let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
            return false;
        };
        let path = url.path();

        match self {
            Self::Slack => host == "hooks.slack.com" && path.starts_with("/services/"),
            Self::Discord => {
                matches!(
                    host.as_str(),
                    "discord.com" | "discordapp.com" | "hooks.discord.com"
                ) && path.starts_with("/api/webhooks/")
            }
            Self::Teams => is_teams_target(&host, path),
        }
    }
}

fn is_teams_target(host: &str, path: &str) -> bool {
    let legacy_connector = matches!(host, "outlook.office.com" | "outlook.office365.com")
        && path.starts_with("/webhook/");
    let has_generated_path = path.len() > 1;
    let current_connector =
        host.ends_with(".webhook.office.com") && host != "webhook.office.com" && has_generated_path;
    let workflow_trigger =
        host.ends_with(".logic.azure.com") && host != "logic.azure.com" && has_generated_path;

    legacy_connector || current_connector || workflow_trigger
}

fn invalid_target() -> String {
    "Invalid webhook target".to_string()
}
