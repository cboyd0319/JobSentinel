# JobSentinel - AI Assistant Instructions

## CRITICAL: Agent Requirements

### 1. USE SUB-AGENTS (MANDATORY)

**Always use sub-agents for parallel work.** This is non-negotiable for efficiency.

```text
When to spawn sub-agents:
- Exploring multiple files/modules → Launch parallel Explore agents
- Code review → Use pr-review-toolkit agents (code-reviewer, silent-failure-hunter)
- Feature development → Use feature-dev agents (code-explorer, code-architect)
- Any task with 3+ independent subtasks → Parallelize with Task tool
```

**Example - DON'T do this:**

```text
1. Read file A
2. Read file B
3. Read file C
4. Make decision
```

**DO this instead:**

```text
1. Launch 3 parallel Explore agents for files A, B, C
2. Receive all results simultaneously
3. Make decision with full context
```

### 2. KEEP ALL DOCUMENTATION UPDATED (MANDATORY)

**After ANY significant change, update ALL relevant docs:**

| Change Type | Update These Docs |
|------------|-------------------|
| New feature | `CHANGELOG.md`, `docs/features/`, `README.md`, `docs/ROADMAP.md` |
| New command | `CLAUDE.md` (Tauri Commands section), `docs/developer/` |
| Bug fix | `CHANGELOG.md` |
| Refactoring | `docs/ROADMAP.md` (Technical Debt section) |
| New scraper | `docs/features/scrapers.md`, `CHANGELOG.md` |
| Config change | `config.example.json`, relevant docs |

**Documentation locations:**

- `docs/features/` - Feature documentation (ghost-detection, scrapers, etc.)
- `docs/releases/` - Version release notes (v1.2.md, v1.3.md, v1.4.md)
- `docs/developer/` - Developer guides (ARCHITECTURE, TESTING, etc.)
- `docs/ROADMAP.md` - Project roadmap and technical debt tracking

**Before committing, always ask: "Did I update the docs?"**

### 3. CURRENT STATUS

**Version:** 2.0.0 (Production Ready)

All major features complete:

- OS-native keyring for secure credential storage
- Resume Builder with 5 ATS-optimized templates
- ATS Optimizer with keyword analysis
- One-Click Apply for 7 ATS platforms
- 13 job board scrapers
- Ghost job detection
- Multi-channel notifications

**Next:** v2.1 - Official installers, CI/CD pipeline

See `docs/ROADMAP.md` for future plans

---

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend)
and React 19 (TypeScript frontend).

**Current Version:** 2.0.0 (January 2026)
**Primary Target:** Windows 11+ (macOS/Linux planned for v2.0)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Rust 2021, Tauri 2.x, Tokio async |
| Database | SQLite with SQLx (async) |
| HTTP | reqwest with rustls |
| HTML Parsing | scraper crate |

## Project Structure

```text
JobSentinel/
├── src/                    # React frontend
│   ├── components/        # UI components (42 components)
│   │   └── automation/    # One-Click Apply components (NEW in v2.0)
│   ├── contexts/          # React contexts (KeyboardShortcuts, Toast, etc.)
│   ├── hooks/             # Custom hooks (useKeyboardNavigation)
│   ├── pages/             # Page components (Dashboard, Applications, ApplicationProfile, etc.)
│   └── utils/             # Utilities (export, api, errorUtils)
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── core/          # Business logic
│   │   │   ├── ats/       # Application Tracking (ENABLED)
│   │   │   ├── automation/# One-Click Apply (NEW in v2.0)
│   │   │   │   ├── browser/   # Chrome DevTools Protocol automation
│   │   │   │   ├── ats_detector.rs  # ATS platform detection
│   │   │   │   ├── form_filler.rs   # Platform-specific form filling
│   │   │   │   └── profile.rs       # Application profile management
│   │   │   ├── config/    # Configuration
│   │   │   ├── credentials/# OS keyring integration (NEW in v2.0)
│   │   │   ├── db/        # Database layer
│   │   │   ├── ghost/     # Ghost job detection
│   │   │   ├── health/    # Scraper health monitoring (NEW in v2.1)
│   │   │   ├── notify/    # Notifications (Slack, Discord, Teams, Email, Telegram)
│   │   │   ├── resume/    # Resume Builder + ATS Optimizer (NEW in v2.0)
│   │   │   ├── scheduler/ # Job scheduling with auto-refresh
│   │   │   ├── scoring/   # Job scoring algorithm
│   │   │   └── scrapers/  # 13 job board scrapers with parallel scraping
│   │   ├── commands/      # Tauri RPC handlers (130 commands)
│   │   └── platforms/     # Platform-specific code (Windows, macOS, Linux)
│   └── migrations/        # SQLite migrations (21 migrations)
└── docs/                  # Documentation
    ├── features/          # Feature documentation
    ├── releases/          # Version release notes
    ├── developer/         # Developer guides
    ├── user/              # User guides
    └── reports/           # Analysis reports
```

## Current Status

### Working Modules

All core modules are enabled and functional:

- config, db, notify, scheduler, scoring, ghost
- scrapers (13 sources: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound,
  WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter)
- ats (Application Tracking System with interview scheduler)
- resume (AI Resume-Job Matcher + Resume Builder + ATS Optimizer)
- salary (Salary Prediction AI)
- market_intelligence (Market Analytics)
- automation (One-Click Apply with form filling)
- credentials (OS-native keyring integration)
- health (Scraper health monitoring, run tracking, smoke tests, credential expiry)

### Frontend Features (v2.0)

- **Ghost Detection** - Visual indicators for fake/stale job postings
- Ghost filter dropdown (All/Real/Ghost jobs)
- Advanced notification filtering (keywords, salary, company lists)
- Keyboard shortcuts (b, n, c, /, ?, r, x)
- Advanced search (AND/OR/NOT, search history)
- Interview prep checklists and follow-up reminders
- Analytics with weekly goals and response rates
- Company research panel (40+ companies)
- Virtual list for performance
- **Resume Builder** - 7-step wizard with ATS-optimized templates
- **ATS Optimizer** - Keyword analysis, format scoring, bullet improver
- **One-Click Apply** - Form auto-fill with browser automation
  - ATS platform detection badges on job cards
  - Application profile with contact info and work authorization
  - Screening question auto-answers with regex patterns
  - Quick Apply button opens browser, fills form, pauses for review
  - Human-in-the-loop: user clicks Submit manually

### Test Status

- 2085 tests passing
- 20 ignored (require file-based database, Chrome, or are doc-tests)
- Integration test files: `tests/automation_integration_test.rs`, `tests/scheduler_integration_test.rs`, etc.

### Tauri Commands (137 total)

- Core Jobs: 14 commands (search, get, hide, bookmark, notes, stats, duplicates)
- Config: 6 commands (save, get, validate_webhook, first_run, complete_setup, test_email)
- Ghost: 10 commands (ghost_jobs, ghost_statistics, filtered_search, mark_real, mark_ghost,
  get_feedback, clear_feedback, get_ghost_config, set_ghost_config, reset_ghost_config)
- ATS: 13 commands (applications, reminders, ghosting detection, interviews)
- Resume Matcher: 7 commands (upload, get_active, set_active, get_skills, match, get_result, recent)
- Resume Builder: 10 commands (create, get, update_contact, update_summary,
  add/delete experience/education, set_skills, delete)
- Resume Templates: 3 commands (list_templates, render_html, render_text)
- Resume Export: 2 commands (export_docx, export_text)
- ATS Analyzer: 5 commands (analyze_for_job, analyze_format, extract_keywords, power_words, improve_bullet)
- Salary: 4 commands (predict, benchmark, negotiate, compare)
- Market: 5 commands (trends, companies, locations, alerts, run_analysis)
- User Data: 20 commands (templates, prep checklists, saved searches, notifications, search history)
- Credentials: 5 commands (store, retrieve, delete, has, get_status)
- Automation: 18 commands (profile, screening answers, attempts, ATS detection, browser control)
- Browser: 2 commands (take_screenshot, fill_form - subset of automation)
- Health: 9 commands (scraper_health, health_summary, scraper_configs, set_scraper_enabled,
  scraper_runs, smoke_test, all_smoke_tests, linkedin_cookie_health, expiring_credentials)

## Development Commands

```bash
# Frontend
npm install              # Install deps
npm run dev              # Dev server
npm run build            # Production build

# Rust
cd src-tauri
cargo check              # Type check
cargo test               # Run tests
cargo clippy -- -D warnings  # Linting (strict)
cargo build --release    # Release build

# Full app
npm run tauri:dev        # Dev mode with hot reload
npm run tauri:build      # Production build
```

## Code Standards

### Rust

- Use `Result<T, E>` for error handling (no unwrap in production)
- Use `tracing` crate for logging (not println!)
- Use SQLx parameterized queries (never string concatenation)
- Run `cargo clippy` before committing

### Database Schema Changes (NO MIGRATIONS)

**IMPORTANT: No users exist yet. v2.1.0 is the first official release.**

- **DO NOT** create incremental migrations for schema changes
- **DO** modify the schema files directly (consolidate into base migrations)
- **DO NOT** worry about backward compatibility until v2.1.0
- **DELETE** migration files when consolidating - no one has data to preserve

This saves significant development time. When we approach v2.1.0, we'll freeze the schema
and start proper migrations from that baseline.

### TypeScript

- Strict mode enabled
- Use React hooks correctly
- No console.log in production

## Key Files

- `src-tauri/src/core/mod.rs` - Module registry (controls enabled features)
- `src-tauri/src/core/db/mod.rs` - Database layer with Job struct
- `src-tauri/src/core/ghost/mod.rs` - Ghost detection algorithm
- `src-tauri/src/core/scrapers/mod.rs` - Scraper registry (13 sources) with parallel scraping
- `src-tauri/src/core/automation/mod.rs` - One-Click Apply automation manager
- `src-tauri/src/core/automation/browser/` - Chrome DevTools Protocol automation
- `src-tauri/src/core/credentials/mod.rs` - OS keyring credential storage
- `src-tauri/src/commands/mod.rs` - Tauri command handlers (110 commands)
- `src-tauri/src/commands/automation.rs` - Automation Tauri commands (18 commands)
- `src/pages/Dashboard.tsx` - Main dashboard with search, job list, ghost filter
- `src/pages/ApplicationProfile.tsx` - One-Click Apply settings page
- `src/components/automation/` - ProfileForm, ScreeningAnswersForm, ApplyButton, ApplicationPreview
- `src/components/GhostIndicator.tsx` - Ghost job warning indicators
- `src/components/` - UI component library (42 components)
- `src/contexts/KeyboardShortcutsContext.tsx` - Keyboard navigation
- `config.example.json` - Example configuration

## Privacy Requirements

- Zero telemetry - no data sent externally without user config
- Local-first - all data in local SQLite database
- Validate webhooks before storing
- Use rustls (pure Rust TLS)

## Common Tasks

### Adding a new scraper

1. Create `src-tauri/src/core/scrapers/newscraper.rs`
2. Implement `JobScraper` trait
3. Add to `scrapers/mod.rs`
4. Add config options to `config/mod.rs`

### Adding a notification channel

1. Create `src-tauri/src/core/notify/newchannel.rs`
2. Implement webhook validation and send logic
3. Add to `notify/mod.rs`
4. Update `AlertConfig` in `config/mod.rs`

### Running specific tests

```bash
cargo test core::ats          # ATS tests
cargo test core::scrapers     # Scraper tests
cargo test core::ghost        # Ghost detection tests
cargo test --ignored          # Run ignored tests (need file db)
```

## Documentation

### User Documentation

- `README.md` - User-facing overview
- `docs/README.md` - Documentation hub
- `docs/user/QUICK_START.md` - User guide
- `CHANGELOG.md` - Version history

### Feature Documentation

- `docs/features/ghost-detection.md` - Ghost detection with user feedback
- `docs/features/scrapers.md` - 13 scrapers with deduplication improvements
- `docs/features/` - All feature guides

### Developer Documentation

- `docs/developer/GETTING_STARTED.md` - Development environment setup
- `docs/developer/ARCHITECTURE.md` - System architecture overview
- `docs/developer/TESTING.md` - Testing guide (unit, integration, E2E)
- `docs/developer/FRONTEND_TESTING.md` - React/Vitest/Playwright testing
- `docs/developer/INTEGRATION_TESTING.md` - Rust integration testing
- `docs/developer/CI_CD.md` - CI/CD pipeline setup and workflows
- `docs/developer/CONTRIBUTING.md` - Contribution guidelines
- `docs/ROADMAP.md` - Roadmap and technical debt tracking

## Technical Debt: File Size Limits

**IMPORTANT:** Keep files under 500 lines. Large files are hard to maintain and regenerate.

### Files Refactored in v1.5

| File | Original Lines | New Lines | Modules Created | Status |
|------|---|---|---|--------|
| `db/mod.rs` | 4442 | 85 | 8 | DONE |
| `scheduler/mod.rs` | 2955 | ~300 | 7 | DONE |
| `market_intelligence/mod.rs` | 2703 | ~400 | 4 | DONE |
| `db/integrity.rs` | 2517 | 85 | 5 (integrity/ dir) | DONE |
| `config/mod.rs` | 2343 | ~300 | 5 | DONE |
| `Dashboard.tsx` | 2315 | 672 | 11 files | DONE |
| `ats/mod.rs` | 2082 | ~300 | 5 | DONE |
| `scrapers/lever.rs` | 2379 | 183 | lever/ dir (tests.rs) | DONE |

### Files Refactored in v1.6

| File | Original Lines | New Lines | Modules Created | Status |
|------|---|---|---|--------|
| `commands/mod.rs` | 1732 | 94 | 9 domain modules | DONE |
| `salary/mod.rs` | 2026 | 59 | types.rs, analyzer.rs, tests.rs | DONE |
| `resume/mod.rs` | 1831 | 440 | types.rs, tests.rs | DONE |

**All v1.5 and v1.6 file modularization complete. Codebase ready for v2.0.**

### When Adding Code

1. **Check file size first** - If file is >400 lines, consider splitting
2. **Extract tests** - Move `#[cfg(test)]` to separate `tests.rs` files
3. **One concern per file** - Don't mix queries, types, and logic
4. **Update ROADMAP.md** - If you make a file larger, document it
