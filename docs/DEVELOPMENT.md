# Development Guide

Here’s how I set the project up for day-to-day hacking and what I run before opening a pull request. Everything below assumes you already cloned the repo.

## Quick setup

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install black isort flake8 bandit safety mypy pytest
cp .env.example .env
cp config/user_prefs.example.json config/user_prefs.json
python3 -m playwright install chromium --with-deps
```

I normally keep the virtual environment in place and reuse it between sessions. If Playwright gives you trouble, rerun the install command with `--with-deps` to pull system libraries.

## Project map

```text
├── src/            # CLI entry points and application logic
├── sources/        # Job board adapters
├── matchers/       # Scoring helpers
├── notify/         # Email and Slack integrations
├── utils/          # Shared helpers (config, logging, health checks)
├── scripts/        # Installers, deployment flows, and security checks
├── cloud/          # Cloud bootstrapper code
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

## Cloud-specific helpers

```bash
scripts/validate-cloud-config.sh gcp
scripts/deploy-cloud.sh --dry-run gcp
scripts/enhanced-cost-monitor.py --provider gcp --check
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
