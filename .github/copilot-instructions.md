# Repository Instructions — JobSentinel

> Purpose: Private, local-first job-search automation. Scrape public job boards, score against user prefs, alert on high-value roles. Runs locally for $0; optional cloud schedule for low cost. Do not add features that compromise privacy or require third-party data brokers.

## Project overview
- **Version:** 0.6.0+ (October 2025)
- **Python:** 3.11+ (uses modern type hints, walrus operator)
- Core loop: **Scrape → Normalize → Score → Alert → Persist**.
- Sources (public only): Greenhouse, Lever, JobsWithGPT, Reed, JobSpy aggregator. Do **not** log in to sites or bypass paywalls.
- Alerts: Slack Incoming Webhook (channel configured by user).
- Storage: Local files + SQLite (or equivalent). No telemetry. **Never** ship code that exfiltrates user data.
- Config: `config/user_prefs.json` (see example file in repo). Keep schema stable; add new keys behind sensible defaults.
- **New in v0.6:** AI/ML capabilities (BERT semantic matching, resume analysis), scam detection, accessibility improvements, MCP integration.

## Quick Reference (Most Common Commands)
```bash
# Development setup
make dev                    # Install with dev dependencies
playwright install chromium # Install browser for scraping

# Running the app
python -m jsa.cli run-once              # Run job scrape once
python -m jsa.cli run-once --dry-run    # Test without sending alerts
python -m jsa.cli web --port 5000       # Start web UI
python -m jsa.cli health                # Health check

# Quality checks (run before every commit)
make test          # Run all tests
make lint          # Ruff linter
make fmt           # Black formatter
make type          # mypy type check
make cov           # Coverage report (≥85%)
make security      # Security scan

# Quick test cycle
make fmt && make lint && make type && make test
```

## Repository Standards & Configuration

### Workflow & Automation Standards
- **Dependabot:** Weekly schedule (Mondays 09:00 UTC), commit prefix `chore(deps):`, grouped updates
- **Auto-merge:** Automatic approval for all Dependabot PRs, auto-merge for patch/minor versions only
- **CI/CD:** GitHub Actions workflows in `.github/workflows/` (see `python-qa.yml`, `dependabot-auto-merge.yml`)
- **Quality Gates:** All PRs must pass linting, type checking, tests (85% coverage), security scans before merge

### File Organization Standards
- **`.github/` directory:** Contains only GitHub-specific configs (workflows, templates, Copilot instructions)
  - Templates: `pull_request_template.md`, `ISSUE_TEMPLATE/*.yml` (lowercase naming)
  - Ownership: `CODEOWNERS` defines code review requirements
  - Actions: Custom actions in `.github/actions/`
- **Documentation:** All docs in `/docs`, never in `.github/`
- **Scripts:** Development/deployment scripts in `/scripts`, never in `.github/`
- **Templates:** User-facing templates in `/templates/` (Slack messages, emails)

### Inclusive Terminology Standards
- **Required replacements:**
  - Use "allowlist" instead of "whitelist"
  - Use "denylist" instead of "blacklist"
  - Use "main" branch instead of "master" branch
  - Use "primary/replica" instead of "master/slave" in architecture discussions
  - Use "denied_companies" config field (not "blacklisted_companies")
- **Code review:** All PRs checked for outdated terminology
- **Exceptions:** Academic/historical references, third-party API field names (document clearly)

### Configuration Management
- **User preferences:** `config/user_prefs.json` with schema validation (`user_prefs.schema.json`)
- **Secrets:** Environment variables or `.env` files (never commit `.env`)
- **Skills taxonomy:** `config/skills_taxonomy_v1.json` for job matching
- **Resume parser:** `config/resume_parser.json` for ML configuration
- **MCP integration:** `copilot-mcp.json` for Model Context Protocol servers

### GitHub Configuration Files
- **Dependabot:** `.github/dependabot.yml` — Standardized across all repos
- **Workflows:** `.github/workflows/*.yml` — GitHub Actions automation
- **Templates:** `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/*.yml`
- **Copilot:** `.github/copilot-instructions.md` (this file), `.github/copilot-mcp.json`
- **Ownership:** `.github/CODEOWNERS` — Code review assignments (@cboyd0319)
- **Funding:** `.github/FUNDING.yml` — Sponsorship information

## Guardrails (read carefully)
- **Respect robots.txt + rate limits.** Default to polite concurrency and exponential backoff. Never DOS a source.
- **No login-required scraping.** Public endpoints only; no captchas, no fake headers that imply authenticated sessions.
- **Secrets** come from `.env` or environment variables. Never hardcode tokens, keys, or webhooks. Do not echo secrets to logs.
- **Privacy by default.** Data stays local. No third-party APIs for resume content unless user explicitly enables them.
- **Licensing/Attribution.** If pulling structured fields from public pages, store only the minimum necessary job metadata.

## Repo map (detailed structure)
- `src/jsa/` — Core application code (v0.6+ refactored architecture)
  - `cli.py` — Command-line interface with subcommands (run-once, web, config-validate, health)
  - `config.py` — Typed configuration facade wrapping legacy utils.config
  - `db.py` — Database abstraction layer with typed facades
  - `health_check.py` — System health monitoring and diagnostics
  - `logging.py` — Structured logging configuration (JSON format)
  - `errors.py` — Custom exception classes with proper inheritance
  - `tracker/` — Job tracking CRM with SQLModel (models.py, service.py, api.py)
  - `web/` — Flask-based web UI with blueprints and WCAG 2.1 AA compliance
  - `http/` — HTTP client utilities with rate limiting and circuit breakers
- `src/domains/` — Domain-driven design modules (some legacy, some new)
  - `ml/` — ML/AI capabilities (BERT, sentiment, semantic matching)
  - `mcp_integration/` — Model Context Protocol clients (Context7, knowledge enhancement)
  - `detection/` — Scam/ghost job detection with FBI IC3 patterns
  - `ats/` — Applicant Tracking System parsing and optimization
  - `autofix/` — Automated resume improvement suggestions
  - `security.py` — Security utilities (OWASP ASVS compliant)
  - `observability.py` — Metrics and monitoring
- `sources/` — Job board scrapers with common base classes
  - `job_scraper_base.py` — Abstract base with rate limiting, error handling
  - `*_scraper.py` — Individual scrapers (Greenhouse, Lever, Reed, JobSpy, JobsWithGPT)
  - `*_mcp_scraper.py` — MCP-based scrapers using subprocess communication
- `matchers/` — Scoring algorithms and matching logic
- `notify/` — Alert systems (Slack, email) with rate limiting
- `models/` — Pydantic data models and SQLModel schemas
- `utils/` — Shared utilities (config, logging, scraping, errors)
- `extension/` — Browser extension for one-click job saving (Chrome/Firefox)
- `config/` — User preferences, JSON schemas, skills taxonomy, resume parser config
- `templates/` — Slack/email message templates + web UI Jinja2 templates
- `docker/` — Multi-stage production containers with security scanning
- `terraform/` — Infrastructure as code (GCP, AWS) with MCP server deployment
- `examples/` — Runnable demos showcasing ML, MCP, detection, and autofix features
- `tests/` — Comprehensive test suite (85%+ coverage)
  - `tests/unit_jsa/` — Tests for new core (src/jsa) with strict typing
  - `tests/unit/` — Legacy tests being migrated
  - `tests/smoke/` — Quick smoke tests for CI
  - Property-based tests with Hypothesis in test_properties.py
- `docs/` — Extensive documentation (45+ guides, WCAG compliant)
- `scripts/` — Development utilities (setup wizard, MCP validation, security scans)

## Tooling & commands
- **CLI (jsa.cli):**
  - Local run: `python -m jsa.cli run-once [--dry-run] [--config PATH]`
  - Web UI: `python -m jsa.cli web --port 5000`
  - Config validate: `python -m jsa.cli config-validate --path config/user_prefs.json`
  - Health check: `python -m jsa.cli health`
  
- **Development (make targets):**
  - `make dev` — Install dev dependencies (includes resume analysis extras)
  - `make test` — Run full test suite (pytest)
  - `make test-core` — Run only src/jsa tests
  - `make lint` — Ruff linter (src/jsa, tests/unit_jsa)
  - `make fmt` — Black formatter (line-length=100)
  - `make type` — mypy type checker (strict mode)
  - `make cov` — Coverage report (85% minimum threshold)
  - `make security` — PyGuard security scan
  - `make mut` — Mutation testing (mutmut)
  - `make analyze` — Run sample ATS analysis (examples/sample_resume.txt)
  - `make clean` — Remove caches and build artifacts
  
- **Scripts & Utilities:**
  - `python scripts/setup_wizard.py` — Interactive setup for new users
  - `python scripts/validate_mcp_config.py` — Validate MCP server configuration
  - `python scripts/ats_cli.py scan --resume PATH` — Analyze resume ATS compatibility
  - `python scripts/security_scan.py` — Enhanced security scanning
  
- **Pre-commit hooks:**
  - `make precommit-install` — Install git hooks
  - `make precommit-run` — Run all hooks manually
  
- **Docker:**
  - `docker/` contains production-ready container images
  - Multi-stage builds with security scanning
  - MCP development environment in `docker-compose.mcp.yml`

> If a command here appears missing, prefer adding a small, well-documented CLI subcommand to `jsa.cli` rather than inventing new scripts.

## Coding standards
- **Language:** Python 3.11+ (modern type hints, walrus operator)
- **Style:** PEP 8/PEP 257 via Black (line-length=100) + Ruff linter
  - Ruff rules: E (pycodestyle errors), F (pyflakes), B (bugbear), I (isort), UP (pyupgrade), S (bandit security)
  - Exceptions documented in pyproject.toml per-file-ignores
- **Type Safety:** mypy strict mode enabled for src/jsa
  - All public functions must have type hints
  - Use Pydantic BaseModel for data validation
  - Runtime type checking with Pydantic where appropriate
- **Inclusive Terminology:** Use modern, inclusive language
  - Use "allowlist" instead of "whitelist"
  - Use "denylist" instead of "blacklist"
  - Use "main" branch instead of "master" branch
  - Use "primary/replica" instead of "master/slave" in architecture discussions
- **Logging:** Structured logging via `jsa.logging`
  - Use appropriate levels: DEBUG (dev details), INFO (user actions), WARNING (degraded), ERROR (failures)
  - No secrets in logs (use sanitizers)
  - Single-line JSON format for production parsing
- **Testing:** Comprehensive pytest suite (85% coverage minimum)
  - Unit tests: tests/unit_jsa/ (for src/jsa)
  - Integration tests: tests/integration/
  - Property-based tests: Hypothesis framework
  - Fixtures in examples/fixtures/ for scrapers
  - Mock external APIs (no live calls in tests)
  - Test names: `test_<feature>_<scenario>` (e.g., test_scraper_respects_rate_limit)
- **Security:** 
  - Bandit security scanning (config in config/bandit.yaml)
  - PyGuard for additional security checks
  - Secrets via .env only (never committed)
  - Input validation on all external data
  - Rate limiting on all scrapers
- **Dependencies:**
  - Favor stdlib first, then: requests, BeautifulSoup4, Playwright
  - Optional extras: [resume] (PDF/DOCX parsing), [ml] (transformers, torch), [mcp] (Model Context Protocol)
  - Pinned versions in pyproject.toml
  - Security updates via Dependabot

## Data contracts

### Job record (normalized)
```json
{
  "source": "greenhouse|lever|reed|jobspy|jobswithgpt|…",
  "source_job_id": "string",
  "title": "string",
  "company": "string",
  "location": "string",
  "remote": true,
  "posted_at": "ISO8601",
  "url": "https://…",
  "description_raw": "string",
  "salary_min": 0,
  "salary_max": 0,
  "currency": "USD",
  "tags": ["python","backend", "…"],
  "collected_at": "ISO8601"
}
```

### Score record
```json
{
  "job_id": "fk to job",
  "overall": 0.0,
  "factors": {
    "skills": 0.0,
    "salary": 0.0,
    "location": 0.0,
    "company": 0.0,
    "recency": 0.0
  }
}
```

> If you add fields, maintain backward compatibility and provide a migration.

## Scoring rules (default weighting)
- Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5%.
- Keep weights configurable in `user_prefs.json`; never hardcode user-specific keywords in code.
- When missing data (e.g., no salary), degrade gracefully, don't crash.

## Slack alerts
- Post only high-value matches (threshold from config). Include title, company, location, score breakdown, and link.
- Do not include full description bodies or any PII. Respect Slack rate limits and retries.

## Source scrapers — pattern to follow
1. **Capability probe** (robots.txt, lightweight HEAD/GET).
2. **Fetch** with polite headers and backoff.
3. **Parse** HTML/JSON → normalized Job record.
4. **De-dupe** on `(source, source_job_id)` or canonical URL.
5. **Persist** to SQLite; return normalized jobs to the pipeline.
6. **Error handling**: catch/label transient vs permanent errors; don't fail the entire run on a single bad page.

## "Ghost job" detection (early heuristics to implement/extend)
- Evergreen titles + unchanging content for >21 days.
- Missing canonical job ID or application link; aggregator-only pages.
- Excessive recruiter contact CTAs; "always hiring" language.
- Score "ghostiness" 0–1; suppress above threshold but keep record for metrics.

## Performance & reliability
- Target 10–50 jobs/min single-process on a dev laptop.
- Use exponential backoff (jitter), timeouts, and circuit breakers around sources to avoid cascading failures.
- Treat external sources as unreliable; prefer idempotent writes and resumable runs.

## AI/ML Capabilities (v0.6+)
New advanced features available:
- **Semantic Matching:** BERT-based job description similarity (sentence-transformers)
- **Resume Analysis:** 13 industry profiles (Tech, Healthcare, Finance, Legal, etc.)
  - ATS optimization scoring
  - Skills extraction and gap analysis
  - Education/experience parsing
  - Contact info extraction
- **Scam Detection:** FBI IC3, FTC, BBB pattern matching
  - Ghost job detection (evergreen postings, missing IDs)
  - MLM/pyramid scheme detection
  - Confidence scoring for legitimate opportunities
- **Sentiment Analysis:** VADER sentiment on job descriptions
- **Adaptive Learning:** System learns from user feedback over time
- **Confidence Scoring:** Multi-factor ML confidence with calibration

See `docs/AI_ML_ROADMAP.md` and `docs/ML_CAPABILITIES.md` for details.

## MCP Integration (Model Context Protocol)
JobSentinel integrates with MCP servers for enhanced AI capabilities:

### Built-in (GitHub Copilot)
- **github-mcp:** Repository operations, issues, PRs (OAuth, automatic - no config needed)

### External (Configured)
- **context7:** Version-specific documentation lookup (HTTP, needs API key)
- **openai-websearch:** Web search via OpenAI (local/uvx, needs API key)
- **fetch:** Web content fetching (local/npx, ready)
- **playwright:** Browser automation (local/npx, ready)

**Config:** `.github/copilot-mcp.json` (HTTP and local command servers)  
**Validation:** `python3 scripts/validate_mcp_config.py`  
**Docs:** `.github/MCP_CONFIG_README.md` and `docs/MCP_INTEGRATION.md`

**Important:** GitHub MCP tools are built-in to Copilot. Do NOT add GitHub server to copilot-mcp.json. Personal Access Tokens (PAT) are NOT supported for GitHub MCP - it uses OAuth automatically.

## Good first tasks for Copilot Agent
- Add a new public scraper (e.g., Workable) following `sources/job_scraper_base.py` pattern
- Implement `ghost_job_score()` + unit tests in `src/domains/detection/` and wire into scoring pipeline
- Add `--dry-run` paths that emit what would be sent to Slack without posting
- Enhance the job tracker CRM (`src/jsa/tracker/`) with new status transitions or export formats
- Add new industry profile to resume parser (see `config/resume_parser.json`)
- Extend ML capabilities in `src/domains/ml/` (new semantic models, confidence scoring)
- Enhance browser extension (`extension/`) with new job board support
- Add new MCP server integration in `src/domains/mcp_integration/`
- Improve accessibility (WCAG 2.1 AA compliance) in web UI templates
- Write property-based tests using Hypothesis for core business logic
- Add new autofix rules in `src/domains/autofix/` for resume optimization
- Enhance security scanning in `scripts/security_scan.py` with new vulnerability patterns

## Browser Extension Integration
- **Location:** `extension/` directory
- **Purpose:** One-click job saving from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever
- **Architecture:** Content scripts inject job extraction logic, popup communicates with local API
- **API Integration:** Connects to `http://localhost:5000` (JobSentinel web UI/API)
- **Permissions:** `activeTab`, `storage` only - minimal privacy footprint
- **Manifest V3:** Modern Chrome/Firefox compatible extension format
- **Installation:** Load unpacked from `extension/` directory in Chrome Developer Mode

## Documentation Resources
Comprehensive documentation in `docs/`:
- **[DOCUMENTATION_INDEX.md](../docs/DOCUMENTATION_INDEX.md)** — Central hub for all docs
- **[BEST_PRACTICES.md](../docs/BEST_PRACTICES.md)** — Production-grade coding patterns
- **[API_INTEGRATION_GUIDE.md](../docs/API_INTEGRATION_GUIDE.md)** — Add new job board integrations
- **[DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md)** — Production deployment (AWS, GCP, Azure)
- **[ARCHITECTURE.md](../docs/ARCHITECTURE.md)** — System design and data flow
- **[AUTHORITATIVE_STANDARDS.md](../docs/AUTHORITATIVE_STANDARDS.md)** — 39+ industry standards
- **[AI_ML_ROADMAP.md](../docs/AI_ML_ROADMAP.md)** — AI/ML vision (v0.6 to v1.0)
- **[ACCESSIBILITY.md](../docs/ACCESSIBILITY.md)** — WCAG 2.1 Level AA compliance
- **[BEGINNER_GUIDE.md](../docs/BEGINNER_GUIDE.md)** — Zero-knowledge terminal guide
- **[SRE_RUNBOOK.md](../docs/SRE_RUNBOOK.md)** — Incident response and operations
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — Dev setup and PR guidelines

When helping with code changes, reference these docs for context.

## Architecture Notes
- **Clean Architecture:** Domain logic isolated from infrastructure concerns
- **Dependency Injection:** Config and services injected rather than global state
- **Circuit Breakers:** Resilience patterns for external APIs (tenacity library)
- **Rate Limiting:** Per-source rate limits with exponential backoff
- **Health Checks:** Comprehensive diagnostics in `jsa.health_check`
- **Observability:** Structured logging + metrics collection points
- **Security Boundaries:** 
  - Scrapers are read-only (no writes to job boards)
  - All external data validated before persistence
  - Secrets in .env, never in code or logs
  - SQL injection prevention (SQLAlchemy ORM)

## Key Architectural Patterns

### Typed Facades Pattern (`src/jsa/`)
New modules provide typed interfaces over legacy utilities:
- `jsa.config.ConfigService` wraps `utils.config.ConfigManager` 
- `jsa.db` provides typed database operations
- `jsa.logging` standardizes structured logging
- Pattern: Maintain backward compatibility while adding type safety

### Domain-Driven Design (`src/domains/`)
Organized by business capabilities, not technical layers:
- `ml/` — Machine learning and AI features
- `detection/` — Scam and quality detection
- `mcp_integration/` — Model Context Protocol servers
- `ats/` — Applicant Tracking System optimization
- Each domain is self-contained with its own models and services

### MCP Integration Pattern
Model Context Protocol servers for external capabilities:
- Use subprocess communication for isolation
- Validate all MCP configs with `scripts/validate_mcp_config.py`
- Standard client interface in `src/domains/mcp_integration/mcp_client.py`
- Built-in GitHub MCP (no config needed), external servers in `.github/copilot-mcp.json`

### Scraper Inheritance Hierarchy
- `job_scraper_base.JobScraperBase` — Abstract base with common functionality
- `api_based_scrapers.APIBasedScraper` — For REST APIs
- `playwright_scraper.PlaywrightScraper` — For JS-heavy sites
- MCP scrapers inherit from base but use subprocess communication
- Always implement: `fetch_jobs()`, respect rate limits, handle errors gracefully

### Testing Strategy
- `tests/unit_jsa/` — Strictly typed tests for new core (`src/jsa`)
- `tests/unit/` — Legacy tests being gradually migrated  
- `tests/smoke/` — Fast integration tests for CI
- Property-based testing with Hypothesis in `test_properties.py`
- Mock all external services; use fixtures in `examples/fixtures/`

## Test Infrastructure
- **Framework:** pytest with asyncio support
- **Coverage:** 85% minimum (enforced in CI)
- **Fixtures:** Reusable test data in `tests/fixtures/`
- **Mocking:** unittest.mock + pytest-mock for external services
- **Property Testing:** Hypothesis for generative tests
- **Mutation Testing:** mutmut to verify test quality
- **Integration Tests:** Docker-based test containers where needed
- **CI/CD:** GitHub Actions workflows in `.github/workflows/`
  - `ci.yml` — Main CI pipeline (lint, test, type check, security scan)
  - `security.yml` — Security scanning (Bandit, PyGuard, dependency checks)
  - `mega-linter.yml` — Comprehensive linting across all file types
  - `dependabot-automerge.yml` — Auto-merge safe dependency updates

Run tests before submitting PRs: `make test && make lint && make type && make cov`

## CI/CD Pipeline
Automated checks on every PR and push to main/develop:
1. **Path-based filtering:** Skips unnecessary checks for docs-only changes
2. **Linting:** Ruff + Black (formatting), MegaLinter (comprehensive)
3. **Type checking:** mypy strict mode on src/jsa
4. **Testing:** Full pytest suite with 85% coverage minimum
5. **Security:** Bandit + PyGuard scans, dependency vulnerability checks
6. **Build validation:** Ensure package builds correctly
7. **Concurrency control:** Cancel outdated runs automatically

All checks must pass before merge. See `.github/workflows/` for details.

### CI/CD Workflow Details
- **Main CI:** `.github/workflows/python-qa.yml` - Comprehensive quality checks
- **Dependabot Auto-merge:** `.github/workflows/dependabot-auto-merge.yml` - Auto-approve/merge safe dependency updates
- **MegaLinter:** `.github/workflows/mega-linter.yml` - Multi-language linting
- **Security:** Bandit, PyGuard, and dependency scanning with automated failure on critical issues
- **Test Matrix:** Python 3.11, 3.12, 3.13 across Ubuntu/Windows/macOS
- **Coverage Enforcement:** 85% minimum with fail-under threshold

## Review checklist (pull requests)
- [ ] No secrets committed; `.env`/env-vars only.
- [ ] Robots.txt respected; concurrency sane.
- [ ] New config keys documented with defaults.
- [ ] Tests added/updated and passing locally.
- [ ] Logs are structured; no PII or secrets.
- [ ] Backward compatibility: schema migrations included if needed.
- [ ] Coverage ≥85% maintained (`make cov`).
- [ ] Lint passes (`make lint`).
- [ ] Type check passes (`make type`).
- [ ] Security scan clean (`make security`).
- [ ] Documentation updated if API/config changes.
- [ ] Conventional commit messages (feat:, fix:, docs:, etc.).

## Common Pitfalls & Gotchas
1. **Python Version:** Requires 3.11+ (uses walrus operator, modern type hints)
   - Check with `python3 --version` or `python --version`
   - CI tests on Python 3.11, 3.12, and 3.13

2. **Virtual Environment:** Always activate before development
   - Symptom: `ModuleNotFoundError: No module named 'jsa'`
   - Fix: `source .venv/bin/activate` (Linux/Mac) or `.venv\Scripts\activate` (Windows)

3. **Playwright Browsers:** Must be installed separately
   - Symptom: `Playwright executable not found`
   - Fix: `playwright install chromium`

4. **Config Files:** Must exist before running
   - Copy: `cp config/user_prefs.example.json config/user_prefs.json`
   - Edit with your preferences before first run

5. **Import Paths:** Use absolute imports from package roots
   - ✅ GOOD: `from jsa.config import load_config`
   - ❌ AVOID: `from ..config import load_config`

6. **Type Hints:** Required for mypy strict mode in src/jsa
   - All public functions need type hints
   - Use `# type: ignore[<code>]` sparingly with justification

7. **Test Isolation:** Tests must not depend on external services
   - Mock all HTTP calls
   - Use fixtures for test data
   - No live scraping in tests

8. **Secrets:** Never commit .env or files containing secrets
   - .gitignore already handles this
   - CI fails if secrets detected in code

9. **Database Migrations:** If you change models, provide migration
   - Document in PR description
   - Maintain backward compatibility where possible

10. **Documentation Updates:** Update docs when changing APIs or config
    - README.md for user-facing changes
    - CONTRIBUTING.md for dev process changes
    - CHANGELOG.md for version changes

---
**Absolute rules:**
- Do not propose login flows, screen-scraping behind auth, or bypassing paywalls/captchas.
- Do not add outbound analytics/telemetry.
- Do not post to Slack without a valid webhook URL and channel from config.
- Do not commit secrets, API keys, or credentials (use .env only).
- Do not compromise user privacy (all data stays local unless explicitly configured otherwise).
- Do not violate robots.txt or rate limits (we are polite web citizens).
