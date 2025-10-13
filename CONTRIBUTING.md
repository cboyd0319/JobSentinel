# Contributing

Thanks for helping make JobSentinel better. This repo uses tight docs hygiene and fast feedback.

## Dev setup

```bash
# Clone and environment
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3.13 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -e .[dev,resume]

# Install Playwright browsers
playwright install chromium

# Copy config templates
cp config/user_prefs.example.json config/user_prefs.json
cp .env.example .env
```

## Lint & test

```bash
# Format code
make fmt  # or: black .

# Lint
make lint  # or: ruff check src/jsa tests/unit_jsa

# Type check
make type  # or: mypy

# Run tests
make test  # or: pytest tests/

# Coverage (85% minimum)
make cov  # or: pytest --cov=src/jsa --cov-report=term-missing --cov-fail-under=85

# Security scan
make security  # or: bandit -r src/jsa
```

## Commit style

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `chore:` Maintenance (deps, config)
- `test:` Test additions/fixes
- `refactor:` Code restructuring without behavior change

Example: `feat: add Reed API scraper with rate limiting`

## Pull requests

**Before submitting:**
- [ ] Tests pass (`make test`)
- [ ] Lint passes (`make lint`)
- [ ] Type check passes (`make type`)
- [ ] Coverage ≥85% (`make cov`)
- [ ] Security scan clean (`make security`)
- [ ] Config changes documented with defaults
- [ ] No secrets committed

**PR description must include:**
- Intent: What problem does this solve?
- Changes: What did you modify? (keep it brief)
- Risk: What could break? (migrations, config changes, etc.)
- Test coverage: What tests did you add/update?

## What good looks like

**Code:**
- Plainspoken names (`fetch_jobs`, not `leverageJobAcquisition`)
- Type hints on public functions
- Docstrings on modules and public APIs (Google style)
- Error handling with clear messages
- Logging at appropriate levels (DEBUG, INFO, WARNING, ERROR)

**Tests:**
- One assertion per test when possible
- Clear test names (`test_scraper_respects_rate_limit`)
- Use fixtures for setup/teardown
- Mock external APIs

**Docs:**
- Answer first, rationale second
- Runnable code blocks with pinned versions
- Tables for configs and comparisons
- Active voice, present tense
- No buzzwords (ban: leverage, utilize, seamlessly, cutting-edge)

## Docs ownership

Maintainers review PRs within 3 business days. For urgent fixes, tag `@cboyd0319`.

Docs-only PRs need one maintainer approval. Code PRs need passing CI + one maintainer.

## Questions?

Open a [Discussion](https://github.com/cboyd0319/JobSentinel/discussions) or [Issue](https://github.com/cboyd0319/JobSentinel/issues/new/choose).
