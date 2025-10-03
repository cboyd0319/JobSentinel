# Developer Guide

**Complete guide for contributors and developers.**

---

## Table of Contents

- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Adding Scrapers](#adding-scrapers)
- [Testing](#testing)
- [GitHub Actions](#github-actions)
- [Release Process](#release-process)

---

## Development Setup

### Prerequisites

- Python 3.11+ (3.12 or 3.13 recommended)
- Git
- Docker (optional - for testing containers)
- Node.js 18+ (optional - for MCP servers)

### Clone and Install

```bash
# Clone repository
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install -r requirements-dev.txt  # If exists

# Install pre-commit hooks
pip install pre-commit
pre-commit install
```

### Configuration

```bash
# Copy example config
cp config/user_prefs.example.json config/user_prefs.json

# Create .env file
cat > .env << EOF
REED_API_KEY=your_key_here
SLACK_WEBHOOK_URL=your_webhook_url
LOG_LEVEL=DEBUG
EOF
```

### Run Tests

```bash
# Python tests
pytest

# Pre-commit hooks (linting, security)
pre-commit run --all-files

# Type checking
mypy src/

# Security scan
bandit -r . -x ./.venv
```

---

## Architecture

### Project Structure

```
job-private-scraper-filter/
├── src/                    # Core application
│   ├── agent.py           # Main entry point
│   ├── matcher.py         # Job matching logic
│   └── ...
├── sources/               # Job board scrapers
│   ├── job_scraper.py    # Base scraper + registry
│   ├── jobswithgpt_scraper.py
│   ├── reed_mcp_scraper.py
│   └── ...
├── utils/                 # Shared utilities
│   ├── validators.py     # Input validation
│   ├── rate_limiter.py   # Rate limiting
│   ├── audit_log.py      # Audit logging
│   ├── cache.py          # Deduplication cache
│   └── ...
├── cloud/                 # Cloud deployment
│   ├── bootstrap.py      # GCP deployment script
│   └── providers/gcp/    # GCP-specific code
├── scripts/              # Utility scripts
│   ├── mcp-panic-button.sh
│   └── ...
├── docker/               # Docker configs
│   ├── mcp-sandbox.dockerfile
│   └── docker-compose.mcp.yml
├── .github/              # GitHub Actions
│   └── workflows/
├── config/               # Configuration
│   └── user_prefs.example.json
└── docs/                 # Documentation
```

### Core Components

#### 1. Agent (`src/agent.py`)
**Purpose:** Main orchestrator, CLI entry point.

**Responsibilities:**
- Parse CLI arguments
- Load configuration
- Coordinate scraping, filtering, matching
- Save results

**Key functions:**
```python
def main():
    """CLI entry point."""

async def scrape_jobs():
    """Scrape jobs from all enabled sources."""

async def filter_jobs(jobs):
    """Filter jobs by user preferences."""
```

#### 2. Scraper Registry (`sources/job_scraper.py`)
**Purpose:** Central registry for all job board scrapers.

**Pattern:** Registry + Factory

**Key classes:**
```python
class JobBoardScraper(ABC):
    """Base class for all scrapers."""
    @abstractmethod
    async def search(self, keywords, locations, **kwargs):
        pass

class JobBoardRegistry:
    """Registry of all available scrapers."""
    def register(self, scraper: JobBoardScraper):
        """Register a scraper."""

    def search_all(self, keywords, locations):
        """Search all registered scrapers."""
```

#### 3. Validators (`utils/validators.py`)
**Purpose:** Input validation with Pydantic schemas.

**Key models:**
- `JobSearchRequest` - Generic job search
- `ReedJobSearchRequest` - Reed API
- `JobSpySearchRequest` - JobSpy MCP
- `MCPServerConfig` - MCP server config

#### 4. Cache (`utils/cache.py`)
**Purpose:** Deduplication using LRU cache.

**Strategy:**
1. **Priority 1:** External ID (Greenhouse, Lever)
2. **Priority 2:** Normalized URL (tracking params removed)
3. **Priority 3:** Content fingerprint (company + title + description)

#### 5. Cloud Bootstrap (`cloud/bootstrap.py`)
**Purpose:** One-command GCP deployment.

**Features:**
- Project creation/selection
- Service enablement
- IAM configuration
- Cloud Run deployment
- Budget alerts
- Terraform backend

---

## Contributing

### Code Style

**Python:**
- PEP 8 compliant
- Black formatter (line length: 100)
- Type hints required
- Docstrings (Google style)

**Enforcement:**
```bash
# Format code
black . --line-length 100

# Check style
flake8 --max-line-length 100

# Type check
mypy src/
```

### Git Workflow

**Branching:**
- `main` - Stable releases
- `develop` - Integration branch (if used)
- `feature/name` - New features
- `fix/name` - Bug fixes

**Commits:**
```bash
# Format: <type>(<scope>): <subject>
git commit -m "feat(scrapers): add Indeed scraper"
git commit -m "fix(cache): resolve deduplication bug"
git commit -m "docs(readme): update installation steps"
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Pull Requests:**
1. Fork repository
2. Create feature branch
3. Make changes + tests
4. Run pre-commit hooks
5. Push and create PR
6. Address review comments
7. Squash and merge

### Code Review Checklist

- [ ] Tests pass (`pytest`)
- [ ] Pre-commit hooks pass
- [ ] Security scan clean (`bandit`)
- [ ] Type hints added
- [ ] Docstrings added
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

---

## Adding Scrapers

### 1. Create Scraper Class

```python
# sources/my_scraper.py
from sources.job_scraper import JobBoardScraper
from typing import List, Dict, Optional

class MyJobBoardScraper(JobBoardScraper):
    """Scraper for MyJobBoard.com"""

    def __init__(self):
        super().__init__(
            name="MyJobBoard",
            base_domains=["myjobboard.com"]
        )

    async def search(
        self,
        keywords: Optional[List[str]] = None,
        locations: Optional[List[Dict]] = None,
        page: int = 1,
        **kwargs
    ) -> List[Dict]:
        """
        Search MyJobBoard for jobs.

        Args:
            keywords: Search keywords
            locations: Location filters
            page: Page number

        Returns:
            List of job dictionaries
        """
        jobs = []

        # Your scraping logic here
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://myjobboard.com/api/jobs",
                params={"q": " ".join(keywords), "page": page}
            )
            data = response.json()

            for item in data["results"]:
                jobs.append({
                    "title": item["title"],
                    "company": item["company"],
                    "location": item["location"],
                    "url": item["url"],
                    "description": item["description"],
                    "salary": item.get("salary"),
                    "external_job_id": item.get("id"),
                    "scraped_at": datetime.utcnow().isoformat()
                })

        return jobs
```

### 2. Register Scraper

```python
# sources/job_scraper.py

from sources.my_scraper import MyJobBoardScraper

def _ensure_registry() -> JobBoardRegistry:
    registry = JobBoardRegistry()

    # Existing scrapers
    registry.register(GreenhouseScraper())
    registry.register(LeverScraper())

    # Add your scraper
    registry.register(MyJobBoardScraper())

    return registry
```

### 3. Add Tests

```python
# tests/test_my_scraper.py
import pytest
from sources.my_scraper import MyJobBoardScraper

@pytest.mark.asyncio
async def test_search():
    scraper = MyJobBoardScraper()
    jobs = await scraper.search(
        keywords=["python"],
        locations=[{"city": "Denver", "state": "CO"}]
    )

    assert len(jobs) > 0
    assert "title" in jobs[0]
    assert "company" in jobs[0]
    assert "url" in jobs[0]

@pytest.mark.asyncio
async def test_pagination():
    scraper = MyJobBoardScraper()

    page1 = await scraper.search(keywords=["python"], page=1)
    page2 = await scraper.search(keywords=["python"], page=2)

    assert len(page1) > 0
    assert len(page2) > 0
    assert page1[0]["url"] != page2[0]["url"]
```

### 4. Add Documentation

Update `docs/USER_GUIDE.md` and `docs/MCP_GUIDE.md` if applicable.

---

## Testing

### Unit Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_my_scraper.py

# Run with coverage
pytest --cov=src --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Integration Tests

```bash
# Test MCP servers
python examples/test_jobswithgpt.py
python examples/test_reed_jobs.py
python examples/test_jobspy.py

# Test cloud deployment (dry-run)
python -m cloud.bootstrap --dry-run
```

### Security Tests

```bash
# Secrets scanning
trufflehog git file://. --only-verified

# Vulnerability scanning
safety check

# Static analysis
bandit -r . -x ./.venv

# SAST
semgrep --config auto .
```

### Manual Testing

```bash
# Test scraper
python -m src.agent --mode scrape --debug

# Test matching
python -m src.agent --mode test --test-type matching

# Test notifications
python -m src.agent --mode test --test-type slack
```

---

## GitHub Actions

### Workflows

#### 1. CI (`ci.yml`)
**Triggers:** Push, Pull Request
**Jobs:**
- Lint (Black, Flake8, MyPy)
- Test (pytest)
- Security (Bandit)

#### 2. Security (`security.yml`)
**Triggers:** Push, Pull Request, Schedule (weekly)
**Jobs:**
- TruffleHog (secrets)
- Bandit (Python security)
- OSV Scanner (dependencies)
- CodeQL (static analysis)

#### 3. Release (`release.yml`)
**Triggers:** Push to `main` (with semantic commit)
**Jobs:**
- Semantic versioning
- CHANGELOG generation
- GitHub release creation
- Tag creation

#### 4. Automated Monitoring (`automated-monitoring.yml`)
**Triggers:** Schedule (every 6 hours)
**Jobs:**
- Health checks
- Backup verification
- Dependency updates

### Local Workflow Testing

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -W .github/workflows/ci.yml

# Run specific job
act -j test

# Dry-run
act --dry-run
```

---

## Release Process

### Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes

**Commit types trigger releases:**
- `feat:` → MINOR bump
- `fix:` → PATCH bump
- `BREAKING CHANGE:` → MAJOR bump
- `docs:`, `chore:` → No release

### Release Checklist

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes + tests**
   ```bash
   # Code...
   pytest
   pre-commit run --all-files
   ```

3. **Commit with semantic format**
   ```bash
   git commit -m "feat: add new scraper for Indeed"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

5. **Merge to main**
   - PR approved and merged
   - CI passes
   - `semantic-release` auto-creates release

6. **Verify release**
   ```bash
   # Check GitHub releases
   gh release list

   # Check tags
   git fetch --tags
   git tag
   ```

### Manual Release (Emergency)

```bash
# Bump version
echo "2.5.0" > VERSION

# Update CHANGELOG
nano CHANGELOG.md

# Commit and tag
git add VERSION CHANGELOG.md
git commit -m "chore(release): 2.5.0"
git tag v2.5.0
git push origin main --tags

# Create GitHub release
gh release create v2.5.0 --title "v2.5.0" --notes "Release notes here"
```

---

## Database Schema

### Job Data Model

```json
{
  "id": "uuid",
  "title": "Senior Python Engineer",
  "company": "Acme Corp",
  "location": "Denver, CO",
  "remote": true,
  "salary": "$120k - $150k",
  "salary_min": 120000,
  "salary_max": 150000,
  "currency": "USD",
  "url": "https://jobs.example.com/12345",
  "description": "Full job description...",
  "requirements": ["Python", "Django", "AWS"],
  "benefits": ["Health insurance", "401k"],
  "external_job_id": "greenhouse_12345",
  "source": "jobswithgpt",
  "match_score": 0.89,
  "matched_keywords": ["python", "aws"],
  "scraped_at": "2025-10-03T10:00:00Z",
  "posted_at": "2025-10-01T08:00:00Z",
  "expires_at": "2025-11-01T23:59:59Z"
}
```

### User Preferences Model

```json
{
  "keywords": ["python", "devops"],
  "job_titles": ["Software Engineer"],
  "locations": [{"city": "Denver", "state": "CO"}],
  "minimum_salary": 100000,
  "maximum_distance_miles": 50,
  "experience_level": "mid-senior",
  "excluded_companies": [],
  "excluded_keywords": [],
  "remote_only": false,
  "work_authorization": ["US Citizen"],
  "mcp_servers": {
    "jobswithgpt": {"enabled": true}
  },
  "slack_webhook_url": null,
  "email_notifications": null
}
```

---

## Performance Optimization

### Profiling

```bash
# Profile scraper
python -m cProfile -o profile.stats -m src.agent --mode scrape

# View results
python -c "import pstats; p = pstats.Stats('profile.stats'); p.sort_stats('cumtime'); p.print_stats(20)"

# Or use snakeviz
pip install snakeviz
snakeviz profile.stats
```

### Benchmarking

```python
import time
import asyncio
from sources.job_scraper import search_jobs_by_keywords

async def benchmark():
    start = time.time()
    jobs = await search_jobs_by_keywords(
        keywords=["python"],
        locations=[{"city": "Denver", "state": "CO"}]
    )
    duration = time.time() - start
    print(f"Found {len(jobs)} jobs in {duration:.2f}s")

asyncio.run(benchmark())
```

### Caching

```python
from utils.cache import job_cache

# Check cache stats
stats = job_cache.get_stats()
print(f"Cache size: {stats['job_hashes_count']}")
print(f"Max size: {stats['max_size']}")

# Clear cache if needed
job_cache.clear()
```

---

## Resources

- **GitHub Repository:** https://github.com/cboyd0319/job-private-scraper-filter
- **Issue Tracker:** https://github.com/cboyd0319/job-private-scraper-filter/issues
- **Python Style Guide:** https://pep8.org
- **Semantic Versioning:** https://semver.org
- **Semantic Commit Messages:** https://www.conventionalcommits.org

---

**Questions?** Open an issue on GitHub or see [Contributing Guide](../CONTRIBUTING.md)
