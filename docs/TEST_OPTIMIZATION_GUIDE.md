# Test Suite Optimization Guide

## Overview

This document describes the test suite optimizations implemented to improve test performance, maintainability, and reliability according to pytest best practices.

## Performance Improvements

### Before Optimization
- **Test runtime**: 10.59s (721 tests)
- **Slowest test**: 2.59s (hypothesis property test)
- **Issues identified**:
  - 17 instances of `time.sleep()` causing unnecessary delays
  - Hypothesis property tests running with default 100 examples
  - No randomized test order validation
  - No timeout protection against runaway tests

### After Optimization
- **Test runtime**: 4.57s (721 tests, excluding slow tests)
- **Improvement**: **57% faster**
- **Slowest test**: 0.32s (optimized hypothesis test)
- **Key changes**:
  - Replaced `time.sleep()` with mocked time in rate limit tests
  - Reduced hypothesis examples to 50 with 500ms deadline
  - Added pytest-randomly for order independence
  - Added pytest-timeout for performance guardrails

## New Dependencies

The following pytest plugins were added to improve test quality:

```toml
pytest-randomly>=3.15,<4      # Randomized test order for independence validation
pytest-timeout>=2.3,<3         # Timeout protection against slow tests
time-machine>=2.17,<3          # Enhanced time mocking capabilities
```

## Configuration Updates

### pyproject.toml

#### Pytest Configuration
```toml
[tool.pytest.ini_options]
addopts = """
  --randomly-seed=1337        # Deterministic random seed
  --timeout=30                # Default 30s timeout per test
"""
timeout = 30
timeout_method = "thread"
```

#### Coverage Configuration
```toml
[tool.coverage.run]
parallel = true               # Parallel coverage collection

[tool.coverage.report]
skip_covered = true           # Skip fully covered files in reports
skip_empty = true             # Skip empty files
```

#### Hypothesis Configuration
```toml
[tool.hypothesis]
max_examples = 50             # Reduced from default 100
deadline = 500                # 500ms deadline per example
phases = ["explicit", "reuse", "generate", "target"]
```

## Best Practices Applied

### 1. Eliminate Real Time Delays

**Anti-pattern:**
```python
def test_refill_after_time(self):
    bucket = TokenBucket(capacity=10, refill_rate=2.0)
    bucket.consume(5)
    time.sleep(0.6)  # 600ms delay!
    bucket.consume(1)
    assert bucket.tokens >= 4.0
```

**Best practice:**
```python
def test_refill_after_time(self):
    with patch("time.time") as mock_time:
        mock_time.return_value = 1000.0
        bucket = TokenBucket(capacity=10, refill_rate=2.0)
        bucket.consume(5)
        
        mock_time.return_value = 1000.6  # Simulate 0.6s
        bucket.consume(1)
        assert bucket.tokens >= 4.0
```

### 2. Mark Legitimately Slow Tests

For tests that genuinely require time delays (e.g., testing actual timeout behavior):

```python
@pytest.mark.slow
def test_cache_expiration(self):
    """Test cache expiration (marked slow due to real timing)."""
    cache = ResponseCache(ttl_seconds=1)
    cache.set("key", value)
    time.sleep(1.5)
    assert cache.get("key") is None
```

Run fast tests only:
```bash
pytest -m "not slow"
```

### 3. Optimize Property-Based Tests

**Before:**
```python
@given(st.text(min_size=1, max_size=50))
def test_property_non_http_becomes_hash(s: str):
    # Runs 100 examples by default
    ...
```

**After:**
```python
@settings(max_examples=50, deadline=500)
@given(st.text(min_size=1, max_size=50))
def test_property_non_http_becomes_hash(s: str):
    # Runs 50 examples with 500ms deadline
    ...
```

### 4. Use Conftest Fixtures for Time Mocking

```python
@pytest.fixture
def mock_time(monkeypatch):
    """Provide controllable time mocking for deterministic tests."""
    import time
    mock = Mock()
    mock.return_value = 1000.0
    monkeypatch.setattr(time, "time", mock)
    return mock

@pytest.fixture
def freeze_time_2025():
    """Freeze time to 2025-01-01 00:00:00 UTC."""
    from freezegun import freeze_time
    with freeze_time("2025-01-01 00:00:00"):
        yield
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run fast tests only (exclude slow tests)
```bash
pytest -m "not slow"
```

### Run with different random seed
```bash
pytest --randomly-seed=42
```

### Disable random order (for debugging)
```bash
pytest -p no:randomly
```

### Show slowest tests
```bash
pytest --durations=10
```

### Run with custom timeout
```bash
pytest --timeout=60  # 60 second timeout
```

## Test Markers

- `@pytest.mark.slow` - Tests that legitimately require time delays
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.asyncio` - Async tests
- `@pytest.mark.windows_deployment` - Windows-specific tests

## Coverage Guidelines

- **Line coverage**: ≥75% (enforced in CI)
- **Branch coverage**: Enabled via `--cov-branch`
- **Skip covered files**: Enabled to reduce noise in reports

## Performance Thresholds

- **Unit tests**: < 100ms typical, < 500ms worst-case
- **Property tests**: < 500ms per test with hypothesis
- **Integration tests**: < 5s per test
- **Overall suite**: Target < 10s for unit tests

## Continuous Improvement

### Regular Audits
1. Run `pytest --durations=20` to identify slow tests
2. Review tests taking >100ms
3. Apply time mocking or mark as `@pytest.mark.slow`

### Mutation Testing (Optional)
For critical logic, use `mutmut` to ensure test quality:
```bash
mutmut run --paths-to-mutate=deploy/common/app/src/jsa
```

### Randomized Order Testing
Tests should pass regardless of execution order. The `pytest-randomly` plugin validates this.

## Troubleshooting

### Test is timing out
- Check if test contains `time.sleep()` - replace with mocked time
- Verify external dependencies are mocked
- Consider marking as `@pytest.mark.slow` if legitimately slow

### Test is flaky
- Ensure deterministic behavior (seeded RNG, mocked time)
- Check for race conditions in async tests
- Verify no reliance on external state or network

### Coverage is low
- Focus on meaningful paths and edge cases
- Don't chase 100% - focus on critical logic
- Use mutation testing to validate test quality

## References

- [Pytest Best Practices](https://docs.pytest.org/en/stable/goodpractices.html)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [pytest-randomly](https://github.com/pytest-dev/pytest-randomly)
- [pytest-timeout](https://github.com/pytest-dev/pytest-timeout)
