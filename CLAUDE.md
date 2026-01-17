# JobSentinel - AI Assistant Instructions

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend) and React 19 (TypeScript frontend).

**Current Version:** 1.3.0 (January 2026)
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
│   ├── components/        # UI components (36 components)
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
│   │   │   ├── notify/    # Notifications (Slack, Discord, Teams, Email, Telegram)
│   │   │   ├── scheduler/ # Job scheduling with auto-refresh
│   │   │   ├── scoring/   # Job scoring algorithm
│   │   │   └── scrapers/  # 13 job board scrapers with parallel scraping
│   │   ├── commands/      # Tauri RPC handlers (47 commands)
│   │   └── platforms/     # Platform-specific code (Windows, macOS, Linux)
│   └── migrations/        # SQLite migrations (13 migrations)
└── docs/                  # Documentation
```

## Current Status

### Working Modules
All core modules are enabled and functional:
- config, db, notify, scheduler, scoring
- scrapers (13 sources: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter)
- ats (Application Tracking System with interview scheduler)
- resume (AI Resume-Job Matcher)
- salary (Salary Prediction AI)
- market_intelligence (Market Analytics)

### Frontend Features (v1.3)
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
- 2008 tests passing, 20 ignored
- Ignored tests require file-based database or are doc-tests for example code

### Tauri Commands (47 total)
- Core: 18 commands (jobs, config, search, statistics, scraping)
- ATS: 10 commands (applications, reminders, ghosting, interviews)
- Resume: 6 commands (upload, match, skills)
- Salary: 4 commands (predict, benchmark, negotiate, compare)
- Market: 5 commands (trends, companies, locations, alerts)
- Setup: 4 commands (wizard, first run, profiles)

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
- `src-tauri/src/core/scrapers/mod.rs` - Scraper registry (13 sources) with parallel scraping
- `src-tauri/src/commands/mod.rs` - Tauri command handlers (47 commands)
- `src/pages/Dashboard.tsx` - Main dashboard with search and job list
- `src/components/` - UI component library (36 components)
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
cargo test --ignored          # Run ignored tests (need file db)
```

## Documentation

- `README.md` - User-facing overview
- `docs/README.md` - Documentation hub
- `docs/user/QUICK_START.md` - User guide
- `docs/developer/GETTING_STARTED.md` - Developer setup
- `CHANGELOG.md` - Version history
