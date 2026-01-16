# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Comprehensive clippy configuration** - lib.rs now includes pedantic lint allows for intentional patterns
- **Email validation** in Settings - from/to email fields validate format before save
- **4 new frontend pages** with navigation from Dashboard:
  - **Applications** - Kanban board for tracking job applications through pipeline
  - **Resume** - AI resume matcher with PDF upload and skill extraction
  - **Salary** - Salary benchmarks, predictions, and negotiation script generation
  - **Market** - Market intelligence with skill trends, company activity, location heat maps
- **Email notifications UI** in Settings - full SMTP configuration with toggle switch
- **GitHub Actions CI/CD** - multi-platform build/test workflow (`.github/workflows/ci.yml`)
- **Dialog plugin** for file picker (tauri-plugin-dialog) - enables resume PDF upload
- **LinkedIn scraper integration** - fully wired into scheduler with Settings UI
  - Session cookie (li_at) authentication
  - Configurable query, location, remote-only filter
  - Adjustable result limit (10-100)
- **Indeed scraper integration** - fully wired into scheduler with Settings UI
  - Query-based search with location
  - Configurable radius (0-100 miles)
  - Adjustable result limit (10-100)
- **Desktop notifications** - native OS notifications via Tauri plugin
  - Notifies on high-match job discoveries
  - Uses tauri-plugin-notification v2
- **25 new Tauri commands** for backend modules:
  - ATS: `create_application`, `get_applications_kanban`, `update_application_status`, `add_application_notes`, `get_pending_reminders`, `complete_reminder`, `detect_ghosted_applications`
  - Resume: `upload_resume`, `get_active_resume`, `set_active_resume`, `get_user_skills`, `match_resume_to_job`, `get_match_result`
  - Salary: `predict_salary`, `get_salary_benchmark`, `generate_negotiation_script`, `compare_offers`
  - Market Intelligence: `get_trending_skills`, `get_active_companies`, `get_hottest_locations`, `get_market_alerts`, `run_market_analysis`
- LinkedIn/Indeed configuration UI in Settings page with toggle switches
- `src/utils/notifications.ts` - frontend notification utility module
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

### Accessibility
- Modal dialogs support ESC key to close and click-outside to dismiss
- Added `role="dialog"`, `aria-modal`, and `aria-labelledby` to all modals
- All form inputs now have proper `id` and associated `htmlFor` labels
- Added `aria-valuetext` to range inputs for screen reader support
- Added focus ring styles (`focus:ring-2`) to selects and textareas

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
- Updated test suite: 290 tests passing, 20 ignored (require file-based database or are doc examples)
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

### Completed Since Alpha
- Application Tracking System (ATS) - ✅ Fully enabled
- AI Resume-Job Matcher - ✅ Fully enabled
- Salary Negotiation AI - ✅ Fully enabled
- Job Market Intelligence Dashboard - ✅ Fully enabled
- LinkedIn scraper - ✅ Integrated with scheduler and Settings UI
- Indeed scraper - ✅ Integrated with scheduler and Settings UI
- Desktop notifications - ✅ Via Tauri plugin

### Deferred to v1.1+
- Email notifications (SMTP - backend ready, frontend pending)
- macOS support (.dmg installer)
- Linux support (.deb, .rpm, .AppImage)

### Deferred to v2.0+
- One-Click Apply Automation - requires legal review and user consent framework

---

[Unreleased]: https://github.com/cboyd0319/JobSentinel/compare/v1.0.0-alpha...HEAD
[1.0.0-alpha]: https://github.com/cboyd0319/JobSentinel/releases/tag/v1.0.0-alpha
