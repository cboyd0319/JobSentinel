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
make fmt  # or: black src tests && ruff check --fix src tests

# Lint
make lint  # or: ruff check src tests

# Type check
make type  # or: mypy src/jsa

# Run tests
make test  # or: pytest tests/

# Coverage
make cov  # or: pytest --cov=src/jsa --cov-report=html tests/

# Security scan
make security  # or: bandit -r src/jsa src/domains
```

## Commit style

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `chore:` Maintenance (deps, config)
- `refactor:` Code restructuring without behavior change
- `test:` Test additions or fixes

Keep PRs narrowly scoped. Include before/after evidence (logs, screenshots, test output).

**Examples:**
```
feat: add LinkedIn scraper support
fix: handle SSL errors in Reed API client
docs: update quickstart with Python 3.13 requirement
chore: bump playwright to 1.45
```

## PR checklist

Before submitting:
- [ ] Quickstart works on a clean machine (test in fresh venv)
- [ ] Updated README/config tables if adding features
- [ ] Added/updated tests (target: 85% coverage for new code)
- [ ] Security implications noted (secrets/permissions)
- [ ] All links valid, CI passing
- [ ] Ran `make fmt lint type test` locally

**Note:** See [.github/workflows/README.md](../../.github/workflows/README.md) for details on CI/CD workflows and local testing.

## Testing guidelines

**Unit tests:** Test business logic in isolation. Mock external dependencies.

**Integration tests:** Test interactions with databases, APIs (use test fixtures).

**End-to-end tests:** Test full user flows (validate config → scrape → score → alert).

**Test file naming:**
- `test_*.py` for unit tests
- `test_*_integration.py` for integration tests
- `test_*_e2e.py` for end-to-end tests

## Code style

**Python:**
- Black formatter (line length: 100)
- Ruff linter (target: py313)
- Mypy strict mode for `src/jsa`
- Type hints on all public functions
- Docstrings for modules, classes, and public functions

**Imports:** Use absolute imports. Group: stdlib → third-party → local.

**Naming:**
- Classes: `PascalCase`
- Functions/variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_leading_underscore`

## Project structure

```
JobSentinel/
├── src/
│   ├── jsa/           # Typed core package
│   │   ├── cli.py     # CLI entry point
│   │   ├── config.py  # Configuration facade
│   │   ├── db.py      # Database facade
│   │   ├── logging.py # Logging facade
│   │   └── web/       # Flask app factory + blueprints
│   └── domains/       # Domain models
├── sources/           # Job source scrapers
├── matchers/          # Scoring rules
├── notify/            # Alert integrations (Slack, email)
├── config/            # Configuration files
├── tests/             # Test suite
├── docs/              # Documentation
└── scripts/           # Utility scripts (installer, etc.)
```

## Documentation

**README:** Keep under 5 minutes to read. Offload deep dives to `docs/`.

**Essential Guides:**
- [BEST_PRACTICES.md](../BEST_PRACTICES.md) - Production-grade coding standards (architecture, security, testing, observability)
- [API_INTEGRATION_GUIDE.md](../API_INTEGRATION_GUIDE.md) - Complete guide for adding new job board integrations
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Production deployment, monitoring, and operations

**Documentation Updates Required:**
- Update relevant docs when adding features or changing behavior
- Add code examples to `examples/` directory for new integrations
- Update CHANGELOG.md with all user-facing changes
- Keep inline documentation up-to-date

**Docstrings:** Follow Google style:
```python
def scrape_jobs(source: str, config: dict[str, Any]) -> list[Job]:
    """Scrape jobs from a configured source.

    Args:
        source: Source identifier (e.g., 'reed', 'jobswithgpt')
        config: Source-specific configuration

    Returns:
        List of scraped Job objects

    Raises:
        ScraperError: If scraping fails after retries
    """
```

**ADRs (Architecture Decision Records):** For significant changes, create `docs/adr/NNN-title.md` with:
- Context: What's the issue?
- Decision: What did you decide?
- Consequences: What are the tradeoffs?

## Releasing

Maintainers only:
1. Update `CHANGELOG.md` with release notes
2. Bump version in `pyproject.toml`
3. Tag with SemVer: `git tag v0.2.0 && git push --tags`
4. GitHub Actions will build and publish artifacts
5. Create GitHub Release with changelog excerpt

## Security

**Never commit secrets.** Use `.env` for local development, environment variables for CI/CD.

**Dependency updates:** Run `pip-audit` regularly. Update `pyproject.toml` and test.

**Vulnerability disclosure:** See [SECURITY.md](SECURITY.md).

## Getting help

- **Bug reports:** Use GitHub Issues, include reproduction steps
- **Feature requests:** Open an issue with "feature:" prefix, explain use case
- **Questions:** Start a GitHub Discussion or ask in Issues

## Code of Conduct

Be respectful. No harassment, discrimination, or personal attacks. Assume good intent. Disagreements are fine; disrespect is not.

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). Report incidents to conduct@yourdomain.tld.

## License

By contributing, you agree your contributions will be licensed under the MIT License.
