# LinkedIn & Indeed Scrapers
## Expand Job Coverage 10x with Major Job Boards

> **Status:** DEFERRED to v1.1+ - Code exists but incomplete
> **Completion:** ~30%
> **Last Updated:** 2026-01-14
> **Blocker:** Scrapers have code but are not integrated, need anti-bot handling

**Note:** LinkedIn and Indeed scraper code exists in `src-tauri/src/core/scrapers/` but is not fully functional. These scrapers require careful handling of rate limits and anti-bot measures.

---

## Overview

JobSentinel aims to support scraping from the two largest job boards: **LinkedIn** (30M+ jobs) and **Indeed** (20M+ jobs). This would expand job coverage by 10x compared to company-specific ATSs alone.

### Key Features

- **🔹 LinkedIn Scraper** - Authenticated session-based scraping
- **🟢 Indeed Scraper** - Public search with multiple HTML layout support
- **⏱️ Rate Limiting** - Token bucket algorithm prevents IP bans
- **🔄 Retry Logic** - Automatic retries with exponential backoff
- **📊 Deduplication** - SHA-256 hashing prevents duplicate jobs

---

## 🏗️ Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│              Job Scraper Registry                   │
│  ┌─────────┐  ┌─────────┐  ┌────────┐ ┌──────────┐│
│  │Greenhouse│  │  Lever  │  │LinkedIn│ │  Indeed  ││
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

### Scraper Comparison

| Feature | LinkedIn | Indeed | Greenhouse | Lever |
|---------|----------|--------|------------|-------|
| **Authentication** | Required (session cookie) | None | None | None |
| **Rate Limit** | 100 req/hour | 500 req/hour | 1000 req/hour | 1000 req/hour |
| **Job Count** | 30M+ | 20M+ | ~500K | ~200K |
| **API Available** | Yes (unofficial) | Limited | Yes (official) | Yes (official) |
| **CAPTCHA Risk** | High | Medium | Low | Low |
| **Complexity** | High | Medium | Low | Low |

---

## 🔹 LinkedIn Scraper

### Setup Instructions

**Step 1: Extract Session Cookie**
1. Log into [LinkedIn](https://www.linkedin.com) in your browser
2. Open DevTools (F12) → Application → Cookies
3. Find and copy the `li_at` cookie value

**Step 2: Add to Config**
```json
{
  "linkedin": {
    "enabled": true,
    "session_cookie": "YOUR_LI_AT_COOKIE_HERE",
    "query": "software engineer",
    "location": "San Francisco Bay Area",
    "remote_only": false,
    "limit": 50
  }
}
```

**Step 3: Run Scraper**
```rust
use jobsentinel::core::scrapers::linkedin::LinkedInScraper;
use jobsentinel::core::scrapers::rate_limiter::{RateLimiter, limits};

let rate_limiter = RateLimiter::new();

let scraper = LinkedInScraper::new(
    config.linkedin.session_cookie.clone(),
    "software engineer".to_string(),
    "San Francisco Bay Area".to_string(),
)
.with_remote_only(true)
.with_limit(50);

// Respect rate limits (100 req/hour)
rate_limiter.wait("linkedin", limits::LINKEDIN).await;

let jobs = scraper.scrape().await?;
println!("Found {} jobs from LinkedIn", jobs.len());
```

### How It Works

1. **Authentication:** Uses your session cookie (`li_at`) for authenticated requests
2. **API-First Approach:** Tries LinkedIn's internal Voyager API first
3. **HTML Fallback:** Falls back to HTML scraping if API fails
4. **Rate Limiting:** Automatic 2-5 second delays between requests
5. **Deduplication:** SHA-256 hash of (title + company + URL)

### API Endpoint

```
GET https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards
?decorationId=com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174
&count=50
&keywords=software+engineer
&location=San+Francisco+Bay+Area
&start=0

Headers:
- Cookie: li_at=YOUR_SESSION_COOKIE
- csrf-token: YOUR_SESSION_COOKIE
- User-Agent: Mozilla/5.0 ...
```

### Security & Privacy

- ✅ **Your Cookie Only:** No credentials stored, uses your own session
- ✅ **Respectful Scraping:** 2-5 second delays, max 100 req/hour
- ✅ **Browser User-Agent:** Mimics real Chrome browser
- ⚠️ **User Responsibility:** Must comply with LinkedIn Terms of Service
- ⚠️ **Session Expiry:** Cookie expires after ~90 days, requires refresh

### Limitations

- **No Password Storage:** Requires manual cookie extraction
- **Session Expiry:** Need to update cookie every 90 days
- **Rate Limits:** 100 requests/hour to avoid detection
- **CAPTCHA:** May trigger CAPTCHA if too aggressive

### Future Enhancement: Headless Browser

For Phase 2, we can upgrade to headless browser automation:

```rust
// Using headless_chrome crate
use headless_chrome::{Browser, LaunchOptionsBuilder};

let browser = Browser::new(LaunchOptionsBuilder::default().build()?)?;
let tab = browser.wait_for_initial_tab()?;

// Navigate to LinkedIn login
tab.navigate_to("https://www.linkedin.com/login")?;
tab.wait_for_element("input#username")?.type_into("your@email.com")?;
tab.wait_for_element("input#password")?.type_into("your_password")?;
tab.wait_for_element("button[type=submit]")?.click()?;

// Navigate to jobs search
tab.navigate_to("https://www.linkedin.com/jobs/search/?keywords=software+engineer")?;
```

**Benefits:**
- No manual cookie extraction
- JavaScript rendering
- Better CAPTCHA handling
- Session management

**Drawbacks:**
- Slower (30-60s startup)
- Higher resource usage (Chrome instance)
- More complex debugging

---

## 🟢 Indeed Scraper

### Setup Instructions

**No authentication required!** Indeed has public job listings.

**Add to Config:**
```json
{
  "indeed": {
    "enabled": true,
    "query": "software engineer",
    "location": "San Francisco, CA",
    "radius": 25,
    "limit": 50
  }
}
```

**Run Scraper:**
```rust
use jobsentinel::core::scrapers::indeed::IndeedScraper;
use jobsentinel::core::scrapers::rate_limiter::{RateLimiter, limits};

let rate_limiter = RateLimiter::new();

let scraper = IndeedScraper::new(
    "software engineer".to_string(),
    "San Francisco, CA".to_string(),
)
.with_radius(50) // miles
.with_limit(100);

// Respect rate limits (500 req/hour)
rate_limiter.wait("indeed", limits::INDEED).await;

let jobs = scraper.scrape().await?;
println!("Found {} jobs from Indeed", jobs.len());
```

### How It Works

1. **Public Search:** No authentication needed
2. **Multi-Layout Support:** Handles 3 different HTML layouts
   - Modern React-based (`[data-jk]`)
   - Classic class-based (`.jobsearch-SerpJobCard`)
   - Mobile layout (`.job_seen_beacon`)
3. **Rate Limiting:** 500 requests/hour limit
4. **Deduplication:** SHA-256 hash prevents duplicates

### Search URL Format

```
https://www.indeed.com/jobs
?q=software+engineer
&l=San+Francisco,+CA
&radius=25
&limit=50
```

### Supported Filters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `q` | Job title/keywords | `software engineer` |
| `l` | Location (city, state, zip, or "remote") | `San Francisco, CA` |
| `radius` | Search radius in miles | `25` |
| `limit` | Max results (default: 50) | `100` |

### HTML Parsing

Indeed uses multiple layout variations. The scraper handles all:

**Modern Layout:**
```html
<div data-jk="abc123">
  <h2 class="jobTitle">
    <span>Senior Software Engineer</span>
  </h2>
  <span data-testid="company-name">TechCorp</span>
  <div data-testid="text-location">Remote</div>
  <div class="job-snippet">Build scalable systems...</div>
</div>
```

**Classic Layout:**
```html
<div class="jobsearch-SerpJobCard" data-jk="abc123">
  <h2 class="jobtitle">Senior Software Engineer</h2>
  <span class="company">TechCorp</span>
  <div class="location">Remote</div>
  <div class="summary">Build scalable systems...</div>
</div>
```

### Advantages

- ✅ **No Authentication:** Public access
- ✅ **High Rate Limits:** 500 req/hour
- ✅ **Large Coverage:** 20M+ jobs
- ✅ **Reliable Parsing:** 3 fallback layouts
- ✅ **Low CAPTCHA Risk:** Respectful delays

### Limitations

- **Description Snippets Only:** Full descriptions require detail page fetch
- **Layout Changes:** Indeed occasionally updates HTML structure
- **Sponsored Results:** Some results are ads (filtered out)

---

## ⏱️ Rate Limiting

### Token Bucket Algorithm

Prevents IP bans by limiting requests per hour:

```rust
use jobsentinel::core::scrapers::rate_limiter::{RateLimiter, limits};

let limiter = RateLimiter::new();

// Wait until request is allowed
limiter.wait("linkedin", limits::LINKEDIN).await; // 100/hour
limiter.wait("indeed", limits::INDEED).await;     // 500/hour
limiter.wait("greenhouse", limits::GREENHOUSE).await; // 1000/hour
```

### How It Works

1. **Token Bucket:** Each scraper has a bucket of tokens
2. **Request Consumes Token:** Each scrape uses 1 token
3. **Refill Over Time:** Tokens refill at constant rate
4. **Wait When Empty:** Automatically waits for next token

### Rate Limits

| Scraper | Requests/Hour | Tokens/Second | Reasoning |
|---------|--------------|---------------|-----------|
| **LinkedIn** | 100 | 0.028 | Conservative (avoid detection) |
| **Indeed** | 500 | 0.139 | Public API, more generous |
| **Greenhouse** | 1000 | 0.278 | Official API |
| **Lever** | 1000 | 0.278 | Official API |
| **JobsWithGPT** | 10,000 | 2.778 | MCP server |

### Example: Token Refill

```
Hour 0:00 → 100 tokens available
Hour 0:10 → Use 50 tokens → 50 remaining
Hour 0:20 → Refilled +17 tokens → 67 available
Hour 0:30 → Refilled +17 tokens → 84 available
Hour 1:00 → Fully refilled → 100 available
```

---

## 🧪 Testing

### Unit Tests

```bash
cargo test --lib scrapers::indeed
cargo test --lib scrapers::linkedin
cargo test --lib scrapers::rate_limiter

# Test coverage:
# ✅ Query parameter building
# ✅ SHA-256 hash generation
# ✅ HTML parsing (all layout variants)
# ✅ Rate limiter token refill
# ✅ Session cookie validation
# ✅ API response parsing
```

**Test Statistics:**
- **Indeed:** 4 unit tests
- **LinkedIn:** 5 unit tests
- **Rate Limiter:** 5 unit tests
- **Total:** 14 tests

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
-- indeed: 12,890
-- greenhouse: 1,245
-- lever: 892
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

- **Public Data:** Indeed jobs are public (no authentication)
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

### Phase 3: Additional Job Boards (Weeks 5-6)

- [ ] **ZipRecruiter:** 8M+ jobs
- [ ] **Monster:** 6M+ jobs
- [ ] **Glassdoor:** 5M+ jobs
- [ ] **AngelList (Wellfound):** 100K+ startup jobs

### Phase 4: Advanced Features (Weeks 7-8)

- [ ] **Job Detail Fetching:** Full descriptions, not just snippets
- [ ] **Company Logo Extraction:** Visual job cards
- [ ] **Salary Parsing:** Extract salary ranges
- [ ] **Application Link Detection:** Direct apply URLs
- [ ] **Duplicate Detection Across Sources:** Same job on multiple boards

---

## 🔧 API Reference

### IndeedScraper

```rust
pub struct IndeedScraper {
    pub query: String,
    pub location: String,
    pub radius: u32,
    pub limit: usize,
}

impl IndeedScraper {
    pub fn new(query: String, location: String) -> Self;
    pub fn with_radius(self, radius: u32) -> Self;
    pub fn with_limit(self, limit: usize) -> Self;
}

impl JobScraper for IndeedScraper {
    async fn scrape(&self) -> ScraperResult;
    fn name(&self) -> &'static str;
}
```

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

### Completed ✅
- [x] Indeed scraper (HTML-based)
- [x] LinkedIn scraper (session-based)
- [x] Rate limiting (token bucket)
- [x] Multi-layout HTML parsing
- [x] Deduplication (SHA-256)
- [x] Unit tests (14 tests)
- [x] Documentation

### Future 🔜
- [ ] Headless browser integration
- [ ] ZipRecruiter, Monster, Glassdoor scrapers
- [ ] Job detail page fetching
- [ ] CAPTCHA solver integration
- [ ] Proxy rotation
- [ ] Comprehensive integration tests

---

**Last Updated:** 2025-11-15
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Phase 1 Complete (HTTP Scraping)
**Next Feature:** Company Health Monitoring (P0)
