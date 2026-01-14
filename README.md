<div align="center">

<img src="docs/images/logo.png" alt="JobSentinel Logo" width="200">

# JobSentinel

### **Privacy-first job search automation**

Windows 11+ (primary) | macOS 26.2+ & Linux (v2.0) | 100% Private | $0 Forever

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.83%2B-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-256%20passing%2C%2013%20ignored-brightgreen.svg)]()

[Download](#installation) | [Features](#features) | [Quick Start](QUICK_START.md) | [Getting Started](GETTING_STARTED.md)

</div>

---

## Project Status

**Current Version: 1.0.0-alpha** (January 2026)

| Component | Status |
|-----------|--------|
| Core (config, db, scoring, scrapers, scheduler, notify) | Working |
| Application Tracking System (ATS) | Working |
| Frontend (React 19 + TypeScript) | Working |
| Tauri integration | Working |
| Tests | 256 passing, 13 ignored |
| Windows build | Ready for testing |
| macOS/Linux builds | Planned for v2.0 |

### Deferred Features (v1.1+)
- AI Resume-Job Matcher (65% complete)
- Salary Negotiation AI (50% complete)
- Job Market Intelligence Dashboard (60% complete)
- LinkedIn/Indeed scrapers (code exists, incomplete)

---

## What is JobSentinel?

**JobSentinel** is a desktop app that:
1. **Scrapes** job boards (Greenhouse, Lever, JobsWithGPT) every 2 hours
2. **Scores** jobs using your preferences (skills, salary, location, company)
3. **Alerts** you on Slack/Discord/Teams when high-match jobs are found (90%+ score)

**All data stays on your machine.** No cloud. No tracking. No subscriptions.

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

### macOS 26.2+ (Planned for v2.0)

macOS support is planned for v2.0. Development is currently done on macOS.

### Linux (Planned for v2.0)

Linux support (.deb, .rpm, .AppImage) is planned for v2.0.

---

## Features

### v1.0 Core (Working)

| Feature | Description |
|---------|-------------|
| **3 Job Boards** | Greenhouse, Lever, JobsWithGPT (500K+ listings) |
| **Application Tracking** | Kanban board, status pipeline, automated reminders |
| **Smart Scoring** | Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5% |
| **Multi-Channel Alerts** | Slack, Discord, and Teams webhook notifications |
| **Auto-Scheduling** | Scrapes every 2 hours (configurable) |
| **Manual Trigger** | Right-click tray icon -> "Search Now" |
| **SQLite Database** | Local storage, full-text search |
| **Setup Wizard** | Interactive first-run configuration |

### v1.1+ Roadmap (Deferred Features)

- [ ] AI Resume-Job Matcher - 65% complete
- [ ] Salary Negotiation AI - 50% complete
- [ ] Job Market Intelligence Dashboard - 60% complete
- [ ] LinkedIn/Indeed scrapers
- [ ] Email notifications (SMTP)
- [ ] macOS support (`.dmg` installer)
- [ ] Linux support (`.deb`, `.rpm`, `.AppImage`)

### v2.0+ (Future)

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
| **Desktop** | Tauri 2.1 | Cross-platform desktop framework |
| **HTTP** | reqwest + scraper | Job board scraping |
| **Notifications** | Slack, Discord, Teams webhooks | Immediate alerts |

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
│   │   │   ├── macos/       # macOS 26.2+ (v2.1+)
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
- ✅ **Core business logic** is platform-agnostic (works on Windows, macOS, Linux, cloud)
- ✅ **Platform-specific code** is isolated with conditional compilation
- ✅ **Cloud deployment** modules are separate (no bloat in desktop app)
- ✅ **No refactoring needed** when adding macOS, Linux, or cloud support

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

| Feature | Status |
|---------|--------|
| **Local-First** | ✅ All data on your machine |
| **Zero Telemetry** | ✅ No tracking, no analytics |
| **No Admin Rights** | ✅ Installs to `%LOCALAPPDATA%` |
| **HTTPS Only** | ✅ Encrypted scraping |
| **Open Source** | ✅ Audit the code |
| **Code Signed** | 🔜 Coming soon |

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
A: Currently Greenhouse, Lever, and JobsWithGPT (covering 500K+ job listings). More scrapers planned for v1.1+ (Reed.co.uk, LinkedIn, etc.).

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
- **macOS:** macOS 26.2+ (Tahoe), 8MB disk, no admin rights

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

We're not accepting contributions yet while v2.0 is in alpha. Check back in Q2 2025!

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

## ⭐ Star Us

If JobSentinel helps you land your next job, give us a star ⭐

**Made with ❤️ for job seekers who value privacy**

[Back to top](#jobsentinel)

</div>
