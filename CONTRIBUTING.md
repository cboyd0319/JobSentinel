# Contributing

Thanks for helping make JobSentinel better. This repo uses tight docs hygiene and fast feedback.

## Dev setup

```bash
# Clone and environment
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3.12 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e .[dev,resume]

# Install Playwright browsers
playwright install chromium

# Copy config templates
cp config/user_prefs.example.json config/user_prefs.json
cp .env.example .env
```

## Repo structure

- `deploy/common/app/src/jsa/` - Core application (CLI, web UI, DB)
- `deploy/common/app/sources/` - Job board scrapers
- `deploy/common/app/domains/` - Domain logic (ATS, ML, LLM, resume)
- `deploy/common/app/utils/` - Shared utilities
- `deploy/common/tests/` - Tests

## Lint & test

```bash
make fmt       # black
make lint      # ruff
make type      # mypy
make test      # pytest tests/
make cov       # coverage ≥85%
make security  # bandit
```

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`

## PR checklist

- [ ] Tests pass (`make test`)
- [ ] Lint/type checks pass
- [ ] Coverage ≥85%
- [ ] Security scan clean
- [ ] Config changes documented
- [ ] No secrets committed

## Questions?

Open a Discussion or Issue:
https://github.com/cboyd0319/JobSentinel

