# JobSentinel Documentation

Welcome to JobSentinel documentation.

## Current Status (January 2026)

**Version: 1.0.0-alpha** | 291 tests passing, 20 ignored

### Working Features
- Job scrapers: Greenhouse, Lever, JobsWithGPT
- Application Tracking System (ATS)
- Multi-factor scoring algorithm
- Notifications: Slack, Discord, Teams
- SQLite database with full-text search
- React 19 frontend with setup wizard

### Enabled Modules (Backend Complete)
- AI Resume-Job Matcher (frontend pending)
- Salary Negotiation AI (frontend pending)
- Job Market Intelligence (frontend pending)

### Deferred Features (v1.1+)
- LinkedIn/Indeed scrapers

---

## Documentation Index

### For Users
- **[Quick Start Guide](user/QUICK_START.md)** - Installation and setup

### For Developers
- **[Getting Started](developer/GETTING_STARTED.md)** - Development setup
- **[Contributing](developer/CONTRIBUTING.md)** - How to contribute
- **[Architecture](developer/ARCHITECTURE.md)** - System design
- **[Testing](developer/TESTING.md)** - Test suite guide
- **[macOS Development](developer/MACOS_DEVELOPMENT.md)** - macOS-specific

### Planning
- **[Roadmap](ROADMAP.md)** - Feature roadmap and priorities

### Feature Specs
| Feature | Status | Doc |
|---------|--------|-----|
| Application Tracking | Working | [ATS](APPLICATION_TRACKING_SYSTEM.md) |
| Multi-Channel Notifications | Working | [Notifications](MULTI_CHANNEL_NOTIFICATIONS.md) |
| SQLite Configuration | Working | [SQLite](SQLITE_CONFIGURATION.md) |
| Resume Matcher | Backend Ready | [Resume](AI_RESUME_JOB_MATCHER.md) |
| Salary AI | Backend Ready | [Salary](SALARY_NEGOTIATION_AI.md) |
| Market Intelligence | Backend Ready | [Market](JOB_MARKET_INTELLIGENCE_DASHBOARD.md) |
| LinkedIn/Indeed | Deferred | [Scrapers](LINKEDIN_INDEED_SCRAPERS.md) |
| One-Click Apply | v2.0+ | [Automation](ONE_CLICK_APPLY_AUTOMATION.md) |

### Reports
- **[Deep Analysis](reports/DEEP_ANALYSIS_COMPLETE_REPORT.md)** - Security and code analysis
- **[v1.0 Status](reports/V1_COMPLETION_STATUS.md)** - Implementation tracking

---

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Install JobSentinel | [Quick Start](user/QUICK_START.md) |
| Set up development | [Getting Started](developer/GETTING_STARTED.md) |
| Contribute code | [Contributing](developer/CONTRIBUTING.md) |
| Understand architecture | [Architecture](developer/ARCHITECTURE.md) |
| See the roadmap | [Roadmap](ROADMAP.md) |

---

## File Structure

```
docs/
├── README.md           # This file
├── ROADMAP.md          # Feature roadmap
├── user/
│   └── QUICK_START.md
├── developer/
│   ├── GETTING_STARTED.md
│   ├── CONTRIBUTING.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   └── MACOS_DEVELOPMENT.md
├── reports/
│   ├── DEEP_ANALYSIS_COMPLETE_REPORT.md
│   └── V1_COMPLETION_STATUS.md
├── images/
│   └── logo.png
└── [Feature docs]      # Individual feature specifications
```

---

**Last Updated:** January 15, 2026
