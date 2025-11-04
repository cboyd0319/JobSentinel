# Copilot Instructions — JobSentinel

Purpose: Provide clear, enforceable guidance so changes remain aligned with JobSentinel's mission, security posture, testing rigor, and documentation standards.

## Mission & Non-Negotiables

- World-class job search automation with AI/ML and MCP integration
- Privacy-first: 100% local-first operation, zero tracking, no cloud dependencies
- Smart scoring and filtering with resume-job matching
- Modern web UI: React 19 + Vite 7 with WCAG 2.1 AA accessibility
- Application tracking and automation built-in
- Free forever: $0 subscriptions, fully open source (MIT license)

**CRITICAL Repo Rules (must follow)**
- No emojis in code ever. Code comments, source files, and generated code must be emoji-free.
- Minimal documentation. Update existing docs in `docs/` or `wiki/` before creating new files. Link from `docs/DOCUMENTATION_INDEX.md`.
- Security first: Never introduce vulnerabilities. All code changes must pass bandit, ruff security checks, and CodeQL.
- Privacy paramount: No telemetry, no tracking, no data leaving the machine without explicit user consent.

Primary audience: Job seekers, passive candidates, recruiters; secondary: developers seeking local-first automation.
Target OS: Windows → macOS → Linux (prioritize Windows for installer development).

## Architecture Snapshot

- **Backend:** Python 3.11+ with FastAPI for REST API and Flask for legacy web UI
- **Frontend:** React 19 + Vite 7 with TypeScript, accessible UI components
- **Database:** SQLite (default), PostgreSQL (optional), async support via aiosqlite/asyncpg
- **Scrapers:** Playwright-based with resilience patterns, supports multiple job boards
- **AI/ML:** Optional features using sentence-transformers, spacy, transformers
- **MCP Integration:** Model Context Protocol for enhanced job intelligence
- **LLM:** OpenAI, Anthropic, LiteLLM for job scoring and resume analysis
- **Resume Analysis:** ATS compatibility scoring, keyword optimization, bias detection

## Documentation Policy (must follow)

- All canonical docs live under `docs/` and `wiki/`
- Allowed root stubs (minimal link-only): `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- This file (`.github/copilot-instructions.md`) is an operational exception
- Main index: `docs/DOCUMENTATION_INDEX.md`
- User guides in `docs/guides/`, architecture in `docs/architecture/`, examples in `deploy/common/examples/`

## Testing & Coverage Requirements

- Repo-wide coverage ≥ 75%; core modules (jsa, domains) ≥ 85%
- Branch coverage enforced in CI (fail-under gates)
- Tools: pytest + pytest-cov + pytest-asyncio + pytest-mock
- Integration tests marked with `@pytest.mark.integration`
- Windows/macOS deployment tests marked with platform-specific markers
- Property-based tests using hypothesis where applicable
- Mutation testing with mutmut for critical modules

## CI Rules & Required Checks

- Coverage job with fail-under thresholds (repo ≥75%; core ≥85%)
- Linting: ruff check (E, F, B, I, UP, S rules enabled)
- Type checking: mypy with strict mode for `jsa` module
- Security: bandit, CodeQL, dependency-review
- Docs checks: markdownlint, yamllint, link validation
- Platform installers: Windows (MSI/Installer), macOS (PKG), tested in CI

## Single Source of Truth

- Main README: overview, quickstart, features
- Documentation index: `docs/DOCUMENTATION_INDEX.md`
- Capabilities: `wiki/Capabilities.md`
- User docs: `docs/guides/`, `docs/quickstart/`
- Developer docs: `CONTRIBUTING.md`, `docs/architecture/`, `TESTING_SUMMARY.md`

## When Adding or Changing Features

1) Update reference and guides:
   - `README.md` Features section
   - `wiki/Capabilities.md`
   - `docs/DOCUMENTATION_INDEX.md`
   - Relevant guide in `docs/guides/`
2) Add tests with ≥85% coverage for new code:
   - Unit tests in `deploy/common/tests/unit/` or `deploy/common/tests/unit_jsa/`
   - Integration tests if needed (mark with `@pytest.mark.integration`)
3) Run validation:
   ```bash
   make lint      # ruff + mypy
   make test      # pytest
   make cov       # coverage report
   ```
4) Update installers if CLI changes:
   - Windows: `deploy/common/app/src/jsa/windows_shortcuts.py`
   - macOS: `deploy/common/app/src/jsa/macos_shortcuts.py`

## Build Systems & Deployment Checklist

- Python package managed via `pyproject.toml` with optional dependencies:
  - `dev`: Development tools (pytest, ruff, mypy, black, bandit)
  - `resume`: Resume analysis (pdfplumber, spacy, python-docx)
  - `ml`: Machine learning (sentence-transformers, transformers, torch)
  - `mcp`: Model Context Protocol integration
  - `llm`: LLM providers (openai, anthropic, litellm)
  - `postgres`: PostgreSQL support (asyncpg, psycopg2-binary)
  - `windows`: Windows-specific (pywin32)
- Install: `pip install -e .[dev,resume,ml,mcp,llm]`
- Platform installers:
  - Windows: MSI via WiX or Inno Setup, creates desktop shortcuts
  - macOS: PKG installer with .command shortcuts
  - Both tested in CI with deployment simulation tests

## Security & Privacy Requirements

- Zero telemetry: no data leaves machine without explicit user action
- Encrypted secrets: use cryptography library for sensitive data
- Secure subprocess: use `utils.secure_subprocess` for external commands
- Input validation: sanitize all user inputs, especially for web endpoints
- Rate limiting: built-in rate limiters for all external API calls
- No hardcoded credentials: use environment variables or config files

## Code Quality Standards

### Linting (ruff)
- All source code in `deploy/common/app/src/` must pass `ruff check` with no errors
- Enabled rule categories: E (errors), F (pyflakes), B (bugbear), I (isort), UP (pyupgrade), S (security)
- Test files have relaxed rules (see `pyproject.toml` `[tool.ruff.lint.per-file-ignores]`)
- Auto-fix safe issues: `ruff check --fix`

### Type Checking (mypy)
- Strict mode enabled for `deploy/common/app/src/jsa/`
- All public functions must have type annotations
- `--strict` flags: no untyped defs, no untyped calls, warn on return any
- Web UI routes (Flask) excluded temporarily (type annotation complexity)

### Formatting (black)
- Line length: 100 characters
- Target: Python 3.11+
- Auto-format: `make fmt` or `black .`

### Security Scanning (bandit)
- Targets: `deploy/common/app/src/jsa/` and `deploy/common/app/src/domains/`
- Security issues in source code must be fixed or justified with `# nosec` + comment
- Test code warnings are generally acceptable (test data, mocks)

## Sanity Checks Before Merge

- [ ] Core functionality tested (at least smoke tests for changed modules)
- [ ] Ruff checks pass for all source code: `make lint`
- [ ] Mypy checks pass: `make type`
- [ ] Coverage gates met (repo ≥75%; core ≥85%): `make cov`
- [ ] Docs updated if feature/API changed
- [ ] Security checks pass: bandit, CodeQL
- [ ] No regressions in existing tests
- [ ] Platform-specific code tested if changed (Windows/macOS)

## Module Organization

**Core Modules (`deploy/common/app/src/jsa/`):**
- `cli.py`: Main CLI entry point
- `config*.py`: Configuration management
- `db*.py`: Database facades and utilities
- `fastapi_app/`: Modern FastAPI REST API
- `web/`: Legacy Flask web UI
- `notify*.py`: Notification systems (email, Slack)
- `*.py`: Various utilities (health check, logging, filters, etc.)

**Domain Modules (`deploy/common/app/src/domains/`):**
- `ats/`: ATS compatibility analysis
- `autofix/`: Resume optimization (keyword, bullets)
- `detection/`: Scam detection, bias detection, quality scoring
- `intelligence.py`: Job intelligence and scoring
- `llm/`: LLM client and providers
- `mcp_integration/`: Model Context Protocol clients
- `ml/`: Machine learning models and features
- `validation*.py`: Input validation frameworks

**Data Models (`deploy/common/app/models/`):**
- `job.py`: Job model
- `job_batch.py`: Batch job model

**Scrapers (`deploy/common/app/sources/`):**
- `job_scraper_base.py`: Base scraper class
- `*_scraper.py`: Site-specific scrapers (LinkedIn, Indeed, RemoteOK, etc.)
- `concurrent_scraper.py`: Parallel scraping support
- `playwright_scraper.py`: Browser automation base

**Utilities (`deploy/common/app/utils/`):**
- `errors.py`: Custom exceptions
- `logging.py`: Structured logging
- `encryption.py`: Data encryption
- `validators.py`: Input validators
- `cache.py`: Caching utilities
- `secure_subprocess.py`: Safe subprocess execution

## Additional Sources

- Main README: project overview and quickstart
- Contributing guide: `CONTRIBUTING.md`
- Documentation index: `docs/DOCUMENTATION_INDEX.md`
- Testing summary: `TESTING_SUMMARY.md`
- Test implementation: `PYTEST_IMPLEMENTATION_SUMMARY.md`
- Coverage reports: `CORE_MODULES_100PCT_COVERAGE_REPORT.md`
- Wiki home: `wiki/Home.md`
- Wiki capabilities: `wiki/Capabilities.md`

Questions? Open an issue and tag `@cboyd0319`.
