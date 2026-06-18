# URL Validation Security

> JobSentinel Security Documentation

---

## Overview

Proper URL validation is critical for preventing security vulnerabilities. JobSentinel uses **URL parsing**
instead of **string prefix matching** to validate webhook URLs, browser-open destinations, and user-supplied
job import URLs.

## The Problem: String Prefix Matching

### Insecure Approach

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

- **Naive check**: passes because the URL contains the expected prefix
- **Actual destination**: `evil.com`, not Slack

#### 2. Fragment Bypass

```text
https://attacker.com/webhook#https://hooks.slack.com/services/T00/B00/XXX
```

- **Naive check**: passes
- **Actual destination**: `attacker.com`

#### 3. URL-Encoded Bypass

```text
https://evil.com/https%3A%2F%2Fhooks.slack.com%2Fservices%2F
```

- **Naive check**: passes after decoding
- **Actual destination**: `evil.com`

#### 4. Subdomain Bypass

```text
https://hooks.slack.com.evil.com/webhook
```

- **Naive check**: passes because the string contains `hooks.slack.com`
- **Actual host**: `hooks.slack.com.evil.com`, not `hooks.slack.com`

## The Solution: Proper URL Parsing

### Secure Approach

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

    // 3. Reject embedded credentials and non-default HTTPS ports
    if url_parsed.username() != "" || url_parsed.password().is_some() {
        return Err(anyhow!("Webhook URL must not include credentials"));
    }
    if matches!(url_parsed.port(), Some(port) if port != 443) {
        return Err(anyhow!("Webhook URL must use the default HTTPS port"));
    }

    // 4. Validate host (exact match)
    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }

    // 5. Validate path
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
// Query parameter bypass fails
validate_webhook_url("https://evil.com?redirect=https://hooks.slack.com/services/T00/B00/XXX")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "evil.com"

// Fragment bypass fails
validate_webhook_url("https://attacker.com/webhook#https://hooks.slack.com/services/T00/B00/XXX")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "attacker.com"

// Subdomain bypass fails
validate_webhook_url("https://hooks.slack.com.evil.com/webhook")
// Error: "Webhook URL must use hooks.slack.com domain"
// Host is correctly identified as "hooks.slack.com.evil.com"
```

## Implementation in JobSentinel

### External Job URLs And Imports

**File**: `src-tauri/src/core/url_security.rs`

`validate_external_http_url` is the shared backend guard for user-controlled external URLs.
It is used by:

- `src-tauri/src/core/db/crud.rs` before a job link is stored in SQLite.
- `src-tauri/src/commands/automation.rs` before Application Assist opens a
  visible review browser and loads local profile data.
- `src-tauri/src/commands/deeplinks.rs` before opening a job URL in the user's browser.
- `src-tauri/src/core/import/fetcher.rs` before fetching a user-supplied job page.
- `src-tauri/src/core/scrapers/http_client.rs` before shared scraper HTTP
  retry helpers fetch a source URL.
- `src-tauri/src/core/config/validation.rs`, `src-tauri/src/core/scrapers/jobswithgpt.rs`,
  and `src-tauri/src/core/health/smoke_tests.rs` before using a configured JobsWithGPT endpoint.

Saved jobs now use this shared guard instead of a string prefix check, so
stored job links cannot target localhost, private networks, embedded
credentials, or non-HTTP schemes. Application Assist also validates the job link
before loading profile data or creating a browser page.

Job import commands canonicalize the pasted URL before preview, fetch, duplicate
hashing, and storage. Canonicalization removes embedded credentials, fragments,
tracking parameters, and sensitive query parameters such as tokens, sessions,
auth values, email fields, passwords, and candidate identifiers while preserving
public job identifiers such as `gh_jid`.

The frontend guard in `src/utils/urlValidation.ts` mirrors these external job
URL rules before calling the backend open command.

The import fetcher does not follow HTTP redirects. A redirect can move from a
validated public URL to a different host or private-network target, so the user
must paste the final public job posting URL directly.

Shared scraper fetch helpers resolve production URLs before sending requests,
reject localhost and non-public resolved IPs, and pin the checked DNS answers on
reqwest clients when the target is a domain. Custom scraper clients, such as API
clients with credential headers, must use the resolved-target retry helper after
applying the DNS override to their client builder. Retry closures are checked so
they cannot switch the scheme, host, port, or path after validation. Local
WireMock servers are reachable only through test-only helper code.

**Rules**:

- Parse with `url::Url` before checking components.
- Allow only `http` and `https`.
- Require a host.
- Reject embedded username or password credentials.
- Reject `localhost` and `*.localhost`.
- Reject loopback, private, link-local, shared-address, unspecified, multicast, and IPv4-mapped private IPs.

Frontend code calls `openDeepLink()` through Tauri IPC instead of importing
`@tauri-apps/plugin-shell` directly or falling back to `window.open()`. The
default Tauri capability does not grant frontend `shell:allow-open`; browser-open
requests must pass the backend URL guard.

The Tauri renderer Content Security Policy keeps `connect-src 'self'`. External
network activity, such as job-source checks or notification delivery, belongs in
validated Rust IPC paths instead of direct renderer `fetch()` calls. The security
sensor fails if known external job-source or webhook hosts are added back to the
renderer CSP.

### Slack Webhooks

**File**: `src-tauri/src/core/notify/slack.rs`

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

**File**: `src-tauri/src/core/notify/discord.rs`

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

    validate_webhook_url_security_parts(&url_parsed)?;

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
// Wrong: string manipulation before parsing
if url.contains("@") || url.contains("..") {
    return Err(anyhow!("Invalid URL"));
}
let parsed = Url::parse(url)?; // Too late!

// Correct: parse first, then validate
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
// Case-sensitive comparison
if url_parsed.host_str() == Some("Discord.com") {  // Won't match "discord.com"
    // ...
}

// Case-insensitive comparison
if url_parsed.host_str().map(|h| h.to_lowercase()) == Some("discord.com".to_string()) {
    // ...
}

// Better: use url crate's domain normalization
// The url crate normalizes domains to lowercase automatically
if url_parsed.host_str() == Some("discord.com") {
    // Works for "Discord.com", "DISCORD.COM", etc.
}
```

### Pitfall 2: Forgetting Subdomains

```rust
// Allows any subdomain
if url_parsed.host_str().unwrap_or("").ends_with("slack.com") {
    // Matches "evil.slack.com", "hooks.slack.com.attacker.com"
}

// Exact match or explicit subdomain list
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

In JobSentinel, use `crate::core::url_security::validate_external_http_url` for
deterministic validation and `resolve_external_http_url_for_fetch` or
`resolve_external_https_url_for_fetch` before backend fetches. Do not create
one-off SSRF checks. Add unit tests for malicious input when touching URL, file
path, command, or HTML input boundaries.

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
// Good: explicit allowlist
const ALLOWED_HOSTS: &[&str] = &["hooks.slack.com"];

// Bad: denylist, easily bypassed
const BLOCKED_HOSTS: &[&str] = &["evil.com", "attacker.com"];
```

### 4. Log sanitized validation failures

```rust
fn sanitized_url_label(url: &str) -> String {
    let Ok(mut parsed) = Url::parse(url) else {
        return "<invalid-url>".to_string();
    };
    let _ = parsed.set_username("");
    let _ = parsed.set_password(None);
    parsed.set_query(None);
    parsed.set_fragment(None);
    parsed.to_string()
}

fn validate_webhook_url(url: &str) -> Result<()> {
    let parsed = Url::parse(url).map_err(|e| {
        tracing::warn!("Invalid webhook URL: {} - {}", sanitized_url_label(url), e);
        anyhow!("Invalid URL format: {}", e)
    })?;

    // ... rest of validation
}
```

Do not log or display raw user-supplied URLs. Strip credentials, query strings,
and fragments before logging or returning validation errors because job URLs,
company-board URLs, and webhooks can carry tokens or private search context.

## Related Documentation

- [Webhook Security Guide](./WEBHOOK_SECURITY.md)
- [Security Policy](../../SECURITY.md)
- [Security Documentation Index](./README.md)

## References

- [OWASP URL Validation](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986)
- [Rust `url` crate documentation](https://docs.rs/url/)
