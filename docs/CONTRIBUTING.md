# Contributing to JobSentinel

Thank you for your interest in contributing to JobSentinel! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Be respectful, constructive, and professional in all interactions.

## Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/JobSentinel.git
   cd JobSentinel
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/cboyd0319/JobSentinel.git
   ```

## Development Setup

### Prerequisites

- Python 3.11 or higher
- Git
- (Optional) Playwright browsers for scraping

### Setup Steps

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -e .[dev,resume,mcp]

# 3. Install Playwright browsers (optional)
playwright install chromium

# 4. Setup pre-commit hooks
pip install pre-commit
pre-commit install

# 5. Copy environment file
cp .env.example .env
# Edit .env with your API keys
```

### Verify Installation

```bash
# Run tests
pytest

# Check code style
ruff check .
black --check .

# Check types
mypy src/
```

## Code Standards

We follow strict code quality standards. See [docs/improvements/code-standards-compliance.md](docs/improvements/code-standards-compliance.md) for details.

### Key Standards

- **PEP 8** - Python style guide (enforced by ruff)
- **PEP 484** - Type hints required for all functions
- **PEP 257** - Docstrings required for all public functions
- **Security** - No hardcoded secrets, proper input validation
- **Testing** - 80% minimum code coverage target

### Pre-commit Hooks

Pre-commit hooks automatically check your code before committing:

```bash
# Install hooks (once)
pre-commit install

# Run manually
pre-commit run --all-files

# Skip hooks (not recommended)
git commit --no-verify
```

Hooks check:
- Ruff linting and formatting
- Type hints (mypy)
- Security issues (bandit)
- Trailing whitespace
- File syntax (YAML, JSON, TOML)
- Secret detection

### Code Style

```python
# ✅ GOOD: Type hints, docstring, descriptive names
def fetch_jobs(url: str, max_results: int = 10) -> list[dict]:
    """Fetch job listings from a URL.

    Args:
        url: The URL to scrape
        max_results: Maximum number of jobs to return

    Returns:
        List of job dictionaries with title, company, location

    Raises:
        ValueError: If URL is invalid
    """
    if not url.startswith(("http://", "https://")):
        raise ValueError(f"Invalid URL: {url}")

    # Implementation...
    return jobs


# ❌ BAD: No types, no docstring, unclear naming
def get_stuff(u, n=10):
    if not u.startswith("http"):
        return []
    return data
```

### Security Guidelines

- ❌ Never commit secrets, API keys, or passwords
- ✅ Use `.env` files for configuration
- ✅ Validate all user input
- ✅ Use parameterized queries (SQLAlchemy)
- ✅ Sanitize data before logging
- ✅ Use SRI attributes for CDN resources
- ✅ Add CSP headers to web pages

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `security/description` - Security fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

Example: `feature/add-linkedin-scraper`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```bash
feat(scrapers): add LinkedIn job scraper

fix(database): resolve race condition in concurrent writes

docs(readme): update installation instructions

security(templates): add SRI attributes to CDN resources
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# Edit files...

# 3. Run tests
pytest

# 4. Check code quality
pre-commit run --all-files

# 5. Commit changes
git add .
git commit -m "feat: add my feature"

# 6. Push to your fork
git push origin feature/my-feature

# 7. Create pull request on GitHub
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov=utils --cov-report=html

# Run specific test file
pytest tests/unit/test_scraper.py

# Run specific test
pytest tests/unit/test_scraper.py::test_fetch_jobs

# View coverage report
open htmlcov/index.html
```

### Writing Tests

```python
# tests/unit/test_example.py
import pytest
from sources.job_scraper import fetch_jobs


def test_fetch_jobs_success():
    """Test successful job fetching."""
    jobs = fetch_jobs("https://example.com/jobs")

    assert len(jobs) > 0
    assert "title" in jobs[0]
    assert "company" in jobs[0]


def test_fetch_jobs_invalid_url():
    """Test error handling for invalid URLs."""
    with pytest.raises(ValueError, match="Invalid URL"):
        fetch_jobs("not-a-url")


@pytest.mark.asyncio
async def test_async_fetch():
    """Test async job fetching."""
    jobs = await async_fetch_jobs("https://example.com/jobs")
    assert isinstance(jobs, list)
```

### Test Coverage Requirements

- Minimum 80% coverage for new code
- All public functions must have tests
- Edge cases and error conditions must be tested
- Security-critical code requires 95%+ coverage

## Submitting Changes

### Before Submitting

- [ ] All tests pass (`pytest`)
- [ ] Code style checks pass (`pre-commit run --all-files`)
- [ ] Type hints added (`mypy src/`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (if user-facing change)
- [ ] No merge conflicts with `main`

### Pull Request Process

1. **Create PR** with clear title and description
2. **Link related issues** using "Fixes #123" or "Closes #456"
3. **Wait for review** - address feedback promptly
4. **CI checks must pass** - all tests and quality checks
5. **Approval required** - at least one maintainer approval
6. **Squash and merge** - keep history clean

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Getting Help

- **Documentation:** See `/docs/` directory
- **Issues:** Check [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
- **Analysis:** See `/docs/improvements/` for code analysis
- **Standards:** See `/docs/improvements/code-standards-compliance.md`

## Recognition

Contributors will be recognized in:
- `CHANGELOG.md` for each release
- GitHub contributors page
- Project README (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Questions?** Open an issue or reach out to the maintainers.

**Thank you for contributing to JobSentinel! 🚀**
