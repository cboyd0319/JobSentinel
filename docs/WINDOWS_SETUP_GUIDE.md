# Windows setup guide

This walkthrough targets Windows 11. I recommend creating a dedicated local user so the scraper runs with minimal rights, but you can install it under your main profile if you just want a quick test.

## Option 1: Dedicated service user (safer)

1. Open PowerShell **as Administrator** and create the user:

```powershell
$password = Read-Host "Password for jobscraper user" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
net user jobscraper "$plain" /add /passwordchg:no /fullname:"Job Scraper Service"
net localgroup Users jobscraper /add
```

1. Sign out, pick *Other user*, and log in as `jobscraper` using the password you just set.
1. Open PowerShell (regular window, not admin) and run the installer:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; \
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
  irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

The script installs Python in your profile, creates a virtualenv, grabs Playwright, sets up scheduled tasks, and drops shortcuts on the desktop. Expect it to run for 10–20 minutes.

## Option 2: Install under your main account

If you’d rather skip the extra user, stay on your profile, open PowerShell **as Administrator**, and run the same command as above. The scheduled tasks will run as your account, so keep that in mind if you change your password later.

## Configure the app

After the script finishes you’ll have a `job-private-scraper-filter` directory on your desktop (or wherever you pointed it). Tweak two files:

1. `.env` — add Slack webhooks or SMTP details if you want alerts.
1. `config/user_prefs.json` — list the job boards, titles, locations, and score thresholds you care about.

Run a quick smoke test while you’re still in the venv:

```powershell
python -m src.agent --mode health
python -m src.agent --mode test
```

## Scheduled tasks

The installer creates two tasks:

- `JobScraperPoll` runs every 15 minutes and calls `python -m src.agent --mode poll`
- `JobScraperDigest` runs daily at 9am for the email summary

Open **Task Scheduler** if you want to change the cadence or disable either one.

## Troubleshooting notes

- If Playwright complains about missing dependencies, rerun `python -m playwright install-deps` from the project folder.
- Permission warnings usually mean `.env` is writable by other users. Right-click → Properties → Security → restrict it to your account.
- When in doubt, re-run the setup script; it’s idempotent and will refresh missing pieces.

Ping me via issues if you hit something odd — Windows edge cases are always welcome.
