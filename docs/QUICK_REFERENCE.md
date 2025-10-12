# JobSentinel Quick Reference

**Fast lookup guide for common tasks**

---

## 🚀 Common Commands

```bash
# Installation
python scripts/install.py                    # Automated installer
python scripts/install.py --dry-run          # Preview installation

# Run job search
python -m jsa.cli run-once                   # Single run
python -m jsa.cli run-once --dry-run         # Preview without saving
python -m jsa.cli run-once --verbose         # Detailed logging

# Configuration
python -m jsa.cli config-validate            # Validate config
python -m jsa.cli config-validate --path custom.json

# Web UI (optional)
python -m jsa.cli web                        # Start web interface
python -m jsa.cli web --port 8080            # Custom port

# Health & diagnostics
python -m jsa.cli health-check               # Check system health
python -m jsa.cli db-stats                   # Database statistics

# Development
make test                                     # Run tests
make lint                                     # Run linters
make fmt                                      # Format code
make cov                                      # Coverage report

# Docker
docker build -f docker/Dockerfile -t jobsentinel:latest .
docker run -d --name jobsentinel \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  jobsentinel:latest
```

---

## 📁 File Locations

| File/Directory | Purpose | Example |
|----------------|---------|---------|
| `config/user_prefs.json` | Your job search preferences | Keywords, locations, salary |
| `.env` | Secrets and API keys | `SLACK_WEBHOOK_URL=...` |
| `data/jobs.db` | SQLite database | Job history |
| `logs/` | Application logs | Debugging |
| `examples/` | Code examples | Custom scrapers, workflows |
| `docs/` | Documentation | Guides, best practices |

---

## 🎯 Configuration Examples

### Minimal Config
```json
{
  "keywords": ["python", "backend"],
  "locations": ["Remote"],
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  }
}
```

### Full Config
```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco"],
  "salary_min": 120000,
  "required_skills": ["python", "docker", "aws"],
  "preferred_skills": ["kubernetes", "terraform"],
  "blacklisted_companies": ["Meta", "Amazon"],
  "min_score": 0.75,
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { 
      "enabled": true, 
      "api_key": "${REED_API_KEY}"
    }
  },
  "slack": {
    "webhook_url": "${SLACK_WEBHOOK_URL}",
    "channel": "#job-alerts",
    "max_alerts_per_run": 5
  }
}
```

---

## 🔑 Environment Variables

```bash
# Required (if using Slack)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional
REED_API_KEY=your_reed_api_key_here
OPENAI_API_KEY=your_openai_key_here
DATABASE_URL=sqlite:///data/jobs.db
LOG_LEVEL=INFO
ENABLE_METRICS=true
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 📊 Job Scoring

Jobs are scored 0.0-1.0 based on:

| Factor | Weight | Example |
|--------|--------|---------|
| Keyword match | 40% | "python" in job title/description |
| Required skills | 30% | Must have Docker, AWS |
| Location match | 15% | Remote or San Francisco |
| Salary range | 10% | ≥ $120,000 |
| Company blacklist | 5% | Not in blacklisted companies |

**Default threshold:** 0.7 (70% match or higher)

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'jsa'` | Activate venv: `source .venv/bin/activate` |
| `Playwright executable not found` | Run: `playwright install chromium` |
| `AuthError: Invalid Slack webhook` | Check webhook in `.env` |
| `No jobs found` | Enable sources in config, verify API keys |
| `SSL certificate verify failed` | Update certifi: `pip install --upgrade certifi` |
| `Database locked` | Close other connections, restart application |

---

## 🌐 API Endpoints (Web UI)

```
GET  /                      # Dashboard
GET  /jobs                  # Job listings
GET  /jobs/:id              # Job details
POST /jobs/:id/apply        # Mark as applied
GET  /stats                 # Statistics
GET  /config                # Configuration
POST /config                # Update configuration
GET  /health                # Health check
```

---

## 📦 Deployment Quick Start

### Local (Free)
```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
python scripts/install.py
python -m jsa.cli run-once
```

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### AWS Lambda
```bash
# Package
pip install -r requirements.txt -t package/
cd package && zip -r ../jobsentinel.zip . && cd ..

# Deploy
aws lambda create-function \
  --function-name jobsentinel \
  --runtime python3.13 \
  --handler jsa.cli.lambda_handler \
  --zip-file fileb://jobsentinel.zip \
  --role arn:aws:iam::ACCOUNT:role/lambda-role
```

### GCP Cloud Run
```bash
# Build and deploy
gcloud run deploy jobsentinel \
  --source . \
  --region us-central1 \
  --memory 1Gi
```

---

## 🔍 Search Patterns

### Keywords
```json
"keywords": [
  "python developer",      // Exact phrase
  "backend engineer",      // Another phrase
  "api",                   // Single word
  "remote"                 // Location hint
]
```

### Locations
```json
"locations": [
  "Remote",                // Remote-first
  "San Francisco, CA",     // City, State
  "United States",         // Country
  "Europe"                 // Region
]
```

### Skills
```json
"required_skills": [       // Must have ALL
  "python",
  "docker",
  "aws"
],
"preferred_skills": [      // Bonus points
  "kubernetes",
  "terraform",
  "postgresql"
]
```

---

## 📈 Monitoring

### Key Metrics
```bash
# Job scraping
jobs.scraped.count        # Total jobs scraped
jobs.unique.count         # Unique jobs found
jobs.matched.count        # Jobs above threshold

# Performance
scraper.duration.seconds  # Time per scrape
scraper.error.rate        # Error percentage

# Alerts
alerts.sent.count         # Slack alerts sent
alerts.failed.count       # Failed alerts
```

### Health Check
```bash
python -m jsa.cli health-check

# Returns:
{
  "status": "healthy",
  "checks": {
    "database": true,
    "slack": true,
    "scrapers": true
  }
}
```

---

## 🔐 Security Checklist

- [ ] Secrets in `.env`, not in code
- [ ] `.env` in `.gitignore`
- [ ] API keys with minimum required scopes
- [ ] Regular dependency updates (`pip-audit`)
- [ ] HTTPS for all external requests
- [ ] Database encrypted at rest (production)
- [ ] Logs don't contain secrets
- [ ] Access logs enabled (production)

---

## 📚 Quick Links

| Resource | URL |
|----------|-----|
| **Documentation** | [docs/DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) |
| **Best Practices** | [docs/BEST_PRACTICES.md](BEST_PRACTICES.md) |
| **API Integration** | [docs/API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md) |
| **Deployment** | [docs/DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| **Examples** | [examples/README.md](../examples/README.md) |
| **Troubleshooting** | [docs/troubleshooting.md](troubleshooting.md) |
| **GitHub Issues** | https://github.com/cboyd0319/JobSentinel/issues |
| **Discussions** | https://github.com/cboyd0319/JobSentinel/discussions |

---

## 💡 Tips & Tricks

### Optimize Search Results
- Use specific keywords (e.g., "Senior Python Engineer" vs "Python")
- Start with fewer keywords, add more if too many results
- Use `blacklisted_companies` to filter out unwanted employers
- Adjust `min_score` threshold (0.7 = 70% match)

### Reduce API Costs
- Use free sources (JobsWithGPT) first
- Enable paid APIs (Reed) only if needed
- Increase search interval (e.g., every 4 hours vs every hour)
- Cache results to avoid duplicate API calls

### Improve Match Quality
- Add `required_skills` for must-have technologies
- Use `preferred_skills` for nice-to-haves
- Set realistic `salary_min` to filter appropriately
- Review and adjust scoring based on results

### Debugging
- Run with `--verbose` for detailed logs
- Use `--dry-run` to test without saving
- Check `logs/` directory for error details
- Enable `DEBUG` log level in `.env`

---

## 🆘 Getting Help

1. **Check documentation:** [docs/](.)
2. **Search existing issues:** [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
3. **Ask in discussions:** [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)
4. **Open new issue:** Include logs, config (remove secrets!), error messages

---

**Last Updated:** October 12, 2025  
**Version:** 1.0.0  
**License:** MIT
