# Repository Reorganization Notes

**Date:** October 14, 2025  
**Version:** 0.6.0+  
**Status:** Complete

## Summary

This document describes the repository reorganization completed on October 14, 2025, which aligns the project structure with Python best practices and GitHub community standards.

## What Changed

### Configuration Files

**Moved to repository root:**
- `.editorconfig` (from `docs/development/`)
- `.pre-commit-config.yaml` (consolidated from two locations, using modern ruff-based version)
- `.yamllint.yml` (from `config/`)

**Removed duplicates:**
- `config/.pre-commit-config.yaml` (outdated version)

### Python Modules

**All legacy top-level modules moved to `src/`:**
- `matchers/` → `src/matchers/` (1 file)
- `models/` → `src/models/` (2 files)
- `notify/` → `src/notify/` (3 files)
- `sources/` → `src/sources/` (12 files)
- `utils/` → `src/utils/` (23 files)

**Total:** 41 Python files relocated using `git mv` to preserve history.

### Import Paths

**No changes required for most users!**

Due to `package-dir = {"" = "src"}` in `pyproject.toml`, import statements remain unchanged:

```python
# These imports continue to work as before:
from sources.job_scraper_base import JobScraperBase
from utils.logging import get_logger
from notify.slack import send_slack_alert
from models.job import JobModel
from matchers.rules import score_job
```

**Only internal fixes needed:**

Files inside `src/` that were incorrectly using `import src.xxx` were updated to use the correct package imports.

## Why This Change?

### Before: Inconsistent Structure
```
JobSentinel/
├── matchers/       # Top-level module
├── models/         # Top-level module
├── notify/         # Top-level module
├── sources/        # Top-level module
├── utils/          # Top-level module
├── src/
│   ├── jsa/        # Some code here
│   └── domains/    # More code here
└── ...
```

**Problems:**
- Mixed top-level and src/ organization
- Confusion about where new code should go
- Inconsistent with Python packaging best practices
- Made IDE navigation harder

### After: Clean Python src/ Layout
```
JobSentinel/
├── src/
│   ├── jsa/        # Core application
│   ├── domains/    # Domain logic
│   ├── matchers/   # Scoring logic
│   ├── models/     # Data models
│   ├── notify/     # Alerting
│   ├── sources/    # Scrapers
│   └── utils/      # Utilities
├── tests/          # Test suite
├── examples/       # Example scripts
├── scripts/        # Dev utilities
├── docs/           # Documentation
└── ...
```

**Benefits:**
- ✅ Clear separation of source code and tooling
- ✅ Standard Python src/ layout
- ✅ All application code in one place
- ✅ Easier to navigate and understand
- ✅ Aligns with PEP 517/518 packaging standards
- ✅ Better IDE support and code completion

## Impact on External Users

### If you're using JobSentinel as a package:

**No changes needed!** All imports work the same:

```python
from sources.greenhouse_scraper import search_greenhouse_jobs
from utils.config import config_manager
from notify.slack import send_slack_alert
```

### If you've forked the repository:

1. **Pull the latest changes** from main
2. **Rebase your feature branches** on the new structure
3. **Update any internal imports** that used `from src.xxx` (rare)

### If you're contributing:

**New code should go in `src/` subdirectories:**
- New scrapers → `src/sources/`
- New utilities → `src/utils/`
- Core features → `src/jsa/`
- Domain logic → `src/domains/`

## Technical Details

### Package Configuration

**pyproject.toml updates:**
```toml
[tool.setuptools.packages.find]
where = ["src"]
include = [
  "jsa*",
  "domains*",
  "matchers*",    # Added
  "models*",      # Added
  "notify*",      # Added
  "sources*",     # Added
  "utils*",       # Added
]
```

### History Preservation

All file moves used `git mv` to preserve Git history:
```bash
git mv matchers src/matchers
git mv models src/models
git mv notify src/notify
git mv sources src/sources
git mv utils src/utils
```

You can still see the full history of any file:
```bash
git log --follow src/sources/greenhouse_scraper.py
```

## Validation Results

**All checks passing:**
- ✅ Tests: 312 passed (same as before)
- ✅ Linting (ruff): Clean
- ✅ Type checking (mypy): No issues in 41 source files
- ✅ Package installation: Clean editable install
- ✅ Import resolution: All imports work correctly

**Pre-existing test failures** (not related to reorganization):
- test_gui_launcher.py: Documentation content check
- test_windows_deployment.py: Privacy check detecting tool names in code comments

## Migration Guide for Contributors

### Adding New Code

**Before (❌ Old way):**
```bash
# Don't do this anymore
touch sources/new_scraper.py
touch utils/new_utility.py
```

**After (✅ New way):**
```bash
# Do this instead
touch src/sources/new_scraper.py
touch src/utils/new_utility.py
```

### Imports Within src/

**Files inside `src/` should NOT use `src.` prefix:**

```python
# ❌ Wrong (in files inside src/):
from src.database import Job
from src.utils.logging import get_logger

# ✅ Correct (in files inside src/):
from database import Job
from utils.logging import get_logger
```

### Imports Outside src/

**Files outside `src/` (tests, examples, scripts) use package imports:**

```python
# ✅ Correct (in tests/, examples/, scripts/):
from sources.greenhouse_scraper import search_greenhouse_jobs
from utils.config import config_manager
from models.job import JobModel
```

## Rollback Instructions

If needed, rollback with:
```bash
# Revert Phase 2 (module moves)
git revert 015245d

# Revert Phase 1 (config consolidation)
git revert 1effb66
```

## Questions?

- **GitHub Issues**: https://github.com/cboyd0319/JobSentinel/issues
- **Documentation**: See `docs/CONTRIBUTING.md`
- **Architecture**: See `docs/ARCHITECTURE.md`

---

**Last Updated:** October 14, 2025  
**Related PRs:** #TBD (this reorganization PR)
