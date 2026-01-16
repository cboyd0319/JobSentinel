# Architecture Documentation

**JobSentinel v1.3 System Architecture**

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

JobSentinel is a **privacy-first, desktop-native job search automation tool** built with Rust and Tauri. The application runs entirely on the user's machine with no cloud dependencies (v1.0), ensuring complete data privacy and control.

### Key Characteristics

- **Desktop-first**: Native Windows/macOS/Linux application
- **Privacy-focused**: All data stored locally, no telemetry
- **Async-first**: Built on Tokio for efficient I/O
- **Type-safe**: Leverages Rust's type system for correctness
- **Modular**: Clean separation between core logic and platform code

---

## System Architecture

### High-Level Architecture

```
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

#### `core/config/`
**Purpose**: Configuration management
- Load/save user preferences
- Validate configuration values
- Provide sensible defaults

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

#### `core/db/`
**Purpose**: SQLite database abstraction
- Job storage and retrieval
- Full-text search (FTS5)
- Statistics aggregation

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
**Purpose**: Job board scraping (10 sources)
- **Greenhouse** - ATS scraper (HTML)
- **Lever** - ATS scraper (HTML)
- **LinkedIn** - Session cookie authentication
- **Indeed** - Query-based search
- **RemoteOK** - JSON API
- **Wellfound** - HTML scraper (formerly AngelList)
- **WeWorkRemotely** - RSS feed parsing
- **BuiltIn** - City-specific tech jobs (HTML)
- **HN Who's Hiring** - Algolia API for monthly threads
- **JobsWithGPT** - API client

**Architecture:**
```rust
#[async_trait]
pub trait JobScraper: Send + Sync {
    async fn scrape(&self) -> ScraperResult;
    fn name(&self) -> &'static str;
}
```

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

#### `core/notify/`
**Purpose**: Alert notifications
- Slack webhook integration (v1.0)
- Email (v2.0)

**Security:**
- Webhook URL validation
- HTTPS enforcement
- Domain allowlisting

#### `core/scheduler/`
**Purpose**: Automated job scraping
- Configurable interval (1-168 hours)
- Graceful shutdown
- Error recovery

**Workflow:**
```
┌──────────────┐
│  Schedule    │
│  (every 2h)  │
└──────┬───────┘
       │
       v
┌──────────────┐
│ Scrape All   │──> 10 sources in parallel:
│   Sources    │    Greenhouse, Lever, LinkedIn, Indeed,
│              │    RemoteOK, Wellfound, WeWorkRemotely,
│              │    BuiltIn, HN Hiring, JobsGPT
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

Tauri command handlers (RPC interface between React and Rust).

**All Commands:**
```rust
search_jobs()              // Trigger manual scrape
get_recent_jobs(limit)     // Get N recent jobs
get_job_by_id(id)          // Get specific job
get_config()               // Get user config
save_config(config)        // Save user config
validate_slack_webhook()   // Test webhook
get_statistics()           // Get aggregate stats
get_scraping_status()      // Get scheduler status
is_first_run()             // Check first-time setup
complete_setup(config)     // Complete onboarding
search_jobs_query(q)       // Full-text search
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

```
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

```
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

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Tauri 2.x | Desktop app framework |
| **Async Runtime** | Tokio | Async I/O and scheduling |
| **Database** | SQLite (sqlx) | Local data storage |
| **HTTP Client** | reqwest | Web scraping |
| **HTML Parser** | scraper | Parse job boards |
| **Serialization** | serde + serde_json | Config and data serialization |
| **Error Handling** | thiserror + anyhow | Structured error handling |
| **Logging** | tracing | Structured logging |
| **Hashing** | sha2 | Job deduplication |

### Frontend (React)

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React 19 | UI framework |
| **Language** | TypeScript | Type-safe JavaScript |
| **Build Tool** | Vite | Fast dev server and build |
| **Styling** | Tailwind CSS | Utility-first CSS |

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

- Use `thiserror` for library errors (specific, structured)
- Use `anyhow` for application errors (context)
- Never use `.unwrap()` in production code
- Always provide context with errors

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

| Threat | Mitigation |
|--------|------------|
| **Data exfiltration** | Webhook URL validation (only slack.com) |
| **SQL injection** | Parameterized queries (sqlx) |
| **XSS** | No eval(), sanitized HTML parsing |
| **Secrets in code** | No hardcoded secrets, user-provided webhooks |
| **Untrusted input** | Strict validation (lengths, formats, ranges) |

### Security Layers

1. **Input Validation**
   - Config validation (strict limits)
   - URL validation (format + domain allowlisting)
   - String length limits

2. **Database Security**
   - Parameterized queries (no string concatenation)
   - Transaction isolation
   - Field length validation

3. **Network Security**
   - HTTPS only
   - 30 second timeouts
   - User-Agent headers
   - Domain allowlisting for webhooks

4. **Data Privacy**
   - All data stored locally
   - No telemetry
   - No cloud dependencies (v1.0)

---

## Future Architecture (v2.0)

### Cloud Deployment

```
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

| Operation | Latency | Notes |
|-----------|---------|-------|
| Config load | <1ms | File read + JSON parse |
| Job upsert | <5ms | SQLite with indexes |
| Job search | <10ms | FTS5 indexed search |
| Scrape single company | 1-5s | Network dependent |
| Score single job | <1ms | Pure computation |
| Full scraping cycle | 30-120s | Depends on # of companies |

---

**Last Updated**: January 17, 2026
**Version**: 1.3
**Maintained By**: The Rust Mac Overlord 🦀
