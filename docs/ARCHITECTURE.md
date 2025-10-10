# Architecture (Post-Refactor Skeleton)

This refactor introduces a typed core package under `src/jsa` with a Flask app factory, blueprints, and a minimal CLI.

Key modules:
- `jsa.web.app` — `create_app()` factory; registers blueprints and sets secrets/CSRF
- `jsa.web.blueprints.*` — `main`, `skills`, `review`, `slack` routes split by concern
- `jsa.config` — typed facade in front of legacy `utils.config`
- `jsa.logging` — typed wrappers around `utils.structured_logging`
- `jsa.http.sanitization` — safe URL utilities
- `jsa.db` — typed facade over legacy database, with test override helper

Compatibility:
- `src/web_ui.py` remains as a thin shim importing the new app factory
- Legacy modules are left intact; new code depends on typed facades

Quality Gates:
- Root `pyproject.toml` configures ruff, mypy (strict for `src/jsa`), pytest
- `Makefile` adds `fmt`, `lint`, `type`, `cov`, and `mut` targets
- CI installs use `constraints/core.txt` for reproducible versions of core tools

Observability:
- Structured JSON logs via `jsa.logging.setup_logging()`
- Optional file logging with `JSA_LOG_FILE` env var (example: `JSA_LOG_FILE=data/logs/app.jsonl`)

Simplicity and Scope
- This refactor intentionally keeps the new core small and focused (app factory, a few facades, CLI).
- Legacy code remains intact. We avoid sweeping rewrites to keep iteration fast for a solo maintainer.
- New work should prefer `jsa.*` modules for typed correctness while preserving existing behavior elsewhere.
