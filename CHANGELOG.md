# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `ModalErrorBoundary` component for graceful Settings modal error handling
- Database query timeout utility (`with_timeout()`) for preventing hangs
- Telegram bot token and chat ID validation
- Search button cooldown (30 seconds) to prevent job board rate limiting
- Accessibility labels (`aria-label`) on icon buttons
- Consistent date formatting (en-US locale)

### Fixed
- HTTP client panic on startup - replaced `expect()` with `OnceCell` + graceful fallback
- Serialization error handling in commands - replaced `unwrap_or_default()` with proper error logging
- Scheduler status race condition - atomic status updates within single lock
- Scheduler graceful shutdown - added `tokio::select!` with shutdown signal
- JobCard console.error now dev-only (`import.meta.env.DEV`)
- Score bounds checking - clamped to 0.0-1.0 with warning logs for anomalies

### Security
- Added comprehensive security documentation for email SMTP password storage
- Documented keyring integration planned for v2.0 (macOS Keychain, Windows Credential Manager)

### Changed
- Application Tracking System (ATS) module now enabled
  - Kanban board with 12 status columns
  - Automated follow-up reminders
  - Timeline/audit trail for all application events
  - Ghosting detection (auto-mark after 2 weeks no contact)
- Resume Matcher module now enabled
  - PDF resume parsing
  - Skill extraction from resumes
  - Job-resume matching with confidence scores
- Salary AI module now enabled
  - H1B data-based salary predictions
  - Salary benchmarks by role and location
  - Offer comparison and negotiation insights
- Market Intelligence module now enabled
  - Daily market snapshots
  - Skill demand trends
  - Salary trends by role/location
  - Company hiring velocity tracking
  - Location job density analysis
  - Market alerts for anomalies

### Changed
- Refactored codebase to fix all compilation errors
- Updated test suite: 291 tests passing, 20 ignored (require file-based database or are doc examples)
- Fixed SQLx Row trait usage (get -> try_get)
- Converted all query! macros to runtime queries (removed DATABASE_URL dependency)
- Fixed proptest edge cases in scrapers
- Fixed webhook URL validation test assertions
- Updated documentation for accurate v1.0 status
- Fixed MEDIAN() SQLite incompatibility (computed in Rust)

### Security
- Removed `unsafe-inline` from script-src CSP
- Added Discord and Teams webhook URLs to CSP connect-src
- Fixed npm vulnerabilities (glob, js-yaml)
- Removed unused `backoff` crate (unmaintained)

### Technical
- Implemented Display and FromStr traits for ApplicationStatus
- Added Default derive to AlertConfig and SlackConfig
- Fixed Indeed scraper hash generation
- Fixed database integrity DateTime handling
- Added #[ignore] to backup/restore and ATS tests (require file-based database)
- Fixed doctest compilation issues
- Fixed all clippy warnings (zero warnings with -D warnings)

## [1.0.0-alpha] - 2026-01-14

### Added
- Core v1.0 release of JobSentinel (alpha)
- Cross-platform desktop application built with Tauri 2.1, Rust, and React 19
- Windows 11+ support (primary target)
- Automated job scraping from three major job boards:
  - Greenhouse
  - Lever
  - JobsWithGPT
- Smart multi-factor job scoring algorithm:
  - Skills matching (40%)
  - Salary requirements (25%)
  - Location preferences (20%)
  - Company preferences (10%)
  - Job recency (5%)
- Multi-channel webhook notifications:
  - Slack
  - Discord
  - Microsoft Teams
- Automatic job search scheduling (every 2 hours, configurable)
- Manual job search trigger via system tray right-click menu
- SQLite database for local job storage with full-text search
- Interactive setup wizard for first-run configuration
- Privacy-first architecture - all data stays local, zero telemetry
- No admin rights required for installation

### Technical Features
- Asynchronous Rust backend with Tokio runtime
- React 19 frontend with Vite and TailwindCSS
- Secure HTTPS-only job board scraping with retry logic
- Content Security Policy (CSP) for enhanced security
- Auto-update capability (built-in to Tauri)
- Minimal resource footprint (~50MB memory, <0.5s startup)

### Deferred to v1.1+
- Application Tracking System (ATS) - 85% complete
- AI Resume-Job Matcher - 65% complete
- Salary Negotiation AI - 50% complete
- Job Market Intelligence Dashboard - 60% complete
- LinkedIn/Indeed scrapers - code exists, incomplete
- Email notifications (SMTP)
- macOS support (.dmg installer)
- Linux support (.deb, .rpm, .AppImage)

### Deferred to v2.0+
- One-Click Apply Automation - requires legal review and user consent framework

---

[Unreleased]: https://github.com/cboyd0319/JobSentinel/compare/v1.0.0-alpha...HEAD
[1.0.0-alpha]: https://github.com/cboyd0319/JobSentinel/releases/tag/v1.0.0-alpha
