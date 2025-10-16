# JobSentinel for macOS — Local, Private, Zero-Headache Setup

This folder contains everything a **non-technical macOS user** needs to install and run JobSentinel locally.

The entire experience now happens through double-clickable icons — no terminal knowledge required.

---

## 🟢 Before You Start

| Requirement | How to check | What to do if missing |
|-------------|--------------|-----------------------|
| macOS 12 Monterey or newer (Sonoma/Sequoia recommended) |  > **About This Mac** | Update via System Settings → General → Software Update |
| Python 3.11 or 3.12 | Double-click **Check Python.command** (or run `python3 --version`) | Install from [python.org](https://www.python.org/downloads/) or via [Homebrew](https://brew.sh) with `brew install python@3.12` |
| 1 GB free disk space |  > **About This Mac** > More Info > Storage | Delete or move files to free up space |
| Internet connection | Open a website in Safari | Connect to Wi‑Fi or Ethernet |

> 💡 **Tip:** If you are unsure whether Python is installed, run the setup anyway — JobSentinel will guide you through fixing it.

---

## 🚀 Zero-Knowledge Quick Start (Double-Click Flow)

1. **Open the JobSentinel folder** (from your download or clone).
2. **Double-click `setup.command`.**
   - The script walks through all checks, creates a private `.venv` environment, installs dependencies, and runs an interactive preference wizard.
   - Grab a coffee ☕ — this takes about 5 minutes on a typical MacBook.
3. When the setup finishes you will see new shortcuts on your Desktop:
   - `Run JobSentinel.command`
   - `JobSentinel Dashboard.command`
   - `Configure JobSentinel.command`
   - `JobSentinel Launcher.command` (opens the graphical control panel)
4. **Launch JobSentinel** by double-clicking `JobSentinel Launcher.command`.
   - The GUI lets you run searches, open the dashboard, and monitor system health with buttons — no commands required.

---

## 🔍 What the Setup Wizard Does Automatically

- Verifies macOS version, Python availability, disk space, and internet access.
- Creates/refreshes a dedicated `.venv` virtual environment so the system Python stays untouched.
- Installs all required Python packages (with automatic pip upgrades).
- Downloads Playwright Chromium for the built-in scrapers.
- Runs the JobSentinel configuration wizard so you can enter skills, preferred locations, salary targets, etc.
- Performs a health check to confirm everything works.
- Drops friendly `.command` launchers on your Desktop plus shell aliases like `jobsentinel-run`.

> 🔐 **Privacy first:** Everything stays on your Mac. No cloud services, no telemetry.

---

## 🖥 Everyday Usage

| Action | Easiest option | Advanced option |
|--------|----------------|-----------------|
| Launch the GUI | Double-click `JobSentinel Launcher.command` | `.venv/bin/python -m jsa.gui_launcher` |
| Run a job search now | Double-click `Run JobSentinel.command` | `.venv/bin/python -m jsa.cli run-once` |
| Dry run (no notifications) | Double-click `JobSentinel Dry Run.command` | `.venv/bin/python -m jsa.cli run-once --dry-run` |
| Open the dashboard | Double-click `JobSentinel Dashboard.command` then go to <http://localhost:5000> | `.venv/bin/python -m jsa.cli web` |
| Update preferences | Double-click `Configure JobSentinel.command` | `.venv/bin/python -m jsa.cli setup` |
| Check status | Double-click `JobSentinel Health Check.command` | `.venv/bin/python -m jsa.cli health` |

> 🕒 **Automate it:** See [`docs/MACOS_QUICK_START.md`](../../../docs/MACOS_QUICK_START.md) for how to schedule JobSentinel with Calendar alerts or `launchd`.

---

## 🆘 Troubleshooting (Friendly Fixes)

| Problem | Fix |
|---------|-----|
| "`setup.command` can't be opened because it is from an unidentified developer" | Control-click the file → Open → Open. This is Gatekeeper doing its job. |
| "Permission denied" when double-clicking scripts | Right-click the script → Open With → Terminal once, or run `chmod +x *.command` inside the folder. |
| Python not found during setup | Install Python via [python.org](https://www.python.org/downloads/) or run `brew install python@3.12`. Then double-click `setup.command` again. |
| Setup stuck downloading dependencies | Check Wi‑Fi, then re-run `setup.command`. The wizard resumes where it left off. |
| GUI fails to launch | Run `JobSentinel Health Check.command` to see diagnostics. |

Need more? Head to [`docs/MACOS_TROUBLESHOOTING.md`](../../../docs/MACOS_TROUBLESHOOTING.md) or open a ticket at [github.com/cboyd0319/JobSentinel/issues](https://github.com/cboyd0319/JobSentinel/issues).

---

## 📂 Files in This Folder

| File | Purpose |
|------|---------|
| `setup.command` | One-click macOS installer launcher |
| `setup.sh` | Under-the-hood shell script that prepares the environment |
| `launch-gui.command` | Double-click helper that opens the GUI without typing |
| `launch-gui.sh` | Script invoked by the command helper |
| `check-python.command` | Quick diagnostic to confirm Python is installed |

---

## 📚 More macOS Resources

- [`docs/MACOS_QUICK_START.md`](../../../docs/MACOS_QUICK_START.md) — complete beginner walkthrough with screenshots
- [`docs/MACOS_TROUBLESHOOTING.md`](../../../docs/MACOS_TROUBLESHOOTING.md) — fix common hiccups fast
- [`docs/MACOS_DEPLOYMENT_CHECKLIST.md`](../../../docs/MACOS_DEPLOYMENT_CHECKLIST.md) — teams/IT-ready validation checklist
- [`docs/QUICKSTART.md`](../../../docs/QUICKSTART.md) — general JobSentinel overview

Happy hunting! 🎯
