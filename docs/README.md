# JobSentinel Documentation

Welcome to JobSentinel documentation.

## Current Status (January 2026)

**Version: 1.3.0** | 290 tests passing, 20 ignored | Full-featured release

### Working Features
- **10 Job scrapers**: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT
- Application Tracking System (ATS) with Kanban board + interview scheduler
- AI Resume-Job Matcher with PDF parsing
- Salary AI with negotiation insights
- Market Intelligence with trend analysis
- Multi-factor scoring algorithm
- Notifications: Slack, Discord, Teams, Desktop, Email (SMTP)
- **Advanced notification filtering** - keyword filters, salary threshold, company lists
- **Keyboard shortcuts** - power user navigation (`b`, `n`, `c`, `/`, `?`, etc.)
- **Advanced search** - Boolean AND/OR/NOT operators, search history
- **Interview prep** - iCal export, prep checklists, follow-up reminders
- **Enhanced analytics** - Response rates, weekly goals, company response times
- **Company research** - 40+ companies with tech stacks
- SQLite database with full-text search
- React 19 frontend with virtual lists and error boundaries

### All Backend Modules Enabled
- Core: config, db, scoring, scheduler, scrapers (10), notify
- ATS: 7 Tauri commands (Kanban, reminders, ghosting detection)
- Resume Matcher: 6 Tauri commands (upload, match, skills)
- Salary AI: 4 Tauri commands (predict, benchmark, negotiate, compare)
- Market Intelligence: 5 Tauri commands (trends, companies, locations, alerts)

### Deferred Features (v2.0+)
- One-Click Apply Automation (legal review required)

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
| Resume Matcher | Working | [Resume](AI_RESUME_JOB_MATCHER.md) |
| Salary AI | Working | [Salary](SALARY_NEGOTIATION_AI.md) |
| Market Intelligence | Working | [Market](JOB_MARKET_INTELLIGENCE_DASHBOARD.md) |
| LinkedIn/Indeed | Working | [Scrapers](LINKEDIN_INDEED_SCRAPERS.md) |
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

**Last Updated:** January 17, 2026
