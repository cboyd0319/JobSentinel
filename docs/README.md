# JobSentinel Documentation

Welcome to JobSentinel documentation.

## For AI Assistants (IMPORTANT)

**If you're an AI assistant working on this codebase:**

1. **USE SUB-AGENTS** - Parallelize work with Task tool. Don't read files sequentially.
2. **UPDATE DOCS** - After ANY change, update relevant docs (see table in CLAUDE.md)
3. **CHECK FILE SIZES** - Keep files <500 lines. See [ROADMAP.md](ROADMAP.md) for refactoring plan.
4. **READ CLAUDE.md FIRST** - Contains project context and critical requirements.

### Current Version: 2.5.1 (Production Ready)

See [ROADMAP.md](ROADMAP.md) for future plans (v2.6: ML predictions, installers).

---

## Current Status (January 2026)

**Version: 2.5.1** | 2100+ tests passing | Market Intelligence UI Release

### What's New in v2.5 📊

- **Market Intelligence UI** - Complete visualization layer with interactive charts
  - MarketSnapshotCard - Daily market summary with sentiment indicators
  - TrendChart - Recharts-powered line/bar charts for trends
  - LocationHeatmap - Interactive job density grid
  - MarketAlertCard - Alert display with mark-as-read
- **Tabbed Market Page** - Overview, Skills, Companies, Locations, Alerts tabs
- **Enhanced Backend Types** - Week-over-week change calculations
- **4 new Tauri commands** for market operations
- See [Market Intelligence Documentation](features/market-intelligence.md) for full details

### What's New in v2.0 🔐

- **OS-Native Keyring Integration** - All credentials securely stored in OS credential managers
  - macOS: Keychain | Windows: Credential Manager | Linux: Secret Service
- **6 credentials secured**: SMTP password, Telegram token, Slack/Discord/Teams webhooks, LinkedIn cookie
- **Automatic migration** - Existing plaintext credentials migrated on first launch
- See [Keyring Documentation](security/KEYRING.md) for full details

### What's New in v2.0 📄

- **Resume Builder** - 7-step wizard for creating professional resumes
  - 5 ATS-optimized templates (Classic, Modern, Technical, Executive, Military)
  - DOCX export with professional formatting
- **ATS Optimizer** - Analyze resumes against job descriptions
  - Keyword extraction and scoring
  - Bullet point improver with 45+ power words
- **22 new Tauri commands** for resume operations
- See [Resume Builder Documentation](features/resume-builder.md) for full details

### What's New in v2.0 🚀

- **One-Click Apply Automation** - Human-in-the-loop form filling
  - 7 ATS platforms: Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby
  - Application profile for contact info and URLs
  - Screening question auto-answers with regex patterns
  - Visible browser automation (user always clicks Submit)
  - CAPTCHA detection with user prompts
- **18 new Tauri commands** for automation
- See [One-Click Apply Documentation](features/one-click-apply.md) for full details

### Working Features

- **13 Job scrapers**: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely,
  BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter
- **Ghost Job Detection** - Identifies fake/stale job postings
- Application Tracking System (ATS) with Kanban board + interview scheduler
- AI Resume-Job Matcher with PDF parsing
- Salary AI with negotiation insights
- Market Intelligence with trend analysis
- Multi-factor scoring algorithm
- Notifications: Slack, Discord, Teams, Desktop, Email (SMTP)
- Advanced notification filtering - keyword filters, salary threshold, company lists
- Keyboard shortcuts - power user navigation (`b`, `n`, `c`, `/`, `?`, etc.)
- Advanced search - Boolean AND/OR/NOT operators, search history
- Interview prep - iCal export, prep checklists, follow-up reminders
- Enhanced analytics - Response rates, weekly goals, company response times
- Company research - 40+ companies with tech stacks
- SQLite database with full-text search
- React 19 frontend with virtual lists and error boundaries

### Screenshots

| Dashboard | Application Tracker |
|-----------|---------------------|
| ![Dashboard](images/dashboard.png) | ![Application Tracking](images/application-tracking.png) |

| Resume Matcher | Salary AI |
|----------------|-----------|
| ![Resume Matcher](images/resume-matcher.png) | ![Salary AI](images/salary-ai.png) |

| Market Intelligence | Settings |
|---------------------|----------|
| ![Market Intelligence](images/market-intelligence.png) | ![Settings](images/settings.png) |

| Resume Builder | ATS Optimizer |
|----------------|---------------|
| ![Resume Builder](images/resume-builder.png) | ![ATS Optimizer](images/ats-optimizer.png) |

| One-Click Apply |
|-----------------|
| ![One-Click Apply](images/one-click-apply.png) |

### Backend Modules (144 Tauri Commands)

- **Core**: config, db, scoring, scheduler, scrapers (13 with parallel scraping), notify, ghost
- **ATS**: 10 commands (Kanban, reminders, ghosting detection, interviews)
- **Resume Matcher**: 6 commands (upload, match, skills)
- **Resume Builder**: 22 commands (builder, templates, export, ATS analysis)
- **Salary AI**: 4 commands (predict, benchmark, negotiate, compare)
- **Market Intelligence**: 9 commands (trends, companies, locations, alerts, snapshot, historical)
- **Ghost Detection**: 3 commands (ghost jobs, statistics, filtered search)
- **User Data**: 20 commands (templates, prep checklists, saved searches, notifications, history)
- **One-Click Apply**: 18 commands (profile, screening answers, attempts, ATS detection, browser)
- **Health**: 9 commands (scraper health, smoke tests, credential expiry)

### Planned Features (v2.1+)

- macOS/Linux installers
- CI/CD Pipeline
- Browser Extension

---

## Documentation Index

### For Users

- **[Quick Start Guide](user/QUICK_START.md)** - Installation and setup

### For Developers

- **[Getting Started](developer/GETTING_STARTED.md)** - Development setup
- **[Contributing](developer/CONTRIBUTING.md)** - How to contribute
- **[Architecture](developer/ARCHITECTURE.md)** - System design
- **[Why Tauri?](developer/WHY_TAURI.md)** - Why we chose Tauri over Electron/Chrome
- **[Testing](developer/TESTING.md)** - Test suite guide
- **[E2E Testing](../e2e-tests/README.md)** - WebdriverIO + Tauri E2E tests
- **[macOS Development](developer/MACOS_DEVELOPMENT.md)** - macOS-specific
- **[SQLite Configuration](developer/sqlite-configuration.md)** - Database setup
- **[Error Handling](developer/ERROR_HANDLING.md)** - Error patterns
- **[Mutation Testing](developer/MUTATION_TESTING.md)** - Test quality

### Security

| Topic | Documentation |
|-------|---------------|
| **Keyring Integration** | [Secure Credential Storage](security/KEYRING.md) |

### Features

| Feature | Status | Documentation |
|---------|--------|---------------|
| Market Intelligence UI | **v2.5** | [Market](features/market-intelligence.md) |
| One-Click Apply | **v2.0** | [One-Click Apply](features/one-click-apply.md) |
| Resume Builder | **v2.0** | [Resume Builder](features/resume-builder.md) |
| Ghost Detection | **v1.4** | [Ghost Detection](features/ghost-detection.md) |
| Application Tracking | Working | [ATS](features/application-tracking.md) |
| Notifications | Working | [Notifications](features/notifications.md) |
| Resume Matcher | Working | [Resume Matcher](features/resume-matcher.md) |
| Salary AI | Working | [Salary](features/salary-ai.md) |
| Job Scrapers | Working | [Scrapers](features/scrapers.md) |

### Release Notes

- **[v2.5 - Market Intelligence UI](releases/v2.5.md)** - Interactive charts, tabbed layout, heatmaps
- **[v2.4 - Resume UI Enhancements](releases/v2.4.md)** - Skill visualization, comparison views
- **[v2.3 - Health Monitoring](releases/v2.3.md)** - Scraper health, smoke tests
- **[v2.2 - Additional Features](releases/v2.2.md)** - Bug fixes and improvements
- **[v2.1 - CI/CD](releases/v2.1.md)** - Build pipeline, testing improvements
- **[v2.0 - Security Hardening](releases/v2.0.md)** - OS-native keyring integration
- **[v1.6 - Additional Refactoring](releases/v1.6.md)** - Commands, scrapers, salary, resume modularization
- **[v1.5 - Modularization](releases/v1.5.md)** - File refactoring and code organization
- **[v1.4 - Ghost Hunter](releases/v1.4.md)** - Ghost job detection
- **[v1.3 - Power User](releases/v1.3.md)** - Keyboard shortcuts, advanced search
- **[v1.2 - Notifications](releases/v1.2.md)** - Multi-channel notifications

### Reports

- **[Security Audit (2026-01-16)](reports/SECURITY_AUDIT_2026-01-16.md)** - Comprehensive security analysis

### Planning

- **[Roadmap](ROADMAP.md)** - Feature roadmap and priorities
- **[Release Plans](plans/README.md)** - Formal planning documents for major releases
  - [v2.6.0 UX Improvements](plans/v2.6.0-ux-improvements.md) - Current sprint

---

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Install JobSentinel | [Quick Start](user/QUICK_START.md) |
| Set up development | [Getting Started](developer/GETTING_STARTED.md) |
| Understand ghost detection | [Ghost Detection](features/ghost-detection.md) |
| Contribute code | [Contributing](developer/CONTRIBUTING.md) |
| Understand architecture | [Architecture](developer/ARCHITECTURE.md) |
| See the roadmap | [Roadmap](ROADMAP.md) |

---

## File Structure

```text
docs/
├── README.md              # This file
├── ROADMAP.md             # Feature roadmap
├── security/              # Security documentation (v2.0+)
│   └── KEYRING.md             # OS-native credential storage
├── features/              # Feature documentation
│   ├── one-click-apply.md     # One-Click Apply automation (v2.0)
│   ├── resume-builder.md      # Resume builder + ATS optimizer (v2.0)
│   ├── ghost-detection.md     # Ghost job detection (v1.4)
│   ├── application-tracking.md
│   ├── notifications.md
│   ├── resume-matcher.md
│   ├── salary-ai.md
│   ├── market-intelligence.md
│   └── scrapers.md
├── releases/              # Version release notes
│   ├── v2.0.md                # Security hardening + Resume Builder + One-Click Apply
│   ├── v1.6.md
│   ├── v1.5.md
│   ├── v1.4.md
│   ├── v1.3.md
│   └── v1.2.md
├── user/
│   └── QUICK_START.md
├── developer/
│   ├── GETTING_STARTED.md
│   ├── CONTRIBUTING.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── MACOS_DEVELOPMENT.md
│   ├── ERROR_HANDLING.md
│   ├── MUTATION_TESTING.md
│   └── sqlite-configuration.md
├── reports/
│   └── SECURITY_AUDIT_2026-01-16.md
└── images/
    ├── dashboard.png
    └── kanban-board.png

e2e-tests/                 # E2E Tests (WebdriverIO + Tauri)
├── README.md              # E2E testing guide
├── package.json           # Test dependencies
├── wdio.conf.js          # WebdriverIO configuration
├── specs/                 # Test specifications
│   ├── dashboard.e2e.js       # Dashboard tests
│   ├── settings.e2e.js        # Settings tests
│   └── one-click-apply.e2e.js # One-Click Apply tests
└── screenshots/           # Captured screenshots
```

---

**Last Updated:** January 18, 2026
