# JobSentinel Best Practices Guide

**Version:** 1.0.0  
**Last Updated:** October 12, 2025  
**Audience:** Contributors, maintainers, production deployers

---

## 🎯 Overview

This guide documents proven patterns for building reliable, maintainable, and production-ready job automation systems. Follow these practices to contribute effectively to JobSentinel and deploy it successfully.

---

## 📐 Architecture Principles

### 1. **Separation of Concerns**

**Pattern:** Each module has a single, well-defined responsibility.

```python
# ✅ GOOD: Clear separation
from sources.job_scraper import scrape_jobs
from matchers.scoring import score_jobs
from notify.slack import send_alerts

jobs = scrape_jobs(source="jobswithgpt")
scored = score_jobs(jobs, preferences)
send_alerts(scored)

# ❌ AVOID: Mixed concerns in one function
def scrape_score_and_notify():  # Does too much
    ...
```

**Benefits:**
- Easier testing and mocking
- Reusable components
- Clear dependency boundaries
- Independent scaling in production

### 2. **Typed Interfaces**

**Pattern:** Use type hints for all public APIs and domain models.

```python
# ✅ GOOD: Explicit types
from typing import List, Dict, Optional
from pydantic import BaseModel

class JobListing(BaseModel):
    """Structured job listing with validation."""
    id: str
    title: str
    company: str
    location: Optional[str] = None
    salary_min: Optional[int] = None
    description: str
    
def score_job(job: JobListing, preferences: Dict[str, any]) -> float:
    """Score a job listing against user preferences.
    
    Args:
        job: Validated job listing
        preferences: User preferences from config
        
    Returns:
        Score between 0.0 and 1.0
        
    Raises:
        ValueError: If preferences are invalid
    """
    ...
```

**Benefits:**
- Catch errors at development time
- Self-documenting code
- Better IDE autocomplete
- Runtime validation with Pydantic

### 3. **Explicit Error Handling**

**Pattern:** Never silently fail. Handle errors explicitly and provide context.

```python
# ✅ GOOD: Explicit error handling
from utils.errors import ScraperError
from utils.logging import get_logger

logger = get_logger(__name__)

async def scrape_page(url: str) -> List[JobListing]:
    """Scrape jobs from a page with explicit error handling."""
    try:
        response = await fetch_with_retry(url, max_retries=3)
        jobs = parse_jobs(response.content)
        logger.info(f"Scraped {len(jobs)} jobs from {url}")
        return jobs
        
    except requests.RequestException as e:
        logger.error(f"Network error scraping {url}: {e}")
        raise ScraperError(f"Failed to fetch {url}", source=url) from e
        
    except ParseError as e:
        logger.error(f"Parse error for {url}: {e}")
        raise ScraperError(f"Invalid response from {url}", source=url) from e

# ❌ AVOID: Silent failures
def scrape_page_bad(url):
    try:
        return parse_jobs(fetch(url))
    except:
        return []  # Lost context, can't diagnose issues
```

**Benefits:**
- Debuggable failures with context
- Monitoring and alerting integration
- Clear error messages for users
- Traceable error chains

---

## 🔒 Security Best Practices

### 1. **Secrets Management**

**Pattern:** Never commit secrets. Use environment variables or secret managers.

```python
# ✅ GOOD: Secure credential loading
import os
from dotenv import load_dotenv
from utils.validators import validate_webhook_url

load_dotenv()

SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL")
if not SLACK_WEBHOOK:
    raise ValueError("SLACK_WEBHOOK_URL not set in environment")

if not validate_webhook_url(SLACK_WEBHOOK):
    raise ValueError("Invalid Slack webhook URL format")

# ❌ AVOID: Hardcoded secrets
SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR_SECRET_TOKEN"  # NEVER!
```

**Required Environment Variables:**
- `SLACK_WEBHOOK_URL`: Slack incoming webhook (if using Slack alerts)
- `OPENAI_API_KEY`: OpenAI API key (if using AI features)
- `REED_API_KEY`: Reed.co.uk API key (if using Reed scraper)

**Production Deployment:**
- Use cloud provider secret managers (GCP Secret Manager, AWS Secrets Manager)
- Enable secret rotation policies
- Audit secret access logs
- Restrict secret access to least-privilege roles

### 2. **Input Validation**

**Pattern:** Validate all external inputs (user config, API responses, file uploads).

```python
# ✅ GOOD: Validated inputs
from pydantic import BaseModel, HttpUrl, validator

class ScraperConfig(BaseModel):
    """Configuration for job scraper with validation."""
    url: HttpUrl  # Validates URL format
    max_pages: int = 10
    timeout: int = 30
    
    @validator('max_pages')
    def validate_max_pages(cls, v):
        if v < 1 or v > 100:
            raise ValueError("max_pages must be between 1 and 100")
        return v
    
    @validator('timeout')
    def validate_timeout(cls, v):
        if v < 10 or v > 300:
            raise ValueError("timeout must be between 10 and 300 seconds")
        return v

# Usage
config = ScraperConfig(
    url="https://jobs.example.com",
    max_pages=50,
    timeout=60
)  # Raises ValidationError if invalid
```

**Benefits:**
- Prevent injection attacks
- Catch configuration errors early
- Clear error messages for users
- Type safety throughout application

### 3. **Rate Limiting & Respectful Scraping**

**Pattern:** Always respect `robots.txt` and implement exponential backoff.

```python
# ✅ GOOD: Respectful scraping with rate limiting
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.rate_limiter import RateLimiter

rate_limiter = RateLimiter(
    max_requests=10,      # Max requests per window
    time_window=60,        # Time window in seconds
    backoff_factor=2.0     # Exponential backoff multiplier
)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=60)
)
async def fetch_with_retry(url: str) -> Response:
    """Fetch URL with rate limiting and exponential backoff."""
    await rate_limiter.acquire(url)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response
```

**Rate Limiting Guidelines:**
- Start with conservative limits (10 req/min)
- Monitor 429 responses and adjust
- Implement exponential backoff (2x, 4x, 8x delays)
- Respect `Retry-After` headers
- Use distributed rate limiting for multi-instance deployments

---

## 🧪 Testing Standards

### 1. **Test Pyramid**

**Pattern:** Follow the test pyramid: many unit tests, some integration tests, few E2E tests.

```
       /\
      /  \  E2E Tests (few, expensive)
     /----\
    /      \ Integration Tests (moderate)
   /--------\
  /          \ Unit Tests (many, fast)
 /____________\
```

**Test Coverage Targets:**
- **Core business logic:** ≥85% coverage (strictly enforced)
- **API endpoints:** ≥75% coverage
- **Utilities:** ≥80% coverage
- **Overall:** ≥80% coverage

### 2. **Unit Testing Patterns**

```python
# ✅ GOOD: Focused unit test with mocks
import pytest
from unittest.mock import Mock, patch
from sources.jobswithgpt_scraper import JobsWithGPTScraper

@pytest.mark.asyncio
async def test_scraper_handles_empty_results():
    """Test scraper gracefully handles empty job results."""
    scraper = JobsWithGPTScraper()
    
    # Mock the HTTP client to return empty results
    with patch.object(scraper, '_fetch_jobs', return_value=[]):
        jobs = await scraper.scrape(keywords=["python"])
        
    assert jobs == []
    assert scraper.stats.total_scraped == 0

@pytest.mark.asyncio
async def test_scraper_handles_network_errors():
    """Test scraper handles network failures gracefully."""
    scraper = JobsWithGPTScraper()
    
    with patch.object(scraper, '_fetch_jobs', side_effect=ConnectionError("Network timeout")):
        with pytest.raises(ScraperError) as exc_info:
            await scraper.scrape(keywords=["python"])
        
        assert "Network" in str(exc_info.value)
        assert scraper.stats.errors == 1
```

### 3. **Integration Testing**

```python
# ✅ GOOD: Integration test with test database
import pytest
from sqlalchemy import create_engine
from src.database import init_db, save_jobs

@pytest.fixture
def test_db():
    """Provide isolated test database."""
    engine = create_engine("sqlite:///:memory:")
    init_db(engine)
    yield engine
    engine.dispose()

def test_job_persistence(test_db):
    """Test saving and retrieving jobs from database."""
    jobs = [
        {"id": "1", "title": "Python Developer", "company": "Acme"},
        {"id": "2", "title": "Data Scientist", "company": "Beta"}
    ]
    
    save_jobs(test_db, jobs)
    
    retrieved = query_jobs(test_db, keyword="Python")
    assert len(retrieved) == 1
    assert retrieved[0].title == "Python Developer"
```

### 4. **Running Tests**

```bash
# Fast unit tests only (< 30 seconds)
make test-fast

# Full test suite (unit + integration)
make test

# With coverage report
make cov

# Mutation testing (advanced)
make mut
```

---

## 📊 Observability & Monitoring

### 1. **Structured Logging**

**Pattern:** Use structured logs for production observability.

```python
# ✅ GOOD: Structured logging
from utils.structured_logging import get_logger

logger = get_logger(__name__)

async def scrape_job_board(source: str, keywords: List[str]) -> List[JobListing]:
    """Scrape job board with comprehensive logging."""
    logger.info(
        "Starting job scrape",
        extra={
            "source": source,
            "keywords": keywords,
            "user_id": "anonymous",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    try:
        jobs = await _scrape(source, keywords)
        
        logger.info(
            "Scrape completed",
            extra={
                "source": source,
                "job_count": len(jobs),
                "duration_ms": timer.elapsed_ms()
            }
        )
        
        return jobs
        
    except Exception as e:
        logger.error(
            "Scrape failed",
            extra={
                "source": source,
                "error_type": type(e).__name__,
                "error_message": str(e)
            },
            exc_info=True
        )
        raise

# ❌ AVOID: Unstructured logs
logger.info(f"Scraped {len(jobs)} jobs")  # Hard to parse/query
```

**Log Levels:**
- `DEBUG`: Detailed diagnostic information (disabled in production)
- `INFO`: Important business events (job scraped, alert sent)
- `WARNING`: Recoverable errors (rate limit hit, retry succeeded)
- `ERROR`: Failures requiring attention (scraper down, alert failed)
- `CRITICAL`: System failures (database unreachable, out of memory)

### 2. **Metrics & Health Checks**

```python
# ✅ GOOD: Metrics collection
from utils.metrics import MetricsCollector

metrics = MetricsCollector()

async def scrape_with_metrics(source: str) -> List[JobListing]:
    """Scrape jobs with metrics collection."""
    with metrics.timer(f"scraper.{source}.duration"):
        try:
            jobs = await _scrape(source)
            metrics.increment(f"scraper.{source}.success")
            metrics.gauge(f"scraper.{source}.jobs", len(jobs))
            return jobs
            
        except Exception as e:
            metrics.increment(f"scraper.{source}.error")
            raise

# Health check endpoint for load balancers
def health_check() -> Dict[str, any]:
    """Return system health status."""
    return {
        "status": "healthy",
        "version": "0.5.0",
        "checks": {
            "database": check_database_connection(),
            "scrapers": check_scraper_availability(),
            "alerts": check_alert_channels()
        },
        "metrics": {
            "uptime_seconds": get_uptime(),
            "jobs_scraped_24h": metrics.get("jobs.total.24h"),
            "error_rate": metrics.get("errors.rate.5m")
        }
    }
```

**Production Monitoring Checklist:**
- [ ] Structured logs exported to centralized logging (CloudWatch, Stackdriver)
- [ ] Error rate alerts configured (>5% error rate → page)
- [ ] Performance monitoring (P95 latency < 10s for scrapes)
- [ ] Resource monitoring (CPU < 80%, Memory < 85%)
- [ ] Health check endpoints for load balancers
- [ ] Dead letter queue for failed alert delivery

---

## 🚀 Performance Optimization

### 1. **Async/Await for I/O**

**Pattern:** Use async for all I/O-bound operations (HTTP, database).

```python
# ✅ GOOD: Concurrent scraping with asyncio
import asyncio

async def scrape_all_sources(sources: List[str]) -> List[JobListing]:
    """Scrape multiple sources concurrently."""
    tasks = [scrape_source(source) for source in sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    jobs = []
    for source, result in zip(sources, results):
        if isinstance(result, Exception):
            logger.error(f"Failed to scrape {source}: {result}")
        else:
            jobs.extend(result)
    
    return jobs

# ❌ AVOID: Sequential scraping
def scrape_all_sources_slow(sources):
    jobs = []
    for source in sources:  # Each takes 10s → 50s total for 5 sources
        jobs.extend(scrape_source(source))
    return jobs
```

**Performance Gains:**
- Sequential: 5 sources × 10s = 50s
- Concurrent: max(10s) = 10s (5x faster)

### 2. **Caching Strategies**

```python
# ✅ GOOD: Intelligent caching
from utils.cache import TTLCache

cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL

@cache.memoize
async def fetch_job_details(job_id: str) -> JobListing:
    """Fetch job details with caching."""
    return await api_client.get_job(job_id)

# Cache invalidation on updates
async def update_job(job_id: str, updates: Dict):
    """Update job and invalidate cache."""
    await api_client.update_job(job_id, updates)
    cache.invalidate(f"fetch_job_details:{job_id}")
```

**Caching Guidelines:**
- Cache static data (job listings) with TTL
- Invalidate cache on mutations
- Use cache warming for critical paths
- Monitor cache hit rates (target >80%)

### 3. **Database Optimization**

```python
# ✅ GOOD: Efficient database queries
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

async def get_recent_jobs_optimized(limit: int = 100) -> List[JobListing]:
    """Efficiently fetch recent jobs with relationships."""
    query = (
        select(Job)
        .options(selectinload(Job.company))  # Eager load relationships
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    
    results = await session.execute(query)
    return results.scalars().all()

# ❌ AVOID: N+1 queries
def get_recent_jobs_slow(limit=100):
    jobs = session.query(Job).order_by(Job.created_at.desc()).limit(limit).all()
    
    for job in jobs:
        company = job.company  # Triggers separate query for EACH job
```

**Database Best Practices:**
- Add indexes on frequently queried columns (`created_at`, `company_id`)
- Use eager loading (`selectinload`) to avoid N+1 queries
- Implement connection pooling (5-10 connections per instance)
- Use read replicas for read-heavy workloads
- Monitor slow queries (>1s) and optimize

---

## 🔧 Configuration Management

### 1. **Environment-Based Config**

**Pattern:** Use environment variables for deployment-specific settings, JSON for user preferences.

```python
# ✅ GOOD: Layered configuration
import os
from pathlib import Path
from pydantic import BaseSettings

class AppConfig(BaseSettings):
    """Application configuration from environment."""
    
    # Environment-specific (varies by deployment)
    environment: str = os.getenv("ENV", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///data/jobs.db")
    
    # Feature flags
    enable_slack_alerts: bool = os.getenv("ENABLE_SLACK", "false").lower() == "true"
    enable_metrics: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    
    # User preferences (from JSON file)
    user_prefs_path: Path = Path("config/user_prefs.json")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Usage
config = AppConfig()

if config.enable_slack_alerts:
    setup_slack_notifier()
```

### 2. **Configuration Validation**

```bash
# Validate configuration before deployment
python -m jsa.cli config-validate --path config/user_prefs.json

# Output:
# ✓ Configuration valid
# ✓ All required fields present
# ✓ Slack webhook URL reachable
# ✓ API keys valid
```

---

## 📦 Dependency Management

### 1. **Version Pinning**

**Pattern:** Pin versions for reproducible builds, update regularly.

```toml
# pyproject.toml
[project]
dependencies = [
    "httpx>=0.26,<0.29",        # Allow patch updates
    "pydantic>=2.6,<2.13",       # Allow minor updates within v2
    "playwright>=1.44,<1.56",    # Browser automation
]

[project.optional-dependencies]
dev = [
    "pytest>=8,<9",
    "black>=24.8,<25",
    "ruff>=0.6.9,<0.7",
]
```

### 2. **Security Scanning**

```bash
# Regular security audits
pip install pip-audit
pip-audit  # Scan for known CVEs

# Update vulnerable dependencies
pip-audit --fix

# Monitor with GitHub Dependabot (enabled in .github/dependabot.yml)
```

---

## 🐳 Deployment Best Practices

### 1. **Docker Production Image**

```dockerfile
# docker/Dockerfile
FROM python:3.13-slim

# Security: Run as non-root user
RUN useradd -m -u 1000 jobsentinel
USER jobsentinel

WORKDIR /app

# Install dependencies first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=jobsentinel:jobsentinel . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -m jsa.cli health-check || exit 1

# Run application
CMD ["python", "-m", "jsa.cli", "run-daemon"]
```

### 2. **Production Checklist**

**Before deploying to production:**

- [ ] All tests passing (`make test`)
- [ ] Security scan clean (`make security`)
- [ ] Secrets in environment (not in code/config files)
- [ ] Database migrations applied
- [ ] Monitoring & alerting configured
- [ ] Backup & restore procedures tested
- [ ] Rollback plan documented
- [ ] Load testing completed (if high traffic expected)
- [ ] Health check endpoint verified
- [ ] Log aggregation configured
- [ ] Error tracking enabled (Sentry, Rollbar)

**Production Environment Variables:**

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/jobsentinel
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
LOG_LEVEL=INFO

# Optional
ENABLE_METRICS=true
ENABLE_PROFILING=false
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🤝 Contributing Guidelines

### 1. **Code Review Checklist**

**For reviewers:**

- [ ] Code follows style guide (Black formatted, Ruff compliant)
- [ ] All public functions have docstrings
- [ ] Tests cover new functionality (≥85% coverage)
- [ ] No hardcoded secrets or sensitive data
- [ ] Error handling is explicit and informative
- [ ] Logging provides sufficient context
- [ ] Breaking changes documented in CHANGELOG.md
- [ ] Dependencies updated in pyproject.toml
- [ ] Documentation updated if user-facing changes

### 2. **Commit Style**

```bash
# Good commit messages
feat(scrapers): Add support for Greenhouse job boards
fix(alerts): Handle Slack webhook timeouts gracefully
docs(api): Update API integration guide with examples
test(scrapers): Add integration tests for Reed API

# Bad commit messages
Update stuff
Fix bug
WIP
```

**Conventional Commits Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

### 3. **Pull Request Template**

```markdown
## Description
[Clear description of what this PR does]

## Changes
- [List specific changes]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
```

---

## 📚 Additional Resources

### External References

| Topic | Resource | Confidence |
|-------|----------|------------|
| Python Project Structure | [Hitchhiker's Guide to Python](https://docs.python-guide.org/writing/structure/) | High |
| API Rate Limiting | [Rate Limit in Web Scraping](https://scrape.do/blog/web-scraping-rate-limit/) | High |
| Error Handling Patterns | [Python Error Handling Best Practices](https://docs.python.org/3/tutorial/errors.html) | High |
| Async Best Practices | [Real Python Async IO](https://realpython.com/async-io-python/) | High |

### Internal Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Contributing Guide](governance/CONTRIBUTING.md)
- [Security Policy](governance/SECURITY.md)
- [Troubleshooting Guide](troubleshooting.md)

---

## 🔄 Continuous Improvement

This guide is a living document. As we learn from production deployments and contributor feedback, we update these practices.

**To suggest improvements:**
1. Open a GitHub issue with the `documentation` label
2. Propose specific changes with rationale
3. Include examples and references
4. Submit a pull request updating this guide

**Review schedule:** Quarterly (Jan, Apr, Jul, Oct)

---

**Version History:**
- 1.0.0 (Oct 12, 2025): Initial release

**Maintainers:** @cboyd0319

**License:** MIT
