# Scraper Health Monitoring System

## Overview

Implement comprehensive scraper health monitoring to track all 13 job scrapers, add retry logic, provide live smoke tests, and warn about credential expiry.

## Goals

1. **Wire all 13 scrapers** into the scheduler (currently only 5)
2. **Track scraper health** - success/failure, duration, jobs found per run
3. **Add retry logic** - exponential backoff for transient failures (429, 503)
4. **Live smoke tests** - optional single-request tests to verify APIs work
5. **Selector health checks** - verify HTML scrapers can still parse pages
6. **LinkedIn cookie expiry warning** - alert when approaching 1-year expiry
7. **Frontend dashboard** - display health metrics in Settings

---

## Implementation

### 1. Database Schema (New Migration)

**File:** `src-tauri/migrations/20260118000000_add_scraper_health.sql`

**Tables:**
- `scraper_runs` - Track each execution (scraper_name, started_at, duration_ms, status, jobs_found, error_message, retry_attempt)
- `scraper_health_metrics` - Daily aggregates (success_rate, avg_duration, last_success)
- `scraper_config` - Scraper metadata (display_name, is_enabled, scraper_type, rate_limit, selector_health)
- `credential_health` - Track credential age/expiry (created_at, last_validated, expires_at, status)
- `scraper_smoke_tests` - Test results (test_type, status, duration_ms, error)

**View:** `scraper_health_status` - Live health status joining runs + config

---

### 2. Rust Module Structure

**New module:** `src-tauri/src/core/health/`

```
health/
├── mod.rs              # HealthManager, exports
├── types.rs            # ScraperRun, HealthMetrics, SmokeTestResult, CredentialHealth
├── tracking.rs         # Record run start/complete/fail
├── metrics.rs          # Calculate success_rate, avg_duration
├── retry.rs            # RetryConfig, with_retry() exponential backoff
├── smoke_tests.rs      # Live API connectivity tests
├── selector_check.rs   # HTML selector validation
├── credential_health.rs # LinkedIn cookie expiry tracking
└── tests.rs
```

**Key Types:**
- `RunStatus`: Running | Success | Failure | Timeout
- `HealthStatus`: Healthy | Degraded | Down | Disabled
- `SelectorHealth`: Healthy | Degraded | Broken | Unknown
- `CredentialStatus`: Valid | Expiring | Expired | Unknown

---

### 3. Retry Logic

**File:** `src-tauri/src/core/health/retry.rs`

```rust
pub struct RetryConfig {
    max_attempts: 3,
    initial_delay_ms: 1000,
    max_delay_ms: 30000,
    backoff_multiplier: 2.0,
    retryable_codes: [429, 500, 502, 503, 504],
}

pub async fn with_retry<F>(config, scraper_name, operation) -> Result<T>
```

Retries on: timeout, 429, 503, connection errors

---

### 4. Wire All 13 Scrapers

**File:** `src-tauri/src/core/scheduler/workers/scrapers.rs`

**Currently wired (5):** Greenhouse, Lever, LinkedIn, Indeed, JobsWithGPT

**Add (8):**
- RemoteOK - title tags + limit
- WeWorkRemotely - category + limit
- BuiltIn - city + category
- Dice - query + location
- HN Who's Hiring - remote filter
- Wellfound - query + remote
- YC Startup - query + filters
- ZipRecruiter - query + location

**Config additions needed:**
- `remoteok_enabled`, `weworkremotely_enabled`, etc.
- Or use `additional_scrapers: Vec<String>` to enable by name

---

### 5. New Tauri Commands (7)

**File:** `src-tauri/src/commands/health.rs`

| Command | Description |
|---------|-------------|
| `get_scraper_health` | All scrapers with health status |
| `get_scraper_runs` | Recent runs for a scraper |
| `run_scraper_smoke_test` | Test single scraper |
| `run_all_smoke_tests` | Test all scrapers |
| `get_linkedin_cookie_health` | Cookie expiry status |
| `set_scraper_enabled` | Enable/disable scraper |
| `get_scraper_config` | All scraper configs |

---

### 6. Frontend Components

**New:** `src/components/ScraperHealthDashboard.tsx`

**Features:**
- Summary stats: Healthy/Degraded/Down counts, Jobs Found Today
- LinkedIn cookie expiry warning banner (yellow, shows days remaining)
- Scraper list with status icons, success rate, avg duration, last error
- "Run Smoke Test" button per scraper
- "Run All Smoke Tests" button

**Integration:** Add section to `src/pages/Settings.tsx`

---

### 7. Config Changes

**File:** `src-tauri/src/core/config/types.rs`

Add:
```rust
pub struct ScraperSettings {
    pub remoteok: ScraperToggle,
    pub weworkremotely: ScraperToggle,
    pub builtin: BuiltInConfig,
    pub dice: DiceConfig,
    pub hn_hiring: HnHiringConfig,
    pub wellfound: WellfoundConfig,
    pub yc_startup: YcStartupConfig,
    pub ziprecruiter: ZipRecruiterConfig,
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/migrations/` | Add `20260118000000_add_scraper_health.sql` |
| `src-tauri/src/core/mod.rs` | Add `pub mod health;` |
| `src-tauri/src/core/health/` | New module (8 files) |
| `src-tauri/src/commands/mod.rs` | Add `pub mod health;` + register commands |
| `src-tauri/src/commands/health.rs` | New file (7 commands) |
| `src-tauri/src/core/scheduler/workers/scrapers.rs` | Wire all 13 scrapers, add health tracking |
| `src-tauri/src/core/scheduler/pipeline.rs` | Integrate health tracking |
| `src-tauri/src/core/config/types.rs` | Add scraper toggle configs |
| `src-tauri/src/main.rs` | Register new commands |
| `src/components/ScraperHealthDashboard.tsx` | New component |
| `src/pages/Settings.tsx` | Add Scraper Health section |
| `CHANGELOG.md` | Document new feature |
| `docs/README.md` | Update command count |

---

## Verification

1. **Run tests:** `cd src-tauri && cargo test core::health`
2. **Build check:** `cargo check`
3. **Run app:** `npm run tauri:dev`
4. **Verify in UI:**
   - Open Settings → Scraper Health section
   - See all 13 scrapers listed with status
   - Run smoke test on one scraper
   - Check LinkedIn cookie warning appears if cookie is old
5. **Test retry:** Simulate 429 response and verify retry with backoff
6. **Test metrics:** Run scraping cycle, verify runs recorded in DB

---

## Estimated Scope

- **Database:** 1 migration file (~100 lines)
- **Rust:** ~800 lines across 8 health module files
- **Commands:** ~100 lines
- **Frontend:** ~300 lines for dashboard component
- **Config:** ~50 lines for new settings

**Total:** ~1,350 lines of new code
