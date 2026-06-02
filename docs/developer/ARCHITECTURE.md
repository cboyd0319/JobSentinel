# Architecture Documentation

System architecture for JobSentinel.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Module Breakdown](#module-breakdown)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Principles](#design-principles)
- [Security Architecture](#security-architecture)

---

## Overview

JobSentinel is a **privacy-first, desktop-native job-search assistant** built with Rust
and Tauri. The application runs entirely on the user's machine with no cloud dependencies
(v1.0), ensuring complete data privacy and control.

### Key Characteristics

- **Desktop-first**: Native Windows/macOS/Linux application
- **Privacy-focused**: All data stored locally, no telemetry
- **Async-first**: Built on Tokio for efficient I/O
- **Type-safe**: Leverages Rust's type system for correctness
- **Modular**: Clean separation between core logic and platform code

---

## System Architecture

### High-Level Architecture

JobSentinel is split into these layers:

1. Frontend: React 19 screens such as Dashboard, Settings, and Job Browser.
2. IPC boundary: Tauri commands validate and route frontend requests.
3. Commands layer: handlers such as `search_jobs`, `get_config`, `get_recent_jobs`,
   `save_config`, `get_statistics`, and `validate_slack_webhook`.
4. Core business logic: scheduler, scoring, notification, scraper, database, and
   configuration modules.
5. Platform layer: Windows, macOS, and Linux path, tray, and notification adapters.

The frontend never reads or writes local job data directly. It calls typed Tauri
commands, and the Rust backend owns scraping, scoring, persistence, and external
notification delivery.

---

## Module Breakdown

### 1. Core (`src/core/`)

Platform-agnostic business logic shared by the desktop app across Windows,
macOS, and Linux.

#### `core/config/` (5 submodules)

**Purpose**: Configuration management

- Load/save user preferences
- Validate configuration values
- Provide sensible defaults
- Keep the in-memory runtime configuration in sync after settings are saved
- **Submodules:**
  - `types.rs` - Configuration types and structures
  - `validation.rs` - Configuration validation logic
  - `defaults.rs` - Default configuration values
  - `alerts.rs` - Alert configuration management
  - `loader.rs` - Configuration file I/O

**Key Types:**

```rust
pub struct Config {
    title_allowlist: Vec<String>,
    salary_floor_usd: i64,
    immediate_alert_threshold: f64,
    alerts: AlertConfig,
    // ...
}
```

**Validation Rules:**

- Salary: 0 ≤ value ≤ $10M
- Alert threshold: 0.0 ≤ value ≤ 1.0
- Scraping interval: 1h ≤ value ≤ 168h
- String lengths enforced
- URL format validation

#### `core/db/` (8 submodules + integrity/)

**Purpose**: SQLite database abstraction

- Job storage and retrieval
- Full-text search (FTS5)
- Statistics aggregation
- Data integrity validation
- **Submodules:**
  - `types.rs` - Database types (Job, Application, etc.)
  - `connection.rs` - Connection pool management
  - `crud.rs` - Create/Read/Update/Delete operations
  - `queries.rs` - Advanced query builders
  - `interactions.rs` - Job interaction tracking
  - `analytics.rs` - Analytics and aggregations
  - `ghost.rs` - Ghost job data storage
  - `tests.rs` - Database unit tests
  - `integrity/` - Data integrity checks (5 modules)
    - `validator.rs` - Data validation logic
    - `repair.rs` - Repair corrupted records
    - `migrations.rs` - Database migration helpers
    - `schema.rs` - Schema validation
    - `tests.rs` - Integrity tests

**Key Operations:**

```rust
upsert_job()        // Insert or update job
get_recent_jobs()   // Get N most recent jobs
get_jobs_by_score() // Filter by score threshold
search_jobs()       // Full-text search
get_statistics()    // Aggregate stats
```

**Schema:**

```sql
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    score REAL,
    created_at TEXT NOT NULL,
    -- ...
);

CREATE VIRTUAL TABLE jobs_fts USING fts5(
    title, company, description
);
```

#### `core/scrapers/`

**Purpose**: Job board scraping (13 sources)

- **Greenhouse** - ATS scraper with HTML fetch and public API fallback
- **Lever** - ATS public API scraper
- **LinkedIn** - Session cookie authentication
- **RemoteOK** - JSON API
- **WeWorkRemotely** - RSS feed parsing
- **BuiltIn** - Tech jobs and remote jobs (HTML)
- **HN Who's Hiring** - Algolia API for monthly threads
- **JobsWithGPT** - API client
- **Dice** - Tech jobs scraper
- **YC Startup Jobs** - Y Combinator startup opportunities
- **USAJobs** - Official USAJobs.gov API
- **SimplyHired** - HTML scraper
- **Glassdoor** - HTML scraper

**Architecture:**

```rust
#[async_trait]
pub trait JobScraper: Send + Sync {
    async fn scrape(&self) -> ScraperResult;
    fn name(&self) -> &'static str;
}

// Error handling with ScraperError
pub type ScraperResult = Result<Vec<Job>, ScraperError>;
```

**Error Handling:**

All scrapers use `ScraperError` for structured error handling with:

- HTTP request/status errors
- Rate limiting detection
- CAPTCHA and bot protection detection
- Parse errors with context
- User-friendly error messages

**Hash Computation:**

```rust
SHA-256(company + title + location + url)
```

**Rate Limiting:**

- 2 second delay between companies
- 30 second timeout per request
- 16 MiB decoded response body cap for external fetches that parse remote bodies

#### `core/scoring/`

**Purpose**: Multi-factor job scoring

- Weighted scoring algorithm
- Configurable factors

**Algorithm:**

```rust
total_score = (
    skills_match   * 0.40 +
    salary_match   * 0.25 +
    location_match * 0.20 +
    company_match  * 0.05 +
    recency_boost  * 0.10
)
```

#### `core/credentials/`

**Purpose**: OS password-store boundary

- Frontend reaches saved secrets only through Tauri credential commands.
- Backend notification and source code uses `CredentialStore` directly.
- Both paths use service name `JobSentinel` and `jobsentinel_*` storage keys.
- Legacy LinkedIn entries are retained only for cleanup and redaction, not new
  storage.

**Key Types:**

```rust
pub enum CredentialKey {
    SmtpPassword,
    TelegramBotToken,
    SlackWebhook,
    DiscordWebhook,
    TeamsWebhook,
    LinkedInCookie,
    LinkedInCookieExpiry,
    UsaJobsApiKey,
}
```

**Saved details:**

- Email app password
- Telegram setup code
- Slack, Discord, and Teams connection links
- USAJobs access code
- Legacy LinkedIn entries for cleanup and redaction only

See [Security: Keyring Integration](../security/KEYRING.md) for full documentation.

#### `core/notify/`

**Purpose**: Alert notifications

- Slack, Discord, and Teams chat alerts
- Email alerts
- Desktop alerts through Tauri
- Saved alert details resolved inside backend code when needed

**Security:**

- Connection-link validation before save and send.
- HTTPS and host/path checks for chat-alert links.
- Saved secret values are not returned to the renderer.
- External alerts omit local match reasons, private notes, salary-floor details,
  and application history.

#### `core/ghost/`

**Purpose**: Ghost job detection (v1.4)

- Flags stale, reposted, already-filled, and low-trust job postings
- Multi-signal analysis (age, reposts, content, requirements)
- Ghost score 0.0-1.0

**Signals Analyzed:**

- Stale postings (60+ days old)
- Repost frequency tracking
- Generic/vague descriptions
- Unrealistic requirements
- Company excessive openings

#### `core/ats/` (5 submodules)

**Purpose**: Application Tracking System

- Kanban board with 12 status columns
- Automated follow-up reminders
- Timeline/audit trail
- Ghosting detection (2 weeks no contact)
- Interview scheduling with iCal export
- **Submodules:**
  - `types.rs` - Application and status types
  - `crud.rs` - Application CRUD operations
  - `reminders.rs` - Reminder scheduling and tracking
  - `ghosting.rs` - Ghosting detection logic
  - `interviews.rs` - Interview scheduling and iCal export

#### `core/user_data/`

**Purpose**: User data persistence (v1.4)

- Cover letter templates with categories
- Interview prep checklists
- Follow-up reminder tracking
- Saved search filters
- Search history (unlimited)
- Notification preferences

**Migration:** Includes localStorage to SQLite migration for existing users.

SQLite is authoritative for job-search records and durable preferences. Frontend
localStorage remains available only for non-authoritative UI preferences, cached
lookup results, sanitized error reports, and transient recovery hints.

#### `core/resume/`

**Purpose**: Local resume fit review and parsing

- PDF, DOCX, TXT, and Markdown resume parsing
- Skill extraction
- Job-resume matching with confidence scores

#### `core/salary/`

**Purpose**: Pay protection and salary transparency

- H1B data-based predictions
- Salary benchmarks by role/location
- Negotiation question drafting
- Offer comparison

#### `core/market_intelligence/` (4 submodules)

**Purpose**: Market Analytics

- Daily market snapshots
- Skill demand trends
- Company hiring velocity
- Location job density
- Hiring trend alerts for anomalies
- **Submodules:**
  - `types.rs` - Market analytics types
  - `trends.rs` - Trend analysis and tracking
  - `analysis.rs` - Market snapshot generation
  - `alerts.rs` - Anomaly detection and alerts

#### `core/automation/` (v2.0)

**Purpose**: Application Assist form preparation

- Human-in-the-loop design (user clicks Submit manually)
- Application profile management
- Saved screening answers
- ATS platform detection and specialized selectors
- Visible browser control via Chrome DevTools Protocol
- Resume file selection through backend-owned native dialog, copied into
  app-owned local storage, with only token/display data crossing renderer IPC

**Key Components:**

- `mod.rs` - Module organization and exports
- `profile.rs` - Application profile and screening answer management
- `browser.rs` - Browser control via chromiumoxide
- `form_filler.rs` - Form field detection and filling
- `ats_detector.rs` - ATS platform detection (7 platforms)

**Supported ATS Platforms:**

- Greenhouse (`boards.greenhouse.io`)
- Lever (`jobs.lever.co`)
- Workday (`myworkdayjobs.com`, `workday.com`)
- Taleo (`taleo.net`)
- iCIMS (`icims.com`)
- BambooHR (`bamboohr.com`)
- Ashby (`ashbyhq.com`, `jobs.ashby.io`)

**Key Types:**

```rust
pub struct ApplicationProfile {
    full_name: String,
    email: String,
    phone: Option<String>,
    linkedin_url: Option<String>,
    github_url: Option<String>,
    // ... work authorization, settings
}

pub struct ScreeningAnswer {
    question_pattern: String,  // Question text to match
    answer: String,
    answer_type: AnswerType,  // text, yes/no, select
}
```

**Safety Features:**

- Never clicks Submit (user always decides)
- CAPTCHA detection with user prompts
- Review pace limit
- Visible browser window (no headless mode)
- Resume attachment remains manual; Application Assist does not upload saved
  resume files automatically

See [Application Assist Feature](../features/one-click-apply.md) for full documentation.

#### `core/scheduler/`

**Purpose**: Automated job scraping

- Configurable interval (1-168 hours)
- Graceful shutdown
- Error recovery
- **Submodules:**
  - `types.rs` - Scheduler types and state
  - `pipeline.rs` - Scraping pipeline orchestration
  - `workers/scrapers.rs` - Scraper execution worker
  - `workers/scoring.rs` - Job scoring and ghost detection worker
  - `workers/persistence.rs` - Database persistence and notification worker
  - `workers/mod.rs` - Worker module exports
  - `tests.rs` - Scheduler unit tests

**Workflow:**

1. Scheduler fires on the configured interval.
2. Scraper workers query enabled sources in parallel, including Greenhouse, Lever,
   LinkedIn, RemoteOK, WeWorkRemotely, BuiltIn, HN Hiring, JobsGPT, Dice, YC Startup
   Jobs, USAJobs, SimplyHired, and Glassdoor.
3. Scoring workers apply multi-factor scoring.
4. Persistence workers upsert jobs into SQLite.
5. Notification workers send alerts through configured Slack, Discord, Teams, or email
   channels when scores meet the alert threshold.

### 2. Commands (`src/commands/`)

Tauri command handlers (RPC interface between React and Rust). The registered
command list lives in `src-tauri/src/main.rs`; `npm run lint:tauri-invokes`
checks frontend invocations and command-count documentation drift.

**Core Commands:**

```rust
search_jobs()              // Trigger manual scrape
get_recent_jobs(limit)     // Get N recent jobs
get_job_by_id(id)          // Get specific job
get_config()               // Get user config
get_dashboard_preferences() // Get minimal Dashboard-only preferences
save_config(config)        // Save user config
validate_slack_webhook()   // Test webhook
get_statistics()           // Get aggregate stats
get_scraping_status()      // Get scheduler status
// ... plus setup, search, bookmarks, notes
```

**Ghost Detection (3):**

```rust
get_ghost_jobs()           // Get flagged ghost jobs
get_ghost_statistics()     // Detection stats
get_recent_jobs_filtered() // Filter by ghost status
```

**ATS Commands:**

```rust
create_application(), get_applications_kanban(),
update_application_status(), add_application_notes(),
get_pending_reminders(), complete_reminder(),
detect_ghosted_applications(), schedule_interview(),
get_upcoming_interviews(), complete_interview()
```

**User Data Commands:**

```rust
// Templates
list_cover_letter_templates(), create_cover_letter_template(),
update_cover_letter_template(), delete_cover_letter_template(),
// Interview Prep
get_interview_prep_checklist(), save_interview_prep_item(),
get_interview_followup(), save_interview_followup(),
// Saved Searches
list_saved_searches(), create_saved_search(),
use_saved_search(), delete_saved_search(),
// Notifications & History
get_notification_preferences(), save_notification_preferences(),
add_search_history(), get_search_history(), clear_search_history()
```

Notification preference command payloads use the current `prefs` shape. Keep
developer references aligned with this form and keep the user-facing Local
Job-Search Data guide free of command examples:

```ts
invoke("save_notification_preferences", {
  prefs: {
    indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
    global: { desktopEnabled: true },
    advancedFilters: {},
  },
});
```

**Resume/Salary/Market (15):**

```rust
// Resume: upload, get_active, set_active, get_skills, match, get_match_result
// Salary: predict, benchmark, negotiate, compare
// Market: trends, companies, locations, alerts, analysis
```

Resume list and active-resume commands return renderer-safe summaries. Keep
local file paths and parsed resume text out of renderer DTOs:

```rust
pub struct ResumeSummary {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**Automation Commands:**

```rust
// Application Profile
upsert_application_profile(), get_application_profile(),
has_application_profile(), get_application_profile_preview(),
// Screening Answers
upsert_screening_answer(), get_screening_answers(),
delete_screening_answer(), find_answer_for_question(),
// Automation Attempts
create_automation_attempt(), get_automation_attempt(),
approve_automation_attempt(), cancel_automation_attempt(),
get_pending_attempts(), get_automation_stats(),
// ATS Detection
detect_ats_platform(), detect_ats_from_html(),
// Browser Control
launch_automation_browser(), close_automation_browser(),
is_browser_running(), fill_application_form()
```

**Error Handling:**

- All commands return `Result<T, String>`
- Errors logged with `tracing`
- User-friendly error messages
- Renderer-facing commands use the smallest practical DTO. Non-settings
  application assist screens use `has_application_profile` or
  `get_application_profile_preview`; the full profile response is for the
  settings editor. Dashboard reads `get_dashboard_preferences` instead of full
  config. Job imports canonicalize URLs before preview/hash/storage and
  `import_job_from_url` returns only `{ jobId }`.

### 3. Platforms (`src/platforms/`)

OS-specific code (conditionally compiled).

**Windows:**

```rust
get_data_dir()    // %LOCALAPPDATA%\JobSentinel
get_config_dir()  // %APPDATA%\JobSentinel
```

**macOS:**

```rust
get_data_dir()    // ~/Library/Application Support/JobSentinel
get_config_dir()  // ~/.config/jobsentinel
get_cache_dir()   // ~/Library/Caches/JobSentinel
get_logs_dir()    // ~/Library/Logs/JobSentinel
```

**Linux:**

```rust
get_data_dir()    // ~/.local/share/jobsentinel
get_config_dir()  // ~/.config/jobsentinel
```

---

## Data Flow

### Complete Scraping Cycle

1. User triggers a scrape or the scheduler fires.
2. `Scheduler::run_scraping_cycle()` snapshots the current runtime configuration.
3. The scheduler starts scraper workers for configured sources.
4. Each scraper parses HTML or JSON into `Vec<Job>`.
5. For each job, the backend computes a SHA-256 hash, scores the job, and upserts it
   into the database.
6. The notification layer selects jobs meeting the configured alert threshold.
7. Each unsent high-scoring job can produce an alert through the configured channels.
8. The command returns the result summary to the UI.

### Configuration Flow

1. User edits configuration in the UI.
2. Frontend calls `save_config(config)`.
3. Rust validates the configuration.
4. Valid configuration is saved to `~/.config/jobsentinel/config.json`.
5. The shared runtime configuration is updated after the disk save succeeds.
6. Manual searches, scheduled source checks, source-status smoke tests, scoring,
   posting-risk settings, and support-report summaries read the updated runtime
   configuration without requiring an app restart.
7. Invalid configuration returns an error with details for the UI.

---

## Technology Stack

### Backend (Rust)

| Category           | Technology         | Purpose                       |
| ------------------ | ------------------ | ----------------------------- |
| **Framework**      | Tauri 2.x          | Desktop app framework         |
| **Async Runtime**  | Tokio              | Async I/O and scheduling      |
| **Database**       | SQLite (sqlx)      | Local data storage            |
| **HTTP Client**    | reqwest            | Web scraping                  |
| **HTML Parser**    | scraper            | Parse job boards              |
| **Serialization**  | serde + serde_json | Config and data serialization |
| **Error Handling** | thiserror + anyhow | Structured error handling     |
| **Logging**        | tracing            | Structured logging            |
| **Hashing**        | sha2               | Job deduplication             |

### Frontend (React)

| Category       | Technology   | Purpose                   |
| -------------- | ------------ | ------------------------- |
| **Framework**  | React 19     | UI framework              |
| **Language**   | TypeScript   | Type-safe JavaScript      |
| **Build Tool** | Vite         | Fast dev server and build |
| **Styling**    | Tailwind CSS | Utility-first CSS         |

### Frontend Boundary Policy

`scripts/check-frontend-boundaries.mjs` enforces production import boundaries.
Run `npm run lint:architecture` directly, or `npm run harness:check` as part of
the broader agent harness.

- Shared layers (`components`, `contexts`, `hooks`, `services`, `utils`,
  `types`, and `config`) must not import page modules.
- Utilities and services must stay outside UI and app-state layers.
- Page modules may compose shared layers and page-local modules such as
  `src/pages/DashboardUI` and `src/pages/hooks`.
- Tests, mocks, stories, and test setup files are excluded from this production
  architecture sensor.

---

## Design Principles

### 1. **Separation of Concerns**

- **Core**: Platform-agnostic business logic
- **Commands**: Thin RPC layer (no business logic)
- **Platforms**: OS-specific code only
- **Frontend shared layers**: Components, hooks, contexts, services, utilities,
  types, and config stay reusable and independent from page modules.

### 2. **Dependency Inversion**

```rust
// Good: core depends on abstractions
#[async_trait]
pub trait JobScraper: Send + Sync {
    async fn scrape(&self) -> ScraperResult;
}

// Bad: core depends on concrete types
pub struct GreenhouseScraper { ... }
```

### 3. **Error Handling**

- Use domain-specific errors (`ScraperError`, `DatabaseError`, `AutomationError`)
- All errors implement structured error types with `thiserror`
- Provide user-friendly messages with `.user_message()` method
- Sanitize URLs and sensitive data in error messages
- Never use `.unwrap()` in production code
- Always provide context with errors

**Example:**

```rust
// ScraperError provides rich context
let result = scraper.scrape().await;
match result {
    Ok(jobs) => { /* ... */ },
    Err(e) => {
        tracing::error!("Scraper failed: {}", e);
        // User-friendly message for UI
        let msg = e.user_message();
        // Check if error is retryable
        if e.is_retryable() {
            // Implement retry logic
        }
    }
}
```

### 4. **Async-First**

- Use `async/await` for I/O operations
- Avoid blocking the async runtime
- Use `tokio::spawn` for CPU-intensive work

### 5. **Security by Default**

- Input validation at boundaries
- No hardcoded secrets
- HTTPS only for webhooks
- Domain allowlisting

---

## Security Architecture

### Threat Model

| Threat                | Mitigation                                   |
| --------------------- | -------------------------------------------- |
| **Data exfiltration** | Webhook URL validation and provider allowlists |
| **SQL injection**     | Parameterized queries (sqlx)                 |
| **XSS**               | No eval(), sanitized HTML parsing            |
| **Secrets in code**   | No hardcoded secrets, user-provided webhooks |
| **Untrusted input**   | Strict validation (lengths, formats, ranges) |

### Security Layers

1. **Input Validation**
   - Config validation (strict limits)
   - URL validation (format + domain allowlisting)
   - URL format enforcement: Greenhouse URLs must start with `https://boards.greenhouse.io/`
   - String length limits (max 500 chars for URLs)
   - XSS prevention in resume HTML generation with `escape_html()`

2. **Database Security**
   - Parameterized queries (no string concatenation)
   - Transaction isolation
   - Field length validation
   - XSS prevention: `javascript:` protocol validation in URLs

3. **Network Security**
   - HTTPS only for external requests
   - URL validation with domain allowlisting
   - 30 second timeouts
   - User-Agent headers
   - Domain allowlisting for webhooks
   - URL sanitization in error messages (removes query params)

4. **Data Privacy**
   - All data stored locally
   - Job-search records and durable preferences are stored in SQLite
   - Browser localStorage is limited to UI preferences, caches, sanitized error
     reports, and transient recovery hints
   - No telemetry
   - No cloud dependencies by default

---

## Performance Characteristics

| Operation             | Latency | Notes                     |
| --------------------- | ------- | ------------------------- |
| Config load           | <1ms    | File read + JSON parse    |
| Job upsert            | <5ms    | SQLite with indexes       |
| Job search            | <10ms   | FTS5 indexed search       |
| Scrape single company | 1-5s    | Network dependent         |
| Score single job      | <1ms    | Pure computation          |
| Full scraping cycle   | 30-120s | Depends on # of companies |
