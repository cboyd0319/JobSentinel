<div align="center">

<img src="docs/images/logo.png" alt="JobSentinel Logo" width="200">

# JobSentinel v2.0

### **The simplest way to automate your job search**

Windows 11+ • Zero Technical Knowledge • 100% Private • $0 Forever

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.83%2B-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.1-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)

[Download](#installation) • [Features](#features) • [Quick Start](QUICK_START.md) • [Getting Started](GETTING_STARTED.md)

</div>

---

## ⚡ What Changed in v2.0?

**JobSentinel v2.0 is a complete rewrite from the ground up.**

### Why the Rewrite?

The original Python version was powerful but **too complex** for the target user: someone with **zero technical knowledge** who just wants to click an installer and have it work.

### What's New?

| Feature | v1.0 (Python) | v2.0 (Tauri/Rust) |
|---------|---------------|-------------------|
| **Installation** | Requires Python 3.12+, pip, Playwright | Single `.msi` installer, double-click to install |
| **Size** | ~350MB (with dependencies) | ~8MB installer |
| **Startup Time** | 3-5 seconds | <0.5 seconds |
| **Memory Usage** | ~500MB | ~50MB |
| **Admin Rights** | Sometimes required | ❌ Never required |
| **Auto-Updates** | Manual | ✅ Built-in |
| **Platform** | Windows, macOS, Linux (complex setup) | Windows 11+ (v1.0), macOS/Linux coming v2.1+ |

### v2.0 Focus: **Windows 11+ Only**

We're starting with **one platform done right**. macOS and Linux support will come in v2.1+.

---

## 🎯 What is JobSentinel?

**JobSentinel** is a desktop app that:
1. **Scrapes** job boards (Greenhouse, Lever, JobsWithGPT) every 2 hours
2. **Scores** jobs using your preferences (skills, salary, location, company)
3. **Alerts** you on Slack when high-match jobs are found (90%+ score)

**All data stays on your machine.** No cloud. No tracking. No subscriptions.

---

## 🚀 Installation

### Prerequisites

- **Windows 11** or newer
- **8MB disk space**
- **No admin rights required**

### Steps

1. Download the latest `.msi` installer from [Releases](https://github.com/cboyd0319/JobSentinel/releases)
2. Double-click `JobSentinel-1.0.0-x64.msi`
3. Follow the setup wizard (4 steps, ~2 minutes)
4. Done! App runs in your system tray

---

## ✨ Features

### v1.0 (Current)

| Feature | Description |
|---------|-------------|
| **3 Job Boards** | Greenhouse, Lever, JobsWithGPT (500K+ listings) |
| **Smart Scoring** | Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5% |
| **Slack Alerts** | Rich-formatted notifications for high matches |
| **Auto-Scheduling** | Scrapes every 2 hours (configurable) |
| **Manual Trigger** | Right-click tray icon → "Search Now" |
| **SQLite Database** | Local storage, full-text search |
| **Setup Wizard** | Interactive first-run configuration |

### v2.0 Roadmap

- [ ] Email notifications (SMTP)
- [ ] Reed.co.uk + JobSpy integration
- [ ] Resume parsing and job-resume matching
- [ ] Application tracker
- [ ] ML-enhanced scoring
- [ ] macOS support (`.dmg` installer)
- [ ] Linux support (`.deb`, `.rpm`, `.AppImage`)

### v3.0+ (Cloud)

- [ ] GCP Cloud Run deployment
- [ ] AWS Lambda deployment
- [ ] Multi-user support
- [ ] Web dashboard

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite + TailwindCSS | Modern, responsive UI |
| **Backend** | Rust + Tokio | Async job scraping, scoring, notifications |
| **Database** | SQLite (SQLx) | Local job storage |
| **Desktop** | Tauri 2.1 | Cross-platform desktop framework |
| **HTTP** | reqwest + scraper | Job board scraping |
| **Notifications** | Slack webhooks | Immediate alerts |

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
│   │   │   ├── macos/       # macOS 13+ (v2.1+)
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

Stored at: `%LOCALAPPDATA%\JobSentinel\config.json`

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

- **[Quick Start Guide](QUICK_START.md)** - User installation and setup guide
- **[Getting Started](GETTING_STARTED.md)** - Developer setup and contribution guide
- **[v1.0 Completion Status](V1_COMPLETION_STATUS.md)** - Implementation tracking
- **[Deep Analysis Fixes](DEEP_ANALYSIS_FIXES.md)** - Security and stability improvements

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

[⬆ Back to top](#jobsentinel-v20)

</div>
