# Documentation Index

Find what you need fast.

## Quick Links

- **New user?** → [QUICKSTART.md](QUICKSTART.md)
- **Issue?** → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Contributing?** → [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **Deploying to cloud?** → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Core Documentation (Start Here)

### Getting Started

1. **[QUICKSTART.md](QUICKSTART.md)** — Get running in 5 minutes  
   All platforms: Windows 11+, macOS 15+, Linux | Zero technical knowledge needed

2. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — Fix common issues  
   Installation, config, scraping, alerts, database, performance, platform-specific

3. **[UI.md](UI.md)** — GUI launcher and web interface  
   Windows/macOS launcher, web UI features, keyboard shortcuts, accessibility

### Development

4. **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Production-grade patterns  
   Security, performance, error handling, testing, observability

5. **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** — Add new job boards  
   REST API, HTML scraping, MCP integration patterns, testing, rate limiting

6. **[DATABASE_GUIDE.md](DATABASE_GUIDE.md)** — Database operations  
   SQLite schema, queries, migrations, backups

### Operations

7. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** — Cloud deployment  
   AWS Lambda, GCP Cloud Run, Azure Container Instances, Docker, Terraform, monitoring

8. **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design  
   Components, data flow, dependencies, trust boundaries

### Advanced

9. **[AI_ML_ROADMAP.md](AI_ML_ROADMAP.md)** — AI/ML capabilities  
   Semantic matching, resume analysis, scam detection, bias detection, GPT integration

10. **[AUTHORITATIVE_STANDARDS.md](AUTHORITATIVE_STANDARDS.md)** — Standards compliance  
    OWASP ASVS, NIST CSF, SWEBOK, GDPR, WCAG 2.2, ISO 27001 (45+ standards)

---

## By Task

### Setup (5-10 minutes)

| Task | Document | Time |
|------|----------|------|
| First-time setup (any platform) | [QUICKSTART.md](QUICKSTART.md) | 5 min |
| Developer environment | [development/README.md](development/README.md) | 10 min |
| Cloud deployment | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 2-4 hours |

### Troubleshooting

| Issue | Section in [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
|-------|------------------------------------------------------|
| Python not found | Installation issues |
| Config errors | Configuration issues |
| No jobs found | Scraping issues |
| Slack alerts failing | Alert issues |
| Database locked | Database issues |
| Slow performance | Performance issues |
| Windows Defender blocks | Windows-specific issues |
| Gatekeeper blocks (macOS) | macOS-specific issues |

### Development Tasks

| Task | Document |
|------|----------|
| Add job board scraper | [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) |
| Understand codebase | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Database operations | [DATABASE_GUIDE.md](DATABASE_GUIDE.md) |
| Code quality standards | [BEST_PRACTICES.md](BEST_PRACTICES.md) |
| Testing setup | [development/README.md](development/README.md) |

---

## By Audience

### Users (Non-Technical)
- [QUICKSTART.md](QUICKSTART.md) — 5-minute setup guide
- [UI.md](UI.md) — GUI launcher and web interface
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Fix issues yourself

### Contributors (Developers)
- [BEST_PRACTICES.md](BEST_PRACTICES.md) — Coding standards
- [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) — Add features
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [DATABASE_GUIDE.md](DATABASE_GUIDE.md) — Data layer
- [development/README.md](development/README.md) — Dev setup

### Operators (DevOps/SRE)
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Cloud deployment
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Operations issues
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture

### Planners (Product/Research)
- [AI_ML_ROADMAP.md](AI_ML_ROADMAP.md) — ML capabilities and roadmap
- [AUTHORITATIVE_STANDARDS.md](AUTHORITATIVE_STANDARDS.md) — Standards compliance

---

## Repository Root Files

Essential files in repository root:

- **[README.md](../README.md)** — Project overview and quickstart
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — How to contribute
- **[SECURITY.md](../SECURITY.md)** — Security policy and reporting
- **[CHANGELOG.md](../CHANGELOG.md)** — Version history
- **[LICENSE](../LICENSE)** — MIT license

---

## Templates

Documentation templates (for other projects):

- **[doc_templates/github-repo-docs-tone-guide.md](doc_templates/github-repo-docs-tone-guide.md)** — Writing style guide

---

## Documentation Stats

- **Total docs:** 10 main guides + 2 development + 1 template
- **Consolidated from:** 28 original docs (27 deleted, 3 new consolidated guides created)
- **Lines reduced:** ~3,500 duplicate lines eliminated
- **Setup guides:** Consolidated 3 platform-specific guides → 1 universal guide
- **Troubleshooting:** Consolidated 4 docs → 1 comprehensive guide
- **UI docs:** Consolidated 3 docs → 1 guide

---

## Maintenance

**Last Updated:** October 14, 2025  
**Version:** 0.9.0  
**Owner:** @cboyd0319

**Need help?** Open an issue: https://github.com/cboyd0319/JobSentinel/issues/new?labels=documentation
