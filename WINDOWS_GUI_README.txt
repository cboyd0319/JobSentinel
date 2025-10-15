========================================================================
                       JobSentinel for Windows
                   AI-Powered Job Search Automation
========================================================================

VERSION: 0.6.1
PLATFORM: Windows 11+ (build 22000+)
REQUIREMENTS: Python 3.12+

------------------------------------------------------------------------
QUICK START (First Time Users)
------------------------------------------------------------------------

1. Make sure Python 3.12+ is installed
   - Test: Open PowerShell and type: python --version
   - If not installed: https://www.python.org/downloads/
   - IMPORTANT: Check "Add Python to PATH" during install!

2. Run setup (CHOOSE ONE):
   
   OPTION A: Double-click "deployments/windows/local/setup-windows.bat"
   OPTION B: Right-click "deployments/windows/local/setup-windows.ps1" -> Run with PowerShell
   
   This will:
   - Check your system (30 seconds)
   - Install dependencies (3-5 minutes)
   - Guide you through configuration
   - Create desktop shortcuts
   - Verify everything works

3. Start using JobSentinel:
   
   EASIEST: Double-click "deployments/windows/local/launch-gui.bat" (graphical interface)
   OR: Use desktop shortcuts created during setup
   OR: Use command line (see below)

------------------------------------------------------------------------
USING THE GUI (Graphical Interface)
------------------------------------------------------------------------

Double-click: "deployments/windows/local/launch-gui.bat"

The GUI window has these buttons:

🚀 Start JobSentinel    - Start the API server
⏹️ Stop JobSentinel     - Stop the API server
🌐 Open Web UI          - Open dashboard in browser
⚙️ Setup Wizard         - Change your preferences
📊 Run Job Scraper      - Search for jobs once
🔧 Edit Configuration   - Advanced settings
📧 Test Email Alerts    - Send test email
💾 Backup Data          - Save your data
❓ Help & Docs          - Open documentation

STATUS INDICATORS:
✅ = Working / Ready
⚠️ = Warning / Not configured
❌ = Error / Not working
⚫ = Inactive / Not running

------------------------------------------------------------------------
COMMAND LINE REFERENCE
------------------------------------------------------------------------

Open PowerShell in this folder, then run:

SETUP & CONFIGURATION:
    python -m jsa.cli setup              # Interactive setup wizard
    python -m jsa.cli config-validate    # Validate your config

RUN JOB SEARCHES:
    python -m jsa.cli run-once           # Search for jobs once
    python -m jsa.cli run-once --dry-run # Test mode (no alerts)

WEB INTERFACES:
    python -m jsa.cli web --port 5000    # Legacy Flask UI
    python -m jsa.cli api --port 8000    # Modern FastAPI + docs

DIAGNOSTICS:
    python -m jsa.cli health             # Check system health
    python -m jsa.cli diagnostic         # Full diagnostic report

DATA MANAGEMENT:
    python -m jsa.cli backup create      # Create backup
    python -m jsa.cli backup list        # List backups
    python -m jsa.cli backup restore     # Restore from backup
    python -m jsa.cli privacy            # Privacy dashboard

DATABASE:
    python -m jsa.cli db-optimize        # Optimize database

------------------------------------------------------------------------
IMPORTANT FILES & FOLDERS
------------------------------------------------------------------------

deployments/windows/local/launch-gui.bat     Your main launcher (double-click this!)
deployments/windows/local/setup-windows.bat  First-time setup (run once)
config/user_prefs.json                       Your job search preferences
data/jobs.sqlite            Your job database (SQLite)
.env                        Email/API credentials (create during setup)
logs/jobsentinel.log        Activity log
docs/                       All documentation

------------------------------------------------------------------------
CONFIGURATION
------------------------------------------------------------------------

Your preferences are in: config/user_prefs.json

To change them:
    METHOD 1: Run setup wizard again (python -m jsa.cli setup)
    METHOD 2: Edit file with Notepad (right-click -> Edit)
    METHOD 3: Use GUI "Configure JobSentinel" button

Example configuration:
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "New York"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  }
}

------------------------------------------------------------------------
EMAIL ALERTS SETUP
------------------------------------------------------------------------

JobSentinel can send you email alerts for high-scoring jobs!

Gmail Setup (Most Common):
1. Enable 2-Factor Authentication on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. During setup, use:
   - Email: your-email@gmail.com
   - Password: [16-character app password]

Outlook/Hotmail Setup:
1. Enable 2-Factor Authentication
2. Generate App Password: https://account.microsoft.com/security
3. Use App Password in setup

Test your email:
    python -m jsa.cli fix --test-email

------------------------------------------------------------------------
DESKTOP SHORTCUTS
------------------------------------------------------------------------

Setup creates these shortcuts on your Desktop:

- Run JobSentinel          (one-time job search)
- Configure JobSentinel    (change preferences)
- JobSentinel Dashboard    (open web UI)
- JobSentinel Health Check (verify system)

If shortcuts didn't create:
    python -m jsa.cli fix --create-shortcuts

------------------------------------------------------------------------
TROUBLESHOOTING
------------------------------------------------------------------------

Problem: "Python not found"
Solution: Install Python 3.12+ from python.org
          Check "Add Python to PATH" during install!

Problem: "ModuleNotFoundError"
Solution: Run: python -m pip install -e .

Problem: GUI doesn't open
Solution: tkinter might be missing
          Reinstall Python from python.org (not Microsoft Store)
          During install, check "tcl/tk and IDLE"

Problem: Email test fails
Solution: Use App Password (not regular password)
          See "EMAIL ALERTS SETUP" above

Problem: No jobs found
Solution: Check your keywords and sources in config
          Try broader search terms
          Lower salary minimum

For more help, see:
    docs/WINDOWS_TROUBLESHOOTING.md

Or run diagnostic:
    python -m jsa.cli diagnostic > diagnostic.txt

------------------------------------------------------------------------
PRIVACY & SECURITY
------------------------------------------------------------------------

✅ 100% Local - All data stays on YOUR computer
✅ 100% Private - No telemetry, no tracking
✅ Zero Admin Rights - Works without administrator access
✅ Open Source - Code is public, auditable

Verify privacy anytime:
    python -m jsa.cli privacy

Your data is in:
    data/jobs.sqlite        (job database)
    config/user_prefs.json  (your preferences)
    .env                    (your email/API credentials)

To uninstall, just delete this folder (backup first!):
    python -m jsa.cli backup create
    cd ..
    rmdir /s JobSentinel

------------------------------------------------------------------------
WHERE YOUR DATA IS STORED
------------------------------------------------------------------------

Everything is in this folder:

JobSentinel/
├── config/user_prefs.json   <- Your job preferences
├── data/jobs.sqlite          <- All found jobs
├── .env                      <- Email/API secrets
├── logs/jobsentinel.log      <- Activity log
└── backups/                  <- Your backups

NEVER leaves your computer unless YOU configure email alerts!

------------------------------------------------------------------------
PERFORMANCE & DISK SPACE
------------------------------------------------------------------------

Typical usage:
- Disk: 50-500 MB (grows with job history)
- Memory: 200-500 MB when running
- CPU: <10% average
- Network: Only when searching for jobs

Clean up old jobs:
    python -m jsa.cli db-optimize --vacuum

------------------------------------------------------------------------
AUTOMATION (Advanced)
------------------------------------------------------------------------

Want JobSentinel to run automatically every day?

Use Windows Task Scheduler:
1. Search "Task Scheduler" in Start menu
2. Create Basic Task
3. Name: "JobSentinel Daily Search"
4. Trigger: Daily at 9:00 AM
5. Action: Start a program
6. Program: python
7. Arguments: -m jsa.cli run-once
8. Start in: C:\Path\To\JobSentinel

Now it runs automatically every morning!

------------------------------------------------------------------------
DOCUMENTATION
------------------------------------------------------------------------

Quick start:       docs/WINDOWS_QUICK_START.md
Complete guide:    docs/BEGINNER_GUIDE.md
Troubleshooting:   docs/WINDOWS_TROUBLESHOOTING.md
Deployment:        docs/DEPLOYMENT_GUIDE.md
All commands:      docs/DOCUMENTATION_INDEX.md

Or visit: https://github.com/cboyd0319/JobSentinel

------------------------------------------------------------------------
SUPPORT
------------------------------------------------------------------------

Need help?
1. Check docs/WINDOWS_TROUBLESHOOTING.md
2. Run: python -m jsa.cli health
3. Run: python -m jsa.cli diagnostic
4. Search: https://github.com/cboyd0319/JobSentinel/issues
5. Create issue: https://github.com/cboyd0319/JobSentinel/issues/new

------------------------------------------------------------------------
LICENSE & CREDITS
------------------------------------------------------------------------

License: MIT
Author: Chad Boyd (@cboyd0319)
Repository: https://github.com/cboyd0319/JobSentinel

Free to use, modify, and distribute.
Keep the LICENSE file and attribution.

------------------------------------------------------------------------
VERSION INFORMATION
------------------------------------------------------------------------

JobSentinel: 0.6.1
Python Required: 3.12+
Windows Required: 11 (build 22000+)
Released: October 2025

Check for updates: https://github.com/cboyd0319/JobSentinel/releases

------------------------------------------------------------------------

Happy job hunting! 🚀

Questions? https://github.com/cboyd0319/JobSentinel/issues

========================================================================
