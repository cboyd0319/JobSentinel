# Core Architecture

Detailed module breakdown for JobSentinel core. See [Architecture](ARCHITECTURE.md) for the system-level layout.

## Core (`src/core/`)

Platform-agnostic business logic shared by the desktop app across Windows,
macOS, and Linux.

### `core/config/` (5 submodules)

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

### `core/job.rs` and `core/normalization/`

**Purpose**: Owner-neutral job identity contracts

- `job.rs` owns the canonical `Job` record used by storage, scoring,
  notifications, scheduling, and source adapters.
- `normalization/` exposes the title, location, and URL normalization facade.
  Its leaf modules are private.
- `job_hash.rs` depends on normalization and URL safety, not on source adapters.
- Source adapters produce `Job` records without importing database model
  modules. The database consumes the same record through the core facade.

This direction keeps job identity independent from both persistence and remote
source ownership, which is required before extracting the Tauri-free core.

### `core/db/` (8 submodules + integrity/)

**Purpose**: SQLite database abstraction

- Job storage and retrieval
- Full-text search (FTS5)
- Statistics aggregation
- Data integrity validation
- Encrypted-at-rest database target for local job-search data and preferences
- SQLCipher pre-migration snapshots verified with `quick_check`
- **Submodules:**
  - `types.rs` - Database query and statistics result types
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

### `core/scrapers/`

**Purpose**: Job board scraping (13 sources)

- **Greenhouse** - ATS scraper with HTML fetch and public API fallback
- **Lever** - ATS public API scraper
- **LinkedIn** - User-opened search links, Browser Import, and local Workbench ledger only; no session storage
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

### `core/scoring/`

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

### `core/credentials/`

**Purpose**: Local secret boundary

- Frontend reaches saved secrets only through Tauri credential commands.
- Backend notification and source code uses `CredentialService`.
- Both paths use `CredentialKey` names for vault rows and legacy cleanup keys.
- Legacy LinkedIn entries are retained only for cleanup and redaction, not new
  storage.
- Current runtime code stores active secrets in the local `secret_vault` table
  with per-row AEAD and protects one vault key with the OS credential store.
  The direct OS credential-store path remains only for legacy fallback and live
  keyring tests.
- Optional passphrase mode wraps the credential-vault key with Argon2id and
  XChaCha20-Poly1305 metadata in `credential_key_wrapping`; loaded envelopes
  must meet the repo's Argon2id work-factor floor, and status checks stay
  SQLite-only without secure-storage prompts.
- macOS target implementation uses native Keychain plus LocalAuthentication for
  Touch ID-capable user-presence unlock instead of generic passive keyring
  probes.

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

See [Local Secret Vault And Keychain Integration](../security/KEYRING.md) for full documentation.

### `core/notify/`

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

### `core/ghost/`

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

### `core/ats/` (5 submodules)

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

### `core/user_data/`

**Purpose**: User data persistence (v1.4)

- Cover letter templates with categories
- Interview prep checklists
- Follow-up reminder tracking
- Saved search filters
- Search history (unlimited)
- Notification preferences

**Migration:** Includes localStorage to SQLite migration for existing users.

SQLite is authoritative for job-search records and durable preferences.
Frontend browser storage remains available only for non-authoritative UI
preferences, cached lookup results, sanitized error reports, transient recovery
hints, and single-read `sessionStorage` handoffs for current-window resume
context.

### `core/resume/`

**Purpose**: Local resume fit review and parsing

- PDF, DOCX, TXT, Markdown, and HTML resume parsing
- Skill extraction
- Job-resume matching with confidence scores

### `core/salary/`

**Purpose**: Pay protection and salary transparency

- H1B data-based predictions
- Salary benchmarks by role/location
- Negotiation question drafting
- Offer comparison

### `core/market_intelligence/` (4 submodules)

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

### `core/automation/` (v2.0)

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

See [Application Assist Feature](../features/application-assist.md) for full documentation.

### `core/scheduler/`

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
   RemoteOK, WeWorkRemotely, BuiltIn, HN Hiring, JobsGPT, Dice, YC Startup Jobs,
   USAJobs, SimplyHired, and Glassdoor. LinkedIn stays user-opened and can be added
   through browser import.
3. Scoring workers apply multi-factor scoring.
4. Persistence workers upsert jobs into SQLite.
5. Notification workers send alerts through configured Slack, Discord, Teams, or email
   channels when scores meet the alert threshold.
