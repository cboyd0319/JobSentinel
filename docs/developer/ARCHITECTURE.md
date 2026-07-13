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
and Tauri. User data is stored locally by default. External alerts, support links,
USAJobs access, GitHub issue links, Google Drive export, and external AI providers run
only after the user explicitly turns on and configures those paths.

### Key Characteristics

- **Desktop-first**: Native Windows/macOS/Linux application
- **Privacy-focused**: Local-first storage, no telemetry, and opt-in external channels
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

### Layer Model And Cross-Cutting Boundaries

The layers form a one-directional dependency model. Lower layers must not depend
on higher layers, and the frontend must not bypass the IPC boundary.

```text
UI (React) -> IPC (Tauri commands) -> Core services -> Storage and sources
```

Cross-cutting concerns enter through one named boundary each, not ad hoc across
layers:

| Concern | Approved boundary | Rule |
| ------- | ----------------- | ---- |
| Logging | Structured logger boundary | No ad hoc `console` in shipped paths; never log secrets or user data |
| External AI | `src/services/aiGateway.ts` | All external AI routes through the privacy-first gateway, disabled by default |
| Credentials | OS keyring | No plaintext secret storage; passive views must not probe saved secrets |
| External APIs and sources | Scraper and source adapters | Rate limits, error handling, and source boundaries apply |
| Configuration | Typed config and settings | No scattered environment reads in the UI |

Enforcement lives in `npm run lint:architecture`, `npm run lint:tauri-invokes`,
`ipc-minimization.mjs`, `npm run lint:external-ai`, and the privacy-logging
sensor. The sensor registry in `../harness/harness-map.md` maps each rule to its
owning command.

---

## Module Breakdown

### Core (`src/core/`)

Detailed core module inventory lives in [Core Architecture](ARCHITECTURE_CORE.md).

### Commands (`src/commands/`)

Tauri command handlers (RPC interface between React and Rust). The registered
command list lives in `src-tauri/src/command_handlers.rs`; `npm run lint:tauri-invokes`
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

### Platforms (`src/platforms/`)

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
4. Valid configuration is atomically saved to the local `config.json`.
5. Runtime configuration is updated only after the durable local save succeeds.
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

- `src/app/` owns startup, providers, navigation, and route composition. It may
  import only a feature's public `index.ts` facade when composing features.
- `src/features/<feature>/` owns a complete product slice, including its page,
  feature-local components, model, tests, and development mock handlers.
- A feature must not import another feature's implementation files. Shared
  product-neutral code belongs in `src/shared/`; reusable UI belongs in
  `src/ui/` as those owners are established.
- Legacy `components`, `contexts`, `hooks`, `services`, `utils`, `types`,
  `config`, and `pages` buckets remain transitional. They must not import app
  or feature implementation modules.
- Tests, mocks, stories, and test setup files are excluded from the production
  architecture sensor, but feature-owned mock handlers remain colocated with
  their feature and are registered by the central development dispatcher.

---

## Design Principles

### 1. **Separation of Concerns**

- **Core**: Platform-agnostic business logic
- **Commands**: Thin RPC layer (no business logic)
- **Platforms**: OS-specific code only
- **Frontend ownership**: App composition depends on public feature facades;
  features own complete vertical slices; shared and UI layers stay independent
  from app and feature implementations.

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
   - SQLCipher encryption at rest for job-search records and preferences
   - Parameterized queries (no string concatenation)
   - Transaction isolation
   - Field length validation
   - XSS prevention: `javascript:` protocol validation in URLs
   - Per-row AEAD secret vault for saved alert credentials, access codes, and
     private connection links

3. **Network Security**
   - HTTPS only for external requests
   - URL validation with domain allowlisting
   - 30 second timeouts
   - User-Agent headers
   - Domain allowlisting for webhooks
   - URL sanitization in error messages (removes query params)

4. **Data Privacy**
   - All data stored locally
   - Job-search records and durable preferences are stored in encrypted SQLite
   - Saved secrets are resolved through backend commands and must not be
     returned to the renderer
   - Browser storage is limited to UI preferences, caches, sanitized error
     reports, transient recovery hints, and single-read current-window handoffs
   - No telemetry
   - External channels stay opt-in and user-configured

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
