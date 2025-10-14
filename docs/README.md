# JobSentinel Documentation

Complete documentation for JobSentinel, a self-hosted job search automation tool.

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](../README.md) | Project overview, quickstart | Everyone |
| [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) | Complete documentation navigation | Everyone |
| [BEST_PRACTICES.md](BEST_PRACTICES.md) | 🆕 Production-grade coding standards | Developers |
| [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) | 🆕 Add new job board integrations | Integration Developers |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 🆕 Production deployment & operations | DevOps/SRE |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow | Developers |
| [CONTRIBUTING.md](governance/CONTRIBUTING.md) | Dev setup, PR guidelines | Contributors |
| [SECURITY.md](governance/SECURITY.md) | Security policy, disclosure | Security researchers |
| [CHANGELOG.md](../CHANGELOG.md) | Version history, changes | Everyone |

## Getting Started

### 🪟 Windows 11 Users (Recommended Path)
1. Read the [README](../README.md) for project overview
2. Follow the [Windows Quick Start](WINDOWS_QUICK_START.md) - 2-minute setup
3. Run `.\bootstrap.ps1` for one-click installation
4. Run `.\run.ps1` to start JobSentinel
5. Access the UI at http://localhost:8000

### 🐧 macOS/Linux Users
1. Read the [README](../README.md) for project overview
2. Follow the [Quickstart Guide](quickstart.md) for installation
3. Configure your preferences in `config/user_prefs.json`
4. Run your first scrape: `python -m jsa.cli run-once`

### Contributors
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for dev setup
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
3. Check [ADRs](adr/) for architectural decisions
4. Run tests: `make test`

## Documentation Structure

```
docs/
├── README.md                  # This file (documentation index)
├── ARCHITECTURE.md            # System architecture and design
├── CHANGELOG.md               # Version history
├── CONTRIBUTING.md            # Contribution guidelines (symlink to root)
├── SECURITY.md                # Security policy (symlink to root)
├── quickstart.md              # Step-by-step installation guide
├── troubleshooting.md         # Common issues and fixes
├── cloud-deployment.md        # Cloud deployment guide (GCP, AWS)
├── configuration.md           # Detailed configuration reference
├── scrapers.md                # How to add new job sources
├── scoring.md                 # Scoring algorithm details
├── adr/                       # Architecture Decision Records
└── improvements/              # Analysis and enhancement docs
    ├── README.md
    ├── code-standards-compliance.md
    ├── development-guidelines.md
    └── enhancement-opportunities.md
```

## Core Documentation

### Windows-Local Edition 🆕
JobSentinel is now optimized for Windows 11+ with zero admin rights:
- **[Windows Local Better](WINDOWS_LOCAL_BETTER.md)** - Master tracker for Windows enhancements
- **[Windows Quick Start](WINDOWS_QUICK_START.md)** - 2-minute installation guide
- **[Windows Troubleshooting](WINDOWS_TROUBLESHOOTING.md)** - Common Windows issues
- **[Windows Setup Validation](WINDOWS_SETUP_VALIDATION.md)** - Validation checklist

### [Documentation Index](DOCUMENTATION_INDEX.md)
Central hub for all documentation with role-based navigation.

### [Architecture](ARCHITECTURE.md)
System design, module structure, data flow, and trust boundaries.

### [Best Practices](BEST_PRACTICES.md) 🆕
Production-grade coding standards covering:
- Architecture principles and patterns
- Security best practices (secrets, validation, rate limiting)
- Testing standards with coverage targets
- Observability & monitoring
- Performance optimization
- Configuration and deployment

### [API Integration Guide](API_INTEGRATION_GUIDE.md) 🆕
Complete guide for adding new job board integrations:
- Quick start for integration developers
- REST API, HTML scraping, and MCP patterns
- Code templates with error handling
- Testing strategies and checklist

### [Deployment Guide](DEPLOYMENT_GUIDE.md) 🆕
Production deployment and operations:
- Docker production setup
- Cloud deployment (AWS, GCP, Azure)
- Monitoring & observability
- Backup & disaster recovery
- Scaling and cost optimization

### [Quickstart](quickstart.md)
Step-by-step installation for Windows, macOS, and Linux.

### [Troubleshooting](troubleshooting.md)
Common errors and solutions.

## Advanced Topics

### [Cloud Deployment](cloud-deployment.md)
Deploy to GCP Cloud Run or AWS Fargate. Includes cost estimates and automation setup.

### [Scrapers](scrapers.md)
How job scrapers work and how to add new sources.

### [Scoring](scoring.md)
Deep dive into the job scoring algorithm.

## Development

### [Architecture Decision Records (ADRs)](adr/)
Document significant architectural decisions with context and consequences.

### [Quality Status](QUALITY_STATUS.md)
Current code quality metrics, test coverage, and technical debt.

### [Improvement Docs](improvements/)
Detailed analysis of code quality, security scans, and enhancement opportunities.

## API Reference

**CLI Commands:**
```bash
python -m jsa.cli --help          # Show all commands
python -m jsa.cli run-once        # Run single scrape
python -m jsa.cli config-validate # Validate configuration
python -m jsa.cli web             # Start web UI
python -m jsa.cli cloud           # Cloud deployment commands
```

**Python API:**
```python
from jsa.config import load_config
from jsa.db import get_db
from sources.jobswithgpt import scrape_jobswithgpt

config = load_config("config/user_prefs.json")
jobs = scrape_jobswithgpt(config)
```

## FAQ

**Q: Does JobSentinel support LinkedIn?**  
A: Not yet. LinkedIn requires authentication and has strict scraping policies. It's on the roadmap.

**Q: Can I run this on Raspberry Pi?**  
A: Technically yes, but Playwright (Chromium) is resource-intensive. Recommended: 2GB+ RAM.

**Q: How do I add a new job source?**  
A: See [scrapers.md](scrapers.md) for a tutorial. TL;DR: Create a new scraper in `sources/`, implement the scraper interface, add to config.

**Q: Is this legal?**  
A: Web scraping legality varies by jurisdiction. JobSentinel respects `robots.txt` and includes rate limiting. Use responsibly and review terms of service for each job board.

**Q: Can I use this for commercial purposes?**  
A: Yes, under the MIT license. See [LICENSE](../LICENSE) for details.

## Support

**Issues:** https://github.com/cboyd0319/JobSentinel/issues  
**Discussions:** https://github.com/cboyd0319/JobSentinel/discussions  
**Security:** security@yourdomain.tld (see [SECURITY.md](../SECURITY.md))

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Dev setup
- Code style
- Testing guidelines
- PR checklist

## License

MIT License - see [LICENSE](../LICENSE) for full text.
