# Development Guide

This guide covers development setup, contribution workflows, and advanced usage for the Job Private Scraper & Filter project.

## Quick Development Setup

### Prerequisites
- Python 3.12.10 (3.13 recommended)
- Git
- Virtual environment tool (venv, conda, etc.)

### Setup Steps

1. **Clone and Setup**
   ```bash
   git clone https://github.com/cboyd0319/job-private-scraper-filter.git
   cd job-private-scraper-filter

   # Create virtual environment
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate

   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Configuration**
   ```bash
   # Copy example configurations
   cp .env.example .env
   cp config/user_prefs.example.json config/user_prefs.json

   # Edit .env with your settings (optional for development)
   # Edit config/user_prefs.json with test job preferences
   ```

3. **Development Tools**
   ```bash
   # Install development and security tools
   pip install flake8 bandit yamllint black isort mypy pytest

   # Install Playwright for JavaScript scraping (optional)
   python3 -m playwright install chromium --with-deps
   ```

4. **Verify Setup**
   ```bash
   # Run health check
   python3 src/agent.py --mode health

   # Run syntax validation
   python3 -m py_compile src/agent.py

   # Run security scan
   bandit -r . -x ./.venv --quiet
   ```

## Project Structure

```
├── src/                       # Core application code and APIs
│   ├── agent.py              # Main scraper logic and CLI
│   ├── database.py           # Database models and operations
│   └── web_ui.py             # Flask web interface
├── scripts/                  # Installation, deployment, and security tooling
│   ├── install.sh            # Universal installer
│   ├── setup.sh              # macOS/Linux developer bootstrap
│   ├── setup_windows*.ps1    # Windows setup (current + legacy)
│   ├── setup-dev-tools.sh    # Developer tooling installer
│   ├── precommit-security-scan.sh # Pre-commit Bandit + Safety gating script
│   ├── deploy-cloud.sh       # Cloud deployment orchestrator
│   ├── validate-cloud-config.sh  # Pre-deployment validation
│   └── enhanced-cost-monitor.py  # Cost monitoring and protection
├── cloud/                    # Cross-provider automation (Cloud Run bootstrap, etc.)
├── config/                   # Configuration files
│   ├── bandit.yaml           # Security scanning configuration
│   ├── .yamllint.yml         # YAML validation rules
│   └── .safety-project.ini   # Safety CLI project metadata
├── utils/                    # Helper modules (config, scraping, logging, etc.)
├── sources/                  # Job board scrapers
├── notify/                   # Notification handlers
├── matchers/                 # Job filtering and scoring rules
├── templates/                # Web UI templates
├── docs/                     # Documentation
└── config/                   # Config samples and linters (copy user_prefs.example.json → user_prefs.json)
```

## Development Workflow

### Code Quality

**Before committing, run:**
```bash
# Format code
black src/ utils/ sources/ notify/ matchers/
isort src/ utils/ sources/ notify/ matchers/

# Check code quality
flake8 --max-line-length=120 --exclude=.venv src/ utils/ sources/ notify/ matchers/

# Security scan
bandit -r . -x ./.venv --quiet
safety scan --json --output safety-results.json --project config/.safety-project.ini || true
rm -f safety-results.json safety-results.sarif

# Type checking (optional)
mypy src/ --ignore-missing-imports
```

To run pre-commit security checks manually:
```bash
scripts/precommit-security-scan.sh
```

**Pre-commit hook setup:**
```bash
# Install pre-commit
pip install pre-commit

# Set up hooks
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3
        args: [--line-length=120]

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
        args: [--profile=black, --line-length=120]

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=120]

  - repo: https://github.com/pycqa/bandit
    rev: 1.7.6
    hooks:
      - id: bandit
        args: [-r, ., -x, ./.venv, --quiet]
EOF

pre-commit install
```

### Testing

**Manual Testing:**
```bash
# Test main functionality
python3 src/agent.py --mode health      # System health
python3 src/agent.py --mode test        # Test notifications
python3 src/agent.py --mode poll        # Run job scraping (dry run)

# Test web UI
python3 src/web_ui.py                   # Start web interface at http://127.0.0.1:5000

# Test cloud deployment validation
scripts/validate-cloud-config.sh gcp   # Validate GCP deployment readiness
```

**Unit Testing (when available):**
```bash
# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

### Cloud Development

**Test Cloud Features:**
```bash
# Validate cloud configuration
scripts/validate-cloud-config.sh [gcp|aws|azure]

# Test cost monitoring
scripts/enhanced-cost-monitor.py --provider gcp --test-alert warning

# Generate deployment configurations (dry run)
scripts/deploy-cloud.sh --dry-run gcp
```

## Adding New Features

### New Job Board Support

1. **Create scraper module in `sources/`:**
   ```python
   # sources/newboard.py
   from sources.common import JobSource, Job

   class NewBoardSource(JobSource):
       def scrape_jobs(self, company_url: str) -> List[Job]:
           # Implementation here
           pass
   ```

2. **Register in `sources/__init__.py`:**
   ```python
   from .newboard import NewBoardSource

   BOARD_TYPES = {
       # ... existing types
       'newboard': NewBoardSource,
   }
   ```

3. **Add configuration example to `config/user_prefs.example.json`:**
   ```json
   {
     "companies": [
       {
         "id": "example-company",
         "board_type": "newboard",
         "url": "https://jobs.example.com/"
       }
     ]
   }
   ```

### New Notification Channel

1. **Create handler in `notify/`:**
   ```python
   # notify/newchannel.py
   def send_notification(jobs: List[dict], config: dict) -> bool:
       # Implementation here
       pass
   ```

2. **Update notification orchestrator in `src/agent.py`**

3. **Add configuration to `.env.example`:**
   ```bash
   # New Channel Settings
   NEWCHANNEL_WEBHOOK_URL=https://example.com/webhook
   NEWCHANNEL_ENABLED=false
   ```

### New Cloud Provider

1. **Add provider support to `scripts/install.sh`**
2. **Create deployment configuration in `scripts/deploy-cloud.sh`**
3. **Add cost monitoring in `scripts/enhanced-cost-monitor.py`**
4. **Update validation in `scripts/validate-cloud-config.sh`**
5. **Document in `docs/CLOUD_COSTS.md`**

## Security Guidelines

### Code Security
- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Validate all external inputs
- Use secure subprocess calls (see `scripts/enhanced-cost-monitor.py` for examples)
- Regular security scanning with bandit

### Infrastructure Security
- Enable billing alerts before cloud deployment
- Use least-privilege IAM roles
- Regular security updates
- Monitor for unusual activity

### Data Privacy
- All data stays local by default
- No telemetry or tracking
- User controls all data and configurations

## Performance Guidelines

### Scraping Performance
- Respect rate limits (default: 15-minute intervals)
- Use connection pooling for HTTP requests
- Implement proper timeouts
- Cache responses when appropriate

### Resource Usage
- Target <200MB memory usage
- Minimize CPU usage during idle periods
- Efficient database queries with SQLModel
- Log rotation to prevent disk filling

## Release Process

### Version Management
```bash
# Update version
echo "1.2.0" > VERSION

# Update changelog
# Edit CHANGELOG.md with new features and fixes

# Commit and tag
git add VERSION CHANGELOG.md
git commit -m "chore: bump version to 1.2.0"
git tag v1.2.0
git push origin main --tags
```

### Release Checklist
- [ ] All tests pass
- [ ] Security scan clean (bandit)
- [ ] Code quality checks pass (flake8)
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Cloud deployment tested
- [ ] Backward compatibility verified

## Troubleshooting Development Issues

### Common Issues

**Import Errors:**
```bash
# Ensure you're in the project root and virtual environment is activated
pwd  # Should show job-private-scraper-filter
which python  # Should show .venv/bin/python
```

**Database Issues:**
```bash
# Reset database
rm -f data/jobs.db
python3 src/agent.py --mode health  # Will recreate database
```

**Playwright Issues:**
```bash
# Reinstall browser
python3 -m playwright install chromium --with-deps
```

**Permission Issues (macOS/Linux):**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Getting Help

1. **Check logs:** `tail -f data/logs/scraper_*.log`
2. **Run health check:** `python3 src/agent.py --mode health`
3. **Check GitHub issues:** https://github.com/cboyd0319/job-private-scraper-filter/issues
4. **Review documentation:** All files in `docs/`

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines and pull request process.

---

**Happy coding!** 🚀
