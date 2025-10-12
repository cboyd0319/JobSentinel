# Advanced Features Guide

**Version:** 0.5.0  
**Last Updated:** October 12, 2025

This guide covers JobSentinel's advanced capabilities that make it the world's best job search automation tool.

---

## Table of Contents

1. [Extended Industry Profiles](#extended-industry-profiles)
2. [Intelligent Job Ranking](#intelligent-job-ranking)
3. [Market Intelligence & Insights](#market-intelligence--insights)
4. [Security & Compliance](#security--compliance)
5. [Resilience & Reliability](#resilience--reliability)
6. [Observability & Monitoring](#observability--monitoring)
7. [API & Integration](#api--integration)

---

## Extended Industry Profiles

JobSentinel now supports **13 comprehensive industry profiles** for resume optimization, each based on market research and ATS best practices.

### Available Industries

1. **Software Engineering** - Technical roles with cloud/DevOps focus
2. **Data Science** - Analytics, ML, and data engineering
3. **Marketing** - Digital marketing and brand management
4. **Healthcare** - Clinical and medical roles
5. **Finance** - Financial analysis and accounting
6. **Legal** - Law, compliance, and contracts
7. **Education** - Teaching and curriculum development
8. **Sales** - B2B/B2C sales and account management
9. **Product Management** - Product strategy and delivery
10. **Cybersecurity** - Information security and compliance
11. **DevOps Engineering** - CI/CD and infrastructure automation
12. **Design (UX/UI)** - User experience and interface design
13. **Executive Leadership** - C-level and senior management

### Using Industry Profiles

```python
from src.domains.resume.service import ResumeEnhancementService
from src.domains.resume.suggestions.industry_profiles_extended import (
    list_available_industries,
    get_industry_profile
)

# List all industries
industries = list_available_industries()
print(f"Available: {len(industries)} industries")

# Get specific profile
healthcare = get_industry_profile("healthcare")
print(f"Required sections: {healthcare.required_sections}")
print(f"Key skills: {healthcare.key_skills}")
print(f"ATS tips: {healthcare.ats_considerations}")

# Analyze resume for specific industry
service = ResumeEnhancementService()
analysis = service.analyze_resume_text(
    resume_text,
    target_industry="healthcare"
)
```

### Profile Features

Each profile includes:
- **Required Sections** - Critical resume sections for the industry
- **Key Skills** - Most valued skills and competencies
- **Common Keywords** - ATS-optimized terms
- **Experience Format** - Preferred presentation style
- **ATS Considerations** - Industry-specific optimization tips

**Reference:** LinkedIn Talent Solutions | https://business.linkedin.com | Medium | Industry hiring trends

---

## Intelligent Job Ranking

Multi-factor scoring algorithm that ranks jobs based on your skills, preferences, and market conditions.

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Skills Match | 40% | Alignment with your technical skills |
| Salary Alignment | 25% | Meets your compensation requirements |
| Location Match | 20% | Matches preferred locations |
| Company Reputation | 10% | Company size and reputation |
| Recency | 5% | How recently posted |

### Usage

```python
from src.domains.intelligence import get_intelligence_engine

engine = get_intelligence_engine()

# Your profile
user_skills = ["python", "aws", "docker", "kubernetes"]
user_preferences = {
    "salary_min": 120000,
    "locations": ["Remote", "San Francisco, CA"]
}

# Rank jobs
ranked_jobs = engine.rank_jobs_intelligently(
    jobs,
    user_skills,
    user_preferences
)

# Top matches
for job, score in ranked_jobs[:5]:
    print(f"{job['title']} at {job['company']}: {score:.1f}/100")
```

---

## Market Intelligence & Insights

Comprehensive job market analysis with salary benchmarking and trend detection.

### Market Analysis

```python
from src.domains.intelligence import get_intelligence_engine

engine = get_intelligence_engine()

# Analyze job market
insights = engine.analyze_job_market(jobs, time_window_days=30)

print(f"Total Jobs: {insights.total_jobs}")
print(f"Market Heat: {insights.market_heat}/100")
print(f"Top Skills: {insights.top_skills}")
print(f"Top Companies: {insights.top_companies}")
```

### Salary Insights

```python
# Get salary analysis
if insights.salary_insights:
    salary = insights.salary_insights
    print(f"Salary Range: ${salary.min_salary} - ${salary.max_salary}")
    print(f"Median: ${salary.median_salary}")
    
    # Negotiation guidance
    low, high = salary.get_negotiation_range()
    print(f"Negotiation Range: ${low} - ${high}")
    
    competitive = salary.get_competitive_offer()
    print(f"Competitive Offer: ${competitive}")
```

### Trend Detection

```python
# Identify trending skills
trends = engine.identify_trending_skills(
    current_jobs=recent_jobs,
    historical_jobs=older_jobs
)

# Hot skills
hot_skills = [t for t in trends if t.is_hot_skill]
for trend in hot_skills:
    print(f"{trend.keyword}: +{trend.growth_rate:.1f}% growth")
```

### Career Recommendations

```python
# Get personalized recommendations
recommendations = engine.generate_career_recommendations(
    user_skills=["python", "django", "postgresql"],
    market_trends=trends,
    current_role="Software Engineer"
)

for rec in recommendations:
    print(f"• {rec}")
```

**Output Example:**
```
• Learn kubernetes: Growing 45.2% with 127 job postings
• Learn terraform: Growing 38.7% with 98 job postings
• Target senior roles: Emphasize technical leadership
```

---

## Security & Compliance

Security controls following **OWASP ASVS 5.0** standards.

### Input Validation

```python
from src.domains.security import get_input_validator

validator = get_input_validator()

# Email validation (V5.1.2)
result, errors = validator.validate_email("user@example.com")
if result == ValidationResult.VALID:
    print("Email is valid")

# URL validation (V5.1.3)
result, errors = validator.validate_url(
    "https://jobs.company.com",
    allowed_schemes=["https"],
    allowed_domains=["company.com"]
)

# Injection detection (V5.3.4)
has_injection, patterns = validator.check_for_injection(user_input)
if has_injection:
    print(f"Suspicious patterns detected: {patterns}")
```

### Rate Limiting

```python
from src.domains.security import get_rate_limiter, RateLimitConfig

limiter = get_rate_limiter()

# Configure rate limit (V4.2.1)
config = RateLimitConfig(
    max_requests=100,      # 100 requests
    window_seconds=60,     # per minute
    burst_allowance=20     # allow bursts up to 120
)

# Check rate limit
allowed, metadata = limiter.check_rate_limit("user_123", config)
if not allowed:
    retry_after = metadata['reset_at'] - time.time()
    print(f"Rate limit exceeded. Retry after {retry_after}s")
```

### Secret Management

```python
from src.domains.security import get_secret_manager

secrets = get_secret_manager()

# Generate secure token (V2.3.1)
token = secrets.generate_token(length=32)

# Hash secrets (V2.4.1)
hash_value, salt = secrets.hash_secret("my_api_key")

# Verify secrets
is_valid = secrets.verify_secret("my_api_key", hash_value, salt)

# Mask for logging (V8.1.1)
masked = secrets.mask_secret("sk_live_1234567890abcdef")
print(f"API Key: {masked}")  # Output: API Key: ****cdef
```

**Security Standards:**
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Application security verification
- NIST SP 800-63B | https://pages.nist.gov/800-63-3 | High | Authentication guidelines

---

## Resilience & Reliability

Circuit breakers, retry strategies, and health monitoring per **Release It!** patterns.

### Circuit Breaker

```python
from src.domains.scraping_resilience import (
    CircuitBreaker,
    CircuitBreakerConfig
)

# Configure circuit breaker
config = CircuitBreakerConfig(
    failure_threshold=5,      # Open after 5 failures
    success_threshold=2,      # Close after 2 successes
    timeout_seconds=60.0,     # Try reset after 60s
    window_seconds=60.0       # Rolling window
)

breaker = CircuitBreaker("greenhouse_scraper", config)

# Use circuit breaker
try:
    result = breaker.call(scrape_function, url)
except CircuitBreakerOpenError:
    print("Circuit breaker is open - service degraded")
```

### Retry with Exponential Backoff

```python
from src.domains.scraping_resilience import (
    ResilientScraper,
    RetryConfig
)

# Configure retry strategy
retry_config = RetryConfig(
    max_attempts=3,
    base_delay_seconds=1.0,
    max_delay_seconds=60.0,
    strategy="exponential"  # or "linear", "fixed"
)

scraper = ResilientScraper(
    name="job_scraper",
    retry_config=retry_config
)

# Execute with automatic retry
result = await scraper.execute_with_retry(async_function, url)
```

### Health Monitoring

```python
from src.domains.scraping_resilience import get_health_monitor

monitor = get_health_monitor()

# Record attempts
monitor.record_attempt("greenhouse", success=True, latency_ms=1250.5)
monitor.record_attempt("lever", success=False, latency_ms=5000.0, error="Timeout")

# Get health status
status = monitor.get_health_status("greenhouse")
print(f"Healthy: {status.is_healthy}")
print(f"Success Rate: {status.success_rate*100:.1f}%")
print(f"Avg Latency: {status.avg_latency_ms:.1f}ms")

# Get unhealthy scrapers
unhealthy = monitor.get_unhealthy_scrapers()
for scraper in unhealthy:
    print(f"⚠ {scraper.scraper_name}: {scraper.consecutive_failures} failures")
```

**Reference:** Release It! (Nygard) | https://pragprog.com/titles/mnee2 | High | Stability patterns

---

## Observability & Monitoring

Comprehensive observability following **Google SRE** principles with metrics, SLOs, and performance tracking.

### Metrics Collection

```python
from src.domains.observability import get_metrics_collector

metrics = get_metrics_collector()

# Counter (monotonically increasing)
metrics.record_counter(
    "jobs.scraped.total",
    value=42,
    labels={"source": "greenhouse"}
)

# Gauge (current value)
metrics.record_gauge("active_scrapers", value=5)

# Histogram (distribution)
metrics.record_histogram("resume.score", value=87.5)

# Performance tracking
metrics.record_performance(
    operation="scrape_jobs",
    duration_ms=2340.5,
    success=True,
    metadata={"count": 42}
)
```

### Performance Tracking

```python
from src.domains.observability import track_performance, track_time

# Context manager
with track_performance("resume_analysis", {"industry": "tech"}):
    analysis = analyze_resume(resume_text)

# Decorator
@track_time()
async def scrape_jobs(url):
    # Function execution time automatically tracked
    return await scraper.scrape(url)
```

### Service Level Objectives

```python
from src.domains.observability import get_slos

# View defined SLOs
slos = get_slos()
for slo in slos:
    print(f"{slo.name}:")
    print(f"  Target: {slo.target_percentage}%")
    print(f"  Window: {slo.window_hours}h")
    print(f"  Description: {slo.description}")
```

**Key SLOs:**
- **Job Scraping Success:** 95% success rate over 24 hours
- **Resume Analysis Latency:** p95 < 5 seconds
- **Alert Delivery:** p99 < 30 seconds
- **API Availability:** 99.9% uptime over 7 days

### Metrics Summary

```python
# Get aggregated metrics
summary = metrics.get_metrics_summary()
print(f"Total Metrics: {summary['total_metrics']}")
print(f"Success Rate: {summary['success_rate']:.1f}%")
print(f"Metrics by Type: {summary['metrics_by_type']}")
```

**Reference:** Google SRE | https://sre.google | Medium | SLO-based reliability engineering

---

## API & Integration

RESTful API following Fielding's REST constraints and Apigee best practices.

### Quick Start

```python
import requests

BASE_URL = "http://localhost:5000/api/v1"

# Health check
response = requests.get(f"{BASE_URL}/health")
health = response.json()
print(f"Status: {health['status']}")

# Analyze resume
response = requests.post(
    f"{BASE_URL}/resume/analyze",
    json={
        "resume_text": resume_content,
        "target_industry": "software_engineering"
    }
)
analysis = response.json()

# Search jobs
response = requests.post(
    f"{BASE_URL}/jobs/search",
    json={
        "keywords": ["python", "backend"],
        "location": "Remote",
        "sites": ["indeed", "glassdoor"]
    }
)
jobs = response.json()
```

### Error Handling

```python
try:
    response = requests.post(f"{BASE_URL}/resume/analyze", json=data)
    response.raise_for_status()
except requests.HTTPError as e:
    error = e.response.json()
    print(f"Error: {error['error']['message']}")
    print(f"Code: {error['error']['code']}")
```

### Rate Limit Headers

```python
response = requests.get(f"{BASE_URL}/health")
print(f"Limit: {response.headers['X-RateLimit-Limit']}")
print(f"Remaining: {response.headers['X-RateLimit-Remaining']}")
print(f"Reset: {response.headers['X-RateLimit-Reset']}")
```

**Full API Documentation:** See [API_SPECIFICATION.md](API_SPECIFICATION.md)

**References:**
- Fielding REST | https://www.ics.uci.edu/~fielding/pubs/dissertation/ | High | REST constraints
- Apigee Web API Design | https://apigee.com | Medium | Pragmatic REST guidelines

---

## Performance & Scaling

### Current Capacity (Single Instance)

| Metric | Limit | Recommended Usage |
|--------|-------|-------------------|
| Jobs scraped/hour | 10,000 | 8,000 (80%) |
| Resume analyses/hour | 100 | 80 (80%) |
| Concurrent scrapers | 10 | 8 (80%) |
| API requests/minute | 100 | 80 (80%) |

### Optimization Tips

1. **Enable Caching**
   ```python
   # Cache frequently accessed data
   config["cache"]["enabled"] = true
   config["cache"]["ttl_seconds"] = 3600
   ```

2. **Batch Operations**
   ```python
   # Process multiple resumes at once
   results = service.analyze_resumes_batch(resume_texts)
   ```

3. **Async Execution**
   ```python
   # Use async for I/O-bound operations
   jobs = await scraper.scrape_multiple_async(urls)
   ```

4. **Database Optimization**
   ```bash
   # Regular maintenance
   sqlite3 data.db "VACUUM;"
   sqlite3 data.db "ANALYZE;"
   ```

---

## Example Code

See [`examples/advanced_features_demo.py`](../examples/advanced_features_demo.py) for complete demonstrations of all features.

Run with:
```bash
python examples/advanced_features_demo.py
```

---

## References & Standards

All features are built on industry-standard practices and specifications:

| Standard | URL | Priority | Purpose |
|----------|-----|----------|---------|
| SWEBOK v4.0a | https://computer.org/swebok | High | Software engineering practices |
| OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Security verification |
| Google SRE | https://sre.google | Medium | Reliability engineering |
| Release It! | https://pragprog.com | High | Resilience patterns |
| Fielding REST | https://ics.uci.edu/~fielding | High | REST architecture |
| Apigee Web API | https://apigee.com | Medium | API design |
| LinkedIn Talent | https://business.linkedin.com | Medium | Industry trends |

---

## Next Steps

1. **Read the SRE Runbook:** [SRE_RUNBOOK.md](SRE_RUNBOOK.md)
2. **Review API Docs:** [API_SPECIFICATION.md](API_SPECIFICATION.md)
3. **Check Best Practices:** [BEST_PRACTICES.md](BEST_PRACTICES.md)
4. **Try the Demo:** `python examples/advanced_features_demo.py`

---

**Need Help?**
- Issues: https://github.com/cboyd0319/JobSentinel/issues
- Docs: https://github.com/cboyd0319/JobSentinel/docs
- Security: See [SECURITY.md](governance/SECURITY.md)
