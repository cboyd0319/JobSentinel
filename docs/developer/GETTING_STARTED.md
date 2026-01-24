# Getting Started with JobSentinel

## Project Status

**Version 2.5.2** (January 18, 2026)

| Component | Status |
|-----------|--------|
| Core modules (config, db, scoring, scrapers, scheduler, notify, ghost, ats, resume, salary, market, automation, credentials, health) | Working |
| Frontend (React 19 + TypeScript) | Working |
| Tests | 2200+ passing, 20 ignored |

---

## For Developers

### Prerequisites

```bash
# Install Rust (https://rustup.rs/)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 20+ (https://nodejs.org/)

# Install Tauri CLI
cargo install tauri-cli@2.1
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Install npm dependencies
npm install

# Run in development mode (hot reload enabled)
npm run tauri:dev
```

### Building for Production

```bash
# Build Windows MSI installer
npm run tauri:build

# Output: src-tauri/target/release/bundle/msi/JobSentinel_1.0.0_x64_en-US.msi
```

### Project Structure

```text
JobSentinel/
├── src/                      # React frontend (TypeScript + Tailwind)
│   ├── components/          # 37 reusable UI components
│   ├── contexts/            # React contexts (KeyboardShortcuts, ErrorReporting)
│   ├── hooks/               # Custom hooks (useKeyboardNavigation)
│   ├── pages/               # Page components (Dashboard, Applications, etc.)
│   ├── utils/               # Utilities (export, api, notifications)
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs          # Tauri app entry
│   │   ├── lib.rs           # Library exports
│   │   ├── core/            # Business logic (modular structure)
│   │   │   ├── ats/         # Application Tracking System
│   │   │   ├── automation/  # One-Click Apply
│   │   │   ├── config/      # Configuration
│   │   │   ├── credentials/ # OS keyring integration
│   │   │   ├── db/          # Database layer (refactored v1.5)
│   │   │   ├── ghost/       # Ghost job detection
│   │   │   ├── health/      # Scraper health monitoring
│   │   │   ├── market_intelligence/  # Market analytics
│   │   │   ├── notify/      # Multi-channel notifications
│   │   │   ├── resume/      # Resume matching + builder
│   │   │   ├── salary/      # Salary prediction
│   │   │   ├── scheduler/   # Job scheduling
│   │   │   ├── scoring/     # Job scoring algorithm
│   │   │   └── scrapers/    # 13 job board scrapers
│   │   ├── platforms/       # Windows/macOS/Linux specific code
│   │   ├── cloud/           # GCP/AWS deployment (v3.0+)
│   │   └── commands/        # 70 Tauri RPC command handlers
│   ├── migrations/          # 18 SQLite migrations
│   └── Cargo.toml           # Rust dependencies
├── public/                  # Static assets (logo, etc.)
├── docs/                    # Documentation
├── package.json             # npm dependencies
└── vite.config.ts           # Vite configuration
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Tauri 2.1** | Desktop app framework (Rust + Web) |
| **React 19** | UI framework |
| **Vite** | Fast build tool |
| **TailwindCSS** | Utility-first CSS |
| **TypeScript** | Type-safe JavaScript |
| **Rust** | Backend language |
| **Tokio** | Async runtime |
| **SQLx** | SQLite database |
| **reqwest** | HTTP client |
| **scraper** | HTML parsing |

### Running Tests

```bash
# Rust tests
cd src-tauri
cargo test

# Frontend tests (716 tests)
npm test
```

### Code Style

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Lint Rust code
cargo clippy

# Format TypeScript/React
npm run format
```

---

## Architecture Overview

### Core Business Logic (Platform-Agnostic)

All core functionality is in `src-tauri/src/core/` and works identically on all platforms:

- **ats**: Application Tracking System with interview scheduler (10 commands)
- **config**: JSON-based user preferences
- **db**: SQLite database with async support (70+ queries)
- **ghost**: Ghost job detection with repost tracking and stale detection
- **market_intelligence**: Market analytics with trends and location insights
- **notify**: Multi-channel notifications (Slack, Discord, Teams, Email, Telegram, Desktop)
- **resume**: AI-powered resume-job matching with skill extraction
- **salary**: Salary prediction and benchmarking
- **scheduler**: Periodic job scraping with configurable interval and auto-refresh
- **scoring**: Multi-factor job scoring (0-1 scale)
- **scrapers**: 13 job board scrapers with parallel execution (Greenhouse, Lever, LinkedIn,
  Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice,
  YC Startup Jobs, ZipRecruiter)

### Platform-Specific Code

Platform code is in `src-tauri/src/platforms/` and uses conditional compilation:

- **Windows**: Windows 11+ specific features (v1.0)
- **macos**: macOS 13+ specific features (v2.1+)
- **linux**: Linux specific features (v2.1+)

Example:

```rust
#[cfg(target_os = "windows")]
pub fn get_data_dir() -> PathBuf {
    // Windows implementation
}

#[cfg(target_os = "macos")]
pub fn get_data_dir() -> PathBuf {
    // macOS implementation
}
```

### Cloud Deployment (v3.0+)

Cloud code is in `src-tauri/src/cloud/` and only compiled with feature flags:

- **gcp**: Google Cloud Platform (Cloud Run, Scheduler)
- **aws**: Amazon Web Services (Lambda, EventBridge)

---

## Debugging

### Enable Rust Logs

```bash
# Set log level (trace, debug, info, warn, error)
RUST_LOG=debug npm run tauri:dev
```

### Chrome DevTools

When running `npm run tauri:dev`, press `Ctrl+Shift+I` (Windows) to open Chrome DevTools for the React frontend.

### Database

Database location: `%LOCALAPPDATA%\JobSentinel\jobs.db`

Open with [DB Browser for SQLite](https://sqlitebrowser.org/):

```bash
# Windows
explorer %LOCALAPPDATA%\JobSentinel
```

---

## Troubleshooting

### "Rust not found"

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
```

### "npm install fails"

```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### "Build fails on Windows"

Ensure you have:

- Visual Studio Build Tools 2022
- Windows 10 SDK

Download: <https://visualstudio.microsoft.com/downloads/>

### Modular Architecture (v1.5+)

To maintain code quality and regenerability, all files follow the LLM-first coding principle:

- **File size limits**: Keep modules under 500 lines for easy maintenance and AI regeneration
- **Flat hierarchy**: Explicit code over deep abstractions
- **Modular structure**: Each module has clear boundaries and minimal coupling
- **Separated concerns**: Tests go in `tests.rs` files, not inline `#[cfg(test)]` blocks

**v1.5 Refactoring Priority** (see [ROADMAP.md](../ROADMAP.md) for details):

| File | Lines | Status |
|------|-------|--------|
| `db/mod.rs` | 4442 | CRITICAL - needs modularization |
| `scheduler/mod.rs` | 2955 | HIGH - candidate for split |
| `market_intelligence/mod.rs` | 2703 | HIGH - candidate for split |
| `config/mod.rs` | 2343 | MEDIUM - monitor size |
| `Dashboard.tsx` | 2315 | MEDIUM - frontend refactoring planned |

---

## Next Steps

1. Read [ROADMAP.md](../ROADMAP.md) for v1.5+ priorities and technical debt
2. Read [Quick Start Guide](../user/QUICK_START.md) for user documentation
3. Check [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues) for tasks
4. Review [Feature Documentation](../features/) for implementation details
5. Join [Discussions](https://github.com/cboyd0319/JobSentinel/discussions) for questions

---

**Last Updated:** January 17, 2026
