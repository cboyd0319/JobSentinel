# URL Validation Security

> JobSentinel Security Documentation

---

## Overview

Proper URL validation is critical for preventing security vulnerabilities. JobSentinel uses **URL parsing**
instead of **string prefix matching** to validate webhook URLs and prevent data exfiltration attacks.

## The Problem: String Prefix Matching

### Insecure Approach ❌

```rust
// INSECURE: String prefix check can be bypassed
fn validate_webhook_url(url: &str) -> Result<()> {
    if url.starts_with("https://hooks.slack.com/services/") {
        Ok(())
    } else {
        Err(anyhow!("Invalid Slack webhook URL"))
    }
}
```

### Why This Is Dangerous

An attacker can bypass this validation using several techniques:

#### 1. Query Parameter Bypass

```text
https://evil.com/steal?redirect=https://hooks.slack.com/services/T00/B00/XXX
```

- **Check**: ✅ Passes (contains the expected prefix)
- **Reality**: ❌ Sends data to `evil.com`, not Slack

#### 2. Fragment Bypass

```text
https://attacker.com/webhook#https://hooks.slack.com/services/T00/B00/XXX
```

- **Check**: ✅ Passes
- **Reality**: ❌ Data sent to `attacker.com`

#### 3. URL-Encoded Bypass

```text
https://evil.com/https%3A%2F%2Fhooks.slack.com%2Fservices%2F
```

- **Check**: ✅ Passes (after decoding)
- **Reality**: ❌ Sends data to `evil.com`

#### 4. Subdomain Bypass

```text
https://hooks.slack.com.evil.com/webhook
```

- **Check**: ✅ Passes (contains "hooks.slack.com")
- **Reality**: ❌ Host is `evil.com`, not `slack.com`

## The Solution: Proper URL Parsing

### Secure Approach ✅

```rust
use url::Url;
use anyhow::{anyhow, Result};

fn validate_webhook_url(url: &str) -> Result<()> {
    // 1. Parse URL first
    let url_parsed = Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;
    
    // 2. Validate scheme
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }
    
    // 3. Validate host (exact match)
    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }
    
    // 4. Validate path
    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!("Invalid Slack webhook path"));
    }
    
    Ok(())
}
```

### Why This Is Secure

The `url::Url` parser correctly identifies URL components:

```text
https://hooks.slack.com:443/services/T00/B00/XXX?foo=bar#baz
^      ^                ^   ^                       ^       ^
|      |                |   |                       |       |
scheme host            port path                  query  fragment
```

Now all bypass attempts fail:

```rust
// ❌ Query parameter bypass - FAILS
validate_webhook_url("https://evil.com?redirect=https://hooks.slack.com/services/T00/B00/XXX")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "evil.com"

// ❌ Fragment bypass - FAILS
validate_webhook_url("https://attacker.com/webhook#https://hooks.slack.com/services/T00/B00/XXX")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "attacker.com"

// ❌ Subdomain bypass - FAILS
validate_webhook_url("https://hooks.slack.com.evil.com/webhook")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "hooks.slack.com.evil.com"
```

## Implementation in JobSentinel

### Slack Webhooks

**File**: `src-tauri/src/core/notify/slack.rs`

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

**File**: `src-tauri/src/core/notify/discord.rs`

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;
    
    if host != "discord.com" && host != "discordapp.com" {
        return Err(anyhow!(
            "Webhook URL must use discord.com or discordapp.com domain"
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
```

### Microsoft Teams Webhooks

**File**: `src-tauri/src/core/notify/teams.rs`

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let url_parsed = url::Url::parse(url)
        .map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    let host = url_parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;
    
    if host != "outlook.office.com" && host != "outlook.office365.com" {
        return Err(anyhow!(
            "Webhook URL must use outlook.office.com or outlook.office365.com domain"
        ));
    }

    if !url_parsed.path().starts_with("/webhook/") {
        return Err(anyhow!("Invalid Teams webhook path"));
    }

    Ok(())
}
```

**Valid URLs**:

```text
https://outlook.office.com/webhook/...
https://outlook.office365.com/webhook/...
```

## Validation Rules

### 1. Always parse URLs first

```rust
// ❌ WRONG: String manipulation before parsing
if url.contains("@") || url.contains("..") {
    return Err(anyhow!("Invalid URL"));
}
let parsed = Url::parse(url)?; // Too late!

// ✅ CORRECT: Parse first, then validate
let parsed = Url::parse(url)?;
if parsed.username() != "" || parsed.password().is_some() {
    return Err(anyhow!("URL must not contain credentials"));
}
```

### 2. Validate scheme (protocol)

```rust
// Require HTTPS for webhooks
if url_parsed.scheme() != "https" {
    return Err(anyhow!("Must use HTTPS"));
}
```

### 3. Validate host (exact match)

```rust
// Use exact comparison, not contains()
if url_parsed.host_str() != Some("hooks.slack.com") {
    return Err(anyhow!("Invalid host"));
}

// For multiple valid hosts, use a list
const VALID_HOSTS: &[&str] = &["discord.com", "discordapp.com"];
if !VALID_HOSTS.contains(&url_parsed.host_str().unwrap_or("")) {
    return Err(anyhow!("Invalid host"));
}
```

### 4. Validate path

```rust
// Check path structure
if !url_parsed.path().starts_with("/services/") {
    return Err(anyhow!("Invalid path"));
}

// Additional path validation
if url_parsed.path().contains("..") {
    return Err(anyhow!("Path traversal detected"));
}
```

### 5. Reject credentials in URLs

```rust
// Webhooks should never have embedded credentials
if url_parsed.username() != "" || url_parsed.password().is_some() {
    return Err(anyhow!("URL must not contain credentials"));
}
```

### 6. Validate port (optional)

```rust
// Enforce standard HTTPS port or allow no port specified
match url_parsed.port() {
    None | Some(443) => Ok(()), // Default HTTPS or explicit 443
    Some(port) => Err(anyhow!("Invalid port: {}", port))
}
```

## Common Pitfalls

### Pitfall 1: Case Sensitivity

```rust
// ❌ Case-sensitive comparison
if url_parsed.host_str() == Some("Discord.com") {  // Won't match "discord.com"
    // ...
}

// ✅ Case-insensitive comparison
if url_parsed.host_str().map(|h| h.to_lowercase()) == Some("discord.com".to_string()) {
    // ...
}

// ✅ Or better: Use url crate's domain normalization
// The url crate normalizes domains to lowercase automatically
if url_parsed.host_str() == Some("discord.com") {
    // Works for "Discord.com", "DISCORD.COM", etc.
}
```

### Pitfall 2: Forgetting Subdomains

```rust
// ❌ Allows any subdomain
if url_parsed.host_str().unwrap_or("").ends_with("slack.com") {
    // Matches "evil.slack.com", "hooks.slack.com.attacker.com"
}

// ✅ Exact match or explicit subdomain list
if url_parsed.host_str() == Some("hooks.slack.com") {
    // Only matches "hooks.slack.com"
}
```

### Pitfall 3: Ignoring Query Parameters

```rust
// Query parameters are usually benign for webhooks, but validate if needed
if url_parsed.query().is_some() {
    // Decide: reject, warn, or allow
}
```

## Testing URL Validation

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
    fn test_rejects_wrong_scheme() {
        let url = "http://hooks.slack.com/services/T00/B00/XXX";
        assert!(validate_webhook_url(url).is_err());
    }

    #[test]
    fn test_rejects_wrong_host() {
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
        let url = "https://hooks.slack.com/api/v1/webhook";
        assert!(validate_webhook_url(url).is_err());
    }
}
```

### Attack Simulation

Test with realistic attack vectors:

```rust
#[test]
fn test_attack_vectors() {
    let attack_urls = vec![
        // Data exfiltration attempts
        "https://evil.com/steal?next=https://hooks.slack.com/services/T/B/X",
        "https://attacker.com#https://hooks.slack.com/services/T/B/X",
        
        // Subdomain tricks
        "https://hooks.slack.com.attacker.com/services/T/B/X",
        "https://fakehooks.slack.com/services/T/B/X",
        
        // Encoding tricks
        "https://evil.com/https%3A%2F%2Fhooks.slack.com%2Fservices%2F",
        
        // Credentials in URL
        "https://user:pass@hooks.slack.com/services/T/B/X",
        
        // Path traversal
        "https://hooks.slack.com/services/../admin/T/B/X",
        
        // Port tricks
        "https://hooks.slack.com:8080/services/T/B/X",
        
        // Non-HTTPS
        "http://hooks.slack.com/services/T/B/X",
        "ftp://hooks.slack.com/services/T/B/X",
    ];

    for url in attack_urls {
        assert!(
            validate_webhook_url(url).is_err(),
            "Failed to reject malicious URL: {}",
            url
        );
    }
}
```

## Additional URL Security

### Preventing Open Redirects

```rust
// When redirecting users, validate the destination
fn validate_redirect_url(url: &str, allowed_hosts: &[&str]) -> Result<()> {
    let parsed = Url::parse(url)?;
    
    let host = parsed.host_str()
        .ok_or_else(|| anyhow!("Invalid host"))?;
    
    if !allowed_hosts.contains(&host) {
        return Err(anyhow!("Redirect to external site not allowed"));
    }
    
    Ok(())
}
```

### Preventing SSRF (Server-Side Request Forgery)

```rust
// When making HTTP requests based on user input
fn validate_external_url(url: &str) -> Result<()> {
    let parsed = Url::parse(url)?;
    
    // Reject internal/private IPs
    if let Some(host) = parsed.host() {
        match host {
            url::Host::Ipv4(ip) => {
                if ip.is_loopback() || ip.is_private() {
                    return Err(anyhow!("Cannot access internal resources"));
                }
            }
            url::Host::Ipv6(ip) => {
                if ip.is_loopback() {
                    return Err(anyhow!("Cannot access internal resources"));
                }
            }
            url::Host::Domain(domain) => {
                if domain == "localhost" || domain.ends_with(".local") {
                    return Err(anyhow!("Cannot access local resources"));
                }
            }
        }
    }
    
    Ok(())
}
```

## Best Practices

### 1. Use the `url` crate

```toml
[dependencies]
url = "2.5"  # Current version in JobSentinel
```

### 2. Parse early, validate thoroughly

```rust
// Parse URL as first step
let url = Url::parse(user_input)?;

// Then validate all components
validate_scheme(&url)?;
validate_host(&url)?;
validate_path(&url)?;
validate_security(&url)?;
```

### 3. Use allowlists, not denylists

```rust
// ✅ GOOD: Explicit allowlist
const ALLOWED_HOSTS: &[&str] = &["hooks.slack.com"];

// ❌ BAD: Denylist (easily bypassed)
const BLOCKED_HOSTS: &[&str] = &["evil.com", "attacker.com"];
```

### 4. Log validation failures

```rust
fn validate_webhook_url(url: &str) -> Result<()> {
    let parsed = Url::parse(url).map_err(|e| {
        tracing::warn!("Invalid webhook URL: {} - {}", url, e);
        anyhow!("Invalid URL format: {}", e)
    })?;
    
    // ... rest of validation
}
```

## Related Documentation

- [Webhook Security Guide](./WEBHOOK_SECURITY.md)
- [Security Policy](../../SECURITY.md)
- [Security Documentation Index](./README.md)

## References

- [OWASP URL Validation](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986)
- [Rust `url` crate documentation](https://docs.rs/url/)

---

**Last Updated**: 2026-01-25
**Version**: 2.6.3
**Security Level**: Production Ready
