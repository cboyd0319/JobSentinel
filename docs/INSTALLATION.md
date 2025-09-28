# Installation

Short, practical installation steps for the platforms I care about. If something doesn't work, open an issue and I'll try to help.

Prereqs
- Python 3.12+
- Git
- Internet (for dependencies and Playwright)

Windows (quick)

Either run the setup script or follow the manual steps below.

Automated (one-liner):

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/setup_windows.ps1" | iex
```

Manual (if you prefer):

```powershell
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m playwright install chromium
copy .env.example .env
copy user_prefs.example.json user_prefs.json
# Edit .env and user_prefs.json
```

macOS / Linux

```bash
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
cp user_prefs.example.json user_prefs.json
# Edit .env and user_prefs.json
```

Post-install

- Edit `.env` and `user_prefs.json` to your liking.
- Test basic functionality: `python agent.py --mode health`
- Test notifications: `python agent.py --mode test`

Automation

Windows: the setup script can create scheduled tasks for you.

macOS/Linux: use `crontab -e` to add something like:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/job-private-scraper-filter && .venv/bin/python agent.py --mode poll

# Daily digest at 9 AM
0 9 * * * cd /path/to/job-private-scraper-filter && .venv/bin/python agent.py --mode digest
```

Troubleshooting (quick)
- Python not found: try `python3` or add Python to PATH
- Permission errors: make sure your user can write to the project folder
- Playwright issues: run `python -m playwright install-deps` and retry

Updating

```bash
git pull origin main
pip install -r requirements.txt --upgrade
python -m playwright install chromium
```

Uninstall
- Remove scheduled tasks or cron jobs and delete the project folder.

See the `docs/` folder for more details.
