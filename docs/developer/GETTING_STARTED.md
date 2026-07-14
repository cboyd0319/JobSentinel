# Getting Started with JobSentinel

## Project Status

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

# Install Node.js 24.18.0 (https://nodejs.org/)
# `.nvmrc` pins the local baseline used by CI.
# `package.json` pins npm 12.0.1.

# Tauri CLI
# `npm ci --ignore-scripts` installs the repo-local CLI from @tauri-apps/cli.
# Use `npm run tauri:*` scripts or `npx --no-install tauri` from the repo root.
```

**Windows Only:**

- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/) — select "Desktop development with C++"
- Windows 10 SDK (included with Build Tools)

**Linux Only:**

```bash
sudo apt-get install -y \
  file \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libgtk-3-bin \
  libappindicator3-dev \
  librsvg2-dev \
  libfuse2t64 \
  patchelf \
  squashfs-tools
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

# Activate the repo-pinned npm, then install dependencies from the lockfile
node scripts/install-pinned-npm.mjs
npm ci --ignore-scripts

# Run in development mode (hot reload enabled)
npm run tauri:dev
```

### Building for Production

```bash
# Build for your current platform
npm run tauri:build

# macOS: Build no-account universal package (Intel + Apple Silicon)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin

# Windows installer outputs
# target/<target>/release/bundle/msi/JobSentinel_<version>_x64_en-US.msi
# target/<target>/release/bundle/nsis/JobSentinel_<version>_x64-setup.exe

# macOS no-account universal DMG output
# target/universal-apple-darwin/release/bundle/dmg/JobSentinel_<version>_no-account_universal.dmg
# target/universal-apple-darwin/release/bundle/dmg/JobSentinel_<version>_no-account_universal.dmg.sha256

# Linux packages output
node scripts/platform/build-linux-appimage.mjs --target x86_64-unknown-linux-gnu
# target/x86_64-unknown-linux-gnu/release/bundle/deb/JobSentinel_<version>_amd64.deb
# target/x86_64-unknown-linux-gnu/release/bundle/appimage/JobSentinel_<version>_amd64.AppImage
```

### Project Structure

```text
JobSentinel/
- src/: React frontend (TypeScript + Tailwind)
  - app/: startup, providers, navigation, and route composition
  - features/: product slices with private implementation modules
  - shared/: product-neutral contracts used by multiple owners
  - ui/: reusable visual primitives
  - test/: Vitest setup and shared test helpers
  - main.tsx: thin entry point
- crates/jobsentinel-core/: Tauri-free Rust core
  - src/core/: business logic modules
  - src/platforms/: Windows, macOS, and Linux adapters
  - migrations/: SQLite migrations
  - tests/: core integration tests
- src-tauri/: thin Tauri desktop shell
  - src/main.rs: minimal app entry
  - src/lib.rs: private shell composition and public run function
  - src/commands/: private Tauri RPC command handlers
  - Cargo.toml: app-only dependencies
- Cargo.toml: explicit workspace members, metadata, dependencies, and lints
- Cargo.lock, .cargo/, .sqlx/, clippy.toml, deny.toml: root Cargo policy
- public/: static assets
- docs/: documentation
- package.json: npm dependencies
- vite.config.ts: Vite configuration
```

### Key Technologies

| Technology      | Purpose                            |
| --------------- | ---------------------------------- |
| **Tauri 2**     | Desktop app framework (Rust + Web) |
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
cargo test --workspace

# Frontend tests
npm run test:run
```

### Code Style

```bash
# Format Rust code
cargo fmt --all -- --check

# Lint Rust code
cargo clippy --workspace -- -D warnings

# Fix TypeScript/React lint issues where safe
npm run lint:fix
```

---

## Architecture Overview

### Core Business Logic (Platform-Agnostic)

All core functionality is in `crates/jobsentinel-core/src/core/` and works identically on all platforms:

- **ats**: Application Tracking System with interview scheduler
- **config**: JSON-based user preferences
- **db**: SQLite database with async support (70+ queries)
- **ghost**: Ghost job detection with repost tracking and stale detection
- **market_intelligence**: Market analytics with trends and location insights
- **notify**: Multi-channel notifications (Slack, Discord, Teams, Email, Telegram, Desktop)
- **resume**: local resume fit review with skill extraction
- **salary**: Pay protection, salary-floor review, and compensation range checks
- **scheduler**: Periodic source checks with configurable interval and auto-refresh
- **scoring**: Multi-factor job scoring (0-1 scale)
- **scrapers**: Scheduled source adapters with parallel execution (Greenhouse,
  Lever, RemoteOK, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice,
  YC Startup Jobs, USAJobs, SimplyHired, Glassdoor)

### Platform-Specific Code

Platform code is in `crates/jobsentinel-core/src/platforms/` and uses conditional compilation:

- **Windows**: Windows 11+ platform features
- **macOS**: macOS platform features. Packaging declares macOS 13.0 as the
  minimum; current release validation targets macOS 26+
- **Linux**: Linux platform features

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
| **macOS**   | `~/Library/Application Support/JobSentinel/jobs.db`         |
| **Linux**   | `~/.local/share/jobsentinel/jobs.db`                        |

Migrations run automatically. You never need to set up tables manually.

Open the containing directory with the platform file browser:

```bash
# Windows
explorer %LOCALAPPDATA%\JobSentinel

# macOS
open ~/Library/Application\ Support/JobSentinel/

# Linux
xdg-open ~/.local/share/jobsentinel/
```

`jobs.db` is encrypted with SQLCipher. Do not open it with an unkeyed SQLite
tool or copy private job-search data into a diagnostic service. Use the
owner-provided database tests and safe support report for diagnosis.

---

## Troubleshooting

### "Rust not found"

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
```

### "npm ci fails"

```bash
# Clear cache
npm cache clean --force

# Delete installed packages, but keep package-lock.json
rm -rf node_modules

# Reinstall from the lockfile with the repo-pinned npm
node scripts/install-pinned-npm.mjs
npm ci --ignore-scripts
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
  file \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libgtk-3-bin \
  libappindicator3-dev \
  librsvg2-dev \
  libfuse2t64 \
  patchelf \
  squashfs-tools
```

### "sqlx error" or "no cached data for this query"

The project uses SQLx offline mode so you don't need a running database to compile.
This is configured automatically via `.cargo/config.toml` (sets `SQLX_OFFLINE=true`).

If you see this error, make sure the root `.sqlx/` directory exists. If you've
changed any SQL queries using the `sqlx::query!()` macro, you'll need to regenerate the cache:

```bash
npm run sqlx:prepare
npm run lint:sqlx
```

> **Prefer runtime queries:** Use `sqlx::query()` (without `!`) for new code. Runtime queries
> don't need the offline cache and are easier to maintain.

### Modular Architecture

The repository enforces explicit ownership and maintainable file boundaries:

- **File size policy**: Follow the current maintainable thresholds in
  [Harness Engineering](../harness/README.md) and run `npm run lint:bloat`
- **Modules before crates**: Split private modules before creating another
  workspace member; crate count follows runtime, dependency, release, and API
  ownership
- **Explicit structure**: Prefer clear ownership over deep abstractions
- **Private implementation**: Expose one owner facade and keep implementation
  leaves private or crate-visible
- **Separated concerns**: Tests go in `tests.rs` files, not inline `#[cfg(test)]` blocks

Current refactor candidates live in
[tech-debt-tracker.md](../plans/tech-debt-tracker.md). Use live line counts and
ownership checks instead of copying fixed size snapshots into setup docs.

---

## Next Steps

1. Read the [root roadmap](../../ROADMAP.md) for product priorities and
   [developer roadmap](../ROADMAP.md) for active implementation routing
2. Read [Quick Start Guide](../user/QUICK_START.md) for user documentation
3. Check [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues) for tasks
4. Review [Feature Documentation](../README.md#features) for implementation details
5. Join [Discussions](https://github.com/cboyd0319/JobSentinel/discussions) for questions
