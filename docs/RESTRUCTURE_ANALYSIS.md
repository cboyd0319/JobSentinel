# Project Restructure Analysis & Plan

**Generated:** 2025-10-09
**Status:** Analysis Complete - Ready for Implementation

---

## TL;DR

This project has **182 scripts** across Python, PowerShell, and Bash with significant technical debt:
- **Duplicate configuration management** (2 pyproject.toml files, scattered config/)
- **3 separate database modules** doing similar things
- **Large monolithic files** (1040+ lines in some scripts)
- **Inconsistent error handling** across old and new code
- **Mixed architectural patterns** (legacy agent.py + new typed jsa/ core)
- **225+ cache directories** polluting the repo
- **Unorganized utils/** with 20+ modules

**Key Invariants to Preserve:**
1. Local-first operation must continue working
2. Cloud deployment paths remain functional
3. Zero secrets in committed code
4. Existing user_prefs.json format compatibility

---

## Design Notes

### Assumptions
1. User has working .venv with Python 3.13
2. Existing tests pass (or are documented as broken)
3. No production deployments depend on exact current structure
4. Migration can be phased (old + new coexist temporarily)

### Contracts
- **Pre:** Project in alpha state, user accepts breakage for better structure
- **Post:** Clean modular architecture, 90%+ code passes strict linting/typing
- **Raises:** No exceptions; we document issues but proceed with restructure

### Error Taxonomy for Restructure
- **UserError:** Invalid config paths, missing required files
- **SystemError:** File permission issues, corrupted git state
- **TransientError:** N/A (this is static restructure, no network/IO races)

---

## Current State Assessment

### Directory Structure Issues

```
CURRENT (messy):
├── config/              # Mix of legacy tool configs + user data
│   ├── pyproject.toml   # DUPLICATE #1 (marked deprecated)
│   ├── mypy.ini         # Redundant with root pyproject.toml
│   └── .pylintrc        # Unused, we use ruff
├── src/
│   ├── agent.py         # 546 lines - orchestration monolith
│   ├── database.py      # DUPLICATE #1
│   ├── concurrent_database.py  # DUPLICATE #2
│   ├── unified_database.py     # DUPLICATE #3 (560 lines!)
│   ├── web_ui.py        # Legacy shim
│   ├── jsa/             # NEW typed core (good!)
│   └── domains/         # Domain-driven design attempt (incomplete)
├── utils/               # 20+ random modules, no cohesion
│   ├── config.py        # Config logic #1
│   ├── enterprise_config.py  # Config logic #2 (490 lines!)
│   ├── errors.py        # Custom exceptions
│   ├── error_taxonomy.py     # NEW error system
│   ├── logging.py       # Logging #1
│   ├── structured_logging.py # Logging #2 (365 lines!)
│   ├── ats_analyzer.py  # 821 lines
│   ├── ats_analyzer_legacy.py
│   ├── ats_scanner_legacy.py
│   ├── ultimate_ats_scanner_legacy.py  # ???
│   └── ... 15 more files
├── sources/             # Scrapers (reasonably organized)
├── cloud/               # Cloud deployment (reasonably organized)
├── scripts/             # 708KB of mixed quality scripts
│   ├── emergency/
│   ├── monitoring/
│   ├── setup/
│   ├── validation/
│   └── utilities/
├── pyproject.toml       # DUPLICATE #2 (canonical)
└── requirements.txt     # Redundant with pyproject.toml
```

### Code Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Python files | 182 | Same | ✓ |
| Largest file | 1040 lines | <500 | ❌ |
| Duplicate configs | 3+ | 1 | ❌ |
| Duplicate database modules | 3 | 1 | ❌ |
| Duplicate error/logging | 2 each | 1 each | ❌ |
| Ruff violations | 50+ | 0 | ❌ |
| Mypy strict coverage | src/jsa only | All src/ | ❌ |
| Test coverage | Unknown | 90%+ | ❌ |
| Cache pollution | 225 dirs | 0 (gitignored) | ❌ |

### Critical Issues by Severity

#### 🔴 Critical (Breaks builds/deploys)
1. **Two pyproject.toml files** - config/pyproject.toml marked deprecated but still present
2. **Three database modules** - database.py, concurrent_database.py, unified_database.py all do similar things
3. **Conflicting dependencies** - requirements.txt vs pyproject.toml drift

#### 🟡 High (Technical debt, maintainability)
1. **Monolithic files:**
   - `scripts/resume_enhancer.py` (1040 lines) - should be modularized
   - `scripts/resume_ats_scanner.py` (961 lines) - overlaps with utils/ats_analyzer.py
   - `cloud/providers/gcp/gcp.py` (857 lines) - needs sub-modules
   - `utils/ats_analyzer.py` (821 lines) - already has plugin system, extract plugins
   - `src/unified_database.py` (560 lines) - consolidate with database.py

2. **Duplicate/conflicting modules:**
   - `utils/errors.py` vs `utils/error_taxonomy.py` vs `src/jsa/errors.py`
   - `utils/logging.py` vs `utils/structured_logging.py` vs `src/jsa/logging.py`
   - `utils/config.py` vs `utils/enterprise_config.py` vs `src/jsa/config.py`

3. **Legacy cruft:**
   - `utils/*_legacy.py` files should be archived or deleted
   - `qa/` directory deleted but references remain in Makefile
   - Old pre-commit config in config/ vs root .pre-commit-config.yaml

#### 🟢 Medium (Best practices, organization)
1. **Inconsistent import styles** - relative vs absolute, star imports
2. **Missing type hints** - legacy code has none, new code has strict typing
3. **Inconsistent error handling** - bare except, silent failures
4. **No mutation testing** - Makefile has stub, not configured
5. **Scattered scripts** - scripts/ has 708KB, needs better organization

---

## Restructure Plan

### Phase 1: Foundation Cleanup (Non-Breaking)

**Goal:** Remove cruft, consolidate configs, no functional changes

#### 1.1 Clean Build Artifacts
```bash
make clean
git clean -fdx -e .venv -e .env -e config/user_prefs.json -e data/
```

#### 1.2 Consolidate Configuration
- **Action:** Delete `config/pyproject.toml` (already marked deprecated)
- **Action:** Delete `config/mypy.ini` (merge into root pyproject.toml)
- **Action:** Archive `config/.pylintrc` (we use ruff, not pylint)
- **Action:** Delete `requirements.txt` (use `pip install -e .[dev,resume]`)
- **Validation:** Ensure root `pyproject.toml` has all deps from requirements.txt

#### 1.3 Update .gitignore
```gitignore
# Build artifacts
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Testing
.pytest_cache/
.coverage
.coverage.*
htmlcov/
.tox/
.hypothesis/
*.cover
.cache
nosetests.xml
coverage.xml
testResults.xml

# Type checking
.mypy_cache/
.dmypy.json
dmypy.json

# Linting
.ruff_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# Environment
.env
.venv/
venv/
ENV/
env/

# Project specific
data/*.sqlite
data/*.db
logs/*.log
logs/*.jsonl
config/user_prefs.json
!config/user_prefs.example.json

# OS
.DS_Store
Thumbs.db
```

---

### Phase 2: Modularize Large Files

#### 2.1 Split `scripts/resume_enhancer.py` (1040 lines)
```
NEW STRUCTURE:
src/jsa/resume/
├── __init__.py
├── enhancer.py          # Main orchestration (CLI entry, <200 lines)
├── analyzers/
│   ├── __init__.py
│   ├── keyword_analyzer.py
│   ├── formatting_analyzer.py
│   └── suggestion_generator.py
├── formatters/
│   ├── __init__.py
│   ├── section_formatter.py
│   └── bullet_formatter.py
└── templates/
    ├── __init__.py
    └── resume_templates.py
```

#### 2.2 Consolidate Database Modules
```
CURRENT (3 files, ~1400 lines total):
src/database.py            # SQLite sync operations
src/concurrent_database.py # Async wrapper
src/unified_database.py    # "Unified" attempt (560 lines)

NEW (1 file, ~400 lines):
src/jsa/db/
├── __init__.py            # Public API
├── schema.py              # SQLAlchemy models
├── operations.py          # CRUD operations
└── migrations/            # Future: alembic migrations
    └── __init__.py
```

**Migration Strategy:**
1. Create new jsa/db with strict types
2. Add compatibility shim in old location
3. Update imports incrementally
4. Delete old files when all imports updated

#### 2.3 Split `cloud/providers/gcp/gcp.py` (857 lines)
```
NEW STRUCTURE:
cloud/providers/gcp/
├── __init__.py            # Public API
├── gcp.py                 # Orchestration only (<200 lines)
├── services/
│   ├── __init__.py
│   ├── cloud_run.py       # Already exists
│   ├── cloud_database.py  # Already exists
│   ├── scheduler.py       # Already exists
│   ├── storage.py         # Extract from gcp.py
│   ├── secrets.py         # Extract from gcp.py
│   └── iam.py             # Extract from gcp.py
└── config/
    ├── __init__.py
    └── project_config.py  # Extract config logic
```

#### 2.4 Consolidate Utils Modules

**utils/ Consolidation Map:**

| Current Files | New Location | Action |
|---------------|--------------|--------|
| `utils/errors.py` | `src/jsa/errors.py` | Merge into existing |
| `utils/error_taxonomy.py` | `src/jsa/errors.py` | Merge (keep taxonomy classes) |
| `utils/logging.py` | `src/jsa/logging.py` | Merge into existing |
| `utils/structured_logging.py` | `src/jsa/logging.py` | Merge (keep StructuredLogger) |
| `utils/config.py` | `src/jsa/config.py` | Merge into existing |
| `utils/enterprise_config.py` | Archive | Move to archive/enterprise/ |
| `utils/ats_analyzer.py` | Keep (break into plugins) | Modularize |
| `utils/*_legacy.py` | Archive | Move to archive/legacy/ |
| `utils/validators.py` | `src/jsa/validation.py` | Extract + strict types |
| `utils/health.py` | `src/jsa/monitoring/health.py` | Move + refactor |
| `utils/cost_tracker.py` | `src/jsa/monitoring/costs.py` | Move + refactor |
| `utils/cache.py` | `src/jsa/core/cache.py` | Move + refactor |
| `utils/rate_limiter.py` | `src/jsa/core/rate_limiter.py` | Move + refactor |

---

### Phase 3: Standardize Code Quality

#### 3.1 Apply Strict Typing to Legacy Code
```bash
# Add type hints incrementally
# Priority order:
1. src/agent.py           # Main orchestrator
2. sources/*_scraper.py   # Public scraper interfaces
3. notify/*.py            # Notification modules
4. models/*.py            # Data models
5. matchers/rules.py      # Scoring logic
```

**Type Coverage Target:**
- `src/jsa/`: 100% (already strict)
- `src/`: 90%+
- `sources/`: 80%+
- `utils/` (remaining): 70%+
- `scripts/`: 50%+ (lower priority)

#### 3.2 Fix Ruff Violations
```bash
# Current issues (~50 violations):
- I001: Import order
- B904: raise ... from err
- UP035: typing.Dict → dict
- F401: Unused imports
- S: Security issues (input validation, subprocess)

# Fix command:
ruff check --fix --unsafe-fixes .
# Then manual review for S-category issues
```

#### 3.3 Add Missing Docstrings
```python
# Template for all public functions/classes:
def function_name(param: Type) -> ReturnType:
    """
    One-line summary ending with period.

    Longer description if needed. Explain the "why" not the "what".

    Contract:
        pre: Preconditions (input constraints)
        post: Postconditions (output guarantees)
        raises: Exception types and when

    Args:
        param: Description with units/ranges if applicable

    Returns:
        Description of return value(s)

    Raises:
        UserError: When user provides invalid input
        TransientError: When retryable failure occurs
        SystemError: When unrecoverable failure occurs
    """
```

---

### Phase 4: Testing Infrastructure

#### 4.1 Test Organization
```
CURRENT:
tests/
├── unit/          # Legacy scraper tests
├── unit_jsa/      # New typed core tests
├── smoke/         # Example imports
└── conftest.py    # Basic config

NEW:
tests/
├── unit/
│   ├── core/          # jsa core tests
│   ├── scrapers/      # Source tests
│   ├── database/      # DB tests
│   ├── cloud/         # Cloud provider tests
│   └── utils/         # Utility tests
├── integration/       # Cross-module tests
├── e2e/              # End-to-end scenarios
├── fixtures/         # Shared test data
│   ├── resumes/
│   ├── job_listings/
│   └── configs/
└── conftest.py       # Pytest config + fixtures
```

#### 4.2 Add Property-Based Tests
```python
# Example: test job scoring is stable
from hypothesis import given, strategies as st

@given(
    keywords=st.lists(st.text(min_size=1, max_size=20), min_size=1, max_size=10),
    job_title=st.text(min_size=1, max_size=100),
)
def test_scoring_is_deterministic(keywords, job_title):
    job = {"title": job_title, "description": "test", "company": "test"}
    prefs = {"keywords": keywords}

    score1, _, _ = score_job(job, prefs)
    score2, _, _ = score_job(job, prefs)

    assert score1 == score2  # Same inputs → same output
    assert 0 <= score1 <= 100  # Score in valid range
```

#### 4.3 Mutation Testing Setup
```toml
# pyproject.toml
[tool.mutmut]
paths_to_mutate = "src/jsa,src/domains"
tests_dir = "tests/unit/core,tests/unit/database"
runner = "pytest"
# Target: 80%+ mutation kill rate
```

---

### Phase 5: CI/CD & Quality Gates

#### 5.1 Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
        args: [--strict, --config-file=pyproject.toml]
        additional_dependencies: [types-requests, sqlalchemy-stubs]
        files: ^src/jsa/

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: detect-private-key

  - repo: local
    hooks:
      - id: pytest-quick
        name: pytest-quick
        entry: pytest tests/unit/core -q
        language: system
        pass_filenames: false
        always_run: true
```

#### 5.2 GitHub Actions CI
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e .[dev,resume]
      - name: Lint
        run: ruff check .
      - name: Type check
        run: mypy src/jsa
      - name: Security scan
        run: bandit -r src/jsa -c config/bandit.yaml

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        run: pip install -e .[dev]
      - name: Test
        run: pytest tests/unit tests/integration --cov=src/jsa --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

---

## Implementation Checklist

### Prerequisites
- [ ] Backup current state: `git tag pre-restructure-backup`
- [ ] Ensure tests pass: `python3 .venv/bin/pytest -q tests/unit_jsa`
- [ ] Verify local agent works: `python3 src/agent.py --dry-run`

### Phase 1: Foundation Cleanup
- [ ] Run `make clean` + git clean
- [ ] Delete `config/pyproject.toml`
- [ ] Delete `config/mypy.ini`
- [ ] Archive `config/.pylintrc`
- [ ] Consolidate `requirements.txt` → `pyproject.toml`
- [ ] Update `.gitignore`
- [ ] Commit: "chore: consolidate configuration files"

### Phase 2: Modularize Large Files
- [ ] Create `src/jsa/resume/` structure
- [ ] Split `scripts/resume_enhancer.py`
- [ ] Create `src/jsa/db/` unified module
- [ ] Consolidate database*.py files
- [ ] Split `cloud/providers/gcp/gcp.py`
- [ ] Archive `utils/*_legacy.py` files
- [ ] Consolidate utils modules into jsa/
- [ ] Commit: "refactor: modularize monolithic files"

### Phase 3: Code Quality
- [ ] Run `ruff check --fix --unsafe-fixes .`
- [ ] Add type hints to src/agent.py
- [ ] Add type hints to sources/*
- [ ] Add missing docstrings (priority modules)
- [ ] Fix security issues flagged by ruff/bandit
- [ ] Commit: "style: apply strict typing and linting"

### Phase 4: Testing
- [ ] Reorganize tests/ directory
- [ ] Add property-based tests for scoring
- [ ] Add integration tests for agent workflow
- [ ] Configure mutation testing
- [ ] Achieve 90%+ coverage for jsa/
- [ ] Commit: "test: comprehensive test suite"

### Phase 5: CI/CD
- [ ] Install pre-commit: `pre-commit install`
- [ ] Run pre-commit on all files
- [ ] Update GitHub Actions CI workflow
- [ ] Configure codecov integration
- [ ] Add status badges to README
- [ ] Commit: "ci: add quality gates and automation"

### Phase 6: Documentation
- [ ] Update README with new structure
- [ ] Create ARCHITECTURE.md (update existing)
- [ ] Create CONTRIBUTING.md
- [ ] Add inline docs to public APIs
- [ ] Generate API docs (Sphinx/mkdocs)
- [ ] Commit: "docs: comprehensive documentation"

---

## Success Metrics

| Metric | Before | Target | Verification |
|--------|--------|--------|--------------|
| Config files | 3 | 1 | `find . -name "pyproject.toml" -o -name "setup.py"` |
| Database modules | 3 | 1 | `ls src/jsa/db/` |
| Files >500 lines | 8 | 0 | `find . -name "*.py" -exec wc -l {} + \| awk '$1>500'` |
| Ruff violations | 50+ | 0 | `ruff check . --statistics` |
| Type coverage (jsa/) | 100% | 100% | `mypy src/jsa --strict` |
| Test coverage (jsa/) | Unknown | 90%+ | `pytest --cov=src/jsa --cov-report=term` |
| Mutation score | 0% | 80%+ | `mutmut run && mutmut results` |
| Cache pollution | 225 | 0 | `git status --ignored` |

---

## Self-Review

### Contracts & Invariants Stated? ✅
- User data preserved (config/user_prefs.json)
- Local operation continues working
- Cloud deployment paths functional
- No secrets committed

### All Branches Covered by Tests? ⚠️
- Current tests exist for jsa/ core
- Legacy code has limited test coverage
- Plan adds comprehensive tests in Phase 4

### Static Analysis Clean? ❌
- Current: 50+ ruff violations
- Target: 0 violations
- Plan addresses in Phase 3

### Strict Types Enforced? ⚠️
- jsa/ has strict typing
- Legacy code has no types
- Plan adds types incrementally in Phase 3

### Side-effects Idempotent? ✅
- File operations use temp + atomic rename pattern
- Database operations use transactions
- No shared mutable state without locks

### Logs Structured w/ trace_id? ⚠️
- New code uses StructuredLogger
- Legacy code uses basic logging
- Plan consolidates in Phase 2

### Performance Hot Paths? ✅
- Job scoring is O(n) with keywords
- Database queries use indexes
- Async scraping with semaphore limits
- No obvious N² pitfalls

### Simulated Failure Scenarios? ⚠️
- Some error handling exists
- Not comprehensive
- Plan adds negative tests in Phase 4

---

## Next Hardening (Post-Restructure)

1. **Add fuzzing** to job parsing/scoring functions
2. **Benchmark** scoring performance with realistic datasets
3. **Add chaos testing** for cloud deployments
4. **Implement circuit breakers** for scraper failures
5. **Add cost budgets** for cloud resources (partially done)
6. **Generate security SBOM** and sign releases

---

## Risk Assessment

### High Risk
- **Database consolidation**: 3 modules → 1 could break existing deployments
  - *Mitigation*: Compatibility shim, phased migration, extensive testing

### Medium Risk
- **Config consolidation**: Breaking change for users with scripted setups
  - *Mitigation*: Document migration, provide compatibility check script

### Low Risk
- **File splits**: Purely internal refactor, no API changes
- **Type hints**: Additive, no runtime impact
- **Test additions**: No risk, pure benefit

---

## Estimated Effort

| Phase | Complexity | Hours | Depends On |
|-------|-----------|-------|------------|
| 1. Foundation | Low | 2-4 | None |
| 2. Modularize | High | 8-12 | Phase 1 |
| 3. Code Quality | Medium | 6-8 | Phase 2 |
| 4. Testing | Medium | 6-10 | Phase 3 |
| 5. CI/CD | Low | 2-4 | Phase 4 |
| 6. Docs | Low | 3-5 | Phase 5 |
| **Total** | - | **27-43** | - |

**Assumptions:**
- 1 developer working solo
- No interruptions or scope creep
- Tests catch regressions early
- No major architectural surprises

---

## Conclusion

This restructure addresses critical technical debt while preserving functionality. The phased approach allows incremental progress with validation at each step. Success metrics are measurable and achievable.

**Recommendation:** Proceed with implementation starting Phase 1.
