# Architecture Documentation

**JobSentinel v2.6.3 System Architecture**

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

JobSentinel is a **privacy-first, desktop-native job search automation tool** built with Rust
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

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Dashboard   │  │    Settings   │  │  Job Browser  │      │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘      │
│          │                  │                  │                │
│          └──────────────────┴──────────────────┘                │
│                             │                                   │
│                    Tauri IPC (Commands)                         │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     Backend (Rust/Tauri)                        │
│  ┌─────────────────────────┴───────────────────────────┐       │
│  │          Commands Layer (Tauri RPC)                 │       │
│  │  - search_jobs      - get_config                    │       │
│  │  - get_recent_jobs  - save_config                   │       │
│  │  - get_statistics   - validate_slack_webhook        │       │
│  └──────────────┬──────────────────────────────────────┘       │
│                 │                                               │
│  ┌──────────────┴──────────────────────────────────────┐       │
│  │               Core Business Logic                   │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │       │
│  │  │ Scheduler│  │  Scoring │  │  Notify  │          │       │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │       │
│  │       │             │             │                 │       │
│  │  ┌────┴──────┬──────┴───────┬─────┴────┐           │       │
│  │  │ Scrapers  │   Database   │  Config  │           │       │
│  │  │-Greenhouse│   (SQLite)   │  (JSON)  │           │       │
│  │  │-Lever     │              │          │           │       │
│  │  │-JobsGPT   │              │          │           │       │
│  │  └───────────┴──────────────┴──────────┘           │       │
│  └─────────────────────────────────────────────────────┘       │
│                             │                                   │
│  ┌─────────────────────────┴───────────────────────────┐       │
│  │         Platform-Specific Layer                     │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │       │
│  │  │ Windows  │  │  macOS   │  │  Linux   │          │       │
│  │  │ - Paths  │  │ - Paths  │  │ - Paths  │          │       │
│  │  │ - Tray   │  │ - Tray   │  │ - Tray   │          │       │
│  │  │ - Notify │  │ - Notify │  │ - Notify │          │       │
│  │  └──────────┘  └──────────┘  └──────────┘          │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### 1. Core (`src/core/`)

Platform-agnostic business logic that can run on any OS or in the cloud.

#### `core/config/` (5 submodules)

**Purpose**: Configuration management

- Load/save user preferences
- Validate configuration values
- Provide sensible defaults
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

- **Greenhouse** - ATS scraper (HTML)
- **Lever** - ATS scraper (HTML)
- **LinkedIn** - Session cookie authentication
- **RemoteOK** - JSON API
- **WeWorkRemotely** - RSS feed parsing
- **BuiltIn** - City-specific tech jobs (HTML)
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

#### `core/credentials/` (NEW in v2.0)

**Purpose**: Secure credential storage

- OS-native keyring integration
- macOS Keychain, Windows Credential Manager, Linux Secret Service
- Dual-access pattern: Tauri plugin for frontend, keyring crate for backend

**Key Types:**

```rust
pub enum CredentialKey {
    SmtpPassword,
    TelegramBotToken,
    SlackWebhookUrl,
    DiscordWebhookUrl,
    TeamsWebhookUrl,
    LinkedInSessionCookie,
}

pub struct CredentialStore {
    service_name: String,  // "com.jobsentinel.app"
}
```

**Credentials Secured:**

- SMTP password (email notifications)
- Telegram bot token
- Slack/Discord/Teams webhook URLs
- LinkedIn session cookie

See [Security: Keyring Integration](../security/KEYRING.md) for full documentation.

#### `core/notify/`

**Purpose**: Alert notifications

- Slack, Discord, Teams webhooks
- Email via SMTP
- Desktop notifications via Tauri
- **Credentials fetched from keyring at runtime** (v2.0+)

**Security:**

- Webhook URL validation
- HTTPS enforcement
- Domain allowlisting
- Secure credential storage via keyring

#### `core/ghost/`

**Purpose**: Ghost job detection (v1.4)

- Identifies fake/stale/already-filled job postings
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

**Migration:** Includes localStorage → SQLite migration for existing users.

#### `core/resume/`

**Purpose**: AI Resume-Job Matcher

- PDF resume parsing
- Skill extraction
- Job-resume matching with confidence scores

#### `core/salary/`

**Purpose**: Salary AI

- H1B data-based predictions
- Salary benchmarks by role/location
- Negotiation script generation
- Offer comparison

#### `core/market_intelligence/` (4 submodules)

**Purpose**: Market Analytics

- Daily market snapshots
- Skill demand trends
- Company hiring velocity
- Location job density
- Market alerts for anomalies
- **Submodules:**
  - `types.rs` - Market analytics types
  - `trends.rs` - Trend analysis and tracking
  - `analysis.rs` - Market snapshot generation
  - `alerts.rs` - Anomaly detection and alerts

#### `core/automation/` (NEW in v2.0)

**Purpose**: One-Click Apply form filling automation

- Human-in-the-loop design (user clicks Submit manually)
- Application profile management
- Screening question auto-answers
- ATS platform detection and specialized selectors
- Browser automation via Chrome DevTools Protocol

**Key Components:**

- `mod.rs` - Module organization and exports
- `profile.rs` - Application profile and screening answer management
- `browser.rs` - Browser control via chromiumoxide
- `form_filler.rs` - Form field detection and filling
- `ats_detection.rs` - ATS platform detection (7 platforms)

**Supported ATS Platforms:**

- Greenhouse (`boards.greenhouse.io`)
- Lever (`jobs.lever.co`)
- Workday (`myworkday.com`, `workday.com`)
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
    question_pattern: String,  // Regex pattern
    answer: String,
    answer_type: AnswerType,  // text, yes/no, select
}
```

**Safety Features:**

- Never auto-submits (user always clicks Submit)
- CAPTCHA detection with user prompts
- Rate limiting (configurable max applications/day)
- Visible browser window (no headless mode)

See [One-Click Apply Feature](../features/one-click-apply.md) for full documentation.

#### `core/scheduler/` (7 submodules)

**Purpose**: Automated job scraping

- Configurable interval (1-168 hours)
- Graceful shutdown
- Error recovery
- **Submodules:**
  - `types.rs` - Scheduler types and state
  - `pipeline.rs` - Scraping pipeline orchestration
  - `workers/scraper.rs` - Scraper worker threads
  - `workers/scorer.rs` - Job scoring worker
  - `workers/notifier.rs` - Notification worker
  - `workers/mod.rs` - Worker pool management
  - `tests.rs` - Scheduler unit tests

**Workflow:**

```text
┌──────────────┐
│  Schedule    │
│  (every 2h)  │
└──────┬───────┘
       │
       v
┌──────────────┐
│ Scrape All   │──> 13 sources in parallel:
│   Sources    │    Greenhouse, Lever, LinkedIn, RemoteOK,
│              │    WeWorkRemotely, BuiltIn, HN Hiring,
│              │    JobsGPT, Dice, YC Startup Jobs,
│              │    USAJobs, SimplyHired, Glassdoor
└──────┬───────┘
       │
       v
┌──────────────┐
│  Score Jobs  │──> Multi-factor scoring
└──────┬───────┘
       │
       v
┌──────────────┐
│  Store in DB │──> SQLite (upsert)
└──────┬───────┘
       │
       v
┌──────────────┐
│ Send Alerts  │──> Slack/Discord/Teams/Email (if score >= threshold)
└──────────────┘
```

### 2. Commands (`src/commands/`)

Tauri command handlers (RPC interface between React and Rust). **169 total commands.**

**Core Commands (18):**

```rust
search_jobs()              // Trigger manual scrape
get_recent_jobs(limit)     // Get N recent jobs
get_job_by_id(id)          // Get specific job
get_config()               // Get user config
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

**ATS Commands (10):**

```rust
create_application(), get_applications_kanban(),
update_application_status(), add_application_notes(),
get_pending_reminders(), complete_reminder(),
detect_ghosted_applications(), schedule_interview(),
get_upcoming_interviews(), complete_interview()
```

**User Data Commands (20):**

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

**Resume/Salary/Market (15):**

```rust
// Resume: upload, get_active, set_active, get_skills, match, get_match_result
// Salary: predict, benchmark, negotiate, compare
// Market: trends, companies, locations, alerts, analysis
```

**Automation Commands (18):** (NEW in v2.0)

```rust
// Application Profile
upsert_application_profile(), get_application_profile(),
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

```text
1. User triggers scrape OR scheduler fires
   │
   v
2. Scheduler::run_scraping_cycle()
   │
   ├──> Scrape Greenhouse companies (parallel)
   ├──> Scrape Lever companies (parallel)
   └──> Scrape JobsWithGPT (parallel)
   │
   v
3. Parse HTML/JSON → Vec<Job>
   │
   v
4. For each job:
   ├──> Compute SHA-256 hash
   ├──> Score job (multi-factor)
   └──> Store in database (upsert)
   │
   v
5. Get high-scoring jobs (score >= threshold)
   │
   v
6. For each high-scoring job:
   └──> Send Slack notification (if not already sent)
   │
   v
7. Return results to UI
```

### Configuration Flow

```text
User edits config in UI
   │
   v
Frontend calls save_config(config)
   │
   v
Rust validates config
   │
   ├──> Valid: Save to ~/.config/jobsentinel/config.json
   └──> Invalid: Return error with details
```

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

---

## Design Principles

### 1. **Separation of Concerns**

- **Core**: Platform-agnostic business logic
- **Commands**: Thin RPC layer (no business logic)
- **Platforms**: OS-specific code only

### 2. **Dependency Inversion**

```rust
// Good ✅: Core depends on abstractions
#[async_trait]
pub trait JobScraper: Send + Sync {
    async fn scrape(&self) -> ScraperResult;
}

// Bad ❌: Core depends on concrete types
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
| **Data exfiltration** | Webhook URL validation (only slack.com)      |
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
   - No telemetry
   - No cloud dependencies (v1.0)

---

## Cloud Architecture (not implemented)

### Cloud Deployment

```text
┌──────────────┐
│   Desktop    │ ──┐
│     App      │   │
└──────────────┘   │
                   ├──> Load Balancer
┌──────────────┐   │
│   Web App    │ ──┘
│   (React)    │
└──────────────┘
        │
        v
┌──────────────────────────────┐
│   Cloud Backend (GCP/AWS)    │
│  ┌────────────────────────┐  │
│  │  Compute (Cloud Run)   │  │
│  │  - Job scrapers        │  │
│  │  - Scoring engine      │  │
│  │  - Notifications       │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  Storage               │  │
│  │  - PostgreSQL (jobs)   │  │
│  │  - Redis (cache)       │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Multi-Tenant Architecture

- Shared scraper pool (cost optimization)
- Per-user scoring and notifications
- User authentication (OAuth)
- Encrypted user data

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

---

**Last Updated**: January 25, 2026
**Version**: 2.6.3
**Maintained By**: The Rust Mac Overlord 🦀
