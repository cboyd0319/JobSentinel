# Changelog

Notes about this project — short and practical. I keep a simple changelog here so I (and anyone testing) can see what's changed.

## [Unreleased]

### Added in 1.0.0

- Release and versioning helpers
- CI tweaks to make releases smoother
- A small CLI `--version` flag

### Changed

- Skip some heavy CI steps for docs-only edits

---

## [1.0.0] - 2025-01-26

### Added

- Initial public release
- Support for Greenhouse, Lever, Workday, and JS-powered career pages
- Rule-based job scoring and optional AI enhancement
- Slack alerts and daily email digests
- Optional ChatGPT integration for better scoring
- Backup and recovery for the local database
- Cross-platform setup scripts for Windows and macOS/Linux
- Privacy-first: everything runs locally

### Technical bits

- SQLite with SQLModel
- Playwright for scraping JS-heavy pages
- JSON-based user prefs and `.env` for secrets
- Structured logs with rotation

### Planned

- More job board scrapers
- Discord alerts and Docker support
- A few UI and analytics improvements

---

Legend:

- 🎉 Major feature
- ✨ New feature
- 🐛 Bug fix
- 📚 Docs
