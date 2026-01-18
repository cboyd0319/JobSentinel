# Scraper Health Monitoring

## Monitor All 13 Job Board Scrapers at a Glance

> **Status:** ACTIVE (v2.1.0+)
> **Coverage:** 13 scrapers tracked with real-time health metrics
> **Last Updated:** 2026-01-17
> **Version:** 2.1.0

JobSentinel's scraper health monitoring gives you complete visibility into your job board
connections. See which scrapers are working, which need attention, and troubleshoot problems
before they stop your job search.

---

## Overview

The health monitoring system automatically tracks all 13 scrapers and alerts you to issues:

- **Real-time status tracking** - Healthy, degraded, down, or disabled
- **Success rate metrics** - See which scrapers are working reliably
- **Performance data** - Track response times and jobs found
- **Run history** - Browse past runs with errors and timing
- **Smoke tests** - Verify scrapers work without running full searches
- **Credential tracking** - Monitor LinkedIn cookie and email SMTP health
- **Trend analysis** - Spot patterns of degradation over time

### Key Metrics Per Scraper

For each of the 13 scrapers, JobSentinel tracks:

| Metric | What It Shows |
|--------|---------------|
| **Health Status** | Current state (healthy/degraded/down/disabled) |
| **Success Rate** | Percentage of successful runs (last 30 days) |
| **Avg Duration** | How long scrapes typically take |
| **Jobs Found (24h)** | How many jobs found in last 24 hours |
| **Last Run** | When the scraper last ran |
| **Error Count** | Failed runs in last 24 hours |
| **Selector Health** | HTML parsing status for web scrapers |

### 13 Scrapers Monitored

| Scraper | Type | Status | Last Check |
|---------|------|--------|------------|
| LinkedIn | API + HTML | ✅ Monitored | 2026-01-17 |
| Indeed | HTML | ✅ Monitored | 2026-01-17 |
| Greenhouse | Official API | ✅ Monitored | 2026-01-17 |
| Lever | Official API | ✅ Monitored | 2026-01-17 |
| RemoteOK | Public API | ✅ Monitored | 2026-01-17 |
| Wellfound | Public API | ✅ Monitored | 2026-01-17 |
| WeWorkRemotely | HTML | ✅ Monitored | 2026-01-17 |
| BuiltIn | HTML | ✅ Monitored | 2026-01-17 |
| HN Who's Hiring | HTML | ✅ Monitored | 2026-01-17 |
| JobsWithGPT | MCP Server | ✅ Monitored | 2026-01-17 |
| Dice | Public API | ✅ Monitored | 2026-01-17 |
| YC Startup Jobs | HTML | ✅ Monitored | 2026-01-17 |
| ZipRecruiter | Public API | ✅ Monitored | 2026-01-17 |

---

## Health Dashboard UI

### How to Access

1. Click **Settings** (gear icon, bottom left)
2. Go to **Troubleshooting** tab
3. Click **View Scraper Health Dashboard**

The dashboard opens in a dedicated window showing real-time health metrics.

### Dashboard Layout

**Summary Section (Top)**

Quick overview of all scrapers:

- Total scrapers: 13
- Healthy: X
- Degraded: Y
- Down: Z
- Disabled: W
- Jobs found (24h): NNNN

**Scraper Table (Main)**

Sortable table with one row per scraper:

```text
Scraper Name      Status      Success Rate  Avg Duration  Jobs (24h)  Last Run
─────────────────────────────────────────────────────────────────────────────
LinkedIn          🟢 Healthy  94%           12.3s         342         5 min ago
Indeed            🟢 Healthy  91%           8.1s          289         15 min ago
Greenhouse        🟢 Healthy  100%          2.4s          18          2 hours ago
Lever             🟡 Degraded 75%           5.2s          12          3 hours ago
RemoteOK          🟢 Healthy  96%           1.8s          45          30 min ago
Wellfound         🟢 Healthy  88%           4.5s          32          1 hour ago
WeWorkRemotely    🟢 Healthy  92%           3.1s          28          45 min ago
BuiltIn           🟢 Healthy  89%           5.8s          22          2 hours ago
HN Who's Hiring   🟢 Healthy  100%          1.2s          15          6 hours ago
JobsWithGPT       🟢 Healthy  97%           2.9s          51          20 min ago
Dice              🔴 Down     42%           N/A           0           12 hours ago
YC Startup Jobs   🟢 Healthy  93%           1.5s          8           4 hours ago
ZipRecruiter      🟡 Degraded 68%           7.4s          24          5 hours ago
```

**Color Legend:**

- 🟢 **Green (Healthy)** - Success rate ≥90%
- 🟡 **Yellow (Degraded)** - Success rate 70-89%
- 🔴 **Red (Down)** - Success rate <70%
- ⚪ **Gray (Disabled)** - Manually disabled or not configured

### Table Features

**Sort Columns**

Click any column header to sort:

- Status: Show healthy first/last
- Success Rate: Worst to best performers
- Avg Duration: Slowest/fastest scrapers
- Jobs (24h): Most productive sources
- Last Run: Recently active/inactive

**Click Row for Details**

Click any scraper row to see:

- Last 10 runs with status, timing, and errors
- Success/failure trend over 7 days
- Error patterns (rate limit, auth, network, etc.)
- Next scheduled run

**Action Buttons**

Right of each row:

- **🧪 Test** - Run smoke test for this scraper
- **⚙️ Config** - View/edit configuration (API keys, cookies, etc.)
- **▶️ Run Now** - Start a full scrape (respects rate limits)
- **⏸️ Disable** - Pause this scraper temporarily

---

## Health Status Indicators

### Status Definitions

**🟢 Healthy**

- Success rate ≥90%
- Last run: Within expected interval
- No recent errors
- All credentials valid

**Action:** Keep monitoring. Everything is working.

**🟡 Degraded**

- Success rate 70-89%
- Some failures but mostly working
- Recent errors but not persistent

**Action:** Watch for trends. May improve or need investigation.

**🔴 Down**

- Success rate <70%
- Multiple recent failures
- Last run had errors
- Credential issues or service down

**Action:** Investigate immediately. Use troubleshooting guide below.

**⚪ Disabled**

- Manually turned off by user
- Not in active scraping rotation

**Action:** Re-enable if you want to use this scraper.

**❓ Unknown**

- No runs in last 7 days
- Never been run

**Action:** Run a smoke test or full scrape to get data.

### Success Rate Calculation

```text
Success Rate = (Successful Runs / Total Runs) × 100%

Time Window: Last 30 days
Minimum Runs: 5 (if <5 runs, shows "insufficient data")

Example:
19 successful runs out of 20 total = 95% success rate ✅ Healthy
14 successful runs out of 20 total = 70% success rate ⚠️ Degraded
8 successful runs out of 20 total = 40% success rate ❌ Down
```

---

## Per-Scraper Status Details

### Accessing Detailed History

1. From the health dashboard, click any scraper row
2. A side panel opens showing:

**Last 10 Runs**

```text
Run #  Date/Time          Status     Duration  Jobs Found  Error
────────────────────────────────────────────────────────────────
10     2026-01-17 14:30   ✅ Success 12.4s     42          —
9      2026-01-17 14:00   ✅ Success 11.8s     45          —
8      2026-01-17 13:30   ❌ Failed  2.1s      0           Rate limit (429)
7      2026-01-17 13:00   ✅ Success 12.2s     38          —
6      2026-01-17 12:30   ✅ Success 11.9s     41          —
5      2026-01-17 12:00   ✅ Success 12.3s     39          —
4      2026-01-17 11:30   ✅ Success 12.1s     43          —
3      2026-01-17 11:00   ✅ Success 12.4s     40          —
2      2026-01-17 10:30   ✅ Success 11.8s     44          —
1      2026-01-17 10:00   ✅ Success 12.2s     42          —
```

**7-Day Trend Chart**

Visual graph showing success/failure pattern:

```text
Success Rate Trend (Last 7 Days)
┌────────────────────────────────┐
│                    ███  ███     │ 90%
│ ███  ███  ███  ███ ███  ███    │ 85%
│ ███  ███  ███  ███ ███  ███    │ 80%
│                                │ 75%
└────────────────────────────────┘
  Mon  Tue  Wed  Thu  Fri  Sat
```

**Recent Errors**

Grouped by type with count:

- Rate Limit (429): 1 error
- Authentication Failed: 0 errors
- Network Timeout: 0 errors
- Service Down (503): 0 errors

Click any error type to see details.

---

## Smoke Tests

Smoke tests are lightweight checks that verify scraper connectivity without running a full
search. They're fast, safe, and useful for troubleshooting.

### What Smoke Tests Check

For each scraper type:

**API-Based Scrapers (Greenhouse, Lever, RemoteOK, Wellfound, Dice, JobsWithGPT)**

- ✅ API endpoint responds
- ✅ Authentication credentials valid (if required)
- ✅ API returns valid job data format
- ✅ Response time acceptable (<5 seconds)

**HTML Scrapers (Indeed, LinkedIn, WeWorkRemotely, BuiltIn, HN, YC Startup Jobs, ZipRecruiter)**

- ✅ Website is reachable
- ✅ HTML structure hasn't changed (selectors valid)
- ✅ CSS selectors find expected elements
- ✅ Response time acceptable (<5 seconds)

**LinkedIn-Specific**

- ✅ Session cookie is valid
- ✅ Cookie is not expired
- ✅ Cookie has permission to view jobs

### Running Smoke Tests

**Test Single Scraper**

1. Click the scraper row
2. Click **🧪 Test** button
3. Wait 5-30 seconds for results

Result shows:

```text
LinkedIn Smoke Test Results
──────────────────────────
Status:           ✅ PASS
Test Duration:    2.3 seconds
Cookie Valid:     Yes (expires in 45 days)
API Responding:   Yes
Jobs Sample:      15 jobs retrieved
Recommendation:   All clear. Scraper is healthy.
```

**Test All Scrapers**

1. From dashboard, click **🧪 Test All Scrapers** button (top right)
2. Progress bar shows: "Testing 13 scrapers... 5 complete"
3. Results appear as each test finishes

Summary shows:

```text
Smoke Test Results: All Scrapers
────────────────────────────────
✅ PASSED (12):
  - LinkedIn, Indeed, Greenhouse, Lever, RemoteOK, Wellfound
  - WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT
  - YC Startup Jobs, Dice

⚠️  WARNING (1):
  - ZipRecruiter - Response time: 8.2s (expected <5s)

Test Duration: 45 seconds
Next Test:     2026-01-18 02:00 UTC (24h from now)
```

### When to Run Manual Tests

- **After changing configuration** - Verify API keys or cookies still work
- **When scraper shows as degraded** - Quick diagnostic
- **After troubleshooting** - Confirm fix worked
- **Weekly routine** - Preventive health check

Smoke tests run automatically once daily (2:00 AM UTC).

---

## Credential Health Tracking

### LinkedIn Cookie Status

LinkedIn cookies have a limited lifespan and must be refreshed periodically.

**Where to Check**

Settings → Troubleshooting → View Scraper Health Dashboard

Under "Credential Warnings" section:

```text
LinkedIn Session Cookie
────────────────────────
Status:          ✅ Valid
Set Date:        2025-12-03
Expires:         2026-01-17 (31 days from now)
Warnings:        ⚠️  Cookie expires in 31 days
Action:          Refresh cookie before 2026-01-17

Refresh Instructions:
1. Log into LinkedIn
2. Open DevTools (F12)
3. Find "li_at" cookie
4. Copy the value
5. Paste into Settings → Scrapers → LinkedIn
```

**Cookie Lifespan**

- Issued when you first log into LinkedIn
- Valid for approximately 365 days
- Expires after 1 year
- You must refresh manually (LinkedIn doesn't auto-renew)

**Warning Thresholds**

- ⚠️ **Yellow Alert:** 30 days before expiry
- 🔴 **Red Alert:** 7 days before expiry
- ❌ **Expired:** Cookie no longer works

**What Happens When Expired**

LinkedIn scraper will:

1. Attempt to use cookie
2. Get 401 Unauthorized response
3. Status changes to "Degraded"
4. Smoke test fails with "Cookie Expired"
5. Notification shows "Update LinkedIn Cookie"

To fix: Refresh cookie following instructions above.

### Email SMTP Validation

For notification features that email scraping alerts:

**Where to Check**

Settings → Troubleshooting → View Scraper Health Dashboard

Under "Credential Warnings" section:

```text
Email SMTP Configuration
────────────────────────
Status:          ⚠️  Not Configured
Configuration:   Add SMTP settings to send email alerts
Recommendation:   Optional - not required for scraping
```

If configured:

```text
Email SMTP Configuration
────────────────────────
Status:          ✅ Valid
Server:          smtp.gmail.com
Port:            587
Test Result:     ✅ Connected (measured 234ms)
Last Test:       2026-01-17 14:30 UTC
```

**Common SMTP Issues**

| Issue | Fix |
|-------|-----|
| **Connection Refused** | Check server address and port |
| **Authentication Failed** | Verify username and password |
| **Timeout (>5s)** | Network latency; try different SMTP provider |
| **TLS Error** | Ensure port matches protocol (587=TLS, 465=SSL) |

---

## Run History & Trend Analysis

### Accessing Run History

**Per-Scraper History**

1. Click any scraper row
2. Side panel shows "Last 10 Runs"
3. Click on any run for details

**Global Run History**

1. Dashboard → Click **Run History** tab
2. See all runs across all scrapers
3. Filter by date or scraper name

### Run History Details

For each run, view:

```text
Run Details: LinkedIn #2026-01-17 14:30 UTC
──────────────────────────────────────────────
Status:          ✅ Success
Started:         2026-01-17 14:30:00 UTC
Completed:       2026-01-17 14:32:15 UTC
Duration:        2m 15s
Query:           "software engineer"
Location:        "San Francisco, CA"
Jobs Found:      42
New Jobs:        38 (4 were duplicates)
Deduplication:   Cross-referenced with 12 other sources
Error:           None
Configuration Used:
  - Rate limit: 100 requests/hour
  - Timeout: 30 seconds
  - Retries: 3
Memory Used:     234 MB
CPU Peak:        45%
```

### Trend Analysis

**Success Rate Trend**

Dashboard shows 7-day and 30-day success rates:

```text
LinkedIn - Success Rate Trend
──────────────────────────────
Last 7 Days:   94% (18/19 runs successful)
Last 30 Days:  92% (276/300 runs successful)
Last 90 Days:  89% (804/900 runs successful)

Trend:         📈 Improving (was 87% in Dec)
```

**Jobs Found Trend**

Track productivity over time:

```text
LinkedIn - Jobs Found (Daily Average)
──────────────────────────────────────
Today:        42 jobs
Last 7 Days:  38 jobs/day average
Last 30 Days: 35 jobs/day average
Last 90 Days: 32 jobs/day average

Trend:        📈 More jobs being found
```

**Performance Trend**

Monitor scrape duration:

```text
LinkedIn - Scrape Duration (Average)
────────────────────────────────────
Today:        2m 15s
Last 7 Days:  2m 12s average
Last 30 Days: 2m 18s average
Last 90 Days: 2m 45s average

Trend:        📉 Getting faster (was 3m in Oct)
```

**Error Trend**

Spot patterns of problems:

```text
LinkedIn - Errors (Last 30 Days)
────────────────────────────────
Rate Limit Errors:        2 (down from 5 in Dec)
Authentication Errors:    0
Network Timeouts:         1
Service Errors (50x):     0

Trend:        ✅ Fewer errors overall
```

### Interpreting Trends

**Good Signs**

- ✅ Success rate increasing
- ✅ Jobs found increasing
- ✅ Scrape duration decreasing
- ✅ Fewer errors

**Concerning Signs**

- ❌ Success rate dropping
- ❌ Jobs found dropping
- ❌ Scrape duration increasing
- ❌ Error rate increasing
- ❌ Rate limit errors appearing

**What to Do**

If you see concerning trends:

1. Run a smoke test for that scraper
2. Check credential health (cookies, API keys)
3. Review recent errors in run history
4. See troubleshooting section below

---

## Troubleshooting Common Issues

### Issue: Rate Limiting (429 Errors)

**Symptom**

```text
❌ FAILED: HTTP 429 Too Many Requests
```

Dashboard shows: Error Rate: Rate Limit (429)

**Why It Happens**

Job boards enforce rate limits to prevent abuse:

- LinkedIn: 100 requests/hour
- Indeed: 500 requests/hour
- API boards: 1000 requests/hour
- Specialized boards: 100-500 requests/hour

You've exceeded the limit for that scraper.

**Fix**

**Short-term:**

1. Stop running that scraper for a bit
2. Rate limiter automatically waits and retries
3. Scraper resumes when tokens refill (up to hourly limit)

**Long-term:**

1. Check if scraper is configured for correct rate limit
2. Settings → Scrapers → [Scraper Name]
3. Adjust "Max Requests Per Hour" if needed
4. Or space out scrape frequency

**Example Configuration**

```json
{
  "linkedin": {
    "enabled": true,
    "rate_limit_requests_per_hour": 100,
    "scrape_interval_minutes": 60
  }
}
```

### Issue: Authentication Failed

**Symptom**

```text
❌ FAILED: HTTP 401 Unauthorized
```

Dashboard shows: Error: Authentication Failed

**Why It Happens**

- LinkedIn cookie expired (>365 days old)
- LinkedIn cookie was revoked (logged out from other device)
- API key is invalid or rotated
- Credentials were entered incorrectly

**Fix**

**For LinkedIn:**

1. Go to Settings → Scrapers → LinkedIn
2. Click **Update LinkedIn Cookie**
3. Follow on-screen instructions:
   - Log into LinkedIn
   - Open DevTools (F12 or right-click → Inspect)
   - Go to **Application** tab
   - Find **Cookies** → **LinkedIn.com**
   - Find and copy **li_at** value
4. Paste into the field
5. Click **Save and Test**
6. Dashboard shows ✅ if successful

**For API-Based Scrapers (Greenhouse, Lever, etc.):**

1. Verify API key hasn't been rotated on the job board's website
2. Settings → Scrapers → [Scraper Name]
3. Re-enter the API key
4. Click **Save and Test**

**Verify It's Fixed**

Run a smoke test to confirm:

1. Click scraper row
2. Click **🧪 Test** button
3. Result should show ✅ PASS

### Issue: Network Timeout

**Symptom**

```text
❌ FAILED: Connection timeout (30 seconds)
```

Dashboard shows: Error: Network Timeout

**Why It Happens**

- Job board website is slow
- Your internet connection is slow
- ISP is blocking or throttling the request
- Firewall is blocking the domain

**Fix**

**Check Your Connection**

1. Run a speed test at speedtest.net
2. If <5 Mbps, speed up your internet
3. Restart your modem/router

**Try Again**

Most timeouts are temporary:

1. Wait a few minutes
2. Run the scraper again
3. It usually works the second time

**Manual Configuration**

If timeouts persist:

1. Settings → Advanced → Scraper Timeout
2. Increase from 30 seconds to 60 seconds
3. Next scrape will wait longer

**Check Firewall**

1. If on corporate network, firewall may block job boards
2. Use home internet as workaround
3. Or configure proxy in Settings → Network

### Issue: Service Down / 503 Errors

**Symptom**

```text
❌ FAILED: HTTP 503 Service Unavailable
```

Dashboard shows: Error: Service Down

**Why It Happens**

- Job board is undergoing maintenance
- Job board is experiencing an outage
- Job board's API is temporarily down

**Status**

1. Check job board's status page:
   - LinkedIn: [LinkedIn System Status](https://www.linkedin.com/system-status)
   - Indeed: [Indeed Status](https://status.indeed.com)
   - Greenhouse: Check email for maintenance notices

2. Or try accessing in a browser to confirm

**Fix**

**If Maintenance Scheduled**

- Job boards often do maintenance at night (typically 1-3 AM PT)
- JobSentinel will automatically retry
- Just wait for maintenance window to end

**If Unexpected Outage**

1. Check status page for updates
2. Follow the job board on Twitter for updates
3. JobSentinel will keep retrying with exponential backoff
4. Typically resolved within 1-2 hours

**Nothing to Do**

- JobSentinel automatically retries with exponential backoff
- You don't need to do anything
- Scraper will resume when service is back

### Issue: HTML Selectors No Longer Work

**Symptom**

```text
❌ FAILED: No jobs found (selectors not matching)
```

Dashboard shows: Error: Selector Health Failed

**Why It Happens**

HTML scrapers use CSS selectors to find job data on web pages. Job boards occasionally update
their HTML structure, breaking selectors.

Examples:

- Indeed changes HTML layout → selectors no longer find job cards
- LinkedIn updates CSS classes → description parsing breaks
- BuiltIn redesigns job listing page → selectors fail

**Fix**

This usually requires code changes (new selectors). **Report it**:

1. Dashboard → **Report Issue**
2. Include:
   - Scraper name
   - Error message
   - When it started happening
3. JobSentinel team updates selectors in next release

**Temporary Workaround**

Use a different scraper while waiting for fix:

1. If LinkedIn selectors break, use Indeed instead
2. If Indeed breaks, use ZipRecruiter
3. You'll still find most jobs through other sources

### Issue: Jobs Count is Zero

**Symptom**

Scraper ran successfully but found 0 jobs:

```text
✅ SUCCESS
Duration: 2m 15s
Jobs Found: 0
Error: None
```

**Why It Happens**

**Scenario 1: Wrong Query**

- Searched for a niche role nobody is hiring for
- Typo in job title

**Scenario 2: Scraper Disabled**

- Scraper was manually disabled
- Configuration: Enabled = false

**Scenario 3: Rate Limited**

- Scraper hit rate limit
- Retries in progress
- Will find jobs on next run

**Scenario 4: Geographic Scope Too Narrow**

- Location filters are too restrictive
- No jobs in specified location

**Fix**

1. **Check Query** - Try a broader job title
2. **Check Enabled** - Settings → Scrapers → Verify "Enabled" is ON
3. **Check Location** - Try "Remote" or expand geographic area
4. **Check Rate Limits** - Look at run history for 429 errors
5. **Wait for Retry** - JobSentinel retries automatically

### Issue: LinkedIn Cookie Keeps Expiring

**Symptom**

You update the cookie, but 5 minutes later it says "Cookie Expired"

**Why It Happens**

Usually one of:

1. You copied an old or invalid cookie
2. The cookie refresh failed (browser caching issue)
3. LinkedIn session was corrupted

**Fix**

1. **Clear Browser Cache**
   - Chrome: Ctrl+Shift+Delete → Clear all data
   - Safari: Develop → Empty Web Caches
   - Edge: Ctrl+Shift+Delete

2. **Log Out and Log Back In**
   - Go to LinkedIn.com
   - Click Profile → Sign Out
   - Sign back in fresh

3. **Extract Cookie Again**
   - Open DevTools (F12)
   - Go to Application → Cookies → LinkedIn.com
   - Find and copy li_at (the full value)
   - Note: Should be 100+ characters, not small

4. **Update in JobSentinel**
   - Settings → Scrapers → LinkedIn
   - Paste the new cookie
   - Click **Save and Test**

5. **If Still Failing**
   - Try a different browser (sometimes cookies get corrupted)
   - Or use Indeed/Greenhouse until you get it working

---

## Database Schema (Technical)

For developers and advanced users:

**Tables**

```sql
-- Stores each run attempt
scraper_runs (
  id INTEGER PRIMARY KEY,
  scraper_name TEXT,
  status TEXT,                    -- "success" or "failed"
  started_at DATETIME,
  completed_at DATETIME,
  duration_ms INTEGER,
  jobs_found INTEGER,
  jobs_new INTEGER,               -- Not deduplicates
  error_message TEXT,
  error_type TEXT,                -- "rate_limit", "auth", "timeout", etc.
  config_json TEXT,
  memory_usage_mb INTEGER,
  cpu_peak_percent REAL
);

-- Scraper configuration and health
scraper_config (
  scraper_name TEXT PRIMARY KEY,
  enabled BOOLEAN,
  rate_limit_requests_per_hour INTEGER,
  scrape_interval_minutes INTEGER,
  last_run_at DATETIME,
  next_run_at DATETIME,
  consecutive_failures INTEGER,
  total_runs INTEGER,
  successful_runs INTEGER
);

-- Credential expiration tracking
credential_health (
  id INTEGER PRIMARY KEY,
  credential_type TEXT,           -- "linkedin_cookie", "api_key", "smtp"
  scraper_name TEXT,
  set_at DATETIME,
  expires_at DATETIME,
  is_valid BOOLEAN,
  last_verified_at DATETIME,
  warning_threshold_days INTEGER
);

-- Smoke test results
scraper_smoke_tests (
  id INTEGER PRIMARY KEY,
  scraper_name TEXT,
  test_result TEXT,               -- "pass" or "fail"
  duration_ms INTEGER,
  tested_at DATETIME,
  error_message TEXT,
  response_time_ms INTEGER
);

-- View: Aggregated health metrics
scraper_health_status (
  scraper_name TEXT,
  status TEXT,                    -- "healthy", "degraded", "down", "disabled"
  success_rate_30d REAL,
  avg_duration_ms INTEGER,
  jobs_found_24h INTEGER,
  jobs_found_7d INTEGER,
  error_count_24h INTEGER,
  last_run_at DATETIME,
  health_score REAL               -- 0.0 to 1.0
);
```

**Tauri Commands**

```typescript
// Get health metrics for all scrapers
invoke('get_scraper_health')
// Returns: { scrapers: [ { name, status, success_rate, avg_duration, ... } ] }

// Get summary statistics
invoke('get_health_summary')
// Returns: { healthy: 11, degraded: 1, down: 1, total_jobs_24h: 2145 }

// Get run history for a specific scraper
invoke('get_scraper_runs', { scraper_name: 'linkedin', limit: 50 })
// Returns: [ { status, duration_ms, jobs_found, error_message, ... } ]

// Run smoke test for scraper
invoke('run_scraper_smoke_test', { scraper_name: 'linkedin' })
// Returns: { result: "pass", duration_ms: 2300, error: null }

// Run all smoke tests
invoke('run_all_smoke_tests')
// Returns: [ { scraper_name, result, duration_ms }, ... ]

// Check LinkedIn cookie health
invoke('get_linkedin_cookie_health')
// Returns: { valid: true, expires_at: '2026-01-17T00:00:00Z', days_until_expiry: 31 }

// Get all expiring credentials
invoke('get_expiring_credentials')
// Returns: [ { type, scraper, expires_at, days_until_expiry }, ... ]

// Enable/disable a scraper
invoke('set_scraper_enabled', { scraper_name: 'linkedin', enabled: false })

// Get scraper configuration
invoke('get_scraper_configs')
// Returns: [ { name, enabled, rate_limit, interval_minutes }, ... ]
```

---

## Best Practices

### Regular Maintenance

**Daily**

- Glance at dashboard summary - make sure mostly green
- If you see 🔴 down, check what's wrong

**Weekly**

- Click **Test All Scrapers** button for full diagnostic
- Review run history for patterns
- Check credential warnings

**Monthly**

- Review 30-day success rate trends
- Verify LinkedIn cookie (refresh if <30 days to expiry)
- Archive old run history if it gets unwieldy

### Optimizing Performance

**Reduce Scrape Frequency**

If you see lots of rate limit errors:

1. Settings → Scrapers → [Scraper Name]
2. Increase "Scrape Interval" from 30 min to 60 min
3. This gives rate limiter more time to refill tokens

**Focus on High-Value Sources**

Check which scrapers give you the best jobs:

1. Dashboard → Run History tab
2. Filter by scraper, sort by "Jobs Found"
3. Disable low-performing scrapers (not finding many jobs)
4. Disable scrapers that are frequently degraded

**Example**

```text
LinkedIn:     342 jobs (high quality) ✅ Keep enabled
Indeed:       289 jobs (high quality) ✅ Keep enabled
Greenhouse:   18 jobs (niche) ✅ Keep enabled
ZipRecruiter: 0 jobs (irrelevant) ❌ Could disable
```

### Reading Error Messages

**Rate Limit Errors (429)**

```text
HTTP 429 Too Many Requests
Rate Limit: 100 requests/hour
Next retry: in 15 seconds
```

→ Normal and expected. JobSentinel handles automatically.

**Authentication Errors (401)**

```text
HTTP 401 Unauthorized
Cookie: li_at expired or invalid
Action: Refresh LinkedIn cookie
```

→ You need to take action. Update your cookie.

**Network Errors (Timeout)**

```text
Connection timeout (30 seconds)
Could not reach linkedin.com
Retrying in exponential backoff
```

→ Usually temporary. Will retry automatically.

**Service Errors (503)**

```text
HTTP 503 Service Unavailable
LinkedIn is undergoing maintenance
Expected resolution: 2026-01-18 03:00 UTC
```

→ Job board's issue, not yours. Will retry.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.1.0** | Jan 2026 | Initial release: Dashboard, smoke tests, run history, credential tracking |
| **2.2.0** | Q2 2026 | Planned: Real-time alerts, predictive health scoring, multi-user support |

---

**Version:** 2.1.0 | **Last Updated:** January 17, 2026 | **Status:** ✅ Production Ready
