# JobSentinel macOS Quick Start Guide

Welcome! This quick start walks a non-technical macOS user from download ➜ first job search in less than 10 minutes.

---

## 1. Download & Open JobSentinel

1. Download the latest release ZIP from GitHub and double-click to extract.
2. Open the extracted **JobSentinel** folder.
3. Inside you will see a `deploy/local/macos` folder with friendly `.command` files.

> ℹ️ **What is a `.command` file?** It is a Mac-friendly shortcut you can double-click just like an app. Terminal will open automatically and close when the script finishes.

---

## 2. Run the One-Click Installer

1. Double-click **`setup.command`**.
2. When macOS Gatekeeper asks if you are sure, choose **Open**.
3. Relax while JobSentinel:
   - Checks your macOS version, disk space, and internet connection.
   - Creates an isolated `.venv` folder so your system Python stays untouched.
   - Installs Python dependencies and Playwright Chromium.
   - Guides you through the JobSentinel preference wizard (keywords, salary, locations, notification settings).
   - Runs an automatic health check.
4. When finished, Terminal will confirm success and place several new shortcuts on your Desktop.

> ✅ **No technical knowledge needed.** Every prompt explains what to do in plain language, and you can cancel at any time.

---

## 3. Launch the Visual Control Panel

1. On your Desktop double-click **`JobSentinel Launcher.command`**.
2. The graphical launcher opens with big buttons for the most common tasks:
   - **Start Job Search** — run a full crawl now.
   - **Open Dashboard** — launch <http://localhost:5000> in your browser.
   - **Health Check** — verify everything is running smoothly.
   - **Update Preferences** — reopen the guided setup wizard.
3. Leave the launcher open or close it when finished — your data always stays on your Mac.

---

## 4. Automate Daily Runs (Optional)

### Option A: Calendar Reminder

1. Open the macOS **Calendar** app and create a new event at the time you want JobSentinel to run.
2. Under **Alert**, choose **Custom…** → **Open file** → select `~/Desktop/Run JobSentinel.command`.
3. Calendar will now open the command automatically at the scheduled time.

### Option B: `launchd` (power users)

1. Open **TextEdit**, set it to plain text, and paste the following (update paths as needed):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.jobsentinel.app</string>
    <key>ProgramArguments</key>
    <array>
      <string>/Users/you/JobSentinel/.venv/bin/python3</string>
      <string>-m</string>
      <string>jsa.cli</string>
      <string>run-once</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>9</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/you/JobSentinel</string>
    <key>StandardOutPath</key>
    <string>/tmp/jobsentinel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/jobsentinel.err</string>
  </dict>
</plist>
```

2. Save as `~/Library/LaunchAgents/com.jobsentinel.app.plist`.
3. Run `launchctl load ~/Library/LaunchAgents/com.jobsentinel.app.plist` once.
4. JobSentinel will now run daily at 9:00 AM.

---

## 5. Troubleshooting Essentials

| Symptom | Quick fix |
|---------|-----------|
| Gatekeeper warning about an unidentified developer | Control-click the `.command` file → **Open**. |
| Python not found | Install from [python.org](https://www.python.org/downloads/) or `brew install python@3.12`, then rerun `setup.command`. |
| Setup fails mid-way | Simply double-click `setup.command` again — it is safe to rerun and will pick up where it left off. |
| GUI does not open | Double-click `JobSentinel Health Check.command` for diagnostics or run `.venv/bin/python -m jsa.cli health`. |

> 📄 Need deeper help? Check [`docs/MACOS_TROUBLESHOOTING.md`](./MACOS_TROUBLESHOOTING.md) for detailed fixes.

---

## 6. Next Steps

- Review [`docs/MACOS_DEPLOYMENT_CHECKLIST.md`](./MACOS_DEPLOYMENT_CHECKLIST.md) if you are rolling JobSentinel out to a team or company.
- Explore the main [`docs/QUICKSTART.md`](./QUICKSTART.md) for multi-platform details.
- Star ⭐ the project on GitHub and share your success stories!

Happy job hunting! 🎉
