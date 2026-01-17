# JobSentinel - AI Assistant Instructions

## CRITICAL: Agent Requirements

### 1. USE SUB-AGENTS (MANDATORY)

**Always use sub-agents for parallel work.** This is non-negotiable for efficiency.

```
When to spawn sub-agents:
- Exploring multiple files/modules → Launch parallel Explore agents
- Code review → Use pr-review-toolkit agents (code-reviewer, silent-failure-hunter)
- Feature development → Use feature-dev agents (code-explorer, code-architect)
- Any task with 3+ independent subtasks → Parallelize with Task tool
```

**Example - DON'T do this:**
```
1. Read file A
2. Read file B
3. Read file C
4. Make decision
```

**DO this instead:**
```
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

### 3. CURRENT WORK IN PROGRESS

**Plan documents:**
- **Detailed plan:** `.claude/plans/virtual-puzzling-pretzel.md` (full implementation details)
- **Public roadmap:** `docs/ROADMAP.md` (high-level priorities + technical debt)

**v1.4 Status (Ghost Detection + Data Insights):**
- [x] E1: Ghost Job Detection - COMPLETE
- [x] E2: Data Insights & Metrics - COMPLETE
  - Score breakdown tooltip
  - Application conversion stats
  - Resume match visualization
- [x] E3: Backend Persistence - COMPLETE (localStorage → SQLite)
  - 4 new database migrations
  - UserDataManager Rust module with 20 Tauri commands
  - localStorage migration utility for existing users
- [ ] E4: UI Connections & Polish - PENDING

**v1.5 Status (File Refactoring):**
- [ ] Modularize oversized files (see Technical Debt section below)
- Priority: db/mod.rs (4442 lines) → scheduler → market_intelligence → config

**v2.0 Status (Production Release):**
- See `.claude/plans/virtual-puzzling-pretzel.md` for P0-P7 details
- Keyring, CI/CD, Packaging, Resume Builder, One-Click Apply

**Before starting work:**
1. Read `.claude/plans/virtual-puzzling-pretzel.md` for implementation details
2. Check `docs/ROADMAP.md` for priorities

---

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend) and React 19 (TypeScript frontend).

**Current Version:** 1.4.0 (January 2026)
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

```
JobSentinel/
├── src/                    # React frontend
│   ├── components/        # UI components (37 components)
│   ├── contexts/          # React contexts (KeyboardShortcuts)
│   ├── hooks/             # Custom hooks (useKeyboardNavigation)
│   ├── pages/             # Page components (Dashboard, Applications, etc.)
│   └── utils/             # Utilities (export, api)
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── core/          # Business logic
│   │   │   ├── ats/       # Application Tracking (ENABLED)
│   │   │   ├── config/    # Configuration
│   │   │   ├── db/        # Database layer
│   │   │   ├── ghost/     # Ghost job detection (NEW in v1.4)
│   │   │   ├── notify/    # Notifications (Slack, Discord, Teams, Email, Telegram)
│   │   │   ├── scheduler/ # Job scheduling with auto-refresh
│   │   │   ├── scoring/   # Job scoring algorithm
│   │   │   └── scrapers/  # 13 job board scrapers with parallel scraping
│   │   ├── commands/      # Tauri RPC handlers (70 commands)
│   │   └── platforms/     # Platform-specific code (Windows, macOS, Linux)
│   └── migrations/        # SQLite migrations (18 migrations)
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
- scrapers (13 sources: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter)
- ats (Application Tracking System with interview scheduler)
- resume (AI Resume-Job Matcher)
- salary (Salary Prediction AI)
- market_intelligence (Market Analytics)

### Frontend Features (v1.4)
- **Ghost Detection** - Visual indicators for fake/stale job postings
- Ghost filter dropdown (All/Real/Ghost jobs)
- Advanced notification filtering (keywords, salary, company lists)
- Keyboard shortcuts (b, n, c, /, ?, r, x)
- Advanced search (AND/OR/NOT, search history)
- Interview prep checklists and follow-up reminders
- Analytics with weekly goals and response rates
- Company research panel (40+ companies)
- Virtual list for performance

### Deferred Modules (v2.0+)
- automation (One-Click Apply - requires legal review)

### Test Status
- 2029 tests passing, 21 ignored
- Ignored tests require file-based database or are doc-tests for example code

### Tauri Commands (70 total)
- Core: 18 commands (jobs, config, search, statistics, scraping)
- Ghost: 3 commands (ghost_jobs, ghost_statistics, filtered_search)
- ATS: 10 commands (applications, reminders, ghosting, interviews)
- Resume: 6 commands (upload, match, skills)
- Salary: 4 commands (predict, benchmark, negotiate, compare)
- Market: 5 commands (trends, companies, locations, alerts)
- Setup: 4 commands (wizard, first run, profiles)
- User Data: 20 commands (templates, prep checklists, saved searches, notifications, search history)

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

### TypeScript
- Strict mode enabled
- Use React hooks correctly
- No console.log in production

## Key Files

- `src-tauri/src/core/mod.rs` - Module registry (controls enabled features)
- `src-tauri/src/core/db/mod.rs` - Database layer with Job struct
- `src-tauri/src/core/ghost/mod.rs` - Ghost detection algorithm
- `src-tauri/src/core/scrapers/mod.rs` - Scraper registry (13 sources) with parallel scraping
- `src-tauri/src/commands/mod.rs` - Tauri command handlers (50 commands)
- `src/pages/Dashboard.tsx` - Main dashboard with search, job list, ghost filter
- `src/components/GhostIndicator.tsx` - Ghost job warning indicators
- `src/components/` - UI component library (37 components)
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

- `README.md` - User-facing overview
- `docs/README.md` - Documentation hub
- `docs/features/ghost-detection.md` - Ghost detection feature guide
- `docs/user/QUICK_START.md` - User guide
- `docs/developer/GETTING_STARTED.md` - Developer setup
- `docs/ROADMAP.md` - Roadmap and technical debt tracking
- `CHANGELOG.md` - Version history

## Technical Debt: File Size Limits

**IMPORTANT:** Keep files under 500 lines. Large files are hard to maintain and regenerate.

### Files Needing Refactoring (v1.5 priority)

| File | Lines | Status |
|------|-------|--------|
| `db/mod.rs` | 4442 | CRITICAL - needs split |
| `scheduler/mod.rs` | 2955 | HIGH - needs split |
| `market_intelligence/mod.rs` | 2703 | HIGH - needs split |
| `db/integrity.rs` | 2517 | HIGH - needs split |
| `config/mod.rs` | 2343 | MEDIUM |
| `Dashboard.tsx` | 2315 | MEDIUM |
| `scrapers/lever.rs` | 2256 | MEDIUM - mostly tests |
| `ats/mod.rs` | 2082 | MEDIUM |

**See `docs/ROADMAP.md` for detailed refactoring strategies.**

### When Adding Code

1. **Check file size first** - If file is >400 lines, consider splitting
2. **Extract tests** - Move `#[cfg(test)]` to separate `tests.rs` files
3. **One concern per file** - Don't mix queries, types, and logic
4. **Update ROADMAP.md** - If you make a file larger, document it
