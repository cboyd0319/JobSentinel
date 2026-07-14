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
2. Desktop shell: the `jobsentinel` crate owns Tauri startup and plugins.
3. IPC boundary: private Tauri commands validate and route frontend requests.
4. Commands layer: handlers such as `search_jobs`, `get_config`, `get_recent_jobs`,
   `save_config`, `get_statistics`, and `validate_slack_webhook`.
5. Core crate: `jobsentinel-core` owns scheduler, scoring, notification,
   scraper, database, configuration, and platform-neutral application logic.
6. Platform layer: target-gated Windows, macOS, and Linux adapters in the core
   crate.

The frontend never reads or writes local job data directly. It calls typed Tauri
commands, and the Rust backend owns scraping, scoring, persistence, and external
notification delivery.

### Layer Model And Cross-Cutting Boundaries

The layers form a one-directional dependency model. Lower layers must not depend
on higher layers, and the frontend must not bypass the IPC boundary.

```text
UI (React) -> private IPC router (jobsentinel) -> jobsentinel-core -> storage and sources
```

Cross-cutting concerns enter through one named boundary each, not ad hoc across
layers:

| Concern | Approved boundary | Rule |
| ------- | ----------------- | ---- |
| Logging | Structured logger boundary | No ad hoc `console` in shipped paths; never log secrets or user data |
| External AI | `src/shared/externalAi/` | All external AI routes through the privacy-first gateway, disabled by default |
| Credentials | OS keyring | No plaintext secret storage; passive views must not probe saved secrets |
| External APIs and sources | Scraper and source adapters | Rate limits, error handling, and source boundaries apply |
| Configuration | Typed config and settings | No scattered environment reads in the UI |

Enforcement lives in `npm run lint:architecture`, `npm run lint:tauri-invokes`,
`ipc-minimization.mjs`, `npm run lint:external-ai`, and the privacy-logging
sensor. The sensor registry in `../harness/harness-map.md` maps each rule to its
owning command.

---

## Module Breakdown

### Cargo Workspace

The root `Cargo.toml` is an explicit-member virtual workspace. It centralizes
package metadata, exact dependency pins, lint policy, and release settings for
exactly two members:

- `crates/jobsentinel-core`: Tauri-free core and platform adapters.
- `src-tauri`: thin desktop shell, private IPC router, and Tauri plugins.

`Cargo.lock`, `.cargo/config.toml`, `.sqlx/`, `clippy.toml`, `deny.toml`, and
the standard `target/` directory are owned at the repository root.

The literal member list is the deterministic source of workspace membership.
Do not use wildcard discovery. Use modules before crates: add a workspace
member only for a distinct runtime, dependency policy, release unit, or stable
cross-crate contract. Repository size and file count do not create an ownership
boundary.

### Core (`crates/jobsentinel-core/src/core/`)

Detailed core module inventory lives in [Core Architecture](ARCHITECTURE_CORE.md).

### Commands (`src-tauri/src/commands/`)

Tauri command handlers (RPC interface between React and Rust). The registered
command list lives in `src-tauri/src/command_handlers.rs`; `npm run lint:tauri-invokes`
checks frontend invocations and command-count documentation drift.

Command ownership is stable even when individual command names change:

| Owner | Renderer-facing responsibility |
| ----- | ------------------------------ |
| Jobs and configuration | Search, recent jobs, preferences, runtime configuration, source status, and statistics |
| Applications and user data | Application tracking, reminders, interviews, notes, templates, searches, and history |
| Resumes | Managed resume summaries, active selection, skills, local matching, builder drafts, and export |
| Salary, market, scoring, and posting risk | Advisory estimates, comparisons, trends, alerts, and evidence |
| Imports, Browser Import, and deep links | Reviewed previews, staged confirmation, bookmarklet delivery, and user-started source links |
| Application assist | Profile, screening answers, ATS detection, reviewed preparation, and browser lifecycle |
| Credentials and external AI | Keyring-backed credential operations, provider validation, approval state, and minimized gateway requests |
| Health and embedded ML | Safe diagnostics, support summaries, optional model lifecycle, and local inference status |

The complete command inventory is generated from
`src-tauri/src/command_handlers.rs`; do not duplicate a fixed count here.
`npm run lint:tauri-invokes` checks that renderer invocations match the
registered router.

Every command must remain private, validate its IPC input, call one core owner,
and map the result to the smallest practical typed DTO. SQL, HTTP fetching,
credential resolution, and business rules do not belong in command handlers.

Notification preference calls use the typed `prefs` envelope:

```ts
invoke("save_notification_preferences", {
  prefs: {
    indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
    global: { desktopEnabled: true },
    advancedFilters: {},
  },
});
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

**Error Handling And Data Minimization:**

- Commands return typed values or clear, sanitized error strings.
- Errors use structured `tracing` fields without secrets or user data.
- User-facing errors explain the recovery action in plain language.
- Renderer-facing commands use the smallest practical DTO. Non-settings
  application assist screens use `has_application_profile` or
  `get_application_profile_preview`; the full profile response is for the
  settings editor. Dashboard reads `get_dashboard_preferences` instead of full
  config. Job imports canonicalize URLs before preview, stage the exact reviewed
  details behind an opaque in-memory identifier, and let `confirm_job_import`
  return only `{ jobId }`.

### Platforms (`crates/jobsentinel-core/src/platforms/`)

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
  Current complete slices are `salary`, `market`, `application-assist`,
  `applications`, `onboarding`, `dashboard`, `resumes`, `settings`, and
  `search-links`, plus the app-composed `linkedin-workbench` and
  `company-research`. Salary, Market, Applications, Dashboard, Settings, and
  Search Links expose only their pages; Onboarding exposes only its first-run
  wizard.
  Application Assist exposes its profile page and the
  Apply action composed into Dashboard by `src/app/`. Resumes exposes its
  library, builder, and matching pages through one domain facade while their
  controllers, validation, rendering, taxonomies, and mock handlers stay
  private. Other models, panels, cards, import flows, board logic, interview
  scheduling, cover-letter templates, setup taxonomies, data hooks, review
  logic, and mock handlers remain private to the owning feature or the
  development mock registry. Onboarding also owns career-profile lookup and
  first-run config mapping in `careerProfileSetup.ts`. Application Assist owns
  required-field and screening-question checks in
  `applicationFormValidation.ts`.
- LinkedIn Workbench exposes one visual entrypoint. `src/app/` composes it into
  Dashboard and Settings through React-node slots; its consent storage, Tauri
  transport, learning view, and privacy policy remain feature-owned modules.
- Company Research exposes one visual entrypoint. `src/app/` composes it into
  Dashboard and Applications through `src/shared/companyResearch.ts`; the
  local directory and lookup model remain private to the feature.
- A feature must not import another feature's implementation files. Shared
  product-neutral code belongs in `src/shared/`; reusable UI belongs in
  `src/ui/` as those owners are established. `src/shared/search-links/` owns
  the typed Tauri client and model used by Search Links, Dashboard, and the
  LinkedIn Workbench; Search Links display state remains private to its feature.
- `src/shared/jobMatchScore.ts` owns the job-fit thresholds used across
  Dashboard and Resume displays. Unrelated constants stay with their owners.
- `src/shared/location/` owns the validated, current-session detected-location
  cache shared by Onboarding and Settings.
- `src/shared/jobSourceRecommendations.ts` owns narrow search-term source
  defaults used by Onboarding and Settings; its broad-audience sensor follows
  that shared owner.
- `src/shared/jobSourceGuidance.ts` owns plain-language source labels and review
  guidance used by Dashboard and Applications.
- `src/shared/dateFormatting.ts` owns date displays used by Dashboard,
  Applications, and Hiring Trends. `src/shared/currencyFormatting.ts` owns the
  US-dollar display shared by Hiring Trends and Pay Protection.
- `src/shared/browserDownload.ts` owns safe browser filenames, Blob downloads,
  and object-URL cleanup shared by Dashboard, Settings, and Resume Builder.
- `src/shared/validation/contactFieldValidation.ts` owns email, phone, and web
  link checks shared by Application Assist and Resumes.
- `src/shared/errorReporting/` owns the validated, privacy-preserving local
  problem-report model, sanitizer, storage contract, context, hook, safe user
  messages, safe toast copy, development logger, and sanitized support-report
  generation. The app provider under `src/app/providers/` owns initialization
  and composition.
- `src/shared/externalAi/` owns the optional, disabled-by-default outside-AI
  types, payload policy, backend transport, and bounded local request log. Its
  gateway, prompt inspection, and request validation stay private under
  `internal/`.
- `src/shared/tauri/` owns the product-neutral renderer command client,
  including request deduplication, bounded response caching, command-scoped
  invalidation, privacy-safe errors, and optional sanitized error toasts.
- Settings owns its notification company chooser, source-health UI and model,
  local problem report panel, and Send Feedback UI under the matching private
  `notifications/`, `sources/health/`, and `support/` subdomains. Feedback
  commands and readable preview formatting stay private to Settings; sanitized
  support reports remain shared because app-level error boundaries also use
  them. Settings credential handling owns notification
  connection-link target validation in `credentials/`. Its support subdomain
  owns recursively redacted local-data backup files and JSON file selection.
- Dashboard owns job-card salary, malformed-pay, and description formatting in
  `jobDisplayFormatting.ts`; `jobCsvExport.ts` owns spreadsheet-safe job export.
- `src/ui/` owns proven multi-feature visual primitives and their colocated
  tests and stories. Features import these modules directly, such as
  `src/ui/Button.tsx`, `src/ui/Modal.tsx`, and the cross-feature job-fit visual
  under `src/ui/score-display/`; there is no aggregate barrel. Score-reason
  parsing stays private to that visual. Product-domain panels and workflows do
  not belong in this directory.
- The legacy root `components`, `config`, `contexts`, `hooks`, `pages`,
  `services`, and `utils` buckets have been removed and are denied by the
  frontend boundary sensor. The root `types` bucket remains transitional.
- Tests, mocks, stories, and test setup files are excluded from the production
  architecture sensor, but feature-owned mock handlers remain colocated with
  their feature and are registered by the central development dispatcher.
- Application Assist owns mock application-platform detection, Applications
  owns tracking and interview-progress commands, Dashboard owns job commands,
  Settings owns source-health mocks, LinkedIn Workbench owns its ledger mock,
  and shared Error Reporting owns safe support-report mocks. Mixed command
  groups under `src/mocks/` remain transitional.

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

- Use domain-specific errors when callers need to distinguish failure modes
- Preserve dependency errors when another error hierarchy adds no behavior
- Translate failures to user-friendly messages at the Tauri boundary
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
