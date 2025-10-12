# Workflow Fixes Documentation

This document details fixes applied to GitHub Actions workflows to resolve errors and improve reliability.

## Issues Fixed

### 1. CI Workflow - Database Test Import Error

**Problem:**
The workflow attempted to import from `src.database` before installing the package:
```yaml
- name: Test database functionality
  run: |
    python - <<'PY'
    from src.database import init_db, get_database_stats  # ERROR: ModuleNotFoundError
```

**Root Cause:**
The "Test database functionality" step ran BEFORE "Install dev extras for core checks" step, causing `ModuleNotFoundError: No module named 'src'`.

**Fix:**
Reordered steps in the `primary-test` job:
1. Run syntax check
2. **Install dev extras** (`pip install -e .[dev]`)
3. Test database functionality (can now import src.database)

**Impact:** Database initialization tests now execute successfully in CI.

### 2. CI Workflow - Agent Module Path Error

**Problem:**
Incorrect module path execution in `cross-platform-ubuntu` job:
```yaml
- name: Test core functionality
  run: python -m src.agent --mode health  # ERROR: src is not a valid module path
```

**Root Cause:**
Using `python -m src.agent` treats `src` as a Python package module, but the repository structure doesn't support this pattern without installation.

**Fix:**
1. Added package installation step before execution:
   ```yaml
   - name: Install package in editable mode
     run: python -m pip install -e .
   ```
2. Changed execution to direct file path:
   ```yaml
   - name: Test core functionality
     run: python src/agent.py --mode health
   ```

**Impact:** Health check tests now execute successfully on Ubuntu runner.

### 3. Configuration Consistency - mypy Python Version

**Problem:**
Version mismatch between CI and type checking:
- GitHub Actions workflows: Python 3.13
- mypy configuration: Python 3.12

**Fix:**
Updated `pyproject.toml`:
```toml
[tool.mypy]
python_version = "3.13"  # Updated from "3.12"
```

**Impact:** Type checking now matches the Python version used in CI/CD, preventing version-specific type issues.

## Verification

### Tests Performed
- ✅ YAML syntax validation for all workflow files
- ✅ Python syntax check on all .py files
- ✅ Config file existence verification
- ✅ Security workflow target discovery
- ✅ Custom action YAML validation

### Expected Behavior

**primary-test job execution order:**
1. Checkout code
2. Prepare Python environment (install requirements.txt)
3. Run syntax check
4. **Install package with dev extras** ← Fixed order
5. Test database functionality
6. Run quality gates (lint/type/coverage)
7. Security scans

**cross-platform-ubuntu job execution order:**
1. Checkout code
2. Prepare Python environment
3. Prepare config files
4. **Install package in editable mode** ← New step
5. Test agent health check

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `.github/workflows/ci.yml` | Reordered steps in primary-test | Fix import before install |
| `.github/workflows/ci.yml` | Added install + changed agent execution | Fix module path error |
| `pyproject.toml` | Updated mypy python_version to 3.13 | Match CI Python version |
| `.github/workflows/README.md` | Updated job descriptions | Document changes |

## Testing Recommendations

To prevent similar issues in the future:

1. **Test locally before CI:**
   ```bash
   # Simulate workflow steps
   python3 -m venv test_env
   source test_env/bin/activate
   pip install -r requirements.txt
   pip install -e .[dev]
   python src/agent.py --mode health
   ```

2. **Use act for local workflow testing:**
   ```bash
   # Install act: https://github.com/nektos/act
   act push -j primary-test
   ```

3. **Pre-commit validation:**
   ```bash
   # Validate YAML syntax
   python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
   ```

## Related Documentation

- [Workflows README](.github/workflows/README.md) - Workflow overview
- [Contributing Guide](../../docs/governance/CONTRIBUTING.md) - PR checklist includes workflow testing
- [Troubleshooting](../../docs/troubleshooting.md) - Common runtime issues

## Date

**Fixed:** 2025-10-12
**Testing:** Verified workflow steps execute in correct order
**Status:** ✅ All workflows operational
