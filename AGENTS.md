# Repository Guidelines

## Project Structure & Module Organization

I keep the core scraper in `src/` (look at `agent.py`, `database.py`, `web_ui.py`). Shared helpers live in `utils/`, job board adapters in `sources/`, notifications in `notify/`, and scoring logic in `matchers/`. Deployment and setup scripts sit in `scripts/`, cloud bootstrappers in `cloud/`, configs and linter settings in `config/`, web templates in `templates/`, and longer notes in `docs/`. Drop any sample data or fixtures in `data/`.

## Build, Test, and Development Commands

- `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` gets a clean environment ready.
- `python3 src/agent.py --mode health|poll|test` exercises the main CLI (health check, dry run, or notification test).
- `python3 src/web_ui.py` launches the Flask UI on `http://127.0.0.1:5000` if you want to poke around manually.
- `scripts/validate-cloud-config.sh gcp` and `scripts/deploy-cloud.sh --dry-run gcp` sanity check deployment changes.

## Coding Style & Naming Conventions

Stick with 4-space indentation, `snake_case` functions, and `PascalCase` classes. Run `black` (line length 120) and `isort` before committing. Lint with `flake8`, run `bandit -r . -x .venv --quiet` for security, and `mypy src/` when you touch type-heavy code. YAML files should pass `.yamllint.yml`, and new config JSON should match the layout in `config/user_prefs.example.json`.

## Testing Guidelines

Place automated tests in `tests/` and name them `test_*.py` so pytest finds them. Before opening a PR, run `python3 src/agent.py --mode health` and add unit tests around any new matchers or scrapers. Use `pytest tests/ -v` for regular runs and `pytest tests/ --cov=src --cov-report=term-missing` before merging bigger features. Skip committing coverage artifacts.

## Commit & Pull Request Guidelines

Keep commits small and write imperative subjects under 72 characters (e.g., `feat: add lever rate limiter`). Add a short body if extra context helps. In PRs, summarize what changed, list config updates, and mention the commands you ran. Flag security-sensitive tweaks, especially if they touch `cloud/`, secrets, or notification code paths.

## Security & Configuration Tips

Copy `.env.example` → `.env` and `config/user_prefs.example.json` → `config/user_prefs.json`, then fill secrets locally only. Run `scripts/precommit-security-scan.sh` before pushing so Safety and Bandit stay honest. When you update deployment scripts, note new environment variables or budget guards in the docs so others can follow along.
