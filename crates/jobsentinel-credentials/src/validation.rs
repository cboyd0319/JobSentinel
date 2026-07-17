use super::{CredentialKey, LINKEDIN_CREDENTIAL_STORAGE_DISABLED, MAX_LINKEDIN_COOKIE_LEN};
use jobsentinel_security::{validate_webhook_target, WebhookTarget};

pub(super) fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {
    match key {
        CredentialKey::LinkedInCookie => validate_legacy_linkedin_cookie(value),
        CredentialKey::SlackWebhook => {
            validate_webhook_credential(value, WebhookTarget::Slack, "Slack")
        }
        CredentialKey::DiscordWebhook => {
            validate_webhook_credential(value, WebhookTarget::Discord, "Discord")
        }
        CredentialKey::TeamsWebhook => {
            validate_webhook_credential(value, WebhookTarget::Teams, "Teams")
        }
        CredentialKey::TelegramBotToken => validate_telegram_bot_token_credential(value),
        CredentialKey::ExternalAiOpenAiApiKey
        | CredentialKey::ExternalAiAnthropicApiKey
        | CredentialKey::ExternalAiGoogleApiKey
        | CredentialKey::ExternalAiGithubCopilotApiKey
        | CredentialKey::ExternalAiCustomApiKey => {
            validate_api_key_credential(value, "Outside AI API key")
        }
        _ => Ok(()),
    }
}

pub(super) fn reject_disabled_credential_storage(key: CredentialKey) -> Result<(), String> {
    if is_disabled_credential(key) {
        Err(LINKEDIN_CREDENTIAL_STORAGE_DISABLED.to_string())
    } else {
        Ok(())
    }
}

pub(super) fn is_disabled_credential(key: CredentialKey) -> bool {
    matches!(
        key,
        CredentialKey::LinkedInCookie | CredentialKey::LinkedInCookieExpiry
    )
}

pub(super) fn validate_legacy_linkedin_cookie(value: &str) -> Result<(), String> {
    if value.len() > MAX_LINKEDIN_COOKIE_LEN {
        return Err("Legacy LinkedIn credential is too long".to_string());
    }

    if value.chars().any(|ch| ch.is_ascii_control() || ch == ';') {
        return Err("Legacy LinkedIn credential contains unsupported characters".to_string());
    }

    Ok(())
}

pub(super) fn validate_api_key_credential(value: &str, label: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.len() < 8 || trimmed.len() > 4096 {
        return Err(format!(
            "{label} should be the provider key copied from your account. Leave it blank if you are not ready to use outside AI."
        ));
    }

    if trimmed
        .chars()
        .any(|ch| ch.is_ascii_control() || ch.is_whitespace())
    {
        return Err(format!(
            "{label} should not include spaces, line breaks, or hidden characters."
        ));
    }

    Ok(())
}

pub(super) fn validate_webhook_credential(
    value: &str,
    target: WebhookTarget,
    provider_label: &str,
) -> Result<(), String> {
    let help = format!(
        "Paste the full {provider_label} connection link copied from {provider_label}. If you are not sure, leave it blank and set it up later."
    );
    validate_webhook_target(value, target)
        .map(|_| ())
        .map_err(|_| help)
}

pub(super) fn validate_telegram_bot_token_credential(value: &str) -> Result<(), String> {
    let help =
        "Paste the Telegram bot token copied from BotFather. If you are not sure, leave it blank and set it up later.";
    let Some((bot_id, token_part)) = value.split_once(':') else {
        return Err(help.to_string());
    };

    if token_part.contains(':') {
        return Err(help.to_string());
    }

    if bot_id.is_empty() || !bot_id.chars().all(|ch| ch.is_ascii_digit()) {
        return Err(help.to_string());
    }

    if token_part.len() < 20
        || !token_part
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err(help.to_string());
    }

    Ok(())
}
