# JobSentinel Documentation

Welcome to the JobSentinel documentation! This directory contains all guides, reports, and technical documentation.

## Current Status (January 2026)

**Version: 1.0.0-alpha** - Core functionality working, 256 tests passing, 13 ignored

### Working Features (v1.0)
- Job scrapers: Greenhouse, Lever, JobsWithGPT
- Application Tracking System (ATS): Kanban board, status pipeline, reminders
- Multi-factor scoring algorithm
- Notifications: Slack, Discord, Teams
- SQLite database with full-text search
- Scheduler for periodic scraping
- React 19 frontend with setup wizard

### Deferred Features (v1.1+)
The following modules are disabled until fixes are complete:
- AI Resume-Job Matcher (65% complete)
- Salary Negotiation AI (50% complete)
- Job Market Intelligence Dashboard (60% complete)
- LinkedIn/Indeed scrapers (incomplete)

---

## Documentation Structure

### For Users

**Start here if you're installing and using JobSentinel:**

- **[Quick Start Guide](user/QUICK_START.md)** - Installation, setup, and daily usage
  - Installation instructions (Windows 11+ primary, macOS/Linux planned)
  - Setup wizard walkthrough
  - Configuration options
  - Troubleshooting common issues
  - FAQ section

### For Developers

**Start here if you're contributing to JobSentinel:**

- **[Getting Started](developer/GETTING_STARTED.md)** - Development setup and workflow
  - Prerequisites (Rust, Node.js, Tauri)
  - Development setup
  - Project structure
  - Running tests

- **[Contributing Guide](developer/CONTRIBUTING.md)** - How to contribute
  - Code of conduct
  - Development workflow
  - Coding standards
  - Pull request process
  - Adding new features

- **[macOS Development](developer/MACOS_DEVELOPMENT.md)** - macOS-specific guide
  - macOS 26.2+ setup
  - Directory structure
  - Testing on macOS
  - Platform-specific features

### Feature Documentation

#### Working Features
- **[Application Tracking System](APPLICATION_TRACKING_SYSTEM.md)** - Kanban board, pipeline management, reminders

#### Deferred Features (v1.1+)
These documents describe features that are partially implemented and deferred to v1.1+:

- **[AI Resume Job Matcher](AI_RESUME_JOB_MATCHER.md)** - v1.1+ (65% complete)
- **[Salary Negotiation AI](SALARY_NEGOTIATION_AI.md)** - v1.1+ (50% complete)
- **[Job Market Intelligence](JOB_MARKET_INTELLIGENCE_DASHBOARD.md)** - v1.1+ (60% complete)
- **[LinkedIn Indeed Scrapers](LINKEDIN_INDEED_SCRAPERS.md)** - v1.1+ (incomplete)
- **[One Click Apply Automation](ONE_CLICK_APPLY_AUTOMATION.md)** - v2.0+ (requires legal review)

### Reports & Analysis

**Technical reports and historical documentation:**

- **[Complete Deep Analysis Report](reports/DEEP_ANALYSIS_COMPLETE_REPORT.md)** - Latest comprehensive analysis
- **[v1.0 Completion Status](reports/V1_COMPLETION_STATUS.md)** - Implementation tracking
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Development progress

---

## Quick Links

### I want to...

**Install JobSentinel:**
See [Quick Start Guide](user/QUICK_START.md#installation)

**Configure my job search:**
See [Quick Start Guide](user/QUICK_START.md#configuration)

**Troubleshoot an issue:**
See [Quick Start Guide](user/QUICK_START.md#troubleshooting)

**Set up development environment:**
See [Getting Started](developer/GETTING_STARTED.md#development-setup)

**Contribute code:**
See [Contributing Guide](developer/CONTRIBUTING.md)

**Build on macOS:**
See [macOS Development](developer/MACOS_DEVELOPMENT.md)

**Understand the architecture:**
See [Getting Started](developer/GETTING_STARTED.md#architecture-overview)

**Review security analysis:**
See [Deep Analysis Report](reports/DEEP_ANALYSIS_COMPLETE_REPORT.md#security-assessment)

---

## File Organization

```
docs/
├── README.md (this file)
├── user/
│   └── QUICK_START.md           # User installation & usage guide
├── developer/
│   ├── GETTING_STARTED.md       # Developer setup guide
│   ├── CONTRIBUTING.md          # Contribution guidelines
│   └── MACOS_DEVELOPMENT.md     # macOS-specific development
├── reports/
│   ├── DEEP_ANALYSIS_COMPLETE_REPORT.md  # Latest full analysis
│   ├── V1_COMPLETION_STATUS.md          # v1.0 implementation status
│   └── ...                              # Other analysis reports
├── images/
│   └── logo.png                  # Project logo
└── [Feature docs]                # Deferred feature documentation
```

---

## Need Help?

If you can't find what you need:

1. Check the [main README FAQ](../README.md#frequently-asked-questions-faq)
2. Search [existing issues](https://github.com/cboyd0319/JobSentinel/issues)
3. Ask in [Discussions](https://github.com/cboyd0319/JobSentinel/discussions)
4. Create a [new issue](https://github.com/cboyd0319/JobSentinel/issues/new/choose)

---

**Last Updated:** January 14, 2026
**Documentation Version:** 1.1
**JobSentinel Version:** 1.0.0-alpha
