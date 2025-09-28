# Troubleshooting

Quick steps I usually try when something goes wrong.

1. Run `python3 -m src.agent --mode health` to get a status report.
2. Check the latest logs: `tail -50 data/logs/scraper_*.log`

Common problems

- Python not found: try `python3` or add Python to PATH
- Permission issues: use a venv and check file permissions
- Playwright install fails: run `python3 -m playwright install-deps`

No jobs found?

- Check `config/user_prefs.json` and company URLs
- Broaden `title_allowlist` or remove restrictive filters for testing

Notification problems

- Slack: confirm `SLACK_WEBHOOK_URL` in `.env` and create a webhook if needed
- Email: use an app password for Gmail and verify SMTP settings

Scraping quirks

- Timeouts: increase `timeout_seconds` in `config/user_prefs.json` (try 60)
- JS-heavy pages: use the `generic_js` board type and ensure Playwright is installed

Advanced checks

- Enable debug logs by setting `LOG_LEVEL=DEBUG` in `.env` and watch `data/logs/`
- Test pieces of the system manually (config load, DB init, single scraper)

When reporting an issue

Include:
- OS and Python version
- A short description and steps to reproduce
- Health check output and recent log excerpts
- Redacted config (no secrets)

Where to get help

- File an issue on GitHub: https://github.com/cboyd0319/job-private-scraper-filter/issues
- Start a discussion if it's a feature request

That's it — if you hit something weird and want me to look, open an issue and I'll try to help when I can.
