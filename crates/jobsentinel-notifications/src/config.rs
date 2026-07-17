use jobsentinel_security::redacted_secret_for_debug;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlertConfig {
    #[serde(default)]
    pub slack: SlackConfig,

    #[serde(default)]
    pub email: EmailConfig,

    #[serde(default)]
    pub discord: DiscordConfig,

    #[serde(default)]
    pub telegram: TelegramConfig,

    #[serde(default)]
    pub teams: TeamsConfig,

    #[serde(default)]
    pub desktop: DesktopConfig,
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct SlackConfig {
    pub enabled: bool,

    /// Webhook URL - stored through `CredentialService`, not serialized.
    #[serde(skip)]
    pub webhook_url: String,
}

impl fmt::Debug for SlackConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("SlackConfig")
            .field("enabled", &self.enabled)
            .field("webhook_url", &redacted_secret_for_debug(&self.webhook_url))
            .finish()
    }
}

/// Email notification configuration
///
/// # Security
///
/// The `smtp_password` field is stored through `CredentialService`, not config.
/// Active secrets live in the local secret vault; the operating system
/// credential store protects the vault key and supports legacy fallback.
///
/// For Gmail, use app-specific passwords rather than your main password.
#[derive(Clone, Serialize, Deserialize, Default)]
pub struct EmailConfig {
    #[serde(default)]
    pub enabled: bool,

    /// SMTP server hostname (e.g., "smtp.gmail.com")
    #[serde(default)]
    pub smtp_server: String,

    /// SMTP port (typically 587 for STARTTLS, 465 for SSL)
    #[serde(default = "default_smtp_port")]
    pub smtp_port: u16,

    /// SMTP username/email
    #[serde(default)]
    pub smtp_username: String,

    /// SMTP password or app-specific password.
    /// Stored through `CredentialService`, not serialized.
    #[serde(skip)]
    pub smtp_password: String,

    /// Email address to send from
    #[serde(default)]
    pub from_email: String,

    /// Email address(es) to send to
    #[serde(default)]
    pub to_emails: Vec<String>,

    /// Use STARTTLS (true for port 587, false for port 465)
    #[serde(default = "default_use_starttls")]
    pub use_starttls: bool,
}

impl fmt::Debug for EmailConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EmailConfig")
            .field("enabled", &self.enabled)
            .field("smtp_server", &self.smtp_server)
            .field("smtp_port", &self.smtp_port)
            .field("smtp_username", &self.smtp_username)
            .field(
                "smtp_password",
                &redacted_secret_for_debug(&self.smtp_password),
            )
            .field("from_email", &self.from_email)
            .field("to_emails", &self.to_emails)
            .field("use_starttls", &self.use_starttls)
            .finish()
    }
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct DiscordConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Discord webhook URL - stored through `CredentialService`, not serialized.
    #[serde(skip)]
    pub webhook_url: String,

    /// Optional: Discord user ID to mention in notifications
    #[serde(default)]
    pub user_id_to_mention: Option<String>,
}

impl fmt::Debug for DiscordConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("DiscordConfig")
            .field("enabled", &self.enabled)
            .field("webhook_url", &redacted_secret_for_debug(&self.webhook_url))
            .field("user_id_to_mention", &self.user_id_to_mention)
            .finish()
    }
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct TelegramConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Telegram Bot API token - stored through `CredentialService`, not serialized.
    #[serde(skip)]
    pub bot_token: String,

    /// Telegram chat ID to send messages to
    #[serde(default)]
    pub chat_id: String,
}

impl fmt::Debug for TelegramConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TelegramConfig")
            .field("enabled", &self.enabled)
            .field("bot_token", &redacted_secret_for_debug(&self.bot_token))
            .field("chat_id", &self.chat_id)
            .finish()
    }
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct TeamsConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Microsoft Teams webhook URL - stored through `CredentialService`, not serialized.
    #[serde(skip)]
    pub webhook_url: String,
}

impl fmt::Debug for TeamsConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TeamsConfig")
            .field("enabled", &self.enabled)
            .field("webhook_url", &redacted_secret_for_debug(&self.webhook_url))
            .finish()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DesktopConfig {
    #[serde(default = "default_desktop_enabled")]
    pub enabled: bool,

    /// Show desktop notifications even if app is focused
    #[serde(default)]
    pub show_when_focused: bool,

    /// Play sound with notifications
    #[serde(default = "default_play_sound")]
    pub play_sound: bool,
}

const fn default_smtp_port() -> u16 {
    587
}

const fn default_use_starttls() -> bool {
    true
}

const fn default_desktop_enabled() -> bool {
    true
}

const fn default_play_sound() -> bool {
    false
}
