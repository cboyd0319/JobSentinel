# JobSentinel - AI Assistant Instructions

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend) and React 19 (TypeScript frontend).

**Current Version:** 1.0.0-alpha (January 2026)
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
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── core/          # Business logic
│   │   │   ├── ats/       # Application Tracking (ENABLED)
│   │   │   ├── config/    # Configuration
│   │   │   ├── db/        # Database layer
│   │   │   ├── notify/    # Notifications (Slack, Discord, Teams)
│   │   │   ├── scheduler/ # Job scheduling
│   │   │   ├── scoring/   # Job scoring algorithm
│   │   │   └── scrapers/  # Job board scrapers
│   │   ├── commands/      # Tauri RPC handlers
│   │   └── platforms/     # Platform-specific code
│   └── migrations/        # SQLite migrations
└── docs/                  # Documentation
```

## Current Status

### Working Modules
All core modules are enabled and functional:
- config, db, notify, scheduler, scoring, scrapers
- ats (Application Tracking System)
- resume (AI Resume-Job Matcher)
- salary (Salary Prediction AI)
- market_intelligence (Market Analytics)

### Deferred Modules (v2.0+)
- automation (One-Click Apply - requires legal review)

### Test Status
- 291 tests passing, 20 ignored
- Ignored tests require file-based database or are doc-tests for example code

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
- `src-tauri/src/commands/mod.rs` - Tauri command handlers
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
