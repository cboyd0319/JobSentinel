# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Dependency Updates** - Updated all software and dependency versions to latest stable releases
  - Updated core Python dependencies (aiofiles, aiohttp, aiosqlite, cryptography, fastapi, Flask, etc.)
  - Updated Google Cloud dependencies to latest versions
  - Updated optional dependencies (resume analysis, ML, MCP, LLM integrations)
  - Updated dev dependencies (black, pytest, ruff, mypy, bandit, etc.)
  - Updated pre-commit hooks to latest versions
  - Updated frontend dependencies (React, React Query, axios, recharts, etc.)
  - Notable updates:
    - MCP protocol to v1.17.0 (fixes CVE-2025-53365 & CVE-2025-53366)
    - Recharts 2.x → 3.x (major version bump - test chart components)
    - Google Cloud Storage 2.x → 3.x (major version bump)
    - Sentence-transformers 2.x → 5.x (major version bump - for ML features)
    - OpenAI SDK 1.x → 2.x (major version bump)

## [0.9.0] - 2025-10-14

### Changed
- **Version bump to 0.9.0** - Significant progress toward 1.0.0 milestone
- Milestone 1.0.0 will be reached once fully tested on a real Windows machine

### Fixed
- Fixed PostgreSQL installer type checking errors (bytes vs str confusion)
- Fixed Settings page to correctly mention PostgreSQL instead of SQLite
- Added missing aiosqlite dependency for async test support

### Enhanced
- **Setup Wizard Improvements**
  - Added Slack webhook testing with real POST requests
  - Added PostgreSQL connection testing before saving config
  - Added URL format validation for Slack webhooks
  - Improved final success screen with comprehensive next steps panel
  - Added documentation links and helpful guidance
  - Maintains zero-knowledge user focus throughout
  
- **UI/UX Improvements** ✨
  - **Tkinter GUI Launcher**: Modern design overhaul
    - Refined color palette (softer backgrounds, professional blue tones)
    - Enhanced typography (larger fonts, better hierarchy)
    - Improved button styling (larger, more prominent, better touch targets)
    - Added hover effects for all interactive elements
    - Better spacing and padding throughout interface
    - Enhanced status indicators and activity log readability
  - **Web UI**: Subtle polish and refinements
    - Enhanced card hover effects (scale + shadow)
    - Added button shine effect on primary actions
    - Improved empty state animations with scaling
    - Better visual feedback on all interactions
  - All changes maintain WCAG 2.1 Level AA compliance
  - Zero new dependencies added
  - Performance maintained (60fps animations, GPU-accelerated)

- **Web UI Improvements**
  - Updated privacy information to reflect PostgreSQL usage
  - Clarified that all data stays local on user's machine
  - Verified all components build without errors (React 19 + Vite 7)
  - Build time: ~2s, 0 linting errors, 0 vulnerabilities

### Quality Assurance
- ✅ Zero mypy type checking errors (strict mode)
- ✅ Zero Ruff linting errors
- ✅ All pytest tests passing (115 passed, 11 skipped)
- ✅ Zero ESLint errors in TypeScript/React code
- ✅ Zero npm security vulnerabilities

### Documentation
- Created comprehensive UPDATE.md roadmap in docs/ folder
- Documented all enhancements and implementation status
- Updated CHANGELOG with v0.6.0+ changes

## [0.6.0] - 2025-10-13

### 🚀 Standards & Compliance

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

### 📘 New Comprehensive Guides (NEW)

- **AI/ML Roadmap** (`docs/reference/AI_ML_ROADMAP.md`) - 14KB comprehensive document
  - Complete evolution plan from v0.6 → v1.0
  - Current capabilities (BERT, spaCy, VADER, TF-IDF)
  - v0.7 enhancements (cross-encoder, GPT-4, bias detection)
  - v1.0 vision (personalized recommendations, career optimization)
  - Model zoo documentation (15+ models)
  - Performance targets and cost projections
  - AI safety & ethics (NIST AI RMF compliance)
  - Research areas (few-shot learning, federated learning, XAI)

- **Accessibility Guide** (`docs/ACCESSIBILITY.md`) - 17KB WCAG 2.1 Level AA
  - Complete WCAG 2.1 Level AA compliance documentation
  - All 4 principles: Perceivable, Operable, Understandable, Robust
  - Assistive technology support (NVDA, JAWS, VoiceOver, etc.)
  - Keyboard navigation patterns and focus management
  - Color contrast guidelines (4.5:1 minimum)
  - Content accessibility (8th grade reading level)
  - Form accessibility patterns with ARIA
  - Testing checklist and validation tools
  - Accessibility statement and reporting

- **Enhanced Security Module** (`src/domains/security_enhanced.py`) - 20KB Level 3
  - OWASP ASVS Level 3 controls for enterprise deployments
  - Advanced audit logging with HMAC-SHA256 tamper detection
  - Content Security Policy (CSP) generator with nonce support
  - Subresource Integrity (SRI) for external resources
  - Secure session management (256-bit session IDs)
  - PII redaction for GDPR/CCPA compliance
  - Automatic session timeout and invalidation
  - Multi-session management per user

### 🎯 Ultimate Enhancements Summary (NEW)

- **Ultimate Enhancements Document** (`ULTIMATE_ENHANCEMENTS_v0.6.1_FINAL.md`)
  - Complete catalog of all v0.6.1+ enhancements
  - Before/after comparisons with quantified metrics
  - Competitive positioning analysis
  - Technical metrics and standards compliance matrix
  - User impact for job seekers, developers, enterprises
  - Implementation summary with files changed
  - Quality assurance checklist
  - Roadmap forward (v0.7 → v0.8 → v1.0)
  - Lessons learned and acknowledgments

### 📚 Documentation

- **Added comprehensive best practices guide** (`docs/reference/BEST_PRACTICES.md`)
  - Architecture principles (separation of concerns, typed interfaces, explicit errors)
  - Security best practices (secrets management, input validation, rate limiting)
  - Testing standards with coverage targets (≥85% for critical paths)
  - Observability & monitoring patterns (structured logging, metrics, health checks)
  - Performance optimization strategies (async/await, caching, database optimization)
  - Production deployment checklist
  
- **Added complete API integration guide** (`docs/reference/API_INTEGRATION_GUIDE.md`)
  - Step-by-step instructions for adding new job board integrations
  - REST API, HTML scraping, and MCP protocol patterns
  - Complete code templates with error handling and retry logic
  - Testing strategies and integration checklist
  
- **Added production deployment guide** (`docs/reference/DEPLOYMENT_GUIDE.md`)
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

- **v0.7.0** - Q1 2026 (LinkedIn scraper, email digest, enhanced AI integration)
- **v0.8.0** - Q2 2026 (GPT-4 cover letter generation, advanced analytics)
- **v1.0.0** - Q3 2026 (Production ready, stable API, mobile app)

---

## Support

- **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Discussions:** https://github.com/cboyd0319/JobSentinel/discussions
- **Security:** See SECURITY.md for vulnerability reporting

[Unreleased]: https://github.com/cboyd0319/JobSentinel/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/cboyd0319/JobSentinel/compare/v0.6.0...v0.9.0
[0.6.0]: https://github.com/cboyd0319/JobSentinel/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/cboyd0319/JobSentinel/releases/tag/v0.5.0
