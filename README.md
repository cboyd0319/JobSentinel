<div align="center">

<img src="docs/images/logo.png" alt="JobSentinel Logo" width="200">

# 🛡️ JobSentinel

### **Your AI-Powered Guardian for the Job Hunt**

*Privacy-first. Zero compromise. 100% free forever.*

<br>

<p align="center">
  <img src="https://img.shields.io/badge/Windows_11+-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows 11+">
  <img src="https://img.shields.io/badge/macOS_14+-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS 14+">
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.83%2B-orange.svg?style=flat-square" alt="Rust"></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-2.x-blue.svg?style=flat-square" alt="Tauri"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61dafb.svg?style=flat-square" alt="React"></a>
  <img src="https://img.shields.io/badge/Tests-2008%20passing-brightgreen.svg?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/Vulnerabilities-0-brightgreen.svg?style=flat-square" alt="Security">
</p>

<br>

---

### 🚀 **JANUARY 18, 2026**

<h2>🔥 BIG THINGS ARE COMING 🔥</h2>

<p><em>The future of job hunting is about to change forever.</em></p>

<p><strong>Mark your calendar. Set your alarms. Tell your friends.</strong></p>

---

<br>

[⬇️ Download](#installation) • [✨ Features](#features) • [🚀 Quick Start](docs/user/QUICK_START.md) • [💻 Developer Guide](docs/developer/GETTING_STARTED.md)

</div>

---

## 🎯 What Makes JobSentinel Different?

| The Problem | JobSentinel's Solution |
|-------------|------------------------|
| 💸 Job aggregators sell your data | 🔒 **Zero data collection** - your data never leaves your machine |
| 😴 Missing dream jobs while you sleep | ⚡ **24/7 vigilance** - automated scanning with instant Slack alerts |
| 🤯 Drowning in irrelevant listings | 🎯 **AI-powered matching** - only see jobs that fit YOU |
| 💰 Subscription fatigue | 🆓 **Free forever** - MIT licensed, no catches |

---

## Project Status

**Current Version: 1.3.0** (January 2026)

| Component | Status | Description |
|-----------|--------|-------------|
| 🧠 **Core Engine** | ✅ Working | Config, DB, scoring, scrapers, scheduler, notifications |
| 📋 **Application Tracking** | ✅ Working | Kanban board with automated reminders |
| 🤖 **AI Resume Matcher** | ✅ Working | PDF parsing, skill extraction, job-resume scoring |
| 💰 **Salary AI** | ✅ Working | H1B-based predictions, negotiation insights |
| 📊 **Market Intelligence** | ✅ Working | Skill trends, hiring velocity, alerts |
| 🎨 **Frontend** | ✅ Working | React 19 + TypeScript + TailwindCSS |
| 🖥️ **Desktop App** | ✅ Working | Tauri 2.1 integration |
| 🔐 **Security** | ✅ **0 vulnerabilities** | cargo-audit verified |
| ✅ **Test Coverage** | ✅ **2008 passing** | 20 ignored (require file-based DB) |

### Job Sources (13 Working)
- **Greenhouse** - Many tech companies use this ATS
- **Lever** - Popular with startups
- **JobsWithGPT** - AI-powered job aggregator
- **LinkedIn** - Requires session cookie (li_at) - configurable in Settings
- **Indeed** - Query-based search - configurable in Settings
- **RemoteOK** - Remote-only jobs via JSON API
- **Wellfound** - Startup jobs (formerly AngelList)
- **WeWorkRemotely** - Remote jobs via RSS feed
- **BuiltIn** - City-specific tech jobs (NYC, LA, Chicago, etc.)
- **HN Who's Hiring** - Monthly Hacker News hiring threads
- **Dice** - Tech-focused job board
- **YC Startup Jobs** - Y Combinator company jobs
- **ZipRecruiter** - Broad job aggregator

---

## 🚀 What is JobSentinel?

<div align="center">
<h3>💼 Scan → 🎯 Match → 📱 Alert</h3>
</div>

**JobSentinel** is a desktop app that automatically:
1. **🔍 Scans** 13 job boards (Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter) every 2 hours
2. **🧠 Matches** jobs to your preferences using AI scoring
3. **📢 Alerts** you on Slack/Discord/Teams/Desktop/Email when great matches appear (90%+ score)

> **🔒 All data stays on YOUR computer.** No cloud. No tracking. No subscriptions. Ever.

---

## Installation

> **Note:** Pre-built installers are not yet available. See [Development](#development) to build from source.

### Windows 11+ (Primary Target)

**Prerequisites:**
- Windows 11 or newer
- 8MB disk space
- No admin rights required

**From Source:**
```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build
```

### macOS 14+ (Sonoma/Sequoia)

macOS builds work and are used for development. Official `.dmg` installers planned for v2.0.

### Linux (Planned for v2.0)

Linux support (.deb, .rpm, .AppImage) is planned for v2.0.

---

## 💪 Features

### v1.3 (Current Release)

| Feature | Description |
|---------|-------------|
| 🌐 **13 Job Boards** | Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter |
| 📋 **Application Tracking** | Kanban board, status pipeline, automated reminders, interview scheduler |
| 🤖 **AI Resume Matcher** | PDF parsing, skill extraction, job-resume scoring |
| 💰 **Salary AI** | H1B-based predictions, offer comparison, negotiation insights |
| 📊 **Market Intelligence** | Daily snapshots, skill trends, hiring velocity, alerts |
| 🎯 **Smart Scoring** | Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5% |
| 📢 **Multi-Channel Alerts** | Slack, Discord, Teams, Desktop, Email (SMTP) |
| ⌨️ **Keyboard Shortcuts** | `b` bookmark, `n` notes, `c` company research, `/` search, `?` help |
| 🔍 **Advanced Search** | Boolean operators (AND/OR/NOT), search history, saved queries |
| 📅 **Interview Scheduler** | iCal export, prep checklists, follow-up reminders |
| 📈 **Enhanced Analytics** | Response rates by source, weekly goals, company response times |
| 🏢 **Company Research** | 40+ known companies with tech stacks, Glassdoor/LinkedIn links |
| 💼 **Cover Letter Templates** | Category filters, custom placeholders, word count |
| 🔔 **Notification Filtering** | Keyword include/exclude, salary threshold, company whitelist/blacklist |
| ⏰ **Auto-Scheduling** | Scrapes every 2 hours (configurable) |
| 🗄️ **SQLite Database** | Local storage, full-text search |

### v1.0-1.2 (Complete)

- [x] Core scrapers (Greenhouse, Lever, JobsWithGPT)
- [x] LinkedIn and Indeed scrapers
- [x] Desktop notifications (Tauri plugin)
- [x] Email notifications (SMTP)
- [x] Frontend pages for ATS, Resume, Salary, Market
- [x] Virtual list for performance
- [x] Error boundaries and loading states
- [x] Accessibility improvements (ARIA, keyboard nav)

### v2.0+ (Future)

- [ ] macOS support (`.dmg` installer)
- [ ] Linux support (`.deb`, `.rpm`, `.AppImage`)
- [ ] One-Click Apply Automation (requires legal review)
- [ ] GCP Cloud Run deployment
- [ ] AWS Lambda deployment
- [ ] Multi-user support
- [ ] Web dashboard

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite + TailwindCSS | Modern, responsive UI |
| **Backend** | Rust + Tokio | Async job scraping, scoring, notifications |
| **Database** | SQLite (SQLx) | Local job storage |
| **Desktop** | Tauri 2.x | Cross-platform desktop framework |
| **HTTP** | reqwest + scraper | Job board scraping |
| **Notifications** | Slack, Discord, Teams, Desktop | Immediate alerts |

### Directory Structure (Future-Proof)

```
JobSentinel/
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── core/            # Platform-agnostic business logic
│   │   │   ├── config/      # Configuration management
│   │   │   ├── db/          # SQLite database layer
│   │   │   ├── scrapers/    # Job board scrapers
│   │   │   ├── scoring/     # Multi-factor scoring
│   │   │   ├── notify/      # Slack notifications
│   │   │   └── scheduler/   # Job search scheduling
│   │   ├── platforms/       # Platform-specific code
│   │   │   ├── windows/     # Windows 11+ (v1.0)
│   │   │   ├── macos/       # macOS 14+ (v2.1+)
│   │   │   └── linux/       # Linux (v2.1+)
│   │   ├── cloud/           # Cloud deployment (v3.0+)
│   │   │   ├── gcp/         # Google Cloud Platform
│   │   │   └── aws/         # Amazon Web Services
│   │   └── commands/        # Tauri RPC commands
│   └── migrations/          # SQLite migrations
├── src/                     # React frontend
│   ├── pages/               # Setup Wizard, Dashboard
│   ├── components/          # Reusable UI components
│   └── lib/                 # Utilities
└── docs/                    # Documentation
```

**Key Design Principles:**
- **Core business logic** is platform-agnostic (works on Windows, macOS, Linux, cloud)
- **Platform-specific code** is isolated with conditional compilation
- **Cloud deployment** modules are separate (no bloat in desktop app)
- **No refactoring needed** when adding macOS, Linux, or cloud support

### UI/UX Design System

JobSentinel features a distinctive, non-generic design system built around the concept of a "vigilant guardian" for your job search:

| Element | Implementation |
|---------|---------------|
| **Brand Colors** | Sentinel Teal (trust, security) + Alert Amber (opportunities) |
| **Typography** | Space Grotesk (display), Inter (body), JetBrains Mono (scores) |
| **Components** | Button, Input, Card, Badge, JobCard, ScoreDisplay, StatCard |
| **Animations** | Staggered entrance, smooth transitions, scanning loader |
| **Accessibility** | Skip-to-content, focus traps, ARIA labels, keyboard navigation |

**Component Library (`src/components/`):**
- `Button` - Multiple variants, loading states, icons
- `Input` - Labels, hints, error states, left/right icons
- `Card` - With hover effects, CardHeader, CardDivider
- `Badge` - Removable badges with semantic variants
- `ScoreDisplay` - Circular and bar score visualizations
- `JobCard` - Rich job listing with score, meta, actions
- `StatCard` - Dashboard statistics with trends
- `EmptyState` - Consistent empty states across the app

---

## 📖 Configuration

### First-Run Setup Wizard

1. **Job Titles**: What roles are you looking for?
   - Example: "Security Engineer", "Product Security Engineer"

2. **Location**: Remote, hybrid, or onsite?
   - Example: Remote + Hybrid

3. **Salary**: Minimum salary in USD
   - Example: $150,000

4. **Slack** (optional): Webhook URL for alerts
   - Create at: https://api.slack.com/messaging/webhooks

### Configuration File

**Location:**
- **Windows:** `%LOCALAPPDATA%\JobSentinel\config.json`
- **macOS:** `~/.config/jobsentinel/config.json`

```json
{
  "title_allowlist": ["Security Engineer", "Product Security"],
  "keywords_boost": ["Kubernetes", "AWS", "IAM"],
  "location_preferences": {
    "allow_remote": true,
    "allow_hybrid": true,
    "allow_onsite": false
  },
  "salary_floor_usd": 150000,
  "immediate_alert_threshold": 0.9,
  "scraping_interval_hours": 2,
  "alerts": {
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/..."
    }
  }
}
```

---

## 🎨 UI Preview

### Setup Wizard
*Interactive 4-step configuration*

### Dashboard
*Recent jobs, statistics, manual search trigger*

*(Screenshots coming soon)*

---

## 🔒 Privacy & Security

<div align="center">

| Feature | Status |
|---------|--------|
| **🏠 Local-First** | ✅ All data on your machine |
| **📊 Zero Telemetry** | ✅ No tracking, no analytics |
| **🔐 No Admin Rights** | ✅ Installs to user directory |
| **🔗 HTTPS Only** | ✅ Encrypted scraping |
| **📖 Open Source** | ✅ Audit every line |
| **🛡️ Vulnerability-Free** | ✅ 0 CVEs in production code |
| **✍️ Code Signed** | 🔜 Coming v1.1 |

</div>

> **Why Zero Vulnerabilities Matter**: JobSentinel is designed to run on public library computers and home computers for users with zero technical knowledge. Security isn't optional—it's foundational.

---

## 📝 Development

### Prerequisites

- **Rust** 1.83+
- **Node.js** 20+
- **Tauri CLI** 2.1+

### Setup

```bash
# Clone repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Documentation

- **[📖 Documentation Hub](docs/README.md)** - Complete documentation index
- **[🚀 Quick Start Guide](docs/user/QUICK_START.md)** - User installation and setup guide
- **[💻 Getting Started](docs/developer/GETTING_STARTED.md)** - Developer setup and contribution guide
- **[🍎 macOS Development](docs/developer/MACOS_DEVELOPMENT.md)** - macOS-specific development guide
- **[🤝 Contributing](docs/developer/CONTRIBUTING.md)** - Contribution guidelines
- **[📊 Analysis Report](docs/reports/DEEP_ANALYSIS_COMPLETE_REPORT.md)** - Complete security and code analysis

---

## ❓ Frequently Asked Questions (FAQ)

### General Questions

**Q: Is JobSentinel really free?**
A: Yes! 100% free, forever. No subscriptions, no hidden costs, no premium tiers. JobSentinel is open source under the MIT license.

**Q: Do I need to create an account?**
A: No! JobSentinel runs entirely on your local machine. No account, no login, no cloud sync. Your data stays private.

**Q: What job boards does it support?**
A: Currently 13 job boards: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, and ZipRecruiter (covering 1M+ job listings).

**Q: Can I use this for non-tech jobs?**
A: Absolutely! While designed for tech roles, JobSentinel works for any jobs posted on Greenhouse, Lever, or JobsWithGPT.

**Q: Does it work offline?**
A: Partially. The app runs offline, but it needs internet to scrape job boards and send Slack notifications.

### Privacy & Security

**Q: What data does JobSentinel collect?**
A: **Nothing!** Zero telemetry, zero analytics, zero tracking. All data stays on your machine. We literally can't see your data.

**Q: Is my Slack webhook secure?**
A: Yes. Webhooks are validated (must start with `https://hooks.slack.com/services/`), stored locally, and only used for job alerts you configure.

**Q: Can someone else access my job data?**
A: Only if they have physical access to your computer. JobSentinel stores data in standard OS directories with your user permissions.

### Setup & Configuration

**Q: How long does setup take?**
A: ~2 minutes. The 4-step wizard covers job titles, location, salary, and Slack notifications (optional).

**Q: Can I change my preferences later?**
A: Yes! Edit the config file:
- **Windows:** `%LOCALAPPDATA%\JobSentinel\config.json`
- **macOS:** `~/.config/jobsentinel/config.json`

**Q: What's a good starting configuration?**
A: See [Configuration Presets](#configuration-presets) below for role-specific templates.

**Q: Do I need a Slack webhook?**
A: No, it's optional. Without Slack, you'll still see all jobs in the dashboard - you just won't get instant notifications.

### Job Scraping & Scoring

**Q: How often does it check for new jobs?**
A: Every 2 hours by default (configurable in `config.json`). You can also trigger manually via "Search Now".

**Q: How accurate is the job scoring?**
A: Very good for title/salary/location matching. The algorithm uses: Skills (40%), Salary (25%), Location (20%), Company (10%), Recency (5%).

**Q: Why am I not finding any jobs?**
A: Common fixes:
1. Broaden your title allowlist (try variations: "Engineer", "Developer", "Specialist")
2. Allow multiple locations (Remote + Hybrid)
3. Lower salary floor to $0 initially
4. Check that Greenhouse/Lever companies are hiring

**Q: Can I search specific companies?**
A: Yes! Add company URLs to `config.json`:
```json
{
  "greenhouse_urls": ["https://boards.greenhouse.io/cloudflare"],
  "lever_urls": ["https://jobs.lever.co/netflix"]
}
```

### Technical Questions

**Q: Does this require Python/Node.js/etc?**
A: No! JobSentinel is a single-file installer. No dependencies, no setup. Just double-click and go.

**Q: What's the system requirements?**
A: Minimal:
- **Windows:** Windows 11+, 8MB disk, no admin rights
- **macOS:** macOS 14+ (Sonoma/Sequoia), 8MB disk, no admin rights

**Q: Can I run multiple instances?**
A: Not recommended. One instance per user is optimal to avoid duplicate notifications and database conflicts.

**Q: How do I update to a new version?**
A: Download the new installer and run it. Your config and database will be preserved.

### Troubleshooting

**Q: JobSentinel won't start**
A: Check:
1. Is it already running? (Check system tray/menu bar)
2. Run with `RUST_LOG=debug` to see error messages
3. Try reinstalling from the latest `.msi`/`.dmg`

**Q: Slack notifications not working**
A: Verify:
1. Webhook URL starts with `https://hooks.slack.com/services/`
2. Slack app has permission to post
3. At least one job scores ≥90% (or your configured threshold)
4. Check logs with `RUST_LOG=debug`

**Q: Database errors**
A: Rare, but if it happens:
1. Close JobSentinel
2. Backup database file
3. Delete database (will be recreated)
4. Restart JobSentinel

**Q: High CPU usage**
A: JobSentinel only uses CPU during scraping (a few minutes every 2 hours). If constantly high, check for multiple instances running.

### Comparison with Alternatives

**Q: How is this better than LinkedIn Easy Apply?**
A:
- ✅ Privacy-first (LinkedIn tracks everything)
- ✅ Automated scoring (LinkedIn requires manual review)
- ✅ Covers more job boards (LinkedIn is just LinkedIn)
- ✅ Slack alerts for instant notifications
- ✅ 100% free (LinkedIn Premium is $40/month)

**Q: How is this different from Indeed/Glassdoor?**
A: JobSentinel is an *automation tool*, not a job board. It scrapes multiple boards, scores jobs based on *your* preferences, and alerts you immediately.

**Q: What about JobSpy or other scrapers?**
A: Most require Python setup, command-line knowledge, and manual configuration. JobSentinel is designed for **zero technical knowledge** - just click and go.

---

## 🎯 Configuration Presets

Quick-start templates for common roles:

### Security Engineer
```json
{
  "title_allowlist": ["Security Engineer", "AppSec Engineer", "Product Security"],
  "keywords_boost": ["Penetration Testing", "SAST", "DAST", "Threat Modeling", "AWS", "Kubernetes"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": true, "allow_onsite": false },
  "salary_floor_usd": 150000
}
```

### Frontend Developer
```json
{
  "title_allowlist": ["Frontend Engineer", "Frontend Developer", "React Developer"],
  "keywords_boost": ["React", "TypeScript", "Next.js", "TailwindCSS", "GraphQL"],
  "keywords_exclude": ["Angular", "jQuery"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": false, "allow_onsite": false },
  "salary_floor_usd": 120000
}
```

### Backend Engineer
```json
{
  "title_allowlist": ["Backend Engineer", "API Engineer", "Platform Engineer"],
  "keywords_boost": ["Python", "Go", "Rust", "Kubernetes", "PostgreSQL", "Microservices"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": true, "allow_onsite": false },
  "salary_floor_usd": 140000
}
```

### DevOps/SRE
```json
{
  "title_allowlist": ["DevOps Engineer", "SRE", "Platform Engineer", "Infrastructure Engineer"],
  "keywords_boost": ["Kubernetes", "Terraform", "AWS", "Docker", "CI/CD", "Monitoring"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": false, "allow_onsite": false },
  "salary_floor_usd": 150000
}
```

### Data Scientist
```json
{
  "title_allowlist": ["Data Scientist", "ML Engineer", "Machine Learning Engineer"],
  "keywords_boost": ["Python", "TensorFlow", "PyTorch", "SQL", "Statistics", "Deep Learning"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": true, "allow_onsite": false },
  "salary_floor_usd": 130000
}
```

### Product Manager
```json
{
  "title_allowlist": ["Product Manager", "Senior Product Manager", "Group Product Manager"],
  "title_blocklist": ["Associate", "Junior", "Intern"],
  "keywords_boost": ["B2B", "SaaS", "Analytics", "User Research"],
  "location_preferences": { "allow_remote": true, "allow_hybrid": true, "allow_onsite": false },
  "salary_floor_usd": 140000
}
```

---

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](docs/developer/CONTRIBUTING.md) for details.

---

## 📜 License

**MIT License** - See [LICENSE](LICENSE)

```
✅ Commercial use
✅ Modification
✅ Distribution
✅ Private use
📋 License and copyright notice required
```

---

## 💬 Support

- 🐛 [File a bug report](https://github.com/cboyd0319/JobSentinel/issues/new)
- 💡 [Request a feature](https://github.com/cboyd0319/JobSentinel/discussions/new?category=feature-requests)
- 💬 [Ask a question](https://github.com/cboyd0319/JobSentinel/discussions/new?category=q-a)

---

<div align="center">

## ⭐ Star History

If JobSentinel helps you land your next job, **give us a star!** ⭐

<div align="center">

**Built with ❤️ for job seekers who refuse to sacrifice privacy**

*Your data is yours. Your job search is yours. Your future is yours.*

<br>

[Back to top](#-jobsentinel)

</div>
