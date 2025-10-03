# Job Finder

```
╔══════════════════════════════════════════════╗
║       Smart Job Search, Running Quietly      ║
║         Local-First • Cloud-Optional         ║
╚══════════════════════════════════════════════╝
```

**Find your next role. Filtered, scored, and delivered.**

This tool polls job boards on your schedule, scores matches with your rules, and sends alerts when opportunities cross your threshold. It runs locally by default, but you can deploy it to the cloud for a hands-off setup.

![Python 3.12.10](https://img.shields.io/badge/python-3.12.10-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Security: 0 Open Alerts](https://img.shields.io/badge/security-0%20open%20alerts-brightgreen.svg)
[![CI/CD Pipeline](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml)
[![Security Scan](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml)

> **Enterprise-Grade Security** • 7 automated security scanners • 100% SARIF coverage • Branch protection enforced

---

## Quick Start

### Windows

1.  **Download the installer**: Right-click [this link](https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/deploy/windows/Install-Job-Finder.ps1) and choose "Save Link As..." to save `Install-Job-Finder.ps1` to your Desktop.
2.  **Run the installer**: Double-click the `Install-Job-Finder.ps1` file on your Desktop and follow the on-screen instructions.

### macOS / Linux (Planned)

We're working on making the setup just as smooth for macOS and Linux users. For now, you can follow the [development setup guide](./docs/DEVELOPMENT.md) to get started.

> **Privacy-first**: This tool runs locally by default. Your data stays on your machine unless you choose to deploy to the cloud.

### ⚠️ A Note on Windows Security

When you first run the installer on Windows, you will likely see a blue "Windows protected your PC" screen. This is expected because the script is not code-signed. To proceed, click **More info** and then **Run anyway**.

---

## What It Does

*   **Polls job boards**: Checks your favorite job sites on a schedule you set.
*   **Filters and scores**: Uses your custom rules to find the best matches.
*   **Sends alerts**: Notifies you via Slack when a great opportunity comes up.
*   **Auto-configures**: Can analyze your resume (PDF/DOCX) to set up your preferences.
*   **Local-first**: Your data stays on your machine. Cloud deployment is optional.

## Documentation

- **[Getting Started](./docs/GETTING_STARTED.md)** - Installation and first run
- **[User Guide](./docs/USER_GUIDE.md)** - Daily usage and configuration
- **[MCP Guide](./docs/MCP_GUIDE.md)** - Access 500k+ jobs via MCP aggregators
- **[Security Guide](./docs/SECURITY_GUIDE.md)** - Security best practices
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Contributing and development
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Common commands cheat sheet
- **[Roadmap](./docs/ROADMAP.md)** - Planned features

## Contributing

Pull requests are welcome! See [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - See [LICENSE](./LICENSE) file for details.

## Need Help?

- **Troubleshooting:** See [User Guide - Troubleshooting](./docs/USER_GUIDE.md#troubleshooting)
- **Issues:** [GitHub Issues](https://github.com/cboyd0319/job-private-scraper-filter/issues)
- **Security:** [Security Policy](./SECURITY.md)

Made with care. Hope it helps you find a great gig.