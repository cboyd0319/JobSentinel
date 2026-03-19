# Job Board Scrapers

## Support for 13 job sources with parallel scraping

> **Status:** ACTIVE (v2.1.0+)
> **Supported Scrapers:** 13 sources
> **Last Updated:** 2026-03-18
> **Version:** 2.6.4
> **Architecture:** Parallel scraping with intelligent rate limiting, health monitoring, and deduplication

**Note:** JobSentinel includes production-ready scrapers for 13 major job boards. All scrapers
implement intelligent rate limiting, automatic deduplication via SHA-256 hashing, and robust
error handling.

---

## Overview

JobSentinel integrates with 13 major job boards to maximize job coverage and find opportunities
faster. Our parallel scraping architecture enables simultaneous searches across multiple sources.

### Supported Scrapers (v2.6.3+)

| Scraper             | Job Count  | Authentication | Status            |
| ------------------- | ---------- | -------------- | ----------------- |
| **LinkedIn**        | 30M+       | Session cookie | ✅ Production     |
| **Greenhouse**      | ~500K      | Official API   | ✅ Production     |
| **Lever**           | ~200K      | Official API   | ✅ Production     |
| **RemoteOK**        | ~100K      | Public         | ✅ Production     |
| **WeWorkRemotely**  | ~50K       | Public         | ✅ Production     |
| **BuiltIn**         | ~80K       | Public         | ✅ Production     |
| **HN Who's Hiring** | ~500/month | Public         | ✅ Production     |
| **JobsWithGPT**     | ~50K       | MCP Server     | ✅ Production     |
| **Dice**            | ~50K       | Public         | ✅ Production     |
| **YC Startup Jobs** | ~10K       | Public         | ✅ Production     |
| **USAJobs**         | ~50K       | API key (free) | ✅ Production     |
| **SimplyHired**     | ~5M        | None (RSS)     | ⚠️ May be blocked |
| **Glassdoor**       | ~1M+       | Public         | ✅ Production     |

### Key Features (v1.5.0)

- **🔹 Multi-Source Integration** - 13 scrapers with parallel execution
- **🟢 Automatic Rate Limiting** - Token bucket algorithm prevents IP bans
- **⏱️ Intelligent Retry Logic** - Automatic retries with exponential backoff
- **📊 Deduplication** - SHA-256 hashing prevents duplicate jobs across sources
- **🚀 Parallel Scraping** - Concurrent requests to multiple boards

---

## 🏗️ Architecture

### Component Diagram

```text
┌─────────────────────────────────────────────────────┐
│              Job Scraper Registry                   │
│  ┌─────────┐  ┌─────────┐  ┌────────┐ ┌──────────┐│
│  │Greenhouse│  │  Lever  │  │LinkedIn│ │Glassdoor ││
│  └────┬────┘  └────┬────┘  └───┬────┘ └────┬─────┘│
│       └───────────┬────────────┴──────────┬─┘      │
│                   ▼                        ▼        │
│            ┌──────────────┐        ┌──────────────┐│
│            │ Rate Limiter │        │ HTTP Client  ││
│            └──────────────┘        └──────────────┘│
└─────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Job Database   │
              │  (Deduplicated) │
              └─────────────────┘
```

### Scraper Details by Category

#### Major general job boards

| Feature            | LinkedIn       |
| ------------------ | -------------- |
| **Authentication** | Session cookie |
| **Rate Limit**     | 100/hour       |
| **Job Count**      | 30M+           |
| **API**            | Unofficial     |
| **CAPTCHA Risk**   | High           |

#### ATS Integration Platforms

| Feature            | Greenhouse | Lever     |
| ------------------ | ---------- | --------- |
| **Authentication** | None       | None      |
| **Rate Limit**     | 1000/hour  | 1000/hour |
| **Job Count**      | ~500K      | ~200K     |
| **API**            | Official   | Official  |
| **CAPTCHA Risk**   | Low        | Low       |

#### Remote-first boards

| Feature            | RemoteOK | WeWorkRemotely |
| ------------------ | -------- | -------------- |
| **Authentication** | None     | None           |
| **Job Count**      | ~100K    | ~50K           |
| **API**            | Public   | Public         |
| **CAPTCHA Risk**   | Low      | Low            |

#### Niche & Specialized

| Feature       | BuiltIn        | HN Who's Hiring | Dice     | JobsWithGPT | YC Jobs  |
| ------------- | -------------- | --------------- | -------- | ----------- | -------- |
| **Focus**     | Tech companies | Tech community  | IT roles | AI-matched  | Startups |
| **Job Count** | ~80K           | ~500/month      | ~50K     | ~50K        | ~10K     |
| **API**       | Public         | HTML            | Public   | MCP         | Public   |

---

## 🔹 LinkedIn Scraper

### Setup Instructions (v2.5.3+)

**One-Click Connect — No Technical Knowledge Required!**

1. Go to **Settings** → **Job Sources** → Enable **LinkedIn**
2. Click **"Connect LinkedIn"**
3. Log in normally in the window that opens (username, password, 2FA if needed)
4. Done! The cookie is extracted automatically and stored securely

That's it. No DevTools. No copy-paste. No technical steps.

#### How It Works (Technical Details)

On macOS, JobSentinel uses native WebKit integration to extract the `li_at` session cookie
directly from the system cookie store:

```rust
// Native macOS cookie extraction via objc2
use objc2_web_kit::WKWebsiteDataStore;
use objc2_foundation::NSHTTPCookie;

let data_store = WKWebsiteDataStore::defaultDataStore();
let cookie_store = data_store.httpCookieStore();
cookie_store.getAllCookies(&block);
```

The cookie is stored securely in your OS keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service).

#### Platform Support

| Platform    | Auto-Connect    | Manual Fallback |
| ----------- | --------------- | --------------- |
| **macOS**   | ✅ Full support | Available       |
| **Windows** | ⏳ Coming soon  | ✅ Available    |
| **Linux**   | ⏳ Coming soon  | ✅ Available    |

#### Config (Search Parameters)

After connecting, configure your search in Settings:

```json
{
  "linkedin": {
    "enabled": true,
    "query": "software engineer",
    "location": "San Francisco Bay Area",
    "remote_only": false,
    "limit": 50
  }
}
```

Note: The `session_cookie` is stored in the OS keychain, NOT in config.json.

### How It Works

1. **Authentication:** Uses your session cookie (`li_at`) for authenticated requests
2. **API-First Approach:** Tries LinkedIn's internal Voyager API first
3. **HTML Fallback:** Falls back to HTML scraping if API fails
4. **Rate Limiting:** Automatic 2-5 second delays between requests
5. **Deduplication:** SHA-256 hash of (title + company + URL)

### API endpoint

```text
GET https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards
?decorationId=com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-178
&count=50
&keywords=software+engineer
&location=San+Francisco+Bay+Area
&start=0

Headers:
- Cookie: li_at=YOUR_SESSION_COOKIE
- csrf-token: YOUR_SESSION_COOKIE
- User-Agent: Mozilla/5.0 ...
```

The scraper uses automatic version fallback for the `decorationId` parameter. It tries versions
178, 176, 174, 172, 170, 168, and 166 in sequence until one succeeds. This handles LinkedIn API
version changes without requiring a code update.

### Security & Privacy

- ✅ **Your Cookie Only:** No credentials stored, uses your own session
- ✅ **Respectful Scraping:** 2-5 second delays, max 100 req/hour
- ✅ **Browser User-Agent:** Mimics real Chrome browser
- ⚠️ **User Responsibility:** Must comply with LinkedIn Terms of Service
- ⚠️ **Session Expiry:** Cookie expires after ~90 days, requires refresh

### Limitations

- **Session Expiry:** Cookie expires after ~365 days, requires re-login
- **Rate Limits:** 100 requests/hour to avoid detection
- **CAPTCHA:** May trigger CAPTCHA if too aggressive

### ✅ Implemented: In-App Login (v2.5.3)

**No manual cookie extraction required!** JobSentinel v2.5.3 introduced native in-app login:

- Opens a native WebView window with LinkedIn login
- User logs in normally (username, password, 2FA)
- Cookie extracted automatically via native macOS `WKHTTPCookieStore` API
- Stored securely in OS keychain

**Benefits:**

- Zero technical knowledge required
- No DevTools or copy-paste
- Secure OS-level credential storage
- Works with 2FA/MFA

**Platform Status:**

- ✅ macOS: Full automatic extraction
- ⏳ Windows: Manual fallback (WebView2 integration planned)
- ⏳ Linux: Manual fallback (WebKitGTK integration planned)

---

## ⏱️ Rate Limiting

### Token Bucket Algorithm

Prevents IP bans by limiting requests per hour:

```rust
use jobsentinel::core::scrapers::rate_limiter::{RateLimiter, limits};

let limiter = RateLimiter::new();

// Wait until request is allowed
limiter.wait("linkedin", limits::LINKEDIN).await;     // 100/hour
limiter.wait("greenhouse", limits::GREENHOUSE).await; // 1000/hour
limiter.wait("usajobs", limits::USAJOBS).await;       // 60/hour
```

### How It Works

1. **Token Bucket:** Each scraper has a bucket of tokens
2. **Request Consumes Token:** Each scrape uses 1 token
3. **Refill Over Time:** Tokens refill at constant rate
4. **Wait When Empty:** Automatically waits for next token

### Rate Limits (v1.5.0)

| Scraper             | Requests/Hour | Tokens/Second | Reasoning                      |
| ------------------- | ------------- | ------------- | ------------------------------ |
| **LinkedIn**        | 100           | 0.028         | Conservative (avoid detection) |
| **Greenhouse**      | 1000          | 0.278         | Official API                   |
| **Lever**           | 1000          | 0.278         | Official API                   |
| **RemoteOK**        | 1000          | 0.278         | Public API                     |
| **WeWorkRemotely**  | 500           | 0.139         | Public site                    |
| **BuiltIn**         | 500           | 0.139         | Public site                    |
| **HN Who's Hiring** | 100           | 0.028         | Community site                 |
| **JobsWithGPT**     | 10,000        | 2.778         | MCP server                     |
| **Dice**            | 500           | 0.139         | Public API                     |
| **YC Startup Jobs** | 200           | 0.056         | Public site                    |
| **USAJobs**         | 60            | 0.017         | Official API, conservative     |
| **SimplyHired**     | 200           | 0.056         | Public RSS, Cloudflare risk    |
| **Glassdoor**       | 200           | 0.056         | Public site                    |

### Example: Token Refill

```text
Hour 0:00 → 100 tokens available
Hour 0:10 → Use 50 tokens → 50 remaining
Hour 0:20 → Refilled +17 tokens → 67 available
Hour 0:30 → Refilled +17 tokens → 84 available
Hour 1:00 → Fully refilled → 100 available
```

---

## 🧮 Deduplication Improvements

JobSentinel uses intelligent deduplication to prevent duplicate jobs across 13 sources
using consistent hashing with URL, location, and title normalization.

### URL Normalization

Strips 20+ tracking parameters before hashing to deduplicate jobs shared via different
sources (social media, email, newsletters):

```text
Before:  https://greenhouse.io/jobs/123?utm_source=linkedin&ref=twitter&fbclid=abc
After:   https://greenhouse.io/jobs/123

Preserved parameters (job identifiers):
- id, job_id, posting, gh_jid, lever_id, position, etc.

Removed parameters (tracking):
- utm_*, fbclid, gclid, ref, source, campaign, session, etc.
```

**Benefit:** Same job posted on LinkedIn becomes identical after normalization.

### Location Normalization

Converts location name variations to canonical forms:

```text
"SF" → "San Francisco"
"San Fran" → "San Francisco"
"Remote US" → "Remote"
"USA Remote" → "Remote"
"Work from home" → "Remote"
```

**Benefit:** Prevents false positives from location spelling variations.

### Title Normalization

Removes abbreviations and standardizes common terms:

```text
"Sr. Software Engineer" → "Senior Software Engineer"
"SWE" → "Software Engineer"
"Sr Dev" → "Senior Developer"
"Jr. Dev" → "Junior Developer"
"FTE" → "Full-Time Employee"
```

**Benefit:** Reduces duplicates from title inconsistencies across job boards.

### Hash Formula

All 13 scrapers use the same consistent formula:

```rust
SHA256(
  normalized_title +
  company_name +
  normalized_location +
  normalized_url
)
```

**Fixed in this release:**

- LinkedIn hash now includes location (was missing, causing duplicates)
- SimplyHired hash now includes location (was missing, causing duplicates)

### Deduplication Badge

Job cards display a "Seen on X sources" badge indicating duplicate detection:

```text
Seen on 3 sources  (same job found on LinkedIn, Greenhouse, Glassdoor)
Seen on 1 source   (unique job)
```

### Implementation

Three new utility modules handle normalization:

| Module              | Purpose                        |
| ------------------- | ------------------------------ |
| `url_utils.rs`      | Strips 20+ tracking parameters |
| `location_utils.rs` | Canonicalizes location names   |
| `title_utils.rs`    | Standardizes job titles        |

Each module includes comprehensive tests (26+ test cases total).

---

## 🏥 Health Monitoring (v2.1.0+)

### Scraper Health Dashboard

Monitor the health and performance of all 13 scrapers from Settings → Troubleshooting → "View Scraper Health Dashboard".

**Dashboard Features:**

- **Summary Stats** - Total scrapers, healthy/degraded/down/disabled counts, jobs found (24h)
- **Scraper Table** - Health status, success rate, avg duration, jobs found, selector health
- **Run History** - Click any scraper to view recent runs with status, timing, and errors
- **Smoke Tests** - Test individual scrapers or all at once
- **Credential Warnings** - Alerts for expiring LinkedIn cookies

### Health Status

| Status       | Description       | Success Rate |
| ------------ | ----------------- | ------------ |
| **Healthy**  | Working normally  | ≥90%         |
| **Degraded** | Some failures     | 70-89%       |
| **Down**     | Not working       | <70%         |
| **Disabled** | Manually disabled | N/A          |
| **Unknown**  | No recent runs    | N/A          |

### Automatic Retry Logic

Scrapers automatically retry on transient failures using exponential backoff:

```rust
// Default retry configuration
RetryConfig {
    max_attempts: 3,
    initial_delay_ms: 1000,    // 1 second
    max_delay_ms: 30000,       // 30 seconds
    backoff_multiplier: 2.0,
    retryable_status_codes: [429, 500, 502, 503, 504],
}
```

**Retry Sequence Example:**

```text
Attempt 1: Immediate
Attempt 2: Wait 1s (+ jitter)
Attempt 3: Wait 2s (+ jitter)
```

### Smoke Tests

Verify scraper connectivity without running full scrapes:

```rust
// Test single scraper
let result = run_smoke_test(&db, &config, "linkedin").await?;

// Test all scrapers
let results = run_all_smoke_tests(&db, &config).await?;
```

Results are stored in `scraper_smoke_tests` table with response times.

### Credential Health (LinkedIn)

LinkedIn cookie expiry is automatically tracked:

- **Cookie Lifespan:** ~365 days
- **Warning Threshold:** 30 days before expiry
- **Auto-notification:** Alerts when cookie is expiring

### Tauri Commands (9 new)

| Command                      | Description                     |
| ---------------------------- | ------------------------------- |
| `get_scraper_health`         | Health metrics for all scrapers |
| `get_health_summary`         | Aggregate health statistics     |
| `get_scraper_configs`        | Scraper configuration details   |
| `set_scraper_enabled`        | Enable/disable scrapers         |
| `get_scraper_runs`           | Recent run history              |
| `run_scraper_smoke_test`     | Test single scraper             |
| `run_all_smoke_tests`        | Test all scrapers               |
| `get_linkedin_cookie_health` | LinkedIn credential status      |
| `get_expiring_credentials`   | All expiring credentials        |

### Database Tables

| Table                          | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `scraper_runs`                 | Run history with timing and status     |
| `scraper_config`               | Scraper configuration and health state |
| `credential_health`            | Credential expiry tracking             |
| `scraper_smoke_tests`          | Smoke test results                     |
| `scraper_health_status` (view) | Aggregated health metrics              |

---

## 🧪 Testing

### Unit Tests

```bash
cargo test --lib scrapers::linkedin
cargo test --lib scrapers::greenhouse
cargo test --lib scrapers::rate_limiter

# Test coverage:
# ✅ Query parameter building
# ✅ SHA-256 hash generation
# ✅ HTML parsing (all layout variants)
# ✅ Rate limiter token refill
# ✅ Session cookie validation
# ✅ API response parsing
```

**Test statistics:**

- **LinkedIn:** 5 unit tests
- **Rate Limiter:** 5 unit tests
- **Total:** 10+ tests

### Integration Tests

```rust
#[tokio::test]
async fn test_linkedin_scraper_live() {
    let scraper = LinkedInScraper::new(
        std::env::var("LINKEDIN_SESSION").unwrap(),
        "software engineer".to_string(),
        "Remote".to_string(),
    );

    let jobs = scraper.scrape().await.unwrap();
    assert!(!jobs.is_empty());
    assert!(jobs.iter().all(|j| j.source == "linkedin"));
}
```

---

## 📊 Analytics

### Job Discovery Metrics

```sql
-- Jobs by source
SELECT source, COUNT(*) as job_count
FROM jobs
GROUP BY source
ORDER BY job_count DESC;

-- Results:
-- linkedin: 15,234
-- greenhouse: 1,245
-- lever: 892
-- usajobs: 743
```

### Scraper Performance

```sql
-- Average jobs per scrape
SELECT
  source,
  AVG(jobs_found) as avg_jobs,
  MAX(jobs_found) as max_jobs
FROM scraper_runs
GROUP BY source;
```

---

## 🔐 Security & Ethics

### Best Practices

1. **Respect Rate Limits:** Use built-in rate limiter
2. **User-Agent Mimicry:** Appears as real browser
3. **Random Delays:** 2-5 second delays between requests
4. **Session Management:** Rotate cookies if multiple accounts
5. **Error Handling:** Graceful failures, no infinite retries

### LinkedIn-Specific Ethics

- ✅ **Use Your Own Account:** Don't share cookies
- ✅ **Personal Use Only:** Don't scrape on behalf of others
- ✅ **Respect ToS:** Comply with LinkedIn Terms of Service
- ⚠️ **Risk of Ban:** Aggressive scraping may trigger account restrictions

### Legal Considerations

- **Public Data:** Most scrapers target public job listings (no authentication required)
- **Authenticated Data:** LinkedIn requires login (use own account)
- **No Circumvention:** We don't bypass CAPTCHAs or security
- **User Responsibility:** Users must comply with site Terms of Service

---

## 🚀 Future Enhancements

### Phase 2: Headless Browser (Weeks 3-4)

- [ ] **Headless Chrome:** Integrate `headless_chrome` crate
- [ ] **Interactive Login:** No manual cookie extraction
- [ ] **JavaScript Rendering:** Full dynamic content support
- [ ] **CAPTCHA Solver:** User-assisted CAPTCHA solving

### Phase 3: Additional job boards (v1.6+)

- [ ] **ZipRecruiter:** 8M+ jobs
- [ ] **AngelList (Wellfound):** 100K+ startup jobs
- [ ] **Monster:** 6M+ jobs
- [x] **Glassdoor:** 5M+ jobs
- [ ] **CareerBuilder:** 1M+ jobs
- [ ] **FlexJobs:** 80K+ remote roles

### Phase 4: Advanced Features (Weeks 7-8)

- [ ] **Job Detail Fetching:** Full descriptions, not just snippets
- [ ] **Company Logo Extraction:** Visual job cards
- [ ] **Salary Parsing:** Extract salary ranges
- [ ] **Application Link Detection:** Direct apply URLs
- [ ] **Duplicate Detection Across Sources:** Same job on multiple boards

---

## 🔧 API Reference

### LinkedInScraper

```rust
pub struct LinkedInScraper {
    pub session_cookie: String,
    pub query: String,
    pub location: String,
    pub remote_only: bool,
    pub limit: usize,
}

impl LinkedInScraper {
    pub fn new(session_cookie: String, query: String, location: String) -> Self;
    pub fn with_remote_only(self, remote_only: bool) -> Self;
    pub fn with_limit(self, limit: usize) -> Self;
}

impl JobScraper for LinkedInScraper {
    async fn scrape(&self) -> ScraperResult;
    fn name(&self) -> &'static str;
}
```

### RateLimiter

```rust
pub struct RateLimiter;

impl RateLimiter {
    pub fn new() -> Self;

    /// Wait until request is allowed
    pub async fn wait(&self, scraper_name: &str, max_requests_per_hour: u32);

    /// Check if request is allowed (non-blocking)
    pub async fn is_allowed(&self, scraper_name: &str, max_requests_per_hour: u32) -> bool;

    /// Reset rate limiter for scraper
    pub async fn reset(&self, scraper_name: &str);
}
```

---

## ✅ Implementation Status

### Completed ✅ (v2.1.0)

- [x] All 13 job board scrapers (production-ready)
- [x] Parallel scraping architecture
- [x] Rate limiting (token bucket, per-scraper)
- [x] Multi-layout HTML parsing
- [x] Deduplication (SHA-256, cross-source)
- [x] Comprehensive unit tests
- [x] Integration tests for all scrapers
- [x] Auto-refresh scheduling (configurable intervals)
- [x] Job filtering (keyword, salary, location, company)
- [x] **Health monitoring dashboard** (v2.1.0)
- [x] **Exponential backoff retry logic** (v2.1.0)
- [x] **Smoke tests for all scrapers** (v2.1.0)
- [x] **Credential expiry tracking** (v2.1.0)
- [x] **Run history tracking** (v2.1.0)

### Future Enhancements 🔜 (v2.2+)

- [ ] Headless browser integration for JavaScript-heavy sites
- [ ] Additional job boards (Monster, ZipRecruiter, Wellfound, CareerBuilder)
- [ ] Job detail page fetching with full descriptions
- [ ] CAPTCHA solver integration
- [ ] Proxy rotation for large-scale scraping
- [ ] Job board version tracking (HTML layout change detection)

---

## 🇺🇸 USAJobs Federal Government Scraper

### Setup Instructions

**Free API key required** from [https://developer.usajobs.gov/](https://developer.usajobs.gov/)

1. Go to **Settings** → **Job Sources** → Enable **USAJobs**
2. Click "Get Free API Key" → Sign up with email (no credit card)
3. Copy API key from confirmation email
4. Paste into JobSentinel → Stored securely in OS keychain
5. Enter same email used for signup (required by API)
6. Configure search parameters (keywords, location, pay grade, etc.)

**Config:**

```json
{
  "usajobs": {
    "enabled": true,
    "email": "you@example.com",
    "keywords": "software engineer",
    "location": "Washington, DC",
    "radius": 50,
    "remote_only": false,
    "pay_grade_min": 11,
    "pay_grade_max": 15,
    "date_posted_days": 30,
    "limit": 100
  }
}
```

**Note:** The `api_key` is stored in the OS keychain, NOT in config.json.

### How It Works

1. **Official API:** Uses the official USAJobs public API (<https://data.usajobs.gov>)
2. **Authentication:** API key + email in User-Agent header (required by API)
3. **Rate Limiting:** Conservative 1-second delays between requests
4. **Deduplication:** SHA-256 hash of (organization + title + location + URL)
5. **GS Pay Grades:** Supports filtering by government pay scale (GS-1 through GS-15)

### API Endpoint

```text
GET https://data.usajobs.gov/api/Search
?Keyword=software+engineer
&LocationName=Washington,+DC
&Radius=50
&DatePosted=30
&Page=1
&ResultsPerPage=100

Headers:
- Host: data.usajobs.gov
- User-Agent: your@email.com
- Authorization-Key: YOUR_API_KEY
```

### Search Parameters

| Parameter         | Description               | Example             |
| ----------------- | ------------------------- | ------------------- |
| `Keyword`         | Job title/keywords        | `software engineer` |
| `LocationName`    | City, state, or zip       | `Washington, DC`    |
| `Radius`          | Search radius in miles    | `50`                |
| `RemoteIndicator` | Remote-only jobs          | `true`              |
| `PayGradeLow`     | Min GS pay grade (1-15)   | `11`                |
| `PayGradeHigh`    | Max GS pay grade (1-15)   | `15`                |
| `DatePosted`      | Days since posting (0-60) | `30`                |

### GS Pay Scale Reference

| Grade     | Annual Salary Range | Typical Role      |
| --------- | ------------------- | ----------------- |
| **GS-5**  | $36K - $46K         | Entry-level       |
| **GS-7**  | $44K - $57K         | Junior            |
| **GS-9**  | $54K - $70K         | Mid-level         |
| **GS-11** | $66K - $86K         | Senior            |
| **GS-12** | $79K - $103K        | Senior Specialist |
| **GS-13** | $94K - $122K        | Lead/Manager      |
| **GS-14** | $111K - $145K       | Senior Manager    |
| **GS-15** | $131K - $170K       | Executive         |

### Features

- ✅ **Official API:** Designed for programmatic access (no scraping)
- ✅ **Comprehensive Data:** Full job descriptions, salary ranges, locations
- ✅ **Salary Data:** Annual salary ranges with PA (Per Annum) codes
- ✅ **Remote Detection:** Detects "Remote" or "Telework" in location fields
- ✅ **No CAPTCHA Risk:** Official API, no anti-bot measures
- ✅ **Free API Key:** No credit card, instant approval

### Limitations

- **API Key Required:** Free but needs signup
- **60-Day Max:** Can only search jobs posted within last 60 days
- **500 Results/Page Max:** Capped by API (use pagination for more)
- **Federal Jobs Only:** Only U.S. government positions

---

## 📋 SimplyHired Job Aggregator Scraper

### Setup Instructions

**No authentication required!** SimplyHired provides RSS feeds.

**Add to Config:**

```json
{
  "simplyhired": {
    "enabled": true,
    "query": "software engineer",
    "location": "Remote",
    "limit": 50
  }
}
```

### How It Works

1. **RSS Feed:** Uses public RSS feeds (<https://www.simplyhired.com/search?q=...&output=rss>)
2. **No Authentication:** Public access
3. **XML Parsing:** Simple XML parsing (no full XML library needed)
4. **Rate Limiting:** Conservative 5-second delays (Cloudflare protection)
5. **Graceful Degradation:** Returns empty list if Cloudflare blocks request

### Search URL Format

```text
https://www.simplyhired.com/search
?q=software+engineer
&l=Remote
&output=rss
```

### Cloudflare Protection

SimplyHired has Cloudflare bot protection. The scraper:

- Detects Cloudflare challenge pages (`cf-browser-verification`)
- Returns empty list instead of error if blocked
- Shows warning in UI when enabled
- Uses realistic User-Agent headers

**Warning:** May return 0 jobs if Cloudflare blocks the request. This is expected behavior.

### Advantages

- ✅ **No Authentication:** Public RSS feeds
- ✅ **Large Coverage:** 5M+ jobs (aggregates from multiple sources)
- ✅ **Simple Parsing:** XML RSS format is easy to parse
- ✅ **Low Rate Limits:** RSS is explicitly public

### Limitations

- ⚠️ **Cloudflare Risk:** May be blocked by anti-bot protection
- **Limited Data:** RSS feeds have brief descriptions only
- **No Salary:** Salary data not in RSS feeds
- **Generic Locations:** Location data may be vague

---

**Last Updated:** 2026-03-18
**Version:** 2.6.4
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Phase 3 Complete (13 scrapers integrated)
**Next Phase:** v2.7 - ML Predictions, Windows/Linux Auto-Connect
