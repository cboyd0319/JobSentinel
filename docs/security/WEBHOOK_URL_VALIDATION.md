# Notification Webhook URL Validation

This guide owns provider-specific webhook host and path validation. See
[URL Validation Security](URL_VALIDATION.md) for the shared parsing, external
URL, redirect, and server-side request forgery boundaries.

## Provider Validation

### Slack Webhooks

**File**: `crates/jobsentinel-notifications/src/slack.rs`

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }

    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!("Invalid Slack webhook path"));
    }

    Ok(())
}
```

**Valid URLs**:

```text
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**Invalid URLs**:

```text
http://hooks.slack.com/services/...       (not HTTPS)
https://evil.com/hooks.slack.com/...      (wrong host)
https://hooks.slack.com/other/...         (wrong path)
```

### Discord Webhooks

**File**: `crates/jobsentinel-notifications/src/discord.rs`

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;

    if !matches!(host, "discord.com" | "discordapp.com" | "hooks.discord.com") {
        return Err(anyhow!(
            "Webhook URL must use a supported Discord webhook domain"
        ));
    }

    if !url_parsed.path().starts_with("/api/webhooks/") {
        return Err(anyhow!("Invalid Discord webhook path"));
    }

    Ok(())
}
```

**Valid URLs**:

```text
https://discord.com/api/webhooks/123456789/ABCDEFG
https://discordapp.com/api/webhooks/123456789/ABCDEFG
https://hooks.discord.com/api/webhooks/123456789/ABCDEFG
```

### Microsoft Teams Webhooks

**File**: `crates/jobsentinel-notifications/src/teams.rs`

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;

    let legacy_connector =
        matches!(host, "outlook.office.com" | "outlook.office365.com")
            && url_parsed.path().starts_with("/webhook/");
    let current_connector = host.ends_with(".webhook.office.com")
        && host != "webhook.office.com"
        && url_parsed.path().len() > 1;
    let workflow_trigger = host.ends_with(".logic.azure.com")
        && host != "logic.azure.com"
        && url_parsed.path().len() > 1;

    if !(legacy_connector || current_connector || workflow_trigger) {
        return Err(anyhow!("Invalid Teams webhook path"));
    }

    Ok(())
}
```

**Valid URLs**:

```text
https://outlook.office.com/webhook/...
https://outlook.office365.com/webhook/...
https://tenant.webhook.office.com/...
https://prod-12.westus.logic.azure.com:443/...
```
