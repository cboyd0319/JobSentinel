# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Application Tracking System (ATS) module now enabled
  - Kanban board with 12 status columns
  - Automated follow-up reminders
  - Timeline/audit trail for all application events
  - Ghosting detection (auto-mark after 2 weeks no contact)

### Changed
- Refactored codebase to fix all compilation errors
- Updated test suite: 256 tests passing, 13 ignored (require file-based database)
- Fixed SQLx Row trait usage (get -> try_get)
- Fixed proptest edge cases in scrapers
- Fixed webhook URL validation test assertions
- Updated documentation for accurate v1.0 status

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
- Auto-fixed clippy warnings

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
