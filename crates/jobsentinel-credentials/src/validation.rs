use super::{CredentialKey, LINKEDIN_CREDENTIAL_STORAGE_DISABLED, MAX_LINKEDIN_COOKIE_LEN};

pub(super) fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {
    match key {
        CredentialKey::LinkedInCookie => validate_legacy_linkedin_cookie(value),
        CredentialKey::SlackWebhook => {
            validate_webhook_credential(value, &["hooks.slack.com"], "/services/", "Slack")
        }
        CredentialKey::DiscordWebhook => validate_webhook_credential(
            value,
            &["discord.com", "discordapp.com", "hooks.discord.com"],
            "/api/webhooks/",
            "Discord",
        ),
        CredentialKey::TeamsWebhook => validate_teams_webhook_credential(value),
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
    allowed_hosts: &[&str],
    required_path_prefix: &str,
    provider_label: &str,
) -> Result<(), String> {
    let help = format!(
        "Paste the full {provider_label} connection link copied from {provider_label}. If you are not sure, leave it blank and set it up later."
    );
    let url = url::Url::parse(value).map_err(|_| help.clone())?;

    if url.scheme() != "https" {
        return Err(help);
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(help);
    }

    if let Some(port) = url.port() {
        if port != 443 {
            return Err(help);
        }
    }

    let host = url.host_str().map(str::to_ascii_lowercase);
    if !host.is_some_and(|host| allowed_hosts.contains(&host.as_str())) {
        return Err(help);
    }

    if !url.path().starts_with(required_path_prefix) {
        return Err(help);
    }

    Ok(())
}

pub(super) fn validate_teams_webhook_credential(value: &str) -> Result<(), String> {
    let help =
        "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later."
            .to_string();
    let url = url::Url::parse(value).map_err(|_| help.clone())?;

    if url.scheme() != "https" {
        return Err(help);
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(help);
    }

    if let Some(port) = url.port() {
        if port != 443 {
            return Err(help);
        }
    }

    let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
        return Err(help);
    };
    let path = url.path();
    let has_generated_path = path.len() > 1;

    let legacy_connector = matches!(
        host.as_str(),
        "outlook.office.com" | "outlook.office365.com"
    ) && path.starts_with("/webhook/");
    let current_connector =
        host.ends_with(".webhook.office.com") && host != "webhook.office.com" && has_generated_path;
    let workflow_trigger =
        host.ends_with(".logic.azure.com") && host != "logic.azure.com" && has_generated_path;

    if legacy_connector || current_connector || workflow_trigger {
        Ok(())
    } else {
        Err(help)
    }
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
