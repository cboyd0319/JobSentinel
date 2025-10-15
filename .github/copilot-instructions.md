# Repository Instructions — JobSentinel

> Purpose: Private, local-first job-search automation. Scrape public job boards, score against user prefs, alert on high-value roles. Runs locally for $0; optional cloud schedule for low cost. Do not add features that compromise privacy or require third-party data brokers.

## Quick Reference for Agents

| Task | Path/Command | Notes |
|------|--------------|-------|
| **Core code** | `deploy/common/app/src/jsa/` | Main application code |
| **Scrapers** | `deploy/common/app/sources/` | Job board integrations |
| **Tests** | `deploy/common/tests/` | Unit, integration, property tests |
| **Config** | `deploy/common/config/user_prefs.json` | User preferences (see example) |
| **Run locally** | `python -m jsa.cli run-once` | Single scrape run |
| **Web UI** | `python -m jsa.cli web --port 8000` | Start web interface |
| **Test suite** | `make test` | Run all tests (85% coverage) |
| **Type check** | `make type` | mypy strict on src/jsa |
| **Lint** | `make lint` | Ruff linter |
| **Docs** | `docs/DOCUMENTATION_INDEX.md` | Complete doc index |

**Important:** All code is in `deploy/`, not project root. Never reference old paths like `src/` or `tests/` at root level.

## Project overview
- **Version:** 0.9.0 (October 2025)
- **Python:** 3.11+ (uses modern type hints, walrus operator)
- Core loop: **Scrape → Normalize → Score → Alert → Persist**.
- Sources (public only): Greenhouse, Lever, JobsWithGPT, Reed, JobSpy aggregator. Do **not** log in to sites or bypass paywalls.
- Alerts: Slack Incoming Webhook (channel configured by user).
- Storage: Local files + SQLite (or equivalent). No telemetry. **Never** ship code that exfiltrates user data.
- Config: `deploy/common/config/user_prefs.json` (see example file in repo). Keep schema stable; add new keys behind sensible defaults.
- **Since v0.6:** AI/ML capabilities (BERT semantic matching, resume analysis), scam detection, accessibility improvements, MCP integration.

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

### File Organization Standards - **CRITICAL REQUIREMENT**

**⚠️ MANDATORY: Repository is deployment-centric as of October 2025**

All code MUST follow this structure. Never reference old paths:

#### Root Directory (12 essential items only)
- **`.github/`** — GitHub configs (workflows, templates, Copilot instructions) ONLY
- **`docs/`** — All documentation (never in `.github/`)
- **`data/`** — Runtime data (SQLite, logs, user data)
- **`deploy/`** — **ALL deployment and application code**
- **Metadata files:** pyproject.toml, requirements.txt, LICENSE, README.md, CHANGELOG.md, etc.
- **Dev tools:** Makefile, .editorconfig, .pre-commit-config.yaml, etc.

#### Deploy Directory Structure (REQUIRED)
```
deploy/
├── local/                    # Platform-specific deployments
│   ├── windows/             # Windows scripts (setup.ps1, launch-gui.ps1, etc.)
│   ├── macos/               # macOS scripts (setup.sh, launch-gui.sh, etc.)
│   └── linux/               # Linux scripts
├── cloud/                    # Cloud deployments
│   ├── common/              # Shared cloud code (bootstrap.py, etc.)
│   ├── docker/              # Docker containers
│   ├── gcp/                 # Google Cloud Platform (Terraform)
│   ├── aws/                 # Amazon Web Services
│   └── azure/               # Microsoft Azure
└── common/                   # **ALL SHARED APPLICATION CODE**
    ├── app/                 # Core application
    │   ├── src/            # Main source (jsa/, domains/, sources/, etc.)
    │   ├── models/         # Data models
    │   ├── sources/        # Job board scrapers
    │   └── utils/          # Utilities
    ├── web/                 # Web interface
    │   ├── frontend/       # React/Vite UI
    │   ├── static/         # CSS, JS, images
    │   └── templates/      # Jinja2 templates
    ├── config/              # Configuration files
    ├── tests/               # Test suite
    ├── scripts/             # Operational scripts
    ├── examples/            # Demo code
    ├── extensions/          # Browser extensions
    └── constraints/         # Dependency constraints
```

#### Path Rules (STRICTLY ENFORCED)
- ✅ **DO:** Use `deploy/common/app/src/jsa/` for core code
- ✅ **DO:** Use `deploy/common/tests/` for tests
- ✅ **DO:** Use `deploy/common/scripts/` for scripts
- ✅ **DO:** Use `deploy/common/config/` for configs
- ❌ **NEVER:** Reference old paths like `src/`, `tests/`, `scripts/`, `config/` at root
- ❌ **NEVER:** Create files outside `deploy/` unless absolutely necessary (metadata only)

#### When Adding New Code
1. **Application code** → `deploy/common/app/src/`
2. **Tests** → `deploy/common/tests/`
3. **Scripts** → `deploy/common/scripts/`
4. **Examples** → `deploy/common/examples/`
5. **Web assets** → `deploy/common/web/`
6. **Platform deployment** → `deploy/local/{platform}/` or `deploy/cloud/{provider}/`
7. **Documentation** → `docs/`

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
- **User preferences:** `deploy/common/config/user_prefs.json` with schema validation (`user_prefs.schema.json`)
- **Secrets:** Environment variables or `.env` files (never commit `.env`)
- **Skills taxonomy:** `deploy/common/config/skills_taxonomy_v1.json` for job matching
- **Resume parser:** `deploy/common/config/resume_parser.json` for ML configuration
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

## Repo map (detailed structure) - **UPDATED October 2025**

**⚠️ CRITICAL: All paths below are CURRENT. Never use old paths.**

### Root (Metadata Only)
- `pyproject.toml` — Python package configuration
- `requirements.txt` — Core dependencies
- `Makefile` — Development tasks (updated for new structure)
- `LICENSE`, `README.md`, `CHANGELOG.md`, etc. — Project metadata
- `data/` — Runtime data (SQLite, logs)
- `docs/` — Documentation (40+ guides)

### Deploy Structure (ALL code lives here)
- `deploy/common/app/src/jsa/` — Core application code (v0.6+ refactored)
  - `cli.py` — Command-line interface with subcommands (run-once, web, config-validate)
  - `config.py` — Configuration loading and validation
  - `db.py` — Database abstraction layer
  - `health_check.py` — System health monitoring and diagnostics
  - `logging.py` — Structured logging configuration
  - `errors.py` — Custom exception classes
  - `web/` — Flask-based web UI with blueprints
  - `http/` — HTTP client utilities with rate limiting
- `deploy/common/app/src/domains/` — Domain models (ATS, ML, LLM, resume analysis)
- `deploy/common/app/sources/` — Job board scrapers (Greenhouse, Lever, Reed, JobSpy, etc.)
- `deploy/common/app/src/matchers/` — Scoring algorithms and matching logic
- `deploy/common/app/src/notify/` — Alert systems (Slack, email)
- `deploy/common/app/models/` — Data models and schemas
- `deploy/common/app/utils/` — Shared utilities and helpers
- `deploy/common/config/` — User preferences, validation schemas, example configs
- `deploy/common/web/templates/` — Jinja2 templates (Slack/email messages)
- `deploy/common/web/frontend/` — React/Vite UI
- `deploy/common/web/static/` — CSS, JS, images
- `deploy/cloud/docker/` — Container images and compose files
- `deploy/cloud/gcp/` — Infrastructure as code (Terraform for GCP)
- `deploy/common/examples/` — Runnable demos, fixtures, and integration tests
- `deploy/common/tests/` — Comprehensive test suite
  - `deploy/common/tests/unit_jsa/` — Tests for new core (src/jsa)
  - `deploy/common/tests/integration/` — Integration tests
  - Property-based tests with Hypothesis
- `deploy/common/scripts/` — Development and deployment utilities
- `deploy/local/windows/` — Windows deployment scripts
- `deploy/local/macos/` — macOS deployment scripts
- `deploy/local/linux/` — Linux deployment scripts

## Tooling & commands
- **CLI (jsa.cli):**
  - Local run: `python -m jsa.cli run-once [--dry-run] [--config PATH]`
  - Web UI: `python -m jsa.cli web --port 5000`
  - Config validate: `python -m jsa.cli config-validate --path deploy/common/config/user_prefs.json`
  - Health check: `python -m jsa.cli health`
  
- **Development (make targets):**
  - `make dev` — Install dev dependencies (includes resume analysis extras)
  - `make test` — Run full test suite (pytest)
  - `make test-core` — Run only deploy/common/app/src/jsa tests
  - `make lint` — Ruff linter (deploy/common/app/src/jsa, deploy/common/tests/unit_jsa)
  - `make fmt` — Black formatter (line-length=100)
  - `make type` — mypy type checker (strict mode)
  - `make cov` — Coverage report (85% minimum threshold)
  - `make security` — PyGuard security scan
  - `make mut` — Mutation testing (mutmut)
  - `make clean` — Remove caches and build artifacts
  
- **Pre-commit hooks:**
  - `make precommit-install` — Install git hooks
  - `make precommit-run` — Run all hooks manually
  
- **Docker:**
  - `deploy/cloud/docker/` contains production-ready container images
  - Multi-stage builds with security scanning

> If a command here appears missing, prefer adding a small, well-documented CLI subcommand to `jsa.cli` rather than inventing new scripts.

## Coding standards
- **Language:** Python 3.11+ (modern type hints, walrus operator)
- **Style:** PEP 8/PEP 257 via Black (line-length=100) + Ruff linter
  - Ruff rules: E (pycodestyle errors), F (pyflakes), B (bugbear), I (isort), UP (pyupgrade), S (bandit security)
  - Exceptions documented in pyproject.toml per-file-ignores
- **Type Safety:** mypy strict mode enabled for deploy/common/app/src/jsa
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
  - Unit tests: deploy/common/tests/unit_jsa/ (for deploy/common/app/src/jsa)
  - Integration tests: deploy/common/tests/integration/
  - Property-based tests: Hypothesis framework
  - Fixtures in deploy/common/examples/fixtures/ for scrapers
  - Mock external APIs (no live calls in tests)
  - Test names: `test_<feature>_<scenario>` (e.g., test_scraper_respects_rate_limit)
- **Security:** 
  - Bandit security scanning (config in deploy/common/config/bandit.yaml)
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

## Source scrapers — pattern to follow (in deploy/common/app/sources/)
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
**Validation:** `python3 deploy/common/scripts/validate_mcp_config.py`  
**Docs:** `.github/MCP_CONFIG_README.md` and `docs/MCP_INTEGRATION.md`

**Important:** GitHub MCP tools are built-in to Copilot. Do NOT add GitHub server to copilot-mcp.json. Personal Access Tokens (PAT) are NOT supported for GitHub MCP - it uses OAuth automatically.

## Good first tasks for Copilot Agent
- Add a new public scraper (e.g., Workable) behind a feature flag in deploy/common/app/sources/.
- Implement `ghost_job_score()` + unit tests and wire into the scoring pipeline.
- Add `--dry-run` paths that emit what would be sent to Slack without posting.
- Improve config validation with schema checking and helpful error messages.
- Write golden-file tests for an existing scraper (recorded fixtures in deploy/common/examples/fixtures/).
- Add new industry profile to resume parser (see deploy/common/config/resume_parser.json).
- Enhance scam detection with additional patterns.
- Add new job board to deploy/common/app/sources/ following the scraper pattern.
- Improve accessibility (WCAG 2.1 Level AA compliance for web UI in deploy/common/web/).

## Documentation Resources
Comprehensive documentation in `docs/` (streamlined October 2025 - 28 → 13 files):
- **[DOCUMENTATION_INDEX.md](../docs/DOCUMENTATION_INDEX.md)** — Central hub for all docs (START HERE)
- **[QUICKSTART.md](../docs/QUICKSTART.md)** — Setup guide for all platforms (Windows/macOS/Linux)
- **[TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)** — Complete troubleshooting guide for all issues
- **[UI.md](../docs/UI.md)** — GUI launcher and web interface documentation
- **[BEST_PRACTICES.md](../docs/BEST_PRACTICES.md)** — Production-grade coding patterns
- **[API_INTEGRATION_GUIDE.md](../docs/API_INTEGRATION_GUIDE.md)** — Add new job board integrations
- **[DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md)** — Cloud deployment (AWS, GCP, Azure)
- **[ARCHITECTURE.md](../docs/ARCHITECTURE.md)** — System design and data flow
- **[AUTHORITATIVE_STANDARDS.md](../docs/AUTHORITATIVE_STANDARDS.md)** — 45+ industry standards
- **[AI_ML_ROADMAP.md](../docs/AI_ML_ROADMAP.md)** — AI/ML vision (v0.6 to v1.0)
- **[DATABASE_GUIDE.md](../docs/DATABASE_GUIDE.md)** — Database operations and queries
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

## Test Infrastructure
- **Framework:** pytest with asyncio support
- **Coverage:** 85% minimum (enforced in CI)
- **Fixtures:** Reusable test data in `deploy/common/tests/fixtures/`
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
3. **Type checking:** mypy strict mode on deploy/common/app/src/jsa
4. **Testing:** Full pytest suite with 85% coverage minimum
5. **Security:** Bandit + PyGuard scans, dependency vulnerability checks
6. **Build validation:** Ensure package builds correctly
7. **Concurrency control:** Cancel outdated runs automatically

All checks must pass before merge. See `.github/workflows/` for details.

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
   - Copy: `cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json`
   - Edit with your preferences before first run

5. **Import Paths:** Use absolute imports from package roots
   - ✅ GOOD: `from jsa.config import load_config`
   - ❌ AVOID: `from ..config import load_config`

6. **Type Hints:** Required for mypy strict mode in deploy/common/app/src/jsa
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
- Do not violate robots.txt or rate limits (polite web citizens).
- This is a single-developer personal project. Use direct, plainspoken language. No "we"/"our"/"us" - use "you" (for user) or direct imperative commands. Follow tone guide: `docs/doc_templates/github-repo-docs-tone-guide.md`.
