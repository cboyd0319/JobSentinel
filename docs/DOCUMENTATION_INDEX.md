# Documentation Index

JobSentinel documentation organized by audience and task.

## Quick Links

- **New user?** → [BEGINNER_GUIDE.md](BEGINNER_GUIDE.md) or [WINDOWS_QUICK_START.md](WINDOWS_QUICK_START.md)
- **Setting up?** → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Issue?** → [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md) or [troubleshooting.md](troubleshooting.md)
- **Contributing?** → [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **Security?** → [../SECURITY.md](../SECURITY.md)

---

## By Audience

### Non-Technical Users
Start here if you've never used a terminal or don't know Python.

1. **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** — Zero-knowledge walkthrough  
   Platform: Windows, Mac, Linux | Time: 30 minutes | Prerequisites: None

2. **[WINDOWS_QUICK_START.md](WINDOWS_QUICK_START.md)** — Windows-specific 10-minute setup  
   Platform: Windows 11+ | Time: 10 minutes | Prerequisites: None

3. **[WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md)** — Fix common Windows issues  
   Platform: Windows 11+ | Covers: Email setup, shortcuts, errors

### Developers

4. **[BEST_PRACTICES.md](BEST_PRACTICES.md)** — Production-grade patterns  
   Topics: Security, performance, error handling, testing

5. **[API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)** — Add new job boards  
   Topics: Scraper patterns, rate limiting, normalization

6. **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design  
   Topics: Data flow, components, dependencies

7. **[DATABASE_GUIDE.md](DATABASE_GUIDE.md)** — Database schema and operations  
   Topics: SQLite, schema, migrations, queries

8. **[development/README.md](development/README.md)** — Dev environment setup  
   Topics: Tooling, testing, linting, type checking

### DevOps/SREs

9. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** — Production deployment  
   Platforms: AWS, GCP, Azure, local | Topics: Docker, Terraform, monitoring

10. **[SRE_RUNBOOK.md](SRE_RUNBOOK.md)** — Operations and incident response  
    Topics: Health checks, logs, metrics, alerts, recovery

11. **[WINDOWS_DEPLOYMENT_CHECKLIST.md](WINDOWS_DEPLOYMENT_CHECKLIST.md)** — Validation checklist  
    Platform: Windows 11+ | Topics: Pre-flight, testing, sign-off

### Product/Planning

12. **[FEATURES.md](FEATURES.md)** — Feature list and capabilities  
    Topics: What JobSentinel can do

13. **[AI_ML_ROADMAP.md](AI_ML_ROADMAP.md)** — AI/ML vision (v0.6 to v1.0)  
    Topics: Semantic matching, resume analysis, scam detection

14. **[UI_IMPROVEMENTS.md](UI_IMPROVEMENTS.md)** — UI/UX enhancements  
    Topics: React 19, accessibility, design system

### Reference

15. **[AUTHORITATIVE_STANDARDS.md](AUTHORITATIVE_STANDARDS.md)** — 39+ industry standards  
    Topics: IEEE, NIST, OWASP, compliance frameworks

16. **[UI_QUICK_REFERENCE.md](UI_QUICK_REFERENCE.md)** — UI component reference  
    Topics: FastAPI endpoints, React components, WebSocket

17. **[troubleshooting.md](troubleshooting.md)** — General troubleshooting  
    Platform: All | Topics: Common errors, debug steps

---

## By Task

### Setup & Installation

| Task | Document | Time |
|------|----------|------|
| First-time Windows setup | [WINDOWS_QUICK_START.md](WINDOWS_QUICK_START.md) | 10 min |
| First-time any platform | [BEGINNER_GUIDE.md](BEGINNER_GUIDE.md) | 30 min |
| Production deployment | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 2-4 hours |
| Dev environment | [development/README.md](development/README.md) | 15 min |

### Troubleshooting

| Issue | Document | Platform |
|-------|----------|----------|
| Windows-specific errors | [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md) | Windows 11+ |
| General errors | [troubleshooting.md](troubleshooting.md) | All |
| Production incidents | [SRE_RUNBOOK.md](SRE_RUNBOOK.md) | Cloud/server |

### Development

| Task | Document | Audience |
|------|----------|----------|
| Add job board scraper | [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) | Developers |
| Understand architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | Developers |
| Database operations | [DATABASE_GUIDE.md](DATABASE_GUIDE.md) | Developers |
| Code quality | [BEST_PRACTICES.md](BEST_PRACTICES.md) | Developers |

### Operations

| Task | Document | Audience |
|------|----------|----------|
| Deploy to cloud | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | DevOps |
| Monitor & respond | [SRE_RUNBOOK.md](SRE_RUNBOOK.md) | SREs |
| Validate deployment | [WINDOWS_DEPLOYMENT_CHECKLIST.md](WINDOWS_DEPLOYMENT_CHECKLIST.md) | QA/DevOps |

---

## By Technology

### Python Backend

- [BEST_PRACTICES.md](BEST_PRACTICES.md) — Python patterns
- [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) — Scraper patterns
- [DATABASE_GUIDE.md](DATABASE_GUIDE.md) — SQLAlchemy ORM
- [development/README.md](development/README.md) — Testing, linting

### React Frontend

- [UI_IMPROVEMENTS.md](UI_IMPROVEMENTS.md) — React 19 + Vite 7
- [UI_QUICK_REFERENCE.md](UI_QUICK_REFERENCE.md) — Component reference
- [UI_VISUAL_COMPARISON.md](UI_VISUAL_COMPARISON.md) — Before/after UI

### AI/ML

- [AI_ML_ROADMAP.md](AI_ML_ROADMAP.md) — ML capabilities roadmap
- [BEST_PRACTICES.md](BEST_PRACTICES.md) — ML model guidelines

### Infrastructure

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Docker, Terraform, cloud
- [SRE_RUNBOOK.md](SRE_RUNBOOK.md) — Operations playbook
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design

### Windows Deployment

- [WINDOWS_QUICK_START.md](WINDOWS_QUICK_START.md) — 10-minute setup
- [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md) — Fix issues
- [WINDOWS_DEPLOYMENT_CHECKLIST.md](WINDOWS_DEPLOYMENT_CHECKLIST.md) — Validation

---

## Root Documentation

Files in repository root:

- **[README.md](../README.md)** — Project overview, quickstart, features
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — Dev setup, PR process, style guide
- **[SECURITY.md](../SECURITY.md)** — Vulnerability reporting, auto-update security
- **[CHANGELOG.md](../CHANGELOG.md)** — Version history and release notes
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** — Community standards
- **[LICENSE](../LICENSE)** — MIT license

---

## Archive

Historical documents (reference only, may be outdated):

- **[archive/WINDOWS_DEPLOYMENT_ANALYSIS.md](archive/WINDOWS_DEPLOYMENT_ANALYSIS.md)** — Initial Windows deployment analysis (Oct 2025)
- **[archive/IMPLEMENTATION_SUMMARY.md](archive/IMPLEMENTATION_SUMMARY.md)** — Advanced scraping features summary
- **[archive/ML_FEATURES_IMPLEMENTATION.md](archive/ML_FEATURES_IMPLEMENTATION.md)** — ML features implementation details
- **[archive/REORGANIZATION_SUMMARY.md](archive/REORGANIZATION_SUMMARY.md)** — Repository reorganization notes

These are preserved for historical context but superseded by current docs.

---

## Templates

Documentation templates in `doc_templates/`:

- **[doc_templates/README_TEMPLATE.md](doc_templates/README_TEMPLATE.md)** — README structure
- **[doc_templates/SECURITY.md](doc_templates/SECURITY.md)** — Security policy template
- **[doc_templates/CONTRIBUTING.md](doc_templates/CONTRIBUTING.md)** — Contributing guide template
- **[doc_templates/CODE_OF_CONDUCT.md](doc_templates/CODE_OF_CONDUCT.md)** — Code of conduct template
- **[doc_templates/github-repo-docs-tone-guide.md](doc_templates/github-repo-docs-tone-guide.md)** — Tone and style guide

---

## Maintenance

**Last Updated:** October 2025  
**Version:** 0.6.1  
**Owner:** @cboyd0319

**To update this index:**
1. Add new documents to appropriate sections
2. Update "Last Updated" date
3. Keep sections alphabetized within each category
4. Use relative links for portability

**Missing documentation?** Open an issue: https://github.com/cboyd0319/JobSentinel/issues/new?labels=documentation
