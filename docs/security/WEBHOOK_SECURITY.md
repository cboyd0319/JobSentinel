# Webhook Security Guide

> JobSentinel Security Documentation

---

## Overview

JobSentinel supports webhook notifications for Slack, Discord, and Microsoft Teams. Webhook URLs are sensitive
credentials that, if compromised, allow attackers to send spam or steal data. This guide covers webhook security
best practices and JobSentinel's protection mechanisms.

## Why Webhook Security Matters

### Data Exfiltration Risk

If an attacker can control webhook URLs, they can redirect job notifications to their own server:

```text
User configures: https://hooks.slack.com/services/T00/B00/XXX
Attacker changes: https://evil.com/steal-jobs
```

Now all job alerts (which may contain salary data, company info, personal preferences) are sent to the
attacker's server.

### Spam and Abuse

Compromised webhooks allow attackers to:

- Spam channels with unwanted messages
- Impersonate JobSentinel
- Disrupt team communication
- Trigger rate limiting/bans

### Credential Theft

Some webhook URLs contain authentication tokens in the path:

```text
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
                                ^          ^          ^
                              Workspace  Channel    Secret Token
```

If leaked, this token allows anyone to post to that channel.

## JobSentinel Protection Mechanisms

### 1. URL Parsing (Not String Matching)

JobSentinel uses proper URL parsing to validate webhooks, preventing bypass attacks.

See: [URL Validation Security](./URL_VALIDATION.md) for detailed explanation.

#### Slack Webhook Validation

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }

    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!("Invalid Slack webhook path"));
    }

    Ok(())
}
```

**Valid**: `https://hooks.slack.com/services/T00/B00/XXX`  
**Invalid**: All bypass attempts are rejected

#### Discord Webhook Validation

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;
    
    if host != "discord.com" && host != "discordapp.com" {
        return Err(anyhow!("Invalid Discord host"));
    }

    if !url_parsed.path().starts_with("/api/webhooks/") {
        return Err(anyhow!("Invalid Discord webhook path"));
    }

    Ok(())
}
```

**Valid**:

- `https://discord.com/api/webhooks/123/ABC`
- `https://discordapp.com/api/webhooks/123/ABC`

#### Teams Webhook Validation

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;
    
    if host != "outlook.office.com" && host != "outlook.office365.com" {
        return Err(anyhow!("Invalid Teams host"));
    }

    if !url_parsed.path().starts_with("/webhook/") {
        return Err(anyhow!("Invalid Teams webhook path"));
    }

    Ok(())
}
```

**Valid**:

- `https://outlook.office.com/webhook/...`
- `https://outlook.office365.com/webhook/...`

### 2. HTTPS-Only

All webhook URLs must use HTTPS to prevent man-in-the-middle attacks:

```rust
if url_parsed.scheme() != "https" {
    return Err(anyhow!("Webhook URL must use HTTPS"));
}
```

**Why this matters**:

- Prevents eavesdropping on notifications
- Protects webhook tokens in transit
- Required by most webhook providers

### 3. Domain Allowlisting

JobSentinel only allows webhooks to known, trusted domains:

| Service | Allowed Hosts |
|---------|---------------|
| Slack | `hooks.slack.com` |
| Discord | `discord.com`, `discordapp.com` |
| Teams | `outlook.office.com`, `outlook.office365.com` |

**Denylisting doesn't work**:

```rust
// ❌ BAD: Easy to bypass
if !url.contains("evil.com") {
    // Allow
}

// ✅ GOOD: Explicit allowlist
if url_parsed.host_str() == Some("hooks.slack.com") {
    // Allow
}
```

### 4. Path Validation

Beyond domain checking, JobSentinel validates the URL path structure:

```rust
// Slack: Must start with /services/
if !url_parsed.path().starts_with("/services/") {
    return Err(anyhow!("Invalid Slack webhook path"));
}

// Discord: Must start with /api/webhooks/
if !url_parsed.path().starts_with("/api/webhooks/") {
    return Err(anyhow!("Invalid Discord webhook path"));
}

// Teams: Must start with /webhook/
if !url_parsed.path().starts_with("/webhook/") {
    return Err(anyhow!("Invalid Teams webhook path"));
}
```

### 5. Secure Credential Storage

Webhook URLs are stored in the OS keyring, not plaintext config files.

See: [Keyring Integration](./KEYRING.md)

**Benefits**:

- OS-level encryption at rest
- Access control (only JobSentinel can read)
- Automatic logout protection (keyring locks)
- No accidental commits to Git

### 6. Validation Before Use

Webhooks are validated before every HTTP request:

```rust
pub async fn send_slack_notification(
    webhook_url: &str,
    notification: &Notification,
) -> Result<()> {
    // Validate before sending
    validate_webhook_url(webhook_url)?;
    
    // Build payload
    let payload = build_slack_payload(notification);
    
    // Send HTTP request
    let client = reqwest::Client::new();
    let response = client.post(webhook_url)
        .json(&payload)
        .send()
        .await?;
    
    // Check response
    if !response.status().is_success() {
        return Err(anyhow!("Webhook request failed: {}", response.status()));
    }
    
    Ok(())
}
```

## Webhook Provider Security

### Slack

**URL Format**:

```text
https://hooks.slack.com/services/T{workspace}/B{channel}/{token}
```

**Security Features**:

- Token-based authentication in URL
- Tokens are workspace-scoped
- Rate limiting (1 message per second)
- Webhook can be deleted/rotated in Slack UI

**Best Practices**:

- Rotate webhooks regularly
- Use dedicated channels for alerts
- Monitor for unexpected messages
- Delete unused webhooks

### Discord

**URL Format**:

```text
https://discord.com/api/webhooks/{id}/{token}
```

**Security Features**:

- Token-based authentication
- Per-channel webhooks
- Rate limiting (30 requests/60 seconds)
- Can be deleted in Discord UI

**Best Practices**:

- One webhook per integration
- Use dedicated channels
- Enable 2FA on Discord account
- Delete compromised webhooks immediately

### Microsoft Teams

**URL Format**:

```text
https://outlook.office.com/webhook/{tenant}/IncomingWebhook/{channel}/{connector}
```

**Security Features**:

- Tenant and channel scoped
- Azure AD authentication
- Rate limiting
- Can be managed via Teams admin

**Best Practices**:

- Review webhook list regularly
- Use team channels, not personal
- Enable conditional access policies
- Audit webhook usage logs

## Attack Scenarios and Mitigations

### Scenario 1: URL Manipulation

**Attack**: User manually edits config file to change webhook URL.

```json
{
  "alerts": {
    "slack": {
      "enabled": true,
      "webhook_url": "https://evil.com/steal"
    }
  }
}
```

**Mitigation**:

1. Webhooks stored in keyring (v2.0+), not config file
2. URL validation on load and before use
3. Error shown to user if validation fails

### Scenario 2: Query Parameter Bypass

**Attack**: Attacker tries to bypass validation with query parameters.

```text
https://evil.com/steal?url=https://hooks.slack.com/services/T/B/X
```

**Mitigation**:

- URL parsing extracts host as `evil.com`
- Validation rejects: host is not `hooks.slack.com`
- Query parameters are irrelevant to validation

### Scenario 3: Subdomain Hijacking

**Attack**: Attacker uses a look-alike subdomain.

```text
https://hooks.slack.com.evil.com/services/T/B/X
```

**Mitigation**:

- URL parser extracts full host: `hooks.slack.com.evil.com`
- Exact comparison fails: `hooks.slack.com.evil.com` != `hooks.slack.com`
- Request is rejected

### Scenario 4: Credential Theft from Config

**Attack**: Attacker gains file system access, reads webhook URLs from config.

**Mitigation**:

1. **v2.0+**: Webhooks stored in OS keyring (encrypted)
2. Requires user authentication to access keyring
3. No plaintext webhooks in config file
4. Even with file access, attacker cannot read webhooks

### Scenario 5: Man-in-the-Middle (MITM)

**Attack**: Attacker intercepts HTTP traffic to steal webhook tokens.

**Mitigation**:

1. HTTPS required (TLS encryption)
2. Webhook URLs must start with `https://`
3. Rust's `rustls` provides strong TLS
4. No HTTP fallback

### Scenario 6: Phishing for Webhooks

**Attack**: Attacker social engineers user to share webhook URL.

**Mitigation** (User Education):

1. Treat webhooks as passwords
2. Never share in public channels
3. Rotate if compromised
4. Use read-only channels when possible

## User Best Practices

### 1. Protect Webhook URLs Like Passwords

```text
❌ Don't share in Slack/Discord/Teams
❌ Don't commit to Git repositories
❌ Don't post in public forums
✅ Store in JobSentinel (keyring)
✅ Rotate if compromised
✅ Delete unused webhooks
```

### 2. Use Dedicated Channels

```text
✅ Create #jobsentinel-alerts channel
✅ Limit channel membership
✅ Monitor for unexpected messages
❌ Don't use general/busy channels
```

### 3. Monitor Webhook Activity

**Slack**: Check workspace audit logs  
**Discord**: Review channel message history  
**Teams**: Check Teams admin center logs

### 4. Rotate Webhooks Regularly

```text
1. Create new webhook in service UI
2. Update webhook URL in JobSentinel
3. Test notification
4. Delete old webhook
```

### 5. Enable Two-Factor Authentication

- Slack: Settings → Two-Factor Authentication
- Discord: User Settings → Enable 2FA
- Teams: Azure AD → Security Defaults

## Testing Webhook Security

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_slack_webhook() {
        let url = "https://hooks.slack.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_ok());
    }

    #[test]
    fn test_rejects_http() {
        let url = "http://hooks.slack.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_err());
    }

    #[test]
    fn test_rejects_wrong_domain() {
        let url = "https://evil.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_err());
    }

    #[test]
    fn test_rejects_subdomain_bypass() {
        let url = "https://hooks.slack.com.evil.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_err());
    }

    #[test]
    fn test_rejects_query_bypass() {
        let url = "https://evil.com?url=https://hooks.slack.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_err());
    }

    #[test]
    fn test_rejects_wrong_path() {
        let url = "https://hooks.slack.com/api/webhook";
        assert!(validate_webhook_url(url).is_err());
    }
}
```

### Manual Testing

1. **Valid webhook**: Configure and send test notification
2. **Invalid domain**: Try `https://evil.com/hook` → Should error
3. **HTTP**: Try `http://hooks.slack.com/...` → Should error
4. **Wrong path**: Try `https://hooks.slack.com/api/...` → Should error
5. **Subdomain trick**: Try `https://hooks.slack.com.evil.com/...` → Should error

## Incident Response

### If Webhook is Compromised

1. **Immediately delete** the webhook in the service UI
2. **Create a new webhook** with a different URL
3. **Update JobSentinel** with the new webhook
4. **Test** to ensure notifications work
5. **Review** recent messages for unauthorized activity
6. **Rotate** any other credentials if needed
7. **Document** the incident

### If Spam is Sent

1. Delete the compromised webhook
2. Report to channel members
3. Clear spam messages
4. Create new webhook with new URL
5. Consider restricting channel access

## Related Documentation

- [URL Validation Security](./URL_VALIDATION.md)
- [Keyring Integration](./KEYRING.md)
- [Security Policy](../../SECURITY.md)
- [Notifications Setup](../features/notifications.md)

## References

- [Slack Webhooks Security](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)
- [Teams Webhooks](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

**Last Updated**: 2026-01-24  
**Version**: 2.5.3  
**Security Level**: Production Ready
