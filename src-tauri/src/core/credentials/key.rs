use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// Enumeration of all credential types supported by JobSentinel.
///
/// Each variant maps to a specific storage identifier used as an encrypted
/// vault row key and, during legacy fallback, as an OS credential item name.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialKey {
    /// SMTP password for email notifications.
    SmtpPassword,
    /// Telegram bot token for Telegram notifications.
    TelegramBotToken,
    /// Slack webhook URL for Slack notifications.
    SlackWebhook,
    /// Discord webhook URL for Discord notifications.
    DiscordWebhook,
    /// Microsoft Teams webhook URL for Teams notifications.
    TeamsWebhook,
    /// Legacy LinkedIn session entry retained only for cleanup and redaction.
    LinkedInCookie,
    /// Legacy LinkedIn expiry entry retained only for cleanup and redaction.
    LinkedInCookieExpiry,
    /// USAJobs API key (free from developer.usajobs.gov) for API access.
    UsaJobsApiKey,
    /// OpenAI API key for optional outside-AI features.
    ExternalAiOpenAiApiKey,
    /// Anthropic API key for optional outside-AI features.
    ExternalAiAnthropicApiKey,
    /// Google Gemini API key for optional outside-AI features.
    ExternalAiGoogleApiKey,
    /// GitHub or Copilot key for optional outside-AI features.
    ExternalAiGithubCopilotApiKey,
    /// Custom provider API key for optional outside-AI features.
    ExternalAiCustomApiKey,
}

/// Non-secret credential availability status for settings diagnostics.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CredentialPresence {
    pub key: CredentialKey,
    pub exists: bool,
    pub available: bool,
}

impl CredentialKey {
    /// Convert credential key to its storage identifier.
    ///
    /// All keys are prefixed with `jobsentinel_` for namespacing in the vault
    /// and legacy keyring.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SmtpPassword => "jobsentinel_smtp_password",
            Self::TelegramBotToken => "jobsentinel_telegram_bot_token",
            Self::SlackWebhook => "jobsentinel_slack_webhook",
            Self::DiscordWebhook => "jobsentinel_discord_webhook",
            Self::TeamsWebhook => "jobsentinel_teams_webhook",
            Self::LinkedInCookie => "jobsentinel_linkedin_cookie",
            Self::LinkedInCookieExpiry => "jobsentinel_linkedin_cookie_expiry",
            Self::UsaJobsApiKey => "jobsentinel_usajobs_api_key",
            Self::ExternalAiOpenAiApiKey => "jobsentinel_external_ai_openai_api_key",
            Self::ExternalAiAnthropicApiKey => "jobsentinel_external_ai_anthropic_api_key",
            Self::ExternalAiGoogleApiKey => "jobsentinel_external_ai_google_api_key",
            Self::ExternalAiGithubCopilotApiKey => "jobsentinel_external_ai_github_copilot_api_key",
            Self::ExternalAiCustomApiKey => "jobsentinel_external_ai_custom_api_key",
        }
    }

    /// Return active credential keys used for migration and diagnostics.
    ///
    /// # Examples
    ///
    /// ```
    /// # use jobsentinel::core::credentials::CredentialKey;
    /// for key in CredentialKey::all() {
    ///     println!("Credential: {}", key.as_str());
    /// }
    /// ```
    pub fn all() -> &'static [Self] {
        &[
            Self::SmtpPassword,
            Self::TelegramBotToken,
            Self::SlackWebhook,
            Self::DiscordWebhook,
            Self::TeamsWebhook,
            Self::UsaJobsApiKey,
            Self::ExternalAiOpenAiApiKey,
            Self::ExternalAiAnthropicApiKey,
            Self::ExternalAiGoogleApiKey,
            Self::ExternalAiGithubCopilotApiKey,
            Self::ExternalAiCustomApiKey,
        ]
    }
}

impl FromStr for CredentialKey {
    type Err = String;

    /// Parse credential key from string.
    ///
    /// Accepts both prefixed (`jobsentinel_smtp_password`) and unprefixed
    /// (`smtp_password`) variants for backwards compatibility.
    ///
    /// # Errors
    ///
    /// Returns error if the string doesn't match any known credential key.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "smtp_password" | "jobsentinel_smtp_password" => Ok(Self::SmtpPassword),
            "telegram_bot_token" | "jobsentinel_telegram_bot_token" => Ok(Self::TelegramBotToken),
            "slack_webhook" | "jobsentinel_slack_webhook" => Ok(Self::SlackWebhook),
            "discord_webhook" | "jobsentinel_discord_webhook" => Ok(Self::DiscordWebhook),
            "teams_webhook" | "jobsentinel_teams_webhook" => Ok(Self::TeamsWebhook),
            "linkedin_cookie" | "jobsentinel_linkedin_cookie" => Ok(Self::LinkedInCookie),
            "linkedin_cookie_expiry" | "jobsentinel_linkedin_cookie_expiry" => {
                Ok(Self::LinkedInCookieExpiry)
            }
            "usajobs_api_key" | "jobsentinel_usajobs_api_key" => Ok(Self::UsaJobsApiKey),
            "external_ai_openai_api_key" | "jobsentinel_external_ai_openai_api_key" => {
                Ok(Self::ExternalAiOpenAiApiKey)
            }
            "external_ai_anthropic_api_key" | "jobsentinel_external_ai_anthropic_api_key" => {
                Ok(Self::ExternalAiAnthropicApiKey)
            }
            "external_ai_google_api_key" | "jobsentinel_external_ai_google_api_key" => {
                Ok(Self::ExternalAiGoogleApiKey)
            }
            "external_ai_github_copilot_api_key"
            | "jobsentinel_external_ai_github_copilot_api_key" => {
                Ok(Self::ExternalAiGithubCopilotApiKey)
            }
            "external_ai_custom_api_key" | "jobsentinel_external_ai_custom_api_key" => {
                Ok(Self::ExternalAiCustomApiKey)
            }
            _ => Err("invalid credential key".to_string()),
        }
    }
}
