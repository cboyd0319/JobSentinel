# Cloud Module Test Architecture

## Overview
This document describes the test architecture and patterns used for comprehensive testing of JobSentinel's cloud deployment modules, following the PyTest Architect Agent specification.

## Core Testing Principles

### 1. Framework: Pure pytest
- No unittest.TestCase inheritance
- Use pytest fixtures and markers
- Leverage pytest-asyncio for async tests
- Use pytest-mock for mocking

### 2. AAA Pattern (Arrange-Act-Assert)
Every test follows this structure:

```python
def test_function_scenario_expected(self):
    """Docstring explaining test purpose."""
    # Arrange - Setup test data and mocks
    mock_logger = MagicMock()
    expected_value = "result"
    
    # Act - Execute function under test
    result = function_under_test(mock_logger, param="value")
    
    # Assert - Verify expectations
    assert result == expected_value
    mock_logger.info.assert_called_once()
```

### 3. Naming Convention
Format: `test_<unit>_<scenario>_<expected>`

Examples:
- `test_authenticate_already_authenticated_with_adc`
- `test_select_region_returns_chosen_region`
- `test_budget_alert_handler_pauses_on_exceeded_budget`

Benefits:
- Self-documenting
- Easy to find specific tests
- Clear intent at a glance

### 4. Determinism
All tests are deterministic:
- ✅ No network calls (mocked)
- ✅ No random values (or seeded)
- ✅ No time dependencies (or frozen)
- ✅ No filesystem dependencies (tmp_path)
- ✅ No environment coupling (monkeypatch)

### 5. Isolation
Each test is completely isolated:
- No shared state between tests
- Each test can run independently
- Order doesn't matter (use pytest-randomly)
- No test dependencies on other tests

### 6. Coverage Focus
Test priority:
1. Public API contract (all functions)
2. Happy paths (success scenarios)
3. Error paths (exceptions, failures)
4. Edge cases (empty, zero, max, special chars)
5. Boundary conditions
6. All branches in conditionals

### 7. Small, Focused Tests
- One behavior per test
- Use parametrization for input matrices
- Keep tests under 20 lines when possible
- Extract common setup to fixtures

## Test Structure

### Directory Layout
```
deploy/common/tests/unit/cloud/
├── conftest.py                    # Shared fixtures and setup
├── test_bootstrap.py              # CLI entry point tests
├── test_exceptions.py             # Exception class tests (existing)
├── test_receipt.py                # Receipt generation tests (existing)
├── test_style.py                  # Style utilities tests (existing)
├── test_teardown.py               # Teardown tests (existing)
├── test_terraform_installer.py    # Terraform installer tests (existing)
├── test_update.py                 # Update tests (existing)
├── test_utils.py                  # Utility function tests (existing)
├── functions/
│   └── test_budget_alerter.py    # Cloud Function tests
└── providers/
    └── gcp/
        ├── test_auth.py           # Authentication tests
        ├── test_budget.py         # Budget setup tests
        ├── test_project.py        # Project management tests
        └── test_regions.py        # Region selection tests
```

### Conftest Setup
The `conftest.py` at `deploy/common/tests/unit/cloud/` provides:

1. **Path Setup**: Adds cloud/common to sys.path
2. **Module Namespace**: Creates "cloud" module for imports
3. **Mock Dependencies**: Mocks utils.cost_tracker
4. **Fixtures**: Common test fixtures

Key fixtures:
- `mock_gcp_credentials`: Mock GCP env vars
- `mock_gcp_region`: Mock region configuration
- `sample_deployment_config`: Sample config data

## Mocking Patterns

### 1. Async Functions
Use AsyncMock for async functions:

```python
@pytest.mark.asyncio
async def test_async_function(self, mocker):
    mock_result = AsyncMock()
    mock_result.returncode = 0
    mock_result.stdout = "output"
    
    mocker.patch("module.run_command", return_value=mock_result)
    
    await function_under_test()
```

### 2. Synchronous Functions
Use MagicMock for sync functions:

```python
def test_sync_function(self, mocker):
    mock_logger = MagicMock()
    mocker.patch("module.function", return_value="result")
    
    result = function_under_test(mock_logger)
```

### 3. Environment Variables
Use monkeypatch for env vars:

```python
def test_with_env_var(self, monkeypatch):
    monkeypatch.setenv("VAR_NAME", "value")
    
    result = function_that_reads_env()
    
    assert result == "value"
```

### 4. Dynamically Imported Modules
For modules imported inside functions:

```python
def test_dynamic_import(self, mocker):
    import sys
    import types
    
    # Create mock module
    mock_module = types.ModuleType("module_name")
    mock_module.Class = MagicMock(return_value=mock_instance)
    sys.modules["full.module.path"] = mock_module
    
    # Test code that imports the module
    result = function_that_imports()
    
    # Cleanup
    del sys.modules["full.module.path"]
```

## Parametrization

### 1. Simple Parametrization
Test multiple inputs:

```python
@pytest.mark.parametrize(
    "input_val,expected",
    [
        (0, 0),
        (1, 1),
        (2, 4),
    ],
    ids=["zero", "one", "two"]
)
def test_function(self, input_val, expected):
    result = square(input_val)
    assert result == expected
```

### 2. Complex Parametrization
Test combinations:

```python
@pytest.mark.parametrize(
    "cost,budget,should_pause",
    [
        (50, 100, False),
        (100, 100, True),
        (150, 100, True),
    ],
    ids=["under", "equal", "over"]
)
def test_threshold(self, cost, budget, should_pause, mocker):
    # Test logic
```

### 3. Cross Parametrization
Test all combinations:

```python
@pytest.mark.parametrize("provider", ["gcp", "aws", "azure"])
@pytest.mark.parametrize("log_level", ["debug", "info", "warning"])
def test_all_combinations(self, provider, log_level):
    # Will run 9 tests (3 x 3)
```

## Fixtures

### 1. Function-Scoped Fixtures
Default scope, fresh for each test:

```python
@pytest.fixture
def sample_data():
    return {"key": "value"}

def test_with_fixture(self, sample_data):
    assert sample_data["key"] == "value"
```

### 2. Class-Scoped Fixtures
Shared across test class:

```python
@pytest.fixture(scope="class")
def expensive_setup():
    # Expensive setup
    yield resource
    # Cleanup
```

### 3. Fixture with Cleanup
Use yield for cleanup:

```python
@pytest.fixture
def mock_gcp_bootstrap(self):
    import sys
    mock_module = setup_mock()
    sys.modules["module"] = mock_module
    
    yield mock_module
    
    # Cleanup
    del sys.modules["module"]
```

## Async Testing

### 1. Basic Async Test
```python
@pytest.mark.asyncio
async def test_async_function(self):
    result = await async_function()
    assert result == expected
```

### 2. Async Fixtures
```python
@pytest.fixture
async def async_resource():
    resource = await setup_resource()
    yield resource
    await cleanup_resource(resource)
```

### 3. Async Mocking
```python
@pytest.mark.asyncio
async def test_with_async_mock(self, mocker):
    mock = AsyncMock(return_value="result")
    mocker.patch("module.async_func", mock)
    
    result = await function_under_test()
    
    mock.assert_called_once()
```

## Error Testing

### 1. Expected Exceptions
```python
def test_raises_exception(self):
    with pytest.raises(ValueError, match="expected message"):
        function_that_raises()
```

### 2. Error Handling
```python
def test_handles_error_gracefully(self, mocker, capsys):
    mocker.patch("module.func", side_effect=Exception("error"))
    
    result = function_that_catches()
    
    assert result is None
    captured = capsys.readouterr()
    assert "error" in captured.out
```

### 3. Missing Data
```python
def test_handles_missing_data(self):
    incomplete_data = {}  # Missing required keys
    
    result = function_with_defaults(incomplete_data)
    
    assert result["key"] == "default_value"
```

## Output Verification

### 1. Logging
```python
def test_logs_message(self, caplog):
    with caplog.at_level(logging.INFO):
        function_that_logs()
    
    assert "expected message" in caplog.text
```

### 2. Print Statements
```python
def test_prints_output(self, capsys):
    function_that_prints()
    
    captured = capsys.readouterr()
    assert "expected output" in captured.out
```

### 3. File Output
```python
def test_writes_file(self, tmp_path):
    output_file = tmp_path / "output.txt"
    
    function_that_writes(output_file)
    
    assert output_file.read_text() == "expected content"
```

## Quality Gates

### Coverage Thresholds
- **Line Coverage**: ≥ 90%
- **Branch Coverage**: ≥ 85%
- **New/Changed Code**: ~100%

### Test Characteristics
- **Speed**: Unit tests < 100ms typical
- **Determinism**: 100% reproducible
- **Isolation**: No inter-test dependencies
- **Clarity**: Self-documenting names

### Code Quality
- **Linting**: Passes ruff/flake8
- **Type Checking**: Passes mypy (where applicable)
- **Security**: Passes bandit
- **Style**: Follows black/ruff formatting

## CI Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e .[dev]
      - run: pytest deploy/common/tests/unit/cloud/ --cov --cov-report=xml
      - uses: codecov/codecov-action@v3
```

## Best Practices Checklist

Before submitting tests, verify:
- [ ] All tests follow AAA pattern
- [ ] Test names are descriptive
- [ ] Tests are deterministic
- [ ] Tests are isolated
- [ ] Mocks are at import site
- [ ] No hardcoded paths
- [ ] No sleep() calls
- [ ] Docstrings explain intent
- [ ] Parametrization used for matrices
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] All tests pass
- [ ] Coverage thresholds met

## Anti-Patterns to Avoid

### ❌ Don't Do This
```python
# Multiple unrelated assertions
def test_everything(self):
    assert func1() == "a"
    assert func2() == "b"
    assert func3() == "c"

# Hidden dependencies
def test_depends_on_order(self):
    # Assumes test_a ran first
    assert shared_state == "modified"

# Real network calls
def test_with_network(self):
    response = requests.get("https://api.example.com")
    
# Sleep for timing
def test_with_sleep(self):
    time.sleep(5)
    assert async_operation_done
```

### ✅ Do This Instead
```python
# One behavior per test
def test_func1_returns_a(self):
    assert func1() == "a"

def test_func2_returns_b(self):
    assert func2() == "b"

# Explicit setup
def test_with_state(self):
    state = "modified"
    assert process(state) == expected

# Mock network
def test_with_mock_network(self, mocker):
    mocker.patch("requests.get", return_value=mock_response)
    
# Control time
def test_with_frozen_time(self, freezer):
    freezer.freeze()
    assert operation() == expected
```

## Conclusion

This architecture provides:
- **Maintainability**: Easy to understand and modify
- **Reliability**: Consistent, reproducible results
- **Speed**: Fast feedback loop
- **Coverage**: Comprehensive test coverage
- **Confidence**: Safe refactoring

Follow these patterns for all new tests to maintain quality and consistency.
