# Contributing

Thanks for helping make JobSentinel better. This repo uses **tight docs hygiene** and **fast feedback**.

## Dev setup

```bash
# Clone and setup
git clone https://github.com/cboyd0319/JobSentinel.git
cd JobSentinel

# Create virtual environment
python3.13 -m venv .venv
source .venv/bin/activate  # Mac/Linux
# OR: .venv\Scripts\activate  # Windows

# Install dependencies
pip install -e ".[dev,test]"

# Docs tooling
npm i -g markdownlint-cli
```

## Lint & test

```bash
# Run tests
pytest tests/ -v

# Type check
mypy src/jsa/ --ignore-missing-imports

# Lint code
ruff check src/jsa/ tests/

# Format code
ruff format src/jsa/ tests/

# Lint docs
markdownlint "**/*.md"
```

## Commit style

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Keep PRs narrowly scoped
- Include before/after evidence (logs, screenshots)

**Examples:**
```
feat(cli): Add run-once command for manual job search
fix(scraper): Handle rate limiting gracefully
docs(readme): Update installation guide with Windows steps
```

## PR checklist

- [ ] Quickstart works on a clean machine
- [ ] Updated README/config tables as needed
- [ ] Added/updated tests (aim for >85% coverage)
- [ ] Security implications noted (secrets/permissions)
- [ ] All tests passing
- [ ] Documentation updated

## Code style

- **Python:** Follow PEP 8, use type hints
- **Docstrings:** Google style for functions
- **Line length:** 100 characters
- **Imports:** Sorted with isort

## Testing requirements

- Unit tests for all new functions
- Integration tests for CLI commands
- E2E tests for critical workflows (Playwright)
- Performance tests for scrapers

## Documentation requirements

- Update README if adding features
- Add docstrings to all public functions
- Update CHANGELOG.md with changes
- Keep docs concise (≤3 sentences per paragraph)

## Releasing

Maintainers only:

```bash
# Update version
bumpversion minor  # or major/patch

# Create release
git tag vX.Y.Z
git push origin vX.Y.Z

# GitHub Actions will:
# - Run full test suite
# - Build artifacts
# - Create GitHub release
# - Publish to PyPI (future)
```

## Questions?

- Open an issue with the `question` label
- Join discussions in GitHub Discussions
- Check the [FAQ](docs/FAQ.md)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful.
