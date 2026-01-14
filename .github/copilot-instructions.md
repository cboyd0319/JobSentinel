# Copilot Instructions — JobSentinel

Purpose: Provide clear, enforceable guidance so changes remain aligned with JobSentinel's mission, security posture, testing rigor, and documentation standards.

## Current Status (January 2026)

**Version: 1.0.0-alpha** - Core functionality working, tests passing

### v1.0 Core (Working)
- Config management with JSON-based preferences
- SQLite database with async SQLx operations
- Job scrapers: Greenhouse, Lever, JobsWithGPT
- Multi-factor scoring algorithm (skills, salary, location, company, recency)
- Notifications: Slack, Discord, Teams webhooks
- Scheduler for periodic scraping (configurable interval)
- Tauri 2.x desktop app with React 19 frontend

### v1.1+ Features (Deferred - Need Fixes)
- Application Tracking System (ATS) - 85% complete
- AI Resume-Job Matcher - 65% complete
- Salary Negotiation AI - 50% complete
- Job Market Intelligence Dashboard - 60% complete

### v2.0+ Features (Deferred - Requires Legal Review)
- One-Click Apply Automation - requires user consent framework

### Test Status
- 256 tests pass (243 library + 12 integration + 1 doc)
- 9 tests ignored (require file-based database for backup/restore)
- 0 clippy warnings
- Release build succeeds

## Mission & Non-Negotiables

- Privacy-first job search automation: 100% privacy, zero telemetry. Local-only operation is required.
- Desktop-first: Tauri-based single binary for Windows 11+ (primary), macOS 26.2+ (v2.0), Linux (v2.0).
- Rust backend: Memory-safe Rust implementation with SQLite for local data storage.
- React frontend: Modern React 19 with TypeScript and TailwindCSS for UI.
- Offline-first: All job data and configuration stored locally; no cloud dependencies required.
- Automated scraping: Periodic job board scraping (Greenhouse, Lever, JobsWithGPT) with configurable intervals.
- Smart scoring: Multi-factor job scoring based on skills, salary, location, company, and recency.
- Privacy-conscious notifications: Optional Slack webhooks for high-match alerts (user-configured).

CRITICAL Repo Rules (must follow)
- Zero emojis in code, ever. Do not add emojis to source files, generated code, or code comments. Code examples in docs that users might copy/paste must also be emoji-free.
- Avoid doc sprawl. Do not create a new doc for every small task. Prefer updating existing docs. Create new documents only when a clear gap exists.

Primary audience: Job seekers who value privacy and want automated job search without sharing data with third parties.
Target OS: Windows 11+ (primary) → macOS 26.2+ (v2.0) → Linux (v2.0).

## Architecture Snapshot

- Tauri 2.x desktop application with React frontend
- Rust backend: `src-tauri/src/`
  - `core/`: Business logic (config, db, scoring, scrapers, scheduler, notify)
  - `commands/`: Tauri command handlers (RPC-style functions)
  - `platforms/`: Platform-specific code (Windows, macOS, Linux)
  - `cloud/`: Future cloud deployment support (AWS, GCP)
- React frontend: `src/`
  - `App.tsx`: Main application entry with first-run setup wizard
  - `pages/`: Dashboard and SetupWizard components
  - `index.css`: TailwindCSS styles
- Database: SQLite with SQLx for async operations
- Scrapers (v1.0 working):
  - Greenhouse: Company-specific job board scraping
  - Lever: Company-specific job board scraping
  - JobsWithGPT: MCP-based job aggregator API
- Scrapers (v1.1+ incomplete):
  - Indeed: Code exists but incomplete
  - LinkedIn: Code exists but incomplete
- Scoring: Multi-factor algorithm (skills 40%, salary 25%, location 20%, company 10%, recency 5%)
- Notifications: Slack, Discord, and Teams webhook integration for high-match alerts (>90% score)

### Disabled Modules (in src-tauri/src/core/mod.rs)
The following modules are commented out until fixed:
- `ats` - Application tracking (needs compilation fixes)
- `resume` - Resume matcher (needs compilation fixes)
- `salary` - Salary negotiation (needs SQLite MEDIAN() workaround)
- `market_intelligence` - Market trends (needs SQLite MEDIAN() workaround)
- `automation` - One-click apply (deferred to v2.0+, requires legal review)

## Documentation Policy (must follow)

- All docs live under root directory (no `docs/` subdirectory yet).
- Allowed root files: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE`, `GETTING_STARTED.md`, `QUICK_START.md`, `MACOS_DEVELOPMENT.md`, `COMPLETION_SUMMARY.md`, `V1_COMPLETION_STATUS.md`, `IMPLEMENTATION_PROGRESS.md`.
- This file (`.github/copilot-instructions.md`) is an operational exception.
- Use active voice and consistent terminology.
- All links should be relative when possible.
- Keep documentation up to date with code changes.

## Testing & Coverage Requirements

- Backend testing: Rust tests with `cargo test`
- Frontend testing: React component testing (to be added)
- Database tests: SQLite operations validated with async tests
- Integration tests: End-to-end Tauri command tests
- Coverage goal: ≥ 80% for critical modules (db, scoring, scrapers)
- Manual testing: Run the app locally and verify UI works correctly

## CI Rules & Required Checks

- TypeScript compilation: `npm run build` must succeed
- Rust compilation: `cargo check --all-features --all-targets` must succeed
- Formatting: `cargo fmt --all -- --check` for Rust
- Linting: `cargo clippy --workspace --all-features --all-targets -- -D warnings` for Rust
- Tests: `cargo test --workspace --all-features` must pass
- Security: CodeQL analysis for vulnerabilities
- Build validation: Tauri build should complete successfully

## Single Source of Truth

- README.md: Overview, features, installation, and quickstart
- GETTING_STARTED.md: Detailed setup and configuration instructions
- QUICK_START.md: Fast setup guide for experienced users
- MACOS_DEVELOPMENT.md: macOS-specific development setup (v2.0)
- package.json: Frontend dependencies and scripts
- Cargo.toml: Rust dependencies and project metadata

## When Adding or Changing Features

1) Update documentation:
   - `README.md` for user-facing feature changes
   - `GETTING_STARTED.md` for setup or configuration changes
   - `IMPLEMENTATION_PROGRESS.md` for development progress
   - Code comments for complex logic
2) Update configuration:
   - `config.example.json` for new configuration options
   - TypeScript types for config changes
   - Rust Config struct for backend changes
3) Add tests:
   - Rust: Unit tests in same file as implementation
   - Rust: Integration tests in `tests/` directory
   - Database: Test migrations and queries
4) Run validation:
   ```bash
   # TypeScript
   npm run build
   npx tsc --noEmit
   
   # Rust
   cargo check --all-features --all-targets
   cargo clippy --workspace --all-features --all-targets -- -D warnings
   cargo fmt --all -- --check
   cargo test --workspace --all-features
   
   # Full build
   npm run tauri:build
   ```

## Build Systems & Technology Stack

- Frontend: React 19 + TypeScript + TailwindCSS + Vite
- Backend: Rust 2021 edition + Tauri 2.x
- Database: SQLite with SQLx (async) + migrations
- HTTP: reqwest with rustls for scraping
- HTML Parsing: scraper crate
- Async: tokio runtime
- Serialization: serde + serde_json
- Logging: tracing + tracing-subscriber
- Error Handling: thiserror + anyhow
- Testing: cargo test + tokio::test

## Security & Privacy Requirements

- Zero telemetry: No data sent to external services without explicit user configuration
- Local-first: All data stored in local SQLite database
- Secure HTTP: Use rustls (pure Rust TLS) instead of native TLS
- No credentials in code: Use environment variables or config files
- Webhook validation: Validate Slack webhooks before storing
- Input sanitization: Validate and sanitize all user inputs
- SQL injection prevention: Use SQLx parameterized queries (never string concatenation)
- Safe Rust: Avoid unsafe blocks; prefer safe abstractions

## Distribution & Packaging

- Windows: MSI installer via Tauri
- macOS: DMG installer via Tauri (v2.0)
- Linux: AppImage, deb, and rpm packages via Tauri (v2.0)
- Auto-updates: Tauri updater for seamless updates
- Signing: Code signing for Windows and macOS releases
- Release assets: Binaries + checksums + signatures

## Precommit Checklist

**Code Quality:**
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Rust compiles without errors: `cargo check --all-features --all-targets`
- [ ] Clippy passes with no warnings: `cargo clippy --workspace --all-features --all-targets -- -D warnings`
- [ ] Code is formatted: `cargo fmt --all`
- [ ] All tests pass: `cargo test --workspace --all-features`
- [ ] No console.log or println! left in production code
- [ ] Error handling is proper (Result types, descriptive errors)
- [ ] No unsafe blocks (or justified with comments)

**Documentation & Features:**
- [ ] README.md updated for user-facing changes
- [ ] Configuration examples updated: `config.example.json`
- [ ] Database migrations created if schema changed
- [ ] Tests added for new features
- [ ] API documentation updated (doc comments)

## Code Quality Standards

**Quality Metrics:**
- All Rust code compiles without errors
- Zero clippy warnings with `-D warnings` flag
- All tests passing (100% success rate)
- Code formatting verified with `cargo fmt --check`
- Zero unsafe code blocks across entire codebase
- Proper error handling patterns (minimal unwrap/expect)
- TypeScript strict mode enabled
- React hooks used correctly (no ESLint warnings)

**Continuous Quality Enforcement:**
- Run `cargo check --workspace --all-features --all-targets` before commits
- Run `cargo clippy --workspace --all-features --all-targets -- -D warnings` to catch issues
- Run `cargo fmt --all -- --check` to verify formatting
- Run `cargo test --workspace --all-features` to verify all tests pass
- Run `npx tsc --noEmit` to verify TypeScript compilation
- All Cargo.toml files must include: name, version, edition, license, repository
- Document TODOs with context and issue numbers
- Use proper error handling (Result types, descriptive errors)
- Prefer logging over println! in production code paths
- Use tracing crate for structured logging

## Platform-Specific Notes

**Windows (Primary Target):**
- Windows 11+ required
- System tray integration via Tauri
- Windows notifications via Tauri plugin
- Paths: %LOCALAPPDATA%\JobSentinel (data), %APPDATA%\JobSentinel (config)
- MSI installer with custom UI

**macOS (v2.0 - Future):**
- macOS 26.2+ (Ventura) required
- Menu bar integration
- macOS notifications via Tauri plugin
- Paths: ~/Library/Application Support/JobSentinel (data), ~/.config/jobsentinel (config)
- DMG installer with background image
- Code signing with Apple Developer ID

**Linux (v2.0 - Future):**
- Modern Linux distributions (Ubuntu 22.04+, Fedora 38+)
- System tray integration via Tauri
- Desktop notifications via libnotify
- Paths: ~/.local/share/jobsentinel (data), ~/.config/jobsentinel (config)
- AppImage, deb, and rpm packages

## Development Workflow

**Setting Up Development Environment:**
1. Install Rust: https://rustup.rs/
2. Install Node.js 18+ and npm
3. Install system dependencies (see GETTING_STARTED.md)
4. Clone repository: `git clone https://github.com/cboyd0319/JobSentinel.git`
5. Install frontend deps: `npm install`
6. Run dev server: `npm run tauri:dev`

**Making Changes:**
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with frequent commits
3. Run quality checks before committing
4. Update documentation if needed
5. Submit pull request with clear description

**Testing Changes:**
1. Unit tests: `cargo test`
2. Integration tests: `cargo test --test integration_tests`
3. Manual testing: `npm run tauri:dev`
4. Build test: `npm run tauri:build`

## Common Pitfalls to Avoid

- Don't use `unwrap()` or `expect()` in production code paths (use proper error handling)
- Don't use `println!` in production code (use `tracing` crate)
- Don't hardcode paths (use `platforms::get_data_dir()` and `platforms::get_config_dir()`)
- Don't store secrets in code or config files
- Don't break backwards compatibility without migration path
- Don't add dependencies without careful consideration (increases binary size)
- Don't use deprecated Tauri v1 APIs (this is Tauri v2)
- Don't mix sync and async code without proper runtime handling
- Don't use `async` in trait methods without `#[async_trait]`
- Don't forget to run database migrations on startup

## Additional Sources

- Tauri documentation: https://tauri.app/
- SQLx documentation: https://docs.rs/sqlx/
- React documentation: https://react.dev/
- TypeScript handbook: https://www.typescriptlang.org/docs/
- Rust book: https://doc.rust-lang.org/book/

Questions? Open an issue and tag `@cboyd0319`.
