# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚀 Standards & Compliance (NEW)

- **Expanded authoritative standards** from 30 to 39+ references
  - Added ISO/IEC 25010:2023 (software quality model - 8 characteristics)
  - Added NIST AI Risk Management Framework (AI safety compliance)
  - Added WCAG 2.1 Level AA (web accessibility)
  - Added IEEE 730-2014 (software quality assurance)
  - Added Property-Based Testing with Hypothesis
  - Added BERT, Sentence-BERT academic references
  - Added LinkedIn, Indeed, Glassdoor market research sources
  - Added 6+ new MCP server options (OpenRouter, Anthropic servers, etc.)
  - Added accessibility standards (Section 508, ARIA)
  
- **Enhanced MCP Integration Guide** (`docs/MCP_INTEGRATION.md`)
  - Added BLS OEWS MCP server documentation (built-in, free)
  - Added LinkedIn Skills Graph integration (planned)
  - Added OpenRouter LLM Gateway (planned)
  - Added Anthropic official MCP servers (available now)
  - Added custom MCP server creation guide
  - Expanded from 2 to 6+ server options

- **Property-Based Testing** (`tests/unit_jsa/test_properties.py`)
  - Added comprehensive Hypothesis test suite (300+ lines)
  - Tests for input validation, security patterns, resume analysis
  - Automatic edge case discovery
  - SQL injection and XSS detection validation
  - Generative testing for robust validation

### 📚 Documentation

- **Added comprehensive best practices guide** (`docs/BEST_PRACTICES.md`)
  - Architecture principles (separation of concerns, typed interfaces, explicit errors)
  - Security best practices (secrets management, input validation, rate limiting)
  - Testing standards with coverage targets (≥85% for critical paths)
  - Observability & monitoring patterns (structured logging, metrics, health checks)
  - Performance optimization strategies (async/await, caching, database optimization)
  - Production deployment checklist
  
- **Added complete API integration guide** (`docs/API_INTEGRATION_GUIDE.md`)
  - Step-by-step instructions for adding new job board integrations
  - REST API, HTML scraping, and MCP protocol patterns
  - Complete code templates with error handling and retry logic
  - Testing strategies and integration checklist
  
- **Added production deployment guide** (`docs/DEPLOYMENT_GUIDE.md`)
  - Docker production setup with compose files
  - Cloud deployment guides (AWS Lambda, GCP Cloud Run, Azure Container Instances)
  - Monitoring & observability setup
  - Backup & disaster recovery procedures
  - Scaling strategies and cost optimization
  
- **Enhanced examples directory** (`examples/`)
  - Added `README.md` with learning paths
  - Added `custom_scraper.py` - Complete example of building custom job board scraper
  - Added `automated_workflow.py` - End-to-end workflow example
  
- **Improved documentation navigation**
  - Updated README with new documentation badges
  - Enhanced DOCUMENTATION_INDEX with role-based navigation
  - Added quick reference for contributors, integration developers, and deployers

### 🎯 Developer Experience

- Professional documentation matching industry-leading open source projects
- Clear guidance for contributors with practical code examples
- Production-ready deployment patterns and operational runbooks
- 75KB+ of new comprehensive documentation

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
