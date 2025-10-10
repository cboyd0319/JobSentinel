# Critical Fixes Plan - Zero Errors Mandate

## TL;DR
Found ~100+ violations across import sorting, type hints, exception handling, and security.
Priority: Fix all auto-fixable issues first, then systematic manual fixes with strict contracts.

## Design Notes

**Assumptions:**
- User wants production-grade code with zero warnings/errors
- All changes must preserve existing functionality
- Types must be strict (no `Any`, no `Optional` without good reason)
- All exceptions must chain properly (`raise ... from err`)

**Contracts:**
- Pre: Code compiles but has style/type/security violations
- Post: Zero ruff violations, strict mypy passing, all tests green
- Raises: No exceptions during fix process; validate at each step

**Data Flow:**
1. Auto-fix import sorting and deprecated types (safe)
2. Fix exception chaining (B904 violations)
3. Add strict type hints to all untyped code
4. Add input validation and security checks
5. Refactor exception handling patterns
6. Split monolithic files
7. Add comprehensive tests

**Error Taxonomy:**
- Auto-fixable: I001 (imports), UP006/UP035 (Dict→dict), UP007 (Optional→|)
- Manual fixes: B904 (exception chaining), S310 (URL validation)
- Architecture: Split files >500 lines, consolidate database modules

## Critical Issues Found

### Auto-Fixable (Priority 1)
- **I001**: ~50 import sorting violations
- **UP006/UP035**: `typing.Dict` → `dict` (~20 violations)
- **UP007**: `Optional[T]` → `T | None` (~15 violations)
- **UP015**: Redundant open mode parameters

**Fix:** `ruff check --fix --unsafe-fixes .`
**Risk:** Low (automated, well-tested)
**Time:** 5 minutes

### Exception Chaining (Priority 2)
- **B904**: ~10 violations of missing `raise ... from err`
- **Pattern:**
  ```python
  except Exception as e:
      raise CustomError(str(e))  # WRONG
  ```

**Fix Pattern:**
```python
except SpecificException as err:
    raise CustomError(...) from err  # CORRECT
```

**Locations:**
- cloud/providers/gcp/cloud_database.py:173
- Multiple files in sources/, utils/

**Risk:** Low (purely additive)
**Time:** 30 minutes

### Security Violations (Priority 3)
- **S310**: Unsafe `urllib.request.urlopen` usage (~6 violations)
  - Allows file:// and custom schemes
  - No URL validation before opening

**Fix Pattern:**
```python
from jsa.http.sanitization import safe_external_url

# Before
response = urllib.request.urlopen(url)  # UNSAFE

# After
validated_url = safe_external_url(url)
if validated_url == "#":
    raise UserError("Invalid URL scheme")
response = urllib.request.urlopen(validated_url)  # SAFE
```

**Risk:** Medium (changes behavior for invalid URLs)
**Time:** 1 hour

### Missing Type Hints (Priority 4)
**Files needing strict types:**
- src/agent.py (546 lines, 0% typed)
- src/database.py (297 lines, partial types)
- src/concurrent_database.py (411 lines, partial types)
- sources/*_scraper.py (partial types)
- utils/*.py (mostly untyped)

**Contract Template:**
```python
from __future__ import annotations
from typing import Final

def function_name(
    required_param: str,
    optional_param: int | None = None,
    *,
    keyword_only: bool = False,
) -> dict[str, object]:
    """
    Contract:
        pre: len(required_param) > 0
        post: returns dict with keys ['status', 'result']
        raises: UserError if required_param empty
    """
    if not required_param:
        raise UserError("code=INVALID_INPUT hint='empty param' action='provide value'")
    ...
```

**Risk:** Medium (requires testing)
**Time:** 8-12 hours

### Anti-Patterns Found

#### 1. Broad Exception Catching
**Location:** Multiple files
**Pattern:**
```python
try:
    risky_operation()
except Exception:  # TOO BROAD
    log.error("failed")
```

**Fix:**
```python
try:
    risky_operation()
except SpecificError as err:
    log.error(f"operation failed: {err}", extra={"trace_id": trace_id})
    raise SystemError("code=OP_FAILED hint='...' action='...'") from err
```

#### 2. Missing Input Validation
**Location:** scrapers, database operations
**Pattern:**
```python
def search(keywords):  # No validation
    return query(keywords)
```

**Fix:**
```python
def search(keywords: list[str]) -> list[dict[str, object]]:
    """
    Contract:
        pre: isinstance(keywords, list) and all(isinstance(k, str) for k in keywords)
        pre: 1 <= len(keywords) <= 20
        post: returns list of job dicts, may be empty
        raises: UserError if keywords invalid
    """
    if not isinstance(keywords, list):
        raise UserError("code=INVALID_TYPE hint='keywords must be list' action='fix input'")
    if not keywords or len(keywords) > 20:
        raise UserError("code=INVALID_LENGTH hint='1-20 keywords' action='adjust count'")
    if not all(isinstance(k, str) and k.strip() for k in keywords):
        raise UserError("code=INVALID_KEYWORD hint='all keywords must be non-empty strings'")

    return query(keywords)
```

#### 3. No Trace IDs in Logging
**Location:** All logging calls
**Pattern:**
```python
logger.error(f"Failed: {e}")
```

**Fix:**
```python
from jsa.logging import get_logger
from utils.error_taxonomy import ErrorContext

logger = get_logger(__name__, component="scraper")
ctx = ErrorContext.get_current()

logger.error(
    "Scraping failed",
    extra={
        "trace_id": ctx.trace_id,
        "error_code": "SCRAPE_FAILED",
        "url": safe_url_for_logging(url),
    },
    exc_info=True
)
```

## Implementation Order

### Phase 1: Auto-Fix (30 min)
```bash
# Backup
git checkout -b strict-quality-enforcement

# Auto-fix safe issues
.venv/bin/python -m ruff check --fix .
.venv/bin/python -m ruff check --fix --unsafe-fixes .

# Verify
.venv/bin/python -m ruff check .
```

### Phase 2: Exception Chaining (1 hour)
Manual fixes for all B904 violations:
1. cloud/providers/gcp/cloud_database.py
2. src/database.py, src/concurrent_database.py
3. sources/*_scraper.py
4. utils/error_taxonomy.py

### Phase 3: Security Fixes (2 hours)
1. Create safe URL validator in jsa/security/
2. Replace all urllib.request.urlopen calls
3. Add URL scheme validation
4. Test with malicious URLs (file://, javascript:, etc.)

### Phase 4: Type Hints (8 hours)
Priority order:
1. src/agent.py (main entry point)
2. src/database.py + consolidate 3 → 1
3. sources/*_scraper.py
4. utils core modules
5. Validate with `mypy --strict`

### Phase 5: Validation & Tests (4 hours)
1. Add input validation to all public functions
2. Add property-based tests
3. Add negative tests
4. Achieve 90% coverage

## Quality Gates

### Gate 1: Linting
```bash
.venv/bin/python -m ruff check . --statistics
# Expected: 0 violations
```

### Gate 2: Type Checking
```bash
.venv/bin/python -m mypy src/jsa --strict
.venv/bin/python -m mypy src/ --strict --exclude "src/jsa"
# Expected: 0 errors
```

### Gate 3: Security
```bash
.venv/bin/python -m bandit -r src/jsa -c pyproject.toml
# Expected: 0 high/medium issues
```

### Gate 4: Tests
```bash
.venv/bin/python -m pytest tests/ --cov=src/jsa --cov-fail-under=90
# Expected: All pass, 90%+ coverage
```

## Risk Mitigation

1. **Create feature branch:** `git checkout -b strict-quality-enforcement`
2. **Commit after each phase:** Atomic, revertible changes
3. **Test after each commit:** Ensure no regressions
4. **Keep compatibility shims:** During database consolidation
5. **Property-based testing:** Catch edge cases automatically

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Ruff violations | ~100 | 0 |
| Mypy errors | ~50+ | 0 |
| Security issues | 6 | 0 |
| Type coverage | 30% | 100% |
| Test coverage | ~60% | 90% |
| Files >500 lines | 8 | 0 |

## Next Steps

1. Run Phase 1 auto-fixes
2. Commit: "style: auto-fix imports and deprecated types"
3. Run Phase 2 exception chaining
4. Commit: "fix: proper exception chaining (B904)"
5. Continue through phases...

---

**Status:** Ready to execute
**Estimated Total Time:** 15-20 hours
**Risk Level:** Low (incremental, tested changes)
