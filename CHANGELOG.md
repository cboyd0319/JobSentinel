# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.5.0] - 2025-10-11

### 🚀 Major Release - Python-First Architecture

**JobSentinel v0.5.0** represents a complete rewrite and modernization of the project. All legacy code has been removed in favor of a clean, Python 3.13-first implementation.

### ✨ Added

- **Universal Python Installer:** Cross-platform `scripts/install.py` supporting:
  - Windows 11+ (automatic Python 3.13.8 installation)
  - macOS 15+ (Sequoia)
  - Ubuntu 22.04+ LTS
- **Multi-Source Job Scrapers:**
  - JobsWithGPT (playwright-based)
  - Reed API integration
  - JobSpy aggregator
  - Greenhouse/Lever ATS support
- **Intelligent Job Scoring Engine:**
  - Keyword matching with TF-IDF
  - Location filtering
  - Salary range validation
  - Company blacklist support
- **Notification System:**
  - Slack webhook integration
  - Configurable thresholds
  - Rich job details in alerts
- **Resume ATS Analysis:**
  - spaCy NLP-powered skill extraction
  - Resume-to-job matching scores
  - CLI interface (`python -m jsa.cli ats-scan`)
- **Local-First Privacy:**
  - SQLite storage (no cloud dependencies)
  - All data stays on your machine
  - API keys stored in `.env` only
- **Cloud Deployment Support:**
  - GCP Cloud Run configurations
  - AWS ECS/Fargate configurations
  - Docker multi-stage builds
  - Terraform infrastructure templates
- **Developer Tools:**
  - Comprehensive test suite (pytest)
  - Type checking (mypy)
  - Linting (ruff)
  - Formatting (black)
  - Pre-commit hooks

### 🔄 Changed

- **Platform Requirements:**
  - Python: >=3.13.8 (leverages JIT compiler, free-threading support)
  - Windows: 11+ (build 22000+)
  - macOS: 15+ (Sequoia)
  - Linux: Ubuntu 22.04+ LTS
- **Architecture:**
  - Modular source plugins
  - Dependency injection for testability
  - Configuration-driven design
  - CLI-first interface
- **Deployment:**
  - Single unified installer replacing all platform-specific scripts
  - Automated virtual environment management
  - Platform-detected automation setup (Task Scheduler/launchd/cron)

### 🗑️ Removed

- All legacy PowerShell scripts and modules
- Old bash installers
- Deprecated migration documentation
- Historical implementation reports

### 📚 Documentation

- Fresh README with quickstart guide
- CONTRIBUTING.md with development setup
- SECURITY.md with vulnerability disclosure policy
- CODE_OF_CONDUCT.md
- Architecture documentation in `docs/`
- Comprehensive troubleshooting guide

### 🔐 Security

- Secrets managed via `.env` (never committed)
- Least-privilege automation setup
- Dependencies pinned in `pyproject.toml`
- No telemetry or third-party tracking
- Local-first design with optional cloud deployment

### ⚡️ Performance

- Python 3.13 JIT compiler (up to 10% faster)
- Efficient SQLite with proper indexing
- Playwright browser pooling
- Async job scraping support

### 🧪 Testing

- Unit tests for core logic (>85% coverage)
- Integration tests for scrapers
- End-to-end installer tests
- Platform compatibility test matrix

---

## Release Schedule

- **v0.6.0** - Q1 2026 (Enhanced AI integration, GPT-4 cover letter generation)
- **v0.7.0** - Q2 2026 (LinkedIn scraper, email digest)
- **v1.0.0** - Q3 2026 (Production ready, stable API, mobile app)

---

## Support

- **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Discussions:** https://github.com/cboyd0319/JobSentinel/discussions
- **Security:** See SECURITY.md for vulnerability reporting

[Unreleased]: https://github.com/cboyd0319/JobSentinel/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/cboyd0319/JobSentinel/releases/tag/v0.5.0
