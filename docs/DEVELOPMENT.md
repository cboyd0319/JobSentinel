# Development Guide

Here’s how I set the project up for day-to-day hacking and what I run before opening a pull request. Everything below assumes you already cloned the repo.

## Quick setup

To ensure a clean and reproducible development environment, we use Python virtual environments. If you use `direnv`, you can set it up to automatically activate the virtual environment when you enter the project directory.

1.  **Install `direnv` (if you don't have it):**
    *   macOS (Homebrew): `brew install direnv`
    *   Linux (apt): `sudo apt-get install direnv`
    *   Then, hook it into your shell (e.g., `echo 'eval "$(direnv hook bash)"' >> ~/.bashrc` or `~/.zshrc`)

2.  **Allow `.envrc`:** Once `direnv` is installed, navigate to the project root and run:
    ```bash
    direnv allow
    ```
    This will activate the virtual environment automatically.

3.  **Manual Virtual Environment Setup (if not using `direnv` or for initial setup):**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate      # Windows: .venv\Scripts\activate
    ```

4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    pip install black isort flake8 bandit safety mypy pytest
    ```

5.  **Initialize Configuration Files:**
    ```bash
    cp .env.example .env
    cp config/user_prefs.example.json config/user_prefs.json
    ```

6.  **Install Playwright Browsers:**
    ```bash
    python3 -m playwright install chromium --with-deps
    ```

I normally keep the virtual environment in place and reuse it between sessions. If Playwright gives you trouble, rerun the install command with `--with-deps` to pull system libraries.

## Project map

```text
├── deploy/         # User-facing installers (Windows, macOS, Linux)
├── src/            # CLI entry points and application logic
├── sources/        # Job board adapters
├── matchers/       # Scoring helpers
├── notify/         # Email and Slack integrations
├── utils/          # Shared helpers (config, logging, health checks)
├── scripts/        # Developer & security tooling
├── cloud/          # Cloud deployment logic (Python)
├── config/         # Sample config files and linter settings
├── templates/      # Web UI templates
└── docs/           # Extra guides like this one
```

## Everyday workflow

1. Branch from `main`
2. Make a focused change
3. Run the formatters and linters
4. Add or update tests if the behavior changed
5. Open a PR with the commands you ran

### Formatters and linting

```bash
black src/ utils/ sources/ notify/ matchers/
isort src/ utils/ sources/ notify/ matchers/
flake8 src/ utils/ sources/ notify/ matchers/
bandit -r . -x .venv --quiet
safety scan --project config/.safety-project.ini || true
mypy src/
```

`scripts/precommit-security-scan.sh` wraps the Safety and Bandit steps if you’d rather run one command.

### Quick runtime checks

```bash
python3 src/agent.py --mode health
python3 src/agent.py --mode test
python3 src/agent.py --mode poll   # optional dry run
python3 src/web_ui.py              # serves the Flask UI on localhost:5000
```

## Testing

I’m still building out the test suite, but pytest is wired up and discovers files named `test_*.py` under `tests/`.

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing
```

When adding new matchers or scrapers, please include unit tests where it makes sense. For web automation pieces, even a simple smoke test that hits a fixture helps.

## Cloud Deployment & Helpers

Cloud deployments are now handled by the OS-specific installers in the `deploy/` directory. These installers are the recommended way to deploy the application to GCP.

- **Windows:** `deploy/windows/install.ps1` (GUI Installer)
- **macOS/Linux:** `deploy/macos/install.sh` or `deploy/linux/install.sh`

For developers, the underlying engine scripts can be called directly for more control:

```powershell
# On Windows, using the PowerShell engine
cd deploy/windows
.\engine\Deploy-GCP.ps1 deploy -WhatIf
```

```bash
# On macOS/Linux, using the Python bootstrap
python3 cloud/bootstrap.py --dry-run
```

These commands make sure IAM bindings, secrets, and schedules line up before an actual deployment. They’re safe to run repeatedly.

## Adding a new job board

Create a scraper in `sources/`, register it in `sources/__init__.py`, and drop an example entry in `config/user_prefs.example.json` so others can follow your lead. Matching tests live in `tests/`.

```python
# sources/newboard.py
from sources.common import JobSource, Job

class NewBoardSource(JobSource):
    def scrape_jobs(self, company_url: str) -> list[Job]:
        # your logic here
        return []
```

Finally, update the docs if the user workflow changes. Keeping the README and INSTALLATION guide honest saves everyone time.
