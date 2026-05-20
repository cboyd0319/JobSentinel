# Getting Started with JobSentinel

## Project Status

**Version 2.6.4**

| Component                                                                                                                            | Status                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Core modules (config, db, scoring, scrapers, scheduler, notify, ghost, ats, resume, salary, market, automation, credentials, health) | Working                                      |
| Frontend (React 19 + TypeScript)                                                                                                     | Working                                      |
| Verification                                                                                                                         | `npm run harness:check`, frontend tests, Rust tests, and E2E tests |

---

## For Developers

### Prerequisites

**All Platforms:**

```bash
# Install Rust (https://rustup.rs/)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 20+ (https://nodejs.org/)
# Download the LTS version from the website

# Install Tauri CLI
cargo install tauri-cli@2.1
```

**Windows Only:**

- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/) — select "Desktop development with C++"
- Windows 10 SDK (included with Build Tools)

**Linux Only:**

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

**macOS Only:**

```bash
# Install Xcode Command Line Tools (if you don't have them)
xcode-select --install
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
# Build for your current platform
npm run tauri:build

# macOS: Build universal binary (Intel + Apple Silicon)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
cd src-tauri && cargo tauri build --target universal-apple-darwin

# Windows MSI installer output
# src-tauri/target/<target>/release/bundle/msi/JobSentinel_<version>_x64_en-US.msi

# macOS Universal DMG output
# src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_<version>_universal.dmg

# Linux packages output
# src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/JobSentinel_<version>_amd64.deb
# src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/JobSentinel_<version>_amd64.AppImage
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
│   │   └── commands/        # Tauri RPC command handlers
│   ├── migrations/          # SQLite migrations
│   └── Cargo.toml           # Rust dependencies
├── public/                  # Static assets (logo, etc.)
├── docs/                    # Documentation
├── package.json             # npm dependencies
└── vite.config.ts           # Vite configuration
```

### Key Technologies

| Technology      | Purpose                            |
| --------------- | ---------------------------------- |
| **Tauri 2.1**   | Desktop app framework (Rust + Web) |
| **React 19**    | UI framework                       |
| **Vite**        | Fast build tool                    |
| **TailwindCSS** | Utility-first CSS                  |
| **TypeScript**  | Type-safe JavaScript               |
| **Rust**        | Backend language                   |
| **Tokio**       | Async runtime                      |
| **SQLx**        | SQLite database                    |
| **reqwest**     | HTTP client                        |
| **scraper**     | HTML parsing                       |

### Running Tests

```bash
# Backend tests
cd src-tauri
cargo test

# Frontend tests
npm test
```

### Code Style

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Lint Rust code
cargo clippy

# Fix TypeScript/React lint issues where safe
npm run lint:fix
```

---

## Architecture Overview

### Core Business Logic (Platform-Agnostic)

All core functionality is in `src-tauri/src/core/` and works identically on all platforms:

- **ats**: Application Tracking System with interview scheduler
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
  RemoteOK, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice,
  YC Startup Jobs, USAJobs, SimplyHired, Glassdoor)

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

## Debugging

### Enable Rust Logs

```bash
# Set log level (trace, debug, info, warn, error)
RUST_LOG=debug npm run tauri:dev
```

### Chrome DevTools

When running `npm run tauri:dev`, press `Ctrl+Shift+I` (Windows) to open Chrome DevTools for the React frontend.

### Database

The SQLite database is **created automatically** on first launch — no setup needed.

**Database location by platform:**

| Platform    | Path                                                        |
| ----------- | ----------------------------------------------------------- |
| **Windows** | `%LOCALAPPDATA%\JobSentinel\jobs.db`                        |
| **macOS**   | `~/Library/Application Support/com.jobsentinel.app/jobs.db` |
| **Linux**   | `~/.local/share/com.jobsentinel.app/jobs.db`                |

Migrations run automatically. You never need to set up tables manually.

Open with [DB Browser for SQLite](https://sqlitebrowser.org/):

```bash
# Windows
explorer %LOCALAPPDATA%\JobSentinel

# macOS
open ~/Library/Application\ Support/com.jobsentinel.app/

# Linux
xdg-open ~/.local/share/com.jobsentinel.app/
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

### "Build fails on Linux"

Install the required system libraries:

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

### "sqlx error" or "no cached data for this query"

The project uses SQLx offline mode so you don't need a running database to compile.
This is configured automatically via `src-tauri/.cargo/config.toml` (sets `SQLX_OFFLINE=true`).

If you see this error, make sure the `.sqlx/` directory exists in `src-tauri/`. If you've
changed any SQL queries using the `sqlx::query!()` macro, you'll need to regenerate the cache:

```bash
cd src-tauri
DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare
```

> **Prefer runtime queries:** Use `sqlx::query()` (without `!`) for new code. Runtime queries
> don't need the offline cache and are easier to maintain.

### Modular Architecture (v1.5+)

To maintain code quality and regenerability, all files follow the LLM-first coding principle:

- **File size limits**: Keep modules under 500 lines for easy maintenance and AI regeneration
- **Flat hierarchy**: Explicit code over deep abstractions
- **Modular structure**: Each module has clear boundaries and minimal coupling
- **Separated concerns**: Tests go in `tests.rs` files, not inline `#[cfg(test)]` blocks

**v1.5 Refactoring Priority** (see [ROADMAP.md](../ROADMAP.md) for details):

| File                         | Lines | Status                                |
| ---------------------------- | ----- | ------------------------------------- |
| `db/mod.rs`                  | 4442  | CRITICAL - needs modularization       |
| `scheduler/mod.rs`           | 2955  | HIGH - candidate for split            |
| `market_intelligence/mod.rs` | 2703  | HIGH - candidate for split            |
| `config/mod.rs`              | 2343  | MEDIUM - monitor size                 |
| `Dashboard.tsx`              | 2315  | MEDIUM - frontend refactoring planned |

---

## Next Steps

1. Read [ROADMAP.md](../ROADMAP.md) for v1.5+ priorities and technical debt
2. Read [Quick Start Guide](../user/QUICK_START.md) for user documentation
3. Check [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues) for tasks
4. Review [Feature Documentation](../README.md#features) for implementation details
5. Join [Discussions](https://github.com/cboyd0319/JobSentinel/discussions) for questions

---

**Last Updated:** March 18, 2026
