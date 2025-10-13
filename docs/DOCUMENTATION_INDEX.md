# 📚 Documentation Index

**Last Updated:** October 12, 2025
**Repository:** JobSentinel v0.6.1 (Enhanced)
**Platform:** Python 3.11+ (Universal: Windows 11+, macOS 14+, Ubuntu 22.04+)

---

## 🆕 Latest Additions (v0.6.1+ - October 2025)

**World-Class Enhancements:**
- **[Deep Analysis 2025](DEEP_ANALYSIS_2025.md)** - 🆕 Comprehensive competitive analysis and roadmap
- **[Missing Features Summary](MISSING_FEATURES_SUMMARY.md)** - 🆕 Quick wins and feature gaps vs competitors
- **[Authoritative Standards](AUTHORITATIVE_STANDARDS.md)** - 🔥 39+ industry standards with full citations (expanded!)
- **[AI/ML Roadmap](AI_ML_ROADMAP.md)** - 🆕 Complete AI/ML vision from v0.6 to v1.0
- **[Accessibility Guide](ACCESSIBILITY.md)** - 🆕 WCAG 2.1 Level AA compliance documentation
- **[Visual Architecture](VISUAL_ARCHITECTURE.md)** - 🔥 12 comprehensive visual diagrams
- **[Property-Based Testing](../tests/unit_jsa/test_properties.py)** - 🆕 Hypothesis generative tests
- **[MCP Integration](MCP_INTEGRATION.md)** - Enhanced with 6+ server options
- **Confidence Scoring** - 🔥 Multi-factor ML confidence with calibration
- **Adaptive Learning** - 🔥 Self-improving system with drift detection
- **Validation Framework** - 🔥 Pre-flight checks with auto-fix
- **Self-Healing** - 🔥 Automatic error recovery and resilience

## 🚀 Quick Start

New to JobSentinel? Start here:

1. **[Complete Beginner's Guide](BEGINNER_GUIDE.md)** - Never used a terminal? Start here! Zero technical knowledge needed.
2. **[60-Second Start](GETTING_STARTED_60_SECONDS.md)** - Fastest path to your first job alert
3. **[README.md](../README.md)** - Project overview and setup
4. **[Quickstart Guide](quickstart.md)** - Step-by-step getting started
5. **[Quick Reference](QUICK_REFERENCE.md)** - Command cheat sheet and common tasks
6. **[CONTRIBUTING.md](governance/CONTRIBUTING.md)** - How to contribute

---

## 📊 Code Quality & Standards

### Current Status (v0.5.0 - October 11, 2025)
- **Platform:** Universal Python 3.11+ deployment
- **Architecture:** Clean Python-only codebase (PowerShell legacy removed)
- **Testing:** Comprehensive test suite with pytest
- **Security:** Environment-based secrets management

### Development Resources
- **[Development Tools](development/)** - Makefile, pre-commit hooks, editor config
- **[Docker Deployment](../docker/)** - Container deployment guides
- **[Architecture](ARCHITECTURE.md)** - System design documentation

---

## 🔒 Security

- **[SECURITY.md](governance/SECURITY.md)** - Security policy and reporting
- **.env.example** - Environment variable template (no secrets!)
- **Secrets Management** - See governance documentation for best practices

---

## 🏗️ Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[VISUAL_ARCHITECTURE.md](VISUAL_ARCHITECTURE.md)** - 🔥 NEW: 12 visual diagrams (data flows, security, ML)
- **[DETECTION_SYSTEMS.md](DETECTION_SYSTEMS.md)** - World-class job & resume analysis
- **[AUTOFIX_SYSTEMS.md](AUTOFIX_SYSTEMS.md)** - Automatic resume optimization
- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** - Production-grade coding standards and patterns
- **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** - Complete guide for adding new job boards
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 🆕 Production deployment, monitoring, and operations
- **[COMPARISON.md](COMPARISON.md)** - 🆕 JobSentinel vs other job automation tools
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - 🆕 Command cheat sheet and quick lookup
- **[RESTRUCTURE_ROADMAP.md](RESTRUCTURE_ROADMAP.md)** - Planned architectural changes
- **[RESTRUCTURE_ANALYSIS.md](RESTRUCTURE_ANALYSIS.md)** - Detailed restructuring analysis

## 🎯 Strategic Planning & Roadmap

- **[DEEP_ANALYSIS_2025.md](DEEP_ANALYSIS_2025.md)** - 🆕 Comprehensive competitive analysis with MCP research
- **[MISSING_FEATURES_SUMMARY.md](MISSING_FEATURES_SUMMARY.md)** - 🆕 Feature gaps and quick wins (90-day plan)
- **[AI_ML_ROADMAP.md](AI_ML_ROADMAP.md)** - AI/ML evolution from v0.6 to v1.0
- **[COMPARISON.md](COMPARISON.md)** - Market positioning vs Teal, Huntr, AIHawk

---

## 📜 Standards & Compliance

**World-Class Engineering:**
- **[Authoritative Standards](AUTHORITATIVE_STANDARDS.md)** - 🔥 EXPANDED: 39+ standards with citations
  - OWASP ASVS 5.0 Level 2 (17 controls mapped)
  - ISO/IEC 25010:2023 (software quality model)
  - NIST AI Risk Management Framework (AI safety)
  - WCAG 2.1 Level AA (web accessibility)
  - IEEE 730-2014 (software quality assurance)
  - NIST CSF, NIST 800-63B (authentication)
  - SWEBOK v4.0a, Google SRE principles
  - REST (Fielding), OpenAPI 3.0
  - GDPR/CCPA compliance (privacy-first)
  - ML/AI research (BERT, Sentence-BERT, VADER, Cross-Encoders)
  - Industry standards (BLS OEWS, FBI IC3, LinkedIn, Indeed, Glassdoor)
  - MCP ecosystem (6+ server options)
  - Accessibility (Section 508, ARIA)
  - Testing (Property-based with Hypothesis)
  - Competitive analysis (AIHawk, Jobscan, TopResume)
- **[AI/ML Roadmap](AI_ML_ROADMAP.md)** - 🆕 Complete AI/ML evolution plan
- **[Accessibility Guide](ACCESSIBILITY.md)** - 🆕 WCAG 2.1 Level AA compliance
- **[Standards Compliance](STANDARDS_COMPLIANCE.md)** - Detailed compliance mapping
- **[Standards Reference](STANDARDS_REFERENCE.md)** - Engineering best practices

## 📋 Project Structure

### Core Components
- **[src/](../src/)** - Main application code (JSA CLI, scrapers, scoring)
- **[tests/](../tests/)** - Comprehensive test suite
- **[config/](../config/)** - Configuration files and examples
- **[scripts/](../scripts/)** - Installation and utility scripts

### Supporting Components
- **[sources/](../sources/)** - Job source scrapers
- **[matchers/](../matchers/)** - Job matching algorithms
- **[notify/](../notify/)** - Notification integrations (Slack, email)
- **[utils/](../utils/)** - Shared utility modules
- **[templates/](../templates/)** - Web UI templates

---

## 🛠️ Development

### Setup
1. Clone repository
2. Follow **[README.md](../README.md)** Quick Start
3. Run installer: `python3 scripts/install.py`
4. Read **[CONTRIBUTING.md](governance/CONTRIBUTING.md)**

### Development Tools
See **[development/](development/)** directory for:
- **Makefile** - Common development tasks
- **Pre-commit hooks** - Automated quality checks
- **Editor configuration** - Consistent code style

### Quick Commands
```bash
# Install dev environment
make dev

# Run tests
make test

# Run linters
make lint

# Format code
make fmt
```

---

## 📈 Project Governance

- **[Code of Conduct](governance/CODE_OF_CONDUCT.md)** - Community standards
- **[Contributing Guide](governance/CONTRIBUTING.md)** - Contribution process
- **[Security Policy](governance/SECURITY.md)** - Vulnerability reporting
- **[Changelog](../CHANGELOG.md)** - Version history

---

## 🗂️ Configuration

### Project Files
- **[pyproject.toml](../pyproject.toml)** - Python project configuration
- **[requirements.txt](../requirements.txt)** - Production dependencies
- **[.gitignore](../.gitignore)** - Git ignore patterns

### User Configuration
- **[config/user_prefs.example.json](../config/user_prefs.example.json)** - User preferences template
- **[.env.example](../.env.example)** - Environment variables template

### Development Configuration
- **[development/](development/)** - Editor config, pre-commit hooks, Makefile
- **[Dependabot Management](DEPENDABOT_MANAGEMENT.md)** - 🆕 Auto-approve and merge Dependabot PRs
- **[Dependabot Quick Start](DEPENDABOT_QUICK_START.md)** - 🆕 Quick reference for Dependabot PR management
- **[Dependabot Troubleshooting](DEPENDABOT_TROUBLESHOOTING.md)** - 🆕 Comprehensive troubleshooting guide

---

## 📝 File Organization

```
JobSentinel/
├── README.md                    # Main project documentation
├── LICENSE                      # MIT License
├── CHANGELOG.md                 # Version history
├── pyproject.toml               # Python project configuration
├── requirements.txt             # Production dependencies
├── .env.example                 # Environment variables template
│
├── docs/                        # All documentation
│   ├── DOCUMENTATION_INDEX.md   # This file (navigation hub)
│   ├── quickstart.md            # Getting started guide
│   ├── troubleshooting.md       # Common issues and solutions
│   ├── ARCHITECTURE.md          # System architecture
│   ├── README.md                # Docs overview
│   ├── governance/              # Project governance
│   │   ├── CODE_OF_CONDUCT.md
│   │   ├── CONTRIBUTING.md
│   │   ├── SECURITY.md
│   │   └── README.md
│   ├── development/             # Development resources
│   │   ├── Makefile
│   │   ├── .editorconfig
│   │   ├── .pre-commit-config.yaml
│   │   └── README.md
│   └── adr/                     # Architecture decision records
│
├── docker/                      # Docker deployment
│   ├── Dockerfile               # Production container
│   ├── docker-compose.mcp.yml   # MCP development
│   └── README.md
│
├── src/                         # Core application
│   └── jsa/                     # JobSentinel Application
├── tests/                       # Test suite
├── config/                      # Configuration files
├── sources/                     # Job source scrapers
├── matchers/                    # Matching algorithms
├── notify/                      # Notifications
├── utils/                       # Utilities
├── scripts/                     # Helper scripts
├── templates/                   # Web UI templates
├── cloud/                       # Cloud deployment configs
└── terraform/                   # Infrastructure as code
```

---

## 🎯 Quick Reference by Role

### For Contributors
1. Read [CONTRIBUTING.md](governance/CONTRIBUTING.md)
2. Study [BEST_PRACTICES.md](BEST_PRACTICES.md) - Coding standards and patterns
3. Review [Development Resources](development/)
4. Check [Quickstart Guide](quickstart.md)

### For Integration Developers
1. Read [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) - Complete integration guide
2. Review existing scrapers in `sources/` directory
3. Study [BEST_PRACTICES.md](BEST_PRACTICES.md) - Rate limiting and error handling
4. Check test examples in `tests/unit/`

### For Security Reviewers
1. Read [SECURITY.md](governance/SECURITY.md)
2. Review security configuration in `.env.example`
3. Check [BEST_PRACTICES.md](BEST_PRACTICES.md) - Security section
4. Verify secrets management patterns

### For Production Deployers
1. Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment guide
2. Check [Quickstart Guide](quickstart.md)
3. Read [Docker Documentation](../docker/)
4. Study [BEST_PRACTICES.md](BEST_PRACTICES.md) - Observability and monitoring

### For Architects
1. Read [ARCHITECTURE.md](ARCHITECTURE.md)
2. Study [BEST_PRACTICES.md](BEST_PRACTICES.md) - Architecture principles
3. Review [ADR Directory](adr/)
4. Check project structure and dependencies

---

## 📊 Project Status

### Version: 0.6.0 (October 13, 2025)

**Recent Changes:**
- ✅ Semantic versioning with single source of truth (pyproject.toml)
- ✅ Git tags for v0.5.0 and v0.6.0 releases
- ✅ Standards & Compliance documentation (39+ authoritative references)
- ✅ Enhanced security features (OWASP ASVS Level 3)
- ✅ Comprehensive AI/ML roadmap and accessibility guide

**Platform Support:**
- Windows 11+ with Python 3.11+
- macOS 14+ with Python 3.11+
- Ubuntu 22.04+ with Python 3.11+

**Key Features:**
- Privacy-first job search automation
- Multiple job board support
- Intelligent matching and scoring
- Slack notifications
- Docker deployment ready

---

## 🔗 External Resources

- **Repository:** https://github.com/cboyd0319/JobSentinel
- **Issue Tracker:** GitHub Issues
- **Discussions:** GitHub Discussions

---

## 📞 Getting Help

1. Check [Troubleshooting Guide](troubleshooting.md)
2. Review [Quickstart Guide](quickstart.md)
3. Search existing issues on GitHub
4. Read [CONTRIBUTING.md](governance/CONTRIBUTING.md) for contribution process
5. Open a new issue with detailed information

---

---

**This index is maintained as part of the project documentation. Last updated: October 11, 2025 (v0.5.0)**
