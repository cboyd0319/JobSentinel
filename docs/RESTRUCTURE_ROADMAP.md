# Restructure Implementation Roadmap

**Status:** Phase 1 Complete ✅
**Next:** Phase 2 - Database & Utils Consolidation
**Generated:** 2025-10-09

---

## Executive Summary

This document tracks the step-by-step implementation of the project restructure outlined in `RESTRUCTURE_ANALYSIS.md`. Each phase builds on the previous, with validation checkpoints to ensure stability.

**Progress:** 6/12 major milestones complete
**Risk Level:** Low (non-breaking changes so far)
**Recommended Next Steps:** Database consolidation (high value, medium complexity)

---

## ✅ Completed Work (Phase 1)

### 1.1 Build Artifacts Cleanup
- **Status:** ✅ Complete
- **Changes:**
  - Removed all `__pycache__` directories (225+ instances)
  - Removed `.pytest_cache`, `.mypy_cache`, `.ruff_cache`
  - Cleaned build artifacts
  - Updated `.gitignore` with comprehensive patterns
- **Validation:** `find . -name "__pycache__" | wc -l` → 0

### 1.2 Configuration Consolidation
- **Status:** ✅ Complete
- **Changes:**
  - **Archived** `config/pyproject.toml` (deprecated)
  - **Archived** `config/mypy.ini` (redundant)
  - **Archived** `config/.pylintrc` (unused, we use ruff)
  - **Archived** `requirements.txt` (replaced with pyproject.toml pointer)
  - **Enhanced** root `pyproject.toml` with:
    - All core dependencies from requirements.txt
    - Resume/MCP optional dependencies
    - Dev dependencies (black, ruff, mypy, bandit, mutmut)
    - Bandit security scanner config
    - Coverage report config (85% threshold)
- **Location:** `archive/old_configs/`
- **Validation:** Only 1 `pyproject.toml` exists in root

### 1.3 .gitignore Modernization
- **Status:** ✅ Complete
- **Changes:**
  - Removed duplicate entries (was 2x of each pattern)
  - Organized into logical sections
  - Added comprehensive patterns for:
    - Python build artifacts
    - Testing tools (.hypothesis, testResults.xml)
    - Security reports (*.sarif, bandit-report.*)
    - Cloud artifacts
    - PowerShell QA system
- **Validation:** No duplicate patterns, well-organized

### 1.4 Legacy Utils Archival
- **Status:** ✅ Complete
- **Changes:**
  - Moved `utils/*_legacy.py` to `archive/legacy/`:
    - `ats_analyzer_legacy.py`
    - `ats_scanner_legacy.py`
    - `ultimate_ats_scanner_legacy.py`
- **Validation:** `ls utils/*legacy* → no such file`

### 1.5 Pre-commit Configuration
- **Status:** ✅ Complete
- **Changes:**
  - Enhanced existing config with security checks:
    - `detect-private-key`
    - `check-added-large-files` (max 1MB)
    - `check-merge-conflict`
    - `check-case-conflict`
- **Validation:** Run `pre-commit run --all-files` (after installing hooks)

### 1.6 Documentation
- **Status:** ✅ Complete
- **Deliverables:**
  - `docs/RESTRUCTURE_ANALYSIS.md` (comprehensive analysis)
  - `docs/RESTRUCTURE_ROADMAP.md` (this document)
- **Validation:** Documents exist and are comprehensive

---

## 🚧 Phase 2: Module Consolidation (Next)

### 2.1 Database Module Consolidation
- **Status:** 🔴 Not Started
- **Priority:** HIGH (removes 1268 lines of duplication)
- **Complexity:** MEDIUM-HIGH

**Current State:**
```
src/database.py            (297 lines) - Basic SQLite operations
src/concurrent_database.py (411 lines) - Async wrapper
src/unified_database.py    (560 lines) - "Unified" attempt
src/jsa/db.py              (85 lines)  - Typed facade

Total: 1353 lines across 4 files
```

**Target State:**
```
src/jsa/db/
├── __init__.py           (~50 lines)  - Public API
├── models.py             (~150 lines) - SQLAlchemy models
├── sync_ops.py           (~200 lines) - Synchronous operations
├── async_ops.py          (~250 lines) - Asynchronous operations
└── migrations/           (future)     - Alembic migrations
    └── __init__.py

Total: ~650 lines, well-organized
```

**Implementation Steps:**
1. Create `src/jsa/db/` directory structure
2. Extract SQLAlchemy models from existing files → `models.py`
3. Consolidate sync operations → `sync_ops.py`
4. Consolidate async operations → `async_ops.py`
5. Create unified public API in `__init__.py`
6. Add compatibility shim in old locations:
   ```python
   # src/database.py (compatibility shim)
   import warnings
   from src.jsa.db import *
   warnings.warn("src.database is deprecated, use src.jsa.db", DeprecationWarning)
   ```
7. Update imports incrementally:
   - `src/agent.py`
   - `cloud/providers/gcp/cloud_database.py`
   - Test files
8. Run tests after each import update
9. Delete old files when all imports updated

**Validation:**
- All tests pass
- No import errors
- Database operations work identically

**Risk Mitigation:**
- Keep old files until 100% of imports updated
- Add compatibility shims
- Extensive testing at each step

---

### 2.2 Error/Logging Module Consolidation
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** LOW-MEDIUM

**Current State:**
```
utils/errors.py           (59 lines)  - Legacy exceptions
utils/error_taxonomy.py   (365 lines) - New taxonomy
src/jsa/errors.py         (32 lines)  - Facade to taxonomy

utils/logging.py          (~300 lines) - Legacy logging
utils/structured_logging.py (365 lines) - New structured logging
src/jsa/logging.py        (~100 lines) - Typed facade
```

**Target State:**
```
src/jsa/errors/
├── __init__.py           (~50 lines)  - Public API
├── taxonomy.py           (~200 lines) - Error classes
├── context.py            (~150 lines) - ErrorContext, tracing
└── handlers.py           (~100 lines) - Error handling utilities

src/jsa/logging/
├── __init__.py           (~50 lines)  - Public API
├── structured.py         (~250 lines) - StructuredLogger
├── redaction.py          (~100 lines) - PII redaction
└── performance.py        (~50 lines)  - Performance logging
```

**Implementation Steps:**
1. Move `utils/error_taxonomy.py` → `src/jsa/errors/taxonomy.py`
2. Split into logical modules (taxonomy, context, handlers)
3. Update `src/jsa/errors.py` to re-export from new location
4. Add deprecation shim in `utils/error_taxonomy.py`
5. Similar process for logging modules
6. Update imports incrementally
7. Delete old files when complete

**Validation:**
- Error handling works identically
- Structured logging produces same output format
- PII redaction still functions

---

### 2.3 Utils Organization
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** LOW

**Current utils/ Contents (remaining after legacy archival):**
```
utils/
├── __init__.py
├── ats_analyzer.py       (821 lines!) - needs modularization
├── audit_log.py
├── cache.py
├── config.py             - merge into jsa/config.py
├── cost_tracker.py       - move to jsa/monitoring/
├── dependency_injection.py
├── encryption.py         - move to jsa/security/
├── enterprise_config.py  - archive (490 lines)
├── health.py             - move to jsa/monitoring/
├── llm.py
├── plugin_system.py
├── rate_limiter.py       - move to jsa/core/
├── resilience.py
├── resume_parser.py
├── scraping.py
├── secure_subprocess.py  - move to jsa/security/
├── self_healing.py
├── structured_logging.py - consolidate (see 2.2)
├── validators.py         - move to jsa/validation/
└── error_taxonomy.py     - consolidate (see 2.2)
```

**Target Organization:**
```
src/jsa/
├── core/               # Core utilities
│   ├── cache.py
│   └── rate_limiter.py
├── security/           # Security utilities
│   ├── encryption.py
│   └── subprocess.py
├── monitoring/         # Monitoring & health
│   ├── health.py
│   ├── costs.py
│   └── audit.py
├── validation/         # Input validation
│   └── validators.py
└── config/             # Configuration (exists)
    └── ...

utils/                  # Keep for backwards compatibility
├── ats_analyzer.py     # Too complex to move yet
├── resume_parser.py    # Stays (specialized)
├── llm.py              # Stays (specialized)
├── plugin_system.py    # Stays (used by ATS)
├── resilience.py       # Stays (used across modules)
└── scraping.py         # Stays (used by scrapers)

archive/enterprise/     # Archive complex enterprise features
└── enterprise_config.py
```

**Implementation Priority:**
1. HIGH: `cache.py`, `rate_limiter.py` → `jsa/core/`
2. HIGH: `health.py`, `cost_tracker.py` → `jsa/monitoring/`
3. MEDIUM: `encryption.py`, `secure_subprocess.py` → `jsa/security/`
4. MEDIUM: `validators.py` → `jsa/validation/`
5. LOW: `enterprise_config.py` → `archive/enterprise/`

---

## 🔮 Phase 3: Large File Modularization

### 3.1 Split `scripts/resume_enhancer.py` (1040 lines)
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** MEDIUM

**Target Structure:**
```
src/jsa/resume/
├── __init__.py
├── enhancer.py          # CLI entry (<200 lines)
├── analyzers/
│   ├── keyword_analyzer.py
│   ├── formatting_analyzer.py
│   └── suggestion_generator.py
├── formatters/
│   ├── section_formatter.py
│   └── bullet_formatter.py
└── templates/
    └── resume_templates.py
```

### 3.2 Split `cloud/providers/gcp/gcp.py` (857 lines)
- **Status:** 🔴 Not Started
- **Priority:** LOW (works as-is)
- **Complexity:** HIGH

**Target Structure:**
```
cloud/providers/gcp/
├── gcp.py (orchestration, <200 lines)
├── services/
│   ├── storage.py
│   ├── secrets.py
│   └── iam.py
└── config/
    └── project_config.py
```

### 3.3 Modularize `utils/ats_analyzer.py` (821 lines)
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** MEDIUM (already has plugin system)

**Current:** Monolithic analyzer with embedded plugins

**Target:**
```
utils/ats/
├── __init__.py
├── analyzer.py          # Core analyzer (<200 lines)
├── plugins/
│   ├── __init__.py
│   ├── keyword_matcher.py
│   ├── formatting_checker.py
│   ├── experience_analyzer.py
│   └── achievement_detector.py
└── taxonomy/
    └── skills_taxonomy.py
```

---

## 🎨 Phase 4: Code Quality (Automated)

### 4.1 Fix Ruff Violations
- **Status:** 🔴 Not Started
- **Priority:** HIGH
- **Complexity:** LOW (mostly auto-fixable)

**Current Issues (~50 violations):**
- I001: Import order (auto-fixable)
- B904: `raise ... from err` (auto-fixable with --unsafe-fixes)
- UP035: `typing.Dict` → `dict` (auto-fixable)
- F401: Unused imports (auto-fixable)
- S-category: Security issues (manual review needed)

**Commands:**
```bash
# Auto-fix safe issues
ruff check --fix .

# Auto-fix with unsafe fixes (review after)
ruff check --fix --unsafe-fixes .

# Manual review for security issues
ruff check --select=S .
```

**Validation:**
```bash
ruff check . --statistics  # Should show 0 violations
```

### 4.2 Add Type Hints (Incremental)
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** MEDIUM (manual work)

**Coverage Targets:**
- `src/jsa/`: 100% (already strict) ✅
- `src/`: 90%+
- `sources/`: 80%+
- `utils/` (remaining): 70%+
- `scripts/`: 50%+

**Priority Order:**
1. `src/agent.py` (main orchestrator)
2. `sources/*_scraper.py` (public interfaces)
3. `notify/*.py` (notification modules)
4. `models/*.py` (data models)
5. `matchers/rules.py` (scoring logic)

**Template:**
```python
from __future__ import annotations
from typing import Any, Optional

def function_name(param: str, optional: Optional[int] = None) -> dict[str, Any]:
    """
    Contract:
        pre: isinstance(param, str) and len(param) > 0
        post: returns dict with keys: ['result', 'status']
        raises: ValueError if param is empty
    """
    ...
```

### 4.3 Add Docstrings
- **Status:** 🔴 Not Started
- **Priority:** MEDIUM
- **Complexity:** LOW (template available)

**Target Coverage:** All public functions/classes in `src/jsa/` and `sources/`

**Template from RESTRUCTURE_ANALYSIS.md:**
```python
def function_name(param: Type) -> ReturnType:
    """
    One-line summary ending with period.

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

## 🧪 Phase 5: Testing Infrastructure

### 5.1 Reorganize Tests
- **Status:** 🔴 Not Started
- **Priority:** LOW
- **Complexity:** LOW

**Current:**
```
tests/
├── unit/          # Legacy scraper tests
├── unit_jsa/      # New typed core tests
├── smoke/         # Example imports
└── conftest.py
```

**Target:**
```
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
└── conftest.py       # Pytest config + shared fixtures
```

### 5.2 Add Property-Based Tests
- **Status:** 🔴 Not Started
- **Priority:** LOW
- **Complexity:** MEDIUM

**Target Areas:**
- Job scoring (deterministic, range-bound)
- Resume parsing (various formats)
- URL sanitization (security properties)

**Example:**
```python
from hypothesis import given, strategies as st

@given(keywords=st.lists(st.text(), min_size=1), job_title=st.text())
def test_scoring_is_deterministic(keywords, job_title):
    job = {"title": job_title, ...}
    prefs = {"keywords": keywords}
    score1, _, _ = score_job(job, prefs)
    score2, _, _ = score_job(job, prefs)
    assert score1 == score2  # Deterministic
    assert 0 <= score1 <= 100  # Valid range
```

### 5.3 Configure Mutation Testing
- **Status:** 🔴 Not Started
- **Priority:** LOW
- **Complexity:** LOW

**Already added to pyproject.toml:**
```toml
[project.optional-dependencies]
dev = [
  ...
  "mutmut>=2.4,<3",
]
```

**Configuration needed:**
```bash
# Run mutation tests
mutmut run --paths-to-mutate src/jsa --tests-dir tests/unit

# View results
mutmut results

# Target: 80%+ mutation kill rate
```

---

## 📋 Phase 6: CI/CD & Quality Gates

### 6.1 GitHub Actions CI
- **Status:** 🟡 Partial (MegaLinter exists)
- **Priority:** MEDIUM
- **Complexity:** LOW

**Current:** `.github/workflows/mega-linter.yml` exists

**Enhancement Needed:**
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
          python-version: '3.13'  # Windows 11 compatible
      - name: Install dependencies
        run: pip install -e .[dev,resume]
      - name: Lint
        run: ruff check .
      - name: Type check
        run: mypy src/jsa
      - name: Security scan
        run: bandit -r src/jsa

  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: Install dependencies
        run: pip install -e .[dev]
      - name: Test
        run: pytest tests/ --cov=src/jsa --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 6.2 Pre-commit Hooks Installation
- **Status:** ✅ Config exists
- **Next:** Install and test

**Commands:**
```bash
# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files

# Should see:
# - black: Passed
# - ruff: Passed
# - mypy: Passed
# - pytest-unit-jsa: Passed
# - Security checks: Passed
```

---

## 📚 Phase 7: Documentation

### 7.1 Update README
- **Status:** 🟡 Partial (current README is good)
- **Priority:** LOW
- **Changes Needed:**
  - Update Python version requirement to 3.13
  - Document new installation: `pip install -e .[dev,resume,mcp]`
  - Remove references to `requirements.txt`
  - Add quality gate badges (when CI complete)

### 7.2 Create CONTRIBUTING.md
- **Status:** 🔴 Not Started
- **Priority:** LOW
- **Content:**
  - Development setup
  - Pre-commit hooks
  - Testing requirements
  - Code style guide
  - PR checklist

### 7.3 Update ARCHITECTURE.md
- **Status:** 🟡 Exists but needs update
- **Priority:** MEDIUM
- **Changes Needed:**
  - Document new module structure
  - Update database architecture
  - Document error taxonomy
  - Add diagrams (optional)

---

## 📊 Success Metrics Dashboard

| Metric | Before | Current | Target | Status |
|--------|--------|---------|--------|--------|
| **Configuration** |
| Config files | 3 | 1 | 1 | ✅ |
| pyproject.toml instances | 2 | 1 | 1 | ✅ |
| **Code Organization** |
| Database modules | 3 (1268 lines) | 3 | 1 (~650 lines) | 🔴 |
| Files >500 lines | 8 | 8 | 0 | 🔴 |
| Legacy utils archived | 0 | 3 | 3 | ✅ |
| **Code Quality** |
| Ruff violations | ~50 | ~50 | 0 | 🔴 |
| Type coverage (jsa/) | 100% | 100% | 100% | ✅ |
| Type coverage (src/) | 10% | 10% | 90% | 🔴 |
| Test coverage (jsa/) | Unknown | Unknown | 90% | 🔴 |
| Mutation score | 0% | 0% | 80% | 🔴 |
| **Infrastructure** |
| Cache pollution (dirs) | 225 | 0 | 0 | ✅ |
| Pre-commit hooks | Basic | Enhanced | Full | 🟡 |
| CI/CD workflows | 1 (ML) | 1 (ML) | 2 (ML+CI) | 🟡 |

**Legend:**
- ✅ Complete
- 🟡 In Progress / Partial
- 🔴 Not Started

---

## 🚀 Recommended Next Steps

### Immediate (High Value, Low Risk)
1. ✅ **DONE:** Clean caches, consolidate config
2. **TODO:** Fix ruff violations (run `ruff check --fix --unsafe-fixes .`)
3. **TODO:** Move simple utils to jsa/ (cache, rate_limiter, validators)

### Short Term (High Value, Medium Risk)
4. **TODO:** Consolidate database modules (biggest win, needs care)
5. **TODO:** Add type hints to `src/agent.py` and scrapers
6. **TODO:** Split `scripts/resume_enhancer.py`

### Medium Term (Quality Improvements)
7. **TODO:** Reorganize test suite
8. **TODO:** Add property-based tests
9. **TODO:** Configure mutation testing
10. **TODO:** Update documentation

### Long Term (Nice to Have)
11. **TODO:** Split `cloud/providers/gcp/gcp.py`
12. **TODO:** Modularize `utils/ats_analyzer.py`
13. **TODO:** Generate API documentation (Sphinx/mkdocs)

---

## ⚠️ Risk Management

### High Risk Items
| Task | Risk | Mitigation |
|------|------|------------|
| Database consolidation | Breaking changes | Compatibility shims, phased migration, extensive tests |
| Import path changes | Import errors everywhere | Update incrementally, keep old paths working |

### Medium Risk Items
| Task | Risk | Mitigation |
|------|------|------------|
| Large file splits | Breaking internal APIs | Keep old entry points, add deprecation warnings |
| Type hint additions | Runtime impact | Use `from __future__ import annotations`, test thoroughly |

### Low Risk Items
- Configuration consolidation (done, no imports affected)
- Cache cleanup (purely mechanical)
- Documentation updates (no code impact)
- Test reorganization (isolated)

---

## 📝 Change Log

### 2025-10-09: Phase 1 Complete
- ✅ Cleaned 225+ cache directories
- ✅ Consolidated config files (archived 4 deprecated files)
- ✅ Enhanced .gitignore (removed duplicates)
- ✅ Archived 3 legacy utils files
- ✅ Enhanced pre-commit hooks with security checks
- ✅ Created comprehensive documentation

**Files Changed:**
- `.gitignore` (rewritten, de-duplicated)
- `pyproject.toml` (enhanced with all deps + tools)
- `requirements.txt` (replaced with pointer)
- `.pre-commit-config.yaml` (added security hooks)
- `archive/` (new directory with deprecated files)
- `docs/RESTRUCTURE_ANALYSIS.md` (new)
- `docs/RESTRUCTURE_ROADMAP.md` (this file)

**Next Phase:** Database & Utils Consolidation

---

## 🎯 Definition of Done

A phase is considered complete when:

1. **Functional Requirements:**
   - All planned changes implemented
   - Existing functionality preserved
   - No regressions introduced

2. **Quality Gates:**
   - All tests pass
   - Ruff check passes (0 violations)
   - Mypy strict passes (for jsa/)
   - Pre-commit hooks pass

3. **Documentation:**
   - Changes documented in this roadmap
   - Inline docs updated where needed
   - Migration guide provided (if breaking)

4. **Validation:**
   - Manual smoke test performed
   - Git status clean (or only expected changes)
   - README updated if user-facing changes

---

## 📞 Questions & Decisions

### Open Questions
1. **Database migration:** Keep old files as shims or hard cutover?
   - **Decision:** Use compatibility shims during transition

2. **Utils remaining in utils/:** Which should stay vs move?
   - **Decision:** Specialized (ATS, resume, LLM) stay; generic (cache, validators) move

3. **Mutation testing:** What kill rate is realistic?
   - **Decision:** Target 80%, adjust if too aggressive

### Decisions Made
1. ✅ Use Python 3.13 as baseline (Windows 11 compatible)
2. ✅ pyproject.toml is canonical, requirements.txt is deprecated
3. ✅ Pre-commit hooks focus on jsa/ (strict), relaxed for legacy code
4. ✅ Archive legacy files rather than delete (reversible)

---

## 🏁 Conclusion

**Phase 1 complete!** The project now has:
- Clean, consolidated configuration
- Comprehensive .gitignore
- Enhanced pre-commit hooks
- Archived legacy code
- Excellent documentation

**Phase 2** (database consolidation) is the biggest value-add but requires care. Recommended approach: implement compatibility shims and migrate incrementally.

**Total Progress:** 6/12 major milestones (50%)

Ready to proceed with next phase! 🚀
