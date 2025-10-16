# JobSentinel Test Suite Documentation

## Quick Start

### Running Tests

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run all tests
pytest

# Run specific test directory
pytest deploy/common/tests/unit/

# Run with coverage
pytest --cov=deploy/cloud/common --cov-report=html

# Run tests in parallel (faster)
pytest -n auto

# Run with verbose output
pytest -v

# Run specific test file
pytest deploy/common/tests/unit/cloud_functions/test_budget_alerter.py

# Run specific test
pytest deploy/common/tests/unit/cloud_functions/test_budget_alerter.py::TestBudgetAlertHandler::test_budget_alert_handler_exceeds_budget_triggers_pause
```

### Current Status

⚠️ **KNOWN ISSUE**: Cloud deployment tests (7 files, 178 tests) cannot currently execute due to module import namespace collision.

**Root Cause**: Test directory `deploy/common/tests/unit/cloud/` conflicts with cloud module namespace.

**Fix Required**: 
```bash
# Rename test directory to resolve conflict
mv deploy/common/tests/unit/cloud/ deploy/common/tests/unit/cloud_tests/
```

## Test Organization

```
deploy/common/tests/
├── conftest.py              # Root test configuration
├── unit/                    # Unit tests
│   ├── cloud/               # ⚠️ BROKEN: Namespace conflict with cloud package
│   │   ├── test_exceptions.py      (43 tests - can't run)
│   │   ├── test_style.py           (55 tests - can't run)
│   │   ├── test_utils.py           (80 tests - can't run)
│   │   ├── test_receipt.py         (tests - can't run)
│   │   ├── test_teardown.py        (tests - can't run)
│   │   ├── test_update.py          (tests - can't run)
│   │   └── test_terraform_installer.py (tests - can't run)
│   ├── cloud_functions/     # ✅ NEW: Working test directory
│   │   └── test_budget_alerter.py  (26 tests - implementation ready)
│   └── unit_jsa/            # JSA application tests
├── integration/             # Integration tests (if any)
├── smoke/                   # Smoke tests
└── fixtures/                # Shared test fixtures
```

## Test Coverage

### Current Coverage by Module

| Module | Tests | Status | Coverage |
|--------|-------|--------|----------|
| exceptions.py | 43 | ⚠️ Broken | - |
| style.py | 55 | ⚠️ Broken | - |
| utils.py | 80 | ⚠️ Broken | 89% (target) |
| receipt.py | tests | ⚠️ Broken | - |
| teardown.py | tests | ⚠️ Broken | - |
| update.py | tests | ⚠️ Broken | - |
| terraform_installer.py | tests | ⚠️ Broken | - |
| functions/budget_alerter.py | 26 | ✅ Ready | 95% (target) |

### Modules Without Tests (17 modules)

High Priority:
- functions/main.py
- providers/gcp/auth.py
- providers/gcp/budget.py
- providers/gcp/project.py
- providers/gcp/regions.py
- providers/gcp/scheduler.py
- providers/gcp/security.py
- providers/gcp/cloud_run.py
- providers/gcp/utils.py

Medium Priority:
- providers/gcp/project_detection.py
- providers/gcp/sdk.py
- providers/gcp/summary.py
- providers/gcp/cloud_database.py
- providers/gcp/teardown.py
- providers/gcp/gcp.py
- bootstrap.py

**See COMPREHENSIVE_TEST_PLAN.md for detailed specifications of all 348+ test cases needed.**

## Test Standards

All tests follow the **PyTest Architect Agent** specifications:

### Core Principles

1. **Pure pytest** - No `unittest.TestCase` classes
2. **AAA Pattern** - Clear Arrange-Act-Assert structure
3. **Descriptive Names** - `test_<unit>_<scenario>_<expected>()`
4. **Parametrization** - Use `@pytest.mark.parametrize` for test matrices
5. **Isolation** - Each test independent, no shared state
6. **Determinism** - Seed RNG, freeze time, mock I/O
7. **Fast** - Target <100ms per test
8. **Documented** - Clear docstrings explaining intent

### Example Test Structure

```python
class TestBudgetAlertHandler:
    """Test the budget alert Cloud Function entry point."""

    def test_budget_alert_handler_exceeds_budget_triggers_pause(self, mocker, capsys):
        """Budget alert handler should pause scheduler when cost exceeds budget."""
        # Arrange
        mock_pause = mocker.patch("budget_alerter._pause_scheduler_job")
        event_data = {"costAmount": 100, "budgetAmount": 90}
        encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()
        event = {"data": encoded_data}
        context = MagicMock(event_id="test-event-123")

        # Act
        budget_alert_handler(event, context)

        # Assert
        mock_pause.assert_called_once()
        captured = capsys.readouterr()
        assert "Cost has exceeded budget" in captured.out
```

### Common Fixtures

```python
@pytest.fixture
def mock_logger():
    """Provide mock logger for testing."""
    return MagicMock(spec=logging.Logger)

@pytest.fixture
def mock_gcp_env(monkeypatch):
    """Set up mock GCP environment variables."""
    monkeypatch.setenv("GCP_PROJECT", "test-project-123")
    monkeypatch.setenv("GCP_REGION", "us-central1")

@pytest.fixture
def mock_run_command(mocker):
    """Mock async run_command function."""
    return mocker.patch("cloud.utils.run_command", new_callable=AsyncMock)
```

## Coverage Targets

### Line Coverage
- **Target**: ≥90% for all cloud modules
- **Minimum**: 85% for complex integration modules
- **Pure Functions**: ~100%

### Branch Coverage
- **Target**: ≥85% for all cloud modules
- **Minimum**: 80% for complex modules

### Mutation Testing (Optional)
- **Target**: ≥85% kill rate
- **Tool**: mutmut or cosmic-ray

## Test Execution

### Local Development

```bash
# Quick test during development
pytest -x  # Stop on first failure

# Test with coverage
pytest --cov=deploy/cloud/common --cov-report=term-missing

# Test specific module
pytest deploy/common/tests/unit/cloud_functions/ -v

# Test with markers
pytest -m "not integration"  # Skip integration tests

# Generate HTML coverage report
pytest --cov=deploy/cloud/common --cov-report=html
open htmlcov/index.html
```

### CI/CD

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e ".[dev]"
      - run: pytest --cov=deploy/cloud/common --cov-report=xml
      - uses: codecov/codecov-action@v3
```

## Writing New Tests

### Step 1: Choose Location

```bash
# For cloud functions
deploy/common/tests/unit/cloud_functions/test_your_module.py

# For GCP providers (after fixing import issue)
deploy/common/tests/unit/cloud_tests/providers/gcp/test_your_module.py

# For JSA application
deploy/common/tests/unit_jsa/test_your_module.py
```

### Step 2: Follow Template

```python
"""Comprehensive tests for module_name.

Brief description of what this module does.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, AsyncMock

# Import module under test
from your_module import function_to_test


class TestYourFunction:
    """Test the main function."""

    def test_happy_path(self):
        """Should succeed with valid inputs."""
        # Arrange
        input_data = "test"
        
        # Act
        result = function_to_test(input_data)
        
        # Assert
        assert result == expected_value

    def test_error_handling(self):
        """Should handle errors gracefully."""
        # Arrange
        invalid_input = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="cannot be None"):
            function_to_test(invalid_input)

    @pytest.mark.parametrize(
        "input_val,expected",
        [
            ("a", 1),
            ("b", 2),
            ("c", 3),
        ],
        ids=["case_a", "case_b", "case_c"],
    )
    def test_various_inputs(self, input_val, expected):
        """Test with various input values."""
        result = function_to_test(input_val)
        assert result == expected
```

### Step 3: Run and Verify

```bash
# Run your new tests
pytest deploy/common/tests/unit/your_test_file.py -v

# Check coverage
pytest deploy/common/tests/unit/your_test_file.py --cov=your_module --cov-report=term-missing

# Ensure high coverage (aim for 90%+)
```

## Debugging Tests

### Common Issues

**Issue**: Import errors
```bash
# Check Python path
python -c "import sys; print('\n'.join(sys.path))"

# Verify module can be imported
python -c "from your_module import your_function"
```

**Issue**: Async test not running
```python
# Add pytest-asyncio marker
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None
```

**Issue**: Mock not working
```python
# Patch at import site, not definition site
mocker.patch("your_test_module.imported_function")  # ✅ Correct
# Not: mocker.patch("source_module.function")  # ❌ Wrong
```

### Useful Debug Flags

```bash
# Show print statements
pytest -s

# Increase verbosity
pytest -vv

# Show local variables on failure
pytest -l

# Drop into debugger on failure
pytest --pdb

# Show slowest tests
pytest --durations=10
```

## Additional Resources

### Documentation
- **COMPREHENSIVE_TEST_PLAN.md** - Complete test specifications for all 17 untested modules
- **TEST_SUITE_IMPLEMENTATION_SUMMARY.md** - Executive summary and implementation roadmap
- [PyTest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [pytest-mock](https://pytest-mock.readthedocs.io/)

### Tools
- **pytest** - Test framework
- **pytest-cov** - Coverage plugin
- **pytest-asyncio** - Async test support
- **pytest-mock** - Mocking helpers
- **freezegun** - Time mocking
- **hypothesis** - Property-based testing

### Getting Help

1. Check existing tests for patterns
2. Review COMPREHENSIVE_TEST_PLAN.md for examples
3. Read module docstrings for expected behavior
4. Ask team members for clarification

## Contributing

### Before Committing

```bash
# Run all tests
pytest

# Check coverage
pytest --cov=deploy/cloud/common --cov-report=term-missing

# Ensure coverage meets threshold (90%+)

# Run linters
ruff check .
black --check .

# Run type checker
mypy deploy/common/app/src/jsa/
```

### Test Review Checklist

- [ ] Tests follow AAA pattern
- [ ] Descriptive test names
- [ ] Proper use of fixtures
- [ ] Comprehensive mocking (no real I/O)
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Docstrings present
- [ ] Coverage ≥90%

## Troubleshooting

### Import Issues

**Problem**: Cannot import cloud modules in tests

**Solution**: Ensure conftest.py properly sets up paths:
```python
import sys
from pathlib import Path

CLOUD_DIR = Path(__file__).parent.parent.parent.parent / "cloud"
sys.path.insert(0, str(CLOUD_DIR))
```

### Async Issues

**Problem**: Async tests fail with "coroutine was never awaited"

**Solution**: Add `@pytest.mark.asyncio` decorator and ensure await:
```python
@pytest.mark.asyncio
async def test_my_async_function():
    result = await my_async_function()  # Don't forget await!
    assert result is not None
```

### Mock Issues

**Problem**: Mock not being called

**Solution**: Patch at the import site:
```python
# In your test file, if module does: from cloud.utils import run_command
mocker.patch("module_under_test.run_command")  # ✅ Correct

# Not:
mocker.patch("cloud.utils.run_command")  # ❌ May not work
```

---

**Last Updated**: 2025-01-16

**Maintainer**: Development Team

**Status**: Tests under development - see COMPREHENSIVE_TEST_PLAN.md for roadmap
