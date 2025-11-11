# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-11

### Added
- Initial v1.0 release of JobSentinel
- Cross-platform desktop application built with Tauri 2.1, Rust, and React 19
- Support for Windows 11+ (MSI installer) and macOS 26.1+ Tahoe (DMG installer for Intel and Apple Silicon)
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
- Slack webhook integration for instant high-match job alerts (90%+ score)
- Automatic job search scheduling (every 2 hours, configurable)
- Manual job search trigger via system tray right-click menu
- SQLite database for local job storage with full-text search
- Interactive setup wizard for first-run configuration
- System tray integration (Windows) and menu bar integration (macOS)
- Privacy-first architecture - all data stays local, zero telemetry
- No admin rights required for installation

### Technical Features
- Asynchronous Rust backend with Tokio runtime
- React 19 frontend with Vite and TailwindCSS
- Secure HTTPS-only job board scraping with retry logic
- Content Security Policy (CSP) for enhanced security
- Auto-update capability (built-in to Tauri)
- Minimal resource footprint (~50MB memory, <0.5s startup)

### Documentation
- Comprehensive README with quick start guide
- User documentation in `docs/user/`
- Developer documentation in `docs/developer/`
- Complete security and code analysis report

### Infrastructure
- CI/CD pipeline with GitHub Actions
- Automated release builds for Windows and macOS
- Security audit integration
- Cross-platform testing

## [Unreleased]

### Planned for v1.1+
- Email notifications (SMTP)
- Reed.co.uk scraper integration
- JobSpy integration
- Resume parsing and job-resume matching
- Application tracker
- ML-enhanced scoring
- Linux support (.deb, .rpm, .AppImage)

---

[1.0.0]: https://github.com/cboyd0319/JobSentinel/releases/tag/v1.0.0
