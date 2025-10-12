# 📚 Documentation Index

**Last Updated:** October 11, 2025
**Repository:** JobSentinel v0.5.0
**Platform:** Python 3.13+ (Universal: Windows 11+, macOS 15+, Ubuntu 22.04+)

---

## 🚀 Quick Start

New to JobSentinel? Start here:

1. **[README.md](../README.md)** - Project overview and setup
2. **[Quickstart Guide](quickstart.md)** - Step-by-step getting started
3. **[CONTRIBUTING.md](governance/CONTRIBUTING.md)** - How to contribute

---

## 📊 Code Quality & Standards

### Current Status (v0.5.0 - October 11, 2025)
- **Platform:** Universal Python 3.13+ deployment
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
- **[BEST_PRACTICES.md](BEST_PRACTICES.md)** - 🆕 Production-grade coding standards and patterns
- **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** - 🆕 Complete guide for adding new job boards
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 🆕 Production deployment, monitoring, and operations
- **[RESTRUCTURE_ROADMAP.md](RESTRUCTURE_ROADMAP.md)** - Planned architectural changes
- **[RESTRUCTURE_ANALYSIS.md](RESTRUCTURE_ANALYSIS.md)** - Detailed restructuring analysis

---

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

### Version: 0.5.0 (October 11, 2025)

**Recent Changes:**
- ✅ Universal Python 3.13+ deployment (Windows, macOS, Linux)
- ✅ PowerShell legacy code removed
- ✅ Documentation restructured and organized
- ✅ Docker deployment streamlined
- ✅ Development tools consolidated

**Platform Support:**
- Windows 11+ with Python 3.13+
- macOS 15+ with Python 3.13+
- Ubuntu 22.04+ with Python 3.13+

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
