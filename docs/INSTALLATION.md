# Installation

Short, practical installation steps for the platforms I care about. If something doesn't work, open an issue and I'll try to help.

Priorities
- ✅ Ease of use — minimal steps, predictable defaults
- ✅ Security — least privilege, secrets handled properly

## Recommended: Google Cloud Run (free tier, fully automated)

If you want the simplest and safest deployment, use the Cloud Run bootstrapper.
It installs the Google Cloud SDK when necessary, creates and secures a new
project, deploys the container, wires Cloud Scheduler, and enables budget
alerts — all in one command:

```bash
python3 -m cloud.bootstrap --provider gcp
```

> 💡 On Windows, replace `python3` with `python` if the alias is not available.

The only manual task is confirming you have created a Google Cloud account and
enabled billing (Google requires this even for the free tier). The script pauses
until you confirm, then continues automatically.

## Local installation

Prereqs
- Python 3.12.10
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
python3 -m playwright install chromium
copy .env.example .env
copy config/user_prefs.example.json config/user_prefs.json
# Edit .env and config/user_prefs.json
```

macOS / Linux

```bash
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m playwright install chromium
cp .env.example .env
cp config/user_prefs.example.json config/user_prefs.json
# Edit .env and config/user_prefs.json
```

Post-install

- Edit `.env` and `config/user_prefs.json` to your liking.
- Test basic functionality: `python3 -m src.agent --mode health`
- Test notifications: `python3 -m src.agent --mode test`

Automation

Windows: the setup script can create scheduled tasks for you.

macOS/Linux: use `crontab -e` to add something like:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/job-private-scraper-filter && .venv/bin/python3 -m src.agent --mode poll

# Daily digest at 9 AM
0 9 * * * cd /path/to/job-private-scraper-filter && .venv/bin/python3 -m src.agent --mode digest
```

Troubleshooting (quick)
- Python not found: try `python3` or add Python to PATH
- Permission errors: make sure your user can write to the project folder
- Playwright issues: run `python3 -m playwright install-deps` and retry

Updating

```bash
git pull origin main
pip install -r requirements.txt --upgrade
python3 -m playwright install chromium
```

Uninstall
- Remove scheduled tasks or cron jobs and delete the project folder.

See the `docs/` folder for more details.
