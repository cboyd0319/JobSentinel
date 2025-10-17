# JobSentinel Current Capabilities

**Version:** 0.9.0  
**Last Updated:** October 17, 2025  
**Status:** Production Ready

This page tracks all current capabilities and features of JobSentinel. For planned features, see [AI/ML Roadmap](../docs/reference/AI_ML_ROADMAP.md) and [Features Documentation](../docs/reference/FEATURES.md).

---

## Table of Contents

1. [Core Job Search Capabilities](#core-job-search-capabilities)
2. [AI & Machine Learning](#ai--machine-learning)
3. [Privacy & Security](#privacy--security)
4. [User Interfaces](#user-interfaces)
5. [Platform Support](#platform-support)
6. [Data Management](#data-management)
7. [Notifications & Alerts](#notifications--alerts)
8. [Developer Tools](#developer-tools)
9. [Deployment Options](#deployment-options)
10. [Accessibility](#accessibility)

---

## Core Job Search Capabilities

### Job Sources & Scraping

JobSentinel can scrape jobs from multiple sources simultaneously:

| Source | Status | Type | Notes |
|--------|--------|------|-------|
| **Greenhouse ATS** | ✅ Production | HTML Scraper | All Greenhouse-powered company career pages |
| **Lever ATS** | ✅ Production | HTML Scraper | All Lever-powered company career pages |
| **JobsWithGPT** | ✅ Production | MCP Integration | 500K+ jobs via Model Context Protocol |
| **Reed.co.uk** | ✅ Production | API | UK jobs (API key required) |
| **JobSpy** | ✅ Production | Multi-Aggregator | Indeed, ZipRecruiter, Glassdoor, Google |
| **LinkedIn** | 🧪 Beta | Scraper | Public job postings (no auth) |
| **AngelList** | 🧪 Beta | Scraper | Startup jobs |
| **RemoteOK** | 🧪 Beta | Scraper | Remote-first positions |
| **We Work Remotely** | 🧪 Beta | Scraper | Remote job board |
| **Hacker News** | 🧪 Beta | Scraper | Monthly "Who's Hiring" threads |
| **Company Career Pages** | 🧪 Beta | Generic Scraper | Direct company websites |

**Scraping Features:**
- ✅ Concurrent scraping with rate limiting
- ✅ Robots.txt compliance
- ✅ Exponential backoff with jitter
- ✅ Circuit breakers for resilience
- ✅ Headless browser support (Playwright)
- ✅ JavaScript-heavy site support
- ✅ Automatic job deduplication
- ✅ Respects API rate limits

### Job Matching & Scoring

**Multi-Factor Scoring Algorithm:**
- **Skills Match** (40%) - TF-IDF keyword matching against job description
- **Salary Range** (25%) - Meets minimum salary requirements
- **Location** (20%) - Remote, hybrid, on-site, city, state, country matching
- **Company Preference** (10%) - Avoids denied companies
- **Recency** (5%) - Prefers recently posted jobs

**Matching Capabilities:**
- ✅ Configurable keyword matching
- ✅ Keyword boost (increase weight for specific terms)
- ✅ Keyword exclusion (filter out unwanted terms)
- ✅ Title allowlist/blocklist
- ✅ Location filtering (multiple formats)
- ✅ Salary range validation with currency support
- ✅ Company denylist
- ✅ Customizable scoring weights
- ✅ Score threshold alerts (default: 80+)
- ✅ TF-IDF statistical importance

**Accuracy:**
- Job matching: **87%** (target: 85%)
- Resume matching: **85%** (target: 85%)

---

## AI & Machine Learning

### Natural Language Processing

**BERT-Based Semantic Understanding:**
- ✅ 768-dimensional sentence embeddings
- ✅ Sentence-BERT for similarity matching
- ✅ 85-90% accuracy, <200ms latency
- ✅ Automatic fallback to TF-IDF

**spaCy NLP Pipeline:**
- ✅ Named Entity Recognition (NER)
- ✅ Part-of-speech tagging
- ✅ Skill extraction from job descriptions
- ✅ Resume parsing and analysis

**Sentiment Analysis:**
- ✅ VADER sentiment on job descriptions
- ✅ 90%+ accuracy
- ✅ Company culture insights

### Resume Analysis

**13 Industry-Specific Profiles:**
1. Technology & Software Engineering
2. Healthcare & Medical
3. Finance & Banking
4. Legal & Compliance
5. Education & Academia
6. Sales & Business Development
7. Marketing & Communications
8. Engineering & Manufacturing
9. Creative & Design
10. Customer Service & Support
11. Operations & Project Management
12. Human Resources & Recruiting
13. General/Universal

**ATS Optimization Scoring (6 Dimensions):**
1. **Content Quality** - Impact statements, quantification
2. **Quantification** - Numbers, percentages, metrics
3. **Action Verbs** - Strong, specific verbs
4. **Keywords** - Industry and role-specific terms
5. **Format** - ATS-friendly structure
6. **Length** - Optimal resume length (1-2 pages)

**Resume Processing:**
- ✅ PDF and DOCX support
- ✅ Skills extraction and categorization
- ✅ Skills gap analysis vs job requirements
- ✅ Learning path recommendations (Coursera, Udemy, freeCodeCamp)
- ✅ Education and experience parsing
- ✅ Contact information extraction
- ✅ Resume-job matching score (85%+ correlation)

### Scam & Ghost Job Detection

**Pattern Detection:**
- ✅ FBI IC3 scam patterns
- ✅ FTC fraud indicators
- ✅ BBB scam database patterns
- ✅ MLM/pyramid scheme detection
- ✅ Ghost job indicators (evergreen postings, missing IDs)
- ✅ Red flag language analysis
- ✅ Excessive call-to-action detection

**Accuracy:**
- Scam detection: **95%** (target: 90%)
- Multi-factor confidence scoring
- Detailed explanations for flagged jobs

### Optional GPT Integration

**Available Models:**
- GPT-4 (~$0.03/1K tokens)
- GPT-3.5 (~$0.0015/1K tokens)
- Local LLaMA (7B params, <5GB RAM, free)

**Capabilities:**
- 📝 Cover letter generation
- 🤔 Interview preparation
- 📊 Job description analysis
- 🔄 Skills translation

**Safety Features:**
- ✅ Monthly budget caps
- ✅ Per-query limits
- ✅ Usage tracking
- ✅ Automatic cascade: Local LLaMA → GPT-3.5 → GPT-4

---

## Privacy & Security

### Privacy Features

- ✅ **100% Local-First** - All data stored on your machine
- ✅ **Zero Telemetry** - No tracking, no analytics, no data collection
- ✅ **Privacy Dashboard** - Complete data transparency and control
- ✅ **No Third-Party Sharing** - Your data never leaves your machine
- ✅ **PII Redaction** - GDPR/CCPA-aligned data handling
- ✅ **Local Database** - SQLite stored in your user directory

### Security Features

**OWASP ASVS Level 2 Compliance (17 Controls):**
- ✅ Input validation on all external data
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Secure sessions (256-bit IDs)
- ✅ Auto session timeout
- ✅ Content Security Policy (CSP) with nonces

**Additional Security:**
- ✅ Secrets in `.env` only (never committed)
- ✅ Audit logging with HMAC-SHA256 tamper detection
- ✅ Read-only scrapers (no writes to job boards)
- ✅ Security scanning (Bandit, PyGuard)
- ✅ Dependency security (Dependabot, automated scans)
- ✅ Multi-stage Docker builds with security scanning
- ✅ Regular security updates via auto-update

**Compliance:**
- OWASP ASVS Level 2
- GDPR data handling
- CCPA privacy standards
- NIST AI Risk Management Framework

---

## User Interfaces

### 1. Command Line Interface (CLI)

**Commands:**
```bash
# Single run
python -m jsa.cli run-once

# Scheduled daemon (every 2 hours)
python -m jsa.cli run-daemon --interval 7200

# Health check
python -m jsa.cli health

# Config validation
python -m jsa.cli config-validate

# Web UI launcher
python -m jsa.cli web --port 8000
```

**Features:**
- ✅ Full-featured command line control
- ✅ Detailed logging and progress
- ✅ Configuration validation
- ✅ Health diagnostics
- ✅ Cross-platform (Windows/macOS/Linux)

### 2. React Web UI (Modern)

**Built With:**
- React 19
- Vite 7
- Tailwind CSS 4
- Recharts (data visualization)

**Features:**
- ✅ **Dashboard** - Job stats, recent matches, activity charts
- ✅ **Job Search** - Advanced filtering, sorting, pagination
- ✅ **Application Tracker** - Kanban-style management (Applied, Interview, Offer, Rejected)
- ✅ **Resume Analyzer** - Upload and analyze resumes
- ✅ **Settings** - Web-based configuration editor
- ✅ **Real-Time Updates** - WebSocket for live notifications
- ✅ **Dark Mode** - System-aware dark/light themes
- ✅ **Responsive Design** - Mobile-first, all screen sizes
- ✅ **Data Visualization** - Interactive charts and graphs

**Accessibility:**
- ✅ WCAG 2.1 Level AA compliant
- ✅ Full keyboard navigation
- ✅ Screen reader support (NVDA, JAWS, VoiceOver)
- ✅ ARIA labels and semantic HTML
- ✅ 4.5:1 color contrast minimum
- ✅ Clear language (8th grade reading level)

### 3. Flask Web UI (Legacy)

- ✅ Alternative web interface
- ✅ Traditional server-side rendering
- ✅ Full feature parity with modern UI

### 4. GUI Launcher (Windows/macOS)

**Windows:**
- ✅ Zero command line required
- ✅ GUI buttons for all operations
- ✅ Desktop shortcuts
- ✅ Works without admin rights
- ✅ Visual log viewer

**macOS:**
- ✅ Native macOS integration
- ✅ Spotlight-searchable shortcuts
- ✅ Dock icon support
- ✅ 5-minute setup wizard

---

## Platform Support

### Operating Systems

| Platform | Version | Status | Installation Time |
|----------|---------|--------|------------------|
| **Windows** | 11+ | ✅ Production | 5 minutes |
| **macOS** | 15+ (Sequoia) | ✅ Production | 5 minutes |
| **Linux** | Ubuntu 22.04+ | ✅ Production | 10 minutes |

### Installation Methods

**Windows:**
- ✅ Double-click installer (`launch-gui.bat`)
- ✅ Automatic dependency installation
- ✅ No admin rights required
- ✅ Desktop shortcuts created automatically

**macOS:**
- ✅ Double-click setup wizard (`setup-macos.sh`)
- ✅ Guided 5-minute installation
- ✅ Automatic Python/Git installation
- ✅ Spotlight-searchable shortcuts

**Linux:**
- ✅ Clone and install script
- ✅ Standard Python venv workflow
- ✅ Package manager integration

**Docker:**
- ✅ Multi-stage builds
- ✅ Security scanning
- ✅ Cross-platform images
- ✅ Development and production configs

### Auto-Update System

- ✅ Zero-admin updates (Windows)
- ✅ Automatic backup before update
- ✅ SHA-256 verification
- ✅ Rollback on failure
- ✅ User notification system
- ✅ No interruption to running jobs

---

## Data Management

### Database

**SQLite (Default):**
- ✅ Zero setup required
- ✅ Single-file database
- ✅ Tested with 10,000+ jobs
- ✅ ~50MB per 1,000 jobs
- ✅ <100MB typical usage

**PostgreSQL (Optional):**
- 🧪 Beta support
- ✅ Multi-user capability
- ✅ Cloud deployment ready
- ✅ Advanced querying

### Data Operations

**Backup & Restore:**
- ✅ One-click backup
- ✅ SHA-256 checksums
- ✅ Automatic backup before updates
- ✅ Point-in-time restore
- ✅ Backup verification

**Export Formats:**
- ✅ JSON (structured data)
- ✅ CSV (spreadsheet-compatible)
- ✅ tar.gz (compressed archives)

**Database Optimization:**
- ✅ VACUUM (reclaim space)
- ✅ ANALYZE (update statistics)
- ✅ Index maintenance
- ✅ Automatic optimization scheduling

**Data Tracking:**
- ✅ Job persistence with full metadata
- ✅ Score history tracking
- ✅ Application status tracking
- ✅ Search history
- ✅ User activity logs

---

## Notifications & Alerts

### Supported Channels

**Slack:**
- ✅ Webhook integration
- ✅ Rich job details (title, company, location, salary, score, link)
- ✅ Rate limiting (respects Slack API limits)
- ✅ Retry logic with exponential backoff
- ✅ Digest mode (batch multiple jobs)

**Email:**
- ✅ SMTP support (Gmail, Outlook, custom)
- ✅ HTML formatted emails
- ✅ Embedded job details
- ✅ Batch digest mode
- ✅ Configurable frequency

**In-App:**
- ✅ WebSocket real-time notifications
- ✅ Browser notifications
- ✅ Visual badges and counters

### Alert Configuration

- ✅ Threshold-based triggers (default: 80+ score)
- ✅ Custom score thresholds
- ✅ Frequency controls (immediate, hourly, daily)
- ✅ Quiet hours support
- ✅ Channel-specific rules

---

## Developer Tools

### Testing

**Test Suite:**
- ✅ pytest framework
- ✅ 87% code coverage (target: 85%)
- ✅ Property-based testing (Hypothesis)
- ✅ Mutation testing (mutmut)
- ✅ Integration tests
- ✅ Unit tests
- ✅ End-to-end tests

**Quality Tools:**
- ✅ Type checking (mypy strict)
- ✅ Linting (Ruff: E, F, B, I, UP, S)
- ✅ Formatting (Black, line-length=100)
- ✅ Pre-commit hooks
- ✅ MegaLinter (cross-file-type linting)

### CI/CD

**GitHub Actions Workflows:**
- ✅ Continuous integration
- ✅ Code coverage reporting
- ✅ CodeQL security scanning
- ✅ Dependency scanning
- ✅ Documentation linting
- ✅ Windows deployment testing
- ✅ macOS deployment testing
- ✅ Path-based filtering

**Performance Monitoring:**
- ✅ Test execution tracking
- ✅ Coverage trends
- ✅ Security scan results
- ✅ Scorecard badges

### Documentation

**Comprehensive Guides (13 Essential Documents):**
1. README.md - Project overview
2. QUICKSTART.md - Universal setup guide
3. ARCHITECTURE.md - System design
4. TROUBLESHOOTING.md - Common issues
5. UI.md - User interface guide
6. FEATURES.md - Complete feature catalog
7. AI_ML_ROADMAP.md - AI/ML vision
8. API_INTEGRATION_GUIDE.md - Add new job boards
9. DATABASE_GUIDE.md - Database management
10. DEPLOYMENT_GUIDE.md - Cloud deployment
11. BEST_PRACTICES.md - Coding standards
12. AUTHORITATIVE_STANDARDS.md - 45+ standards
13. GLOSSARY.md - Terminology reference

**Developer Resources:**
- ✅ API documentation
- ✅ Plugin system guide
- ✅ Custom scraper template
- ✅ Contributing guidelines
- ✅ Code of conduct
- ✅ Security policy

### Integration & Extensibility

**Model Context Protocol (MCP):**
- ✅ GitHub Copilot integration
- ✅ MCP server support
- ✅ AI-assisted development

**Plugin Architecture:**
- ✅ Modular job source plugins
- ✅ Custom scraper support
- ✅ Plugin template and examples

**APIs:**
- ✅ RESTful API (FastAPI)
- ✅ WebSocket API for real-time updates
- ✅ GraphQL (planned)

---

## Deployment Options

### Local Deployment

**Cost:** $0  
**Setup Time:** 5-10 minutes

- ✅ Run on your personal machine
- ✅ Complete data privacy
- ✅ No ongoing costs
- ✅ GUI launcher (Windows/macOS)
- ✅ CLI for advanced users

### Docker

**Cost:** $0 (local)  
**Setup Time:** 5 minutes

- ✅ Multi-stage builds
- ✅ Security scanning integrated
- ✅ Development and production configs
- ✅ Cross-platform images
- ✅ Docker Compose support

### Cloud Platforms

**AWS Lambda:**
- ✅ Serverless deployment
- ✅ EventBridge scheduling
- ✅ Terraform templates
- **Cost:** ~$5-10/month

**GCP Cloud Run:**
- ✅ Managed containers
- ✅ Auto-scaling
- ✅ Terraform templates
- **Cost:** ~$8-15/month

**Azure Container Instances:**
- ✅ Serverless containers
- ✅ Fast deployment
- ✅ Terraform templates
- **Cost:** ~$10-20/month

**Kubernetes:**
- ✅ Helm charts included
- ✅ Enterprise-ready
- ✅ Multi-tenant support
- **Cost:** ~$50+/month (cluster costs)

### Infrastructure as Code

- ✅ Terraform templates for all platforms
- ✅ Environment-specific configurations
- ✅ Automated deployment pipelines
- ✅ Infrastructure documentation

---

## Accessibility

### WCAG 2.1 Level AA Compliance

**Visual Accessibility:**
- ✅ 4.5:1 minimum color contrast
- ✅ Resizable text (up to 200%)
- ✅ No information conveyed by color alone
- ✅ High contrast dark mode

**Keyboard Accessibility:**
- ✅ Full keyboard navigation
- ✅ Visible focus indicators
- ✅ Logical tab order
- ✅ Keyboard shortcuts

**Screen Reader Support:**
- ✅ NVDA (Windows)
- ✅ JAWS (Windows)
- ✅ VoiceOver (macOS/iOS)
- ✅ ARIA labels on all interactive elements
- ✅ Semantic HTML structure

**Content Accessibility:**
- ✅ Clear, concise language (8th grade level)
- ✅ Descriptive link text
- ✅ Alternative text for images
- ✅ Proper heading hierarchy

**Additional Features:**
- ✅ Focus management for dynamic content
- ✅ Skip navigation links
- ✅ Form labels and error messages
- ✅ Status messages for screen readers

---

## Performance Metrics

### Current Performance (v0.9.0)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Job Matching Accuracy | 85% | 87% | ✅ Exceeds |
| Scam Detection Accuracy | 90% | 95% | ✅ Exceeds |
| Resume Analysis Accuracy | 85% | 85% | ✅ Meets |
| Semantic Matching Latency | <200ms | <200ms | ✅ Meets |
| Test Coverage | 85% | 87% | ✅ Exceeds |
| Type Safety | 100% | 100% | ✅ Meets |
| Security Issues | 0 | 0 | ✅ Meets |

### Resource Usage

- **Scrape Time:** 30-60s per source
- **Scoring:** <5s per 100 jobs
- **Alert Latency:** <10s (Slack/email)
- **Memory:** <500MB (includes ML models)
- **Disk:** ~50MB per 1,000 jobs
- **Database:** <100MB typical

---

## Configuration System

### Configuration File Format

**Location:** `deploy/common/config/user_prefs.json`  
**Format:** JSON with schema validation

### Available Settings

**Job Matching:**
- `keywords` - Terms to match in title/description
- `locations` - Allowed locations (Remote, cities, states)
- `min_salary` - Minimum annual salary (USD)
- `denied_companies` - Companies to exclude
- `title_allowlist` - Include specific job titles
- `title_blocklist` - Exclude specific job titles
- `keyword_boost` - Increase weight for terms
- `keyword_exclude` - Filter out terms

**Job Sources:**
- Per-source enable/disable
- API keys where required
- Custom scraper configuration
- Rate limiting settings

**Scoring Weights:**
- Customize factor weights (skills, salary, location, etc.)
- Set alert threshold
- Configure matching algorithm

**Alerts:**
- Slack webhook URL
- Email SMTP configuration
- Digest mode settings
- Quiet hours

### Configuration Management

- ✅ JSON schema validation
- ✅ Hot reload (no restart required)
- ✅ Multiple profiles support
- ✅ Config validation CLI command
- ✅ Web-based settings editor
- ✅ Example configurations included

---

## Unique Capabilities

JobSentinel is the **only** job search tool that offers:

1. ✅ **Privacy Dashboard** - Complete data transparency
2. ✅ **Auto-Update with Rollback** - Zero-admin updates for Windows
3. ✅ **Zero Admin Rights** - Works on locked-down corporate computers
4. ✅ **100% Local-First** - All data stays on YOUR machine
5. ✅ **Open Source** - Full source code available (MIT License)
6. ✅ **$0 Cost Baseline** - Free forever with optional paid upgrades
7. ✅ **Custom Scraper Support** - Add any job board yourself
8. ✅ **FBI/FTC Scam Detection** - Industry-leading fraud protection
9. ✅ **13 Industry Resume Profiles** - Comprehensive ATS optimization
10. ✅ **Self-Hosted or Cloud** - Your choice of deployment

---

## Technology Stack

### Backend

- **Language:** Python 3.12+
- **Framework:** FastAPI (REST), Flask (legacy web)
- **Database:** SQLite (default), PostgreSQL (optional)
- **ML/AI:** BERT, spaCy, scikit-learn, Sentence-BERT, VADER
- **Scraping:** Playwright, BeautifulSoup4, Requests
- **Task Queue:** APScheduler
- **Testing:** pytest, Hypothesis, mutmut

### Frontend

- **Framework:** React 19
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **State:** React Context API
- **WebSocket:** Socket.io

### Infrastructure

- **Container:** Docker
- **IaC:** Terraform
- **Orchestration:** Kubernetes (Helm)
- **CI/CD:** GitHub Actions
- **Monitoring:** Health check system

### Security

- **Scanning:** Bandit, PyGuard, CodeQL
- **Dependencies:** Dependabot, Safety
- **Secrets:** python-dotenv
- **Validation:** Pydantic, JSON Schema

---

## Version History

### v0.9.0 (Current - October 2025)
- ✅ React 19 + Vite 7 modern UI
- ✅ Consolidated documentation (13 essential guides)
- ✅ Platform installers (Windows/macOS)
- ✅ WCAG 2.1 AA accessibility
- ✅ Privacy dashboard
- ✅ Auto-update system
- ✅ Backup & restore
- ✅ Email notifications

### v0.6.0 (September 2025)
- ✅ Core scraping and matching
- ✅ AI/ML capabilities (BERT, spaCy)
- ✅ Privacy and security features
- ✅ Resume analysis (13 profiles)
- ✅ Scam detection (FBI/FTC patterns)
- ✅ Modern React UI
- ✅ OWASP ASVS compliance

### v0.5.0 (August 2025)
- ✅ Initial release
- ✅ Basic scraping (Greenhouse, Lever)
- ✅ Multi-factor scoring
- ✅ SQLite database
- ✅ Slack alerts
- ✅ CLI interface

---

## Future Roadmap

### v1.0 (Q1 2026)

**Planned Features:**
- Cross-encoder reranking for improved matching
- GPT-4 integration (optional, cost-controlled)
- Bias detection (gender, age, salary, location)
- Skills taxonomy integration (LinkedIn Skills Graph)
- Database encryption at rest
- Browser extension
- Mobile companion app (PWA)

**For detailed roadmap, see:**
- [AI/ML Roadmap](../docs/reference/AI_ML_ROADMAP.md)
- [Features Documentation](../docs/reference/FEATURES.md)

---

## Getting Started

### Quick Links

- **Installation:** See [Quick Start Guide](../docs/QUICKSTART.md)
- **Configuration:** Edit `deploy/common/config/user_prefs.json`
- **First Run:** `python -m jsa.cli run-once`
- **Web UI:** `python -m jsa.cli web --port 8000`
- **Help:** `python -m jsa.cli --help`

### Platform-Specific Setup

**Windows:**
1. Download repository ZIP
2. Extract to Desktop
3. Double-click `deploy/local/windows/launch-gui.bat`

**macOS:**
1. Download repository ZIP
2. Extract to Desktop
3. Double-click `deploy/local/macos/setup-macos.sh`
4. Follow 5-minute wizard

**Linux:**
```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
playwright install chromium
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json
python -m jsa.cli run-once
```

---

## Support & Community

### Getting Help

- **Documentation:** [Documentation Index](../docs/DOCUMENTATION_INDEX.md)
- **Troubleshooting:** [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)
- **Issues:** [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
- **Discussions:** [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

### Contributing

We welcome contributions! See:
- [Contributing Guide](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Development Setup](../docs/development/README.md)

### Security

Report vulnerabilities responsibly:
- See [Security Policy](../SECURITY.md)
- Security issues are prioritized

---

## License

JobSentinel is open source software licensed under the [MIT License](../LICENSE).

**This means you can:**
- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute
- ✅ Use privately

**With the requirement:**
- 📋 Include the original license and copyright notice

---

## Acknowledgments

JobSentinel is built with:
- Python and the amazing Python community
- React and the modern web ecosystem
- Open source ML models (BERT, spaCy)
- Guidance from FBI IC3, FTC, and BBB on fraud patterns
- OWASP security standards
- WCAG accessibility guidelines

**Made with ❤️ for job seekers who value privacy**

---

**Last Updated:** October 17, 2025  
**Version:** 0.9.0  
**Maintainer:** Chad Boyd  
**Repository:** https://github.com/cboyd0319/JobSentinel
