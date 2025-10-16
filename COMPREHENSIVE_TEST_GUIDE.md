# JobSentinel Comprehensive Test Suite - Implementation Guide

## Overview

This document outlines the comprehensive pytest-based test suite for JobSentinel, following industry best practices and the Pytest Architect patterns.

## Testing Philosophy

### Core Principles

1. **Framework**: Use `pytest` exclusively (no unittest style)
2. **AAA Pattern**: Every test follows Arrange – Act – Assert
3. **Naming**: `test_<unit>_<scenario>_<expected>()` with readable, intent-revealing names
4. **Determinism**: No hidden time, randomness, network, or environment coupling
5. **Isolation**: Each test stands alone—no inter-test dependencies
6. **Coverage Is a Guardrail**: Focus on meaningful paths, not just metrics
7. **Small, Focused Tests**: One behavior per test, parametrization for input matrices

## Coverage Targets

- **Line Coverage**: ≥ 75% (current), target 90%
- **Branch Coverage**: ≥ 85%
- **New/Changed Pure Functions**: ~100% line + branch coverage

## Test Structure

```
deploy/common/tests/
├── unit/                    # Unit tests (fast, isolated)
│   ├── test_database.py    # 41 tests - Core database operations
│   ├── test_health_check.py # 49 tests - System health monitoring
│   ├── test_*.py           # Additional unit tests
│   └── conftest.py         # Shared fixtures
├── integration/            # Integration tests (optional)
├── conftest.py            # Root fixtures and configuration
└── fixtures/              # Shared test data and fixtures
```

## Implemented Test Modules

### 1. test_database.py (41 passing tests)

**Coverage:**
- Job model validation and field defaults
- Database URL derivation (SQLite ↔ PostgreSQL)
- Database type detection
- Async CRUD operations (create, read, update)
- Digest and alert tracking
- Database statistics aggregation
- Job cleanup operations
- Edge cases (boundary values, empty data, errors)

**Key Patterns:**
```python
@pytest.mark.asyncio
async def test_add_job_creates_new_job_when_not_exists(sample_job_data):
    """add_job creates a new job when hash doesn't exist."""
    # Arrange
    mock_session = AsyncMock(spec=AsyncSession)
    # ... setup mocks
    
    # Act
    result = await add_job(sample_job_data)
    
    # Assert
    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
```

### 2. test_health_check.py (49 passing tests)

**Coverage:**
- HealthCheckResult dataclass functionality
- Python version validation (pass/fail scenarios)
- Core dependency checking (requests, sqlalchemy, etc.)
- Optional dependency warnings (ML, MCP features)
- Configuration file validation
- Database accessibility checks
- Network connectivity tests
- System resource monitoring (disk, memory)
- Overall health report generation
- Report formatting and output
- Edge cases (unicode paths, malformed configs)

**Key Patterns:**
```python
@pytest.mark.parametrize(
    "status",
    ["pass", "warn", "fail"],
    ids=["pass_status", "warn_status", "fail_status"],
)
def test_result_accepts_valid_statuses(status):
    """HealthCheckResult accepts valid status values."""
    result = HealthCheckResult(name="Test", status=status, message="Test")
    assert result.status == status
```

## Test Fixtures

### Standard Fixtures

```python
@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed RNG for deterministic tests."""
    import random
    random.seed(1337)

@pytest.fixture
def sample_job_data():
    """Minimal valid job data for testing."""
    return {
        "hash": "abc123",
        "title": "Senior Python Developer",
        "url": "https://example.com/job/123",
        "company": "Tech Corp",
        "location": "Remote",
        "score": 0.85,
    }
```

## Mocking Strategies

### 1. Async Mocking
```python
mock_session = AsyncMock(spec=AsyncSession)
mock_session.__aenter__.return_value = mock_session
mock_session.__aexit__.return_value = None
```

### 2. File System Mocking
```python
with patch("pathlib.Path.exists", return_value=True):
    with patch("builtins.open", mock_open(read_data="test data")):
        # Test code
```

### 3. Network Mocking
```python
with patch("urllib.request.urlopen") as mock_urlopen:
    mock_urlopen.return_value = Mock()
    # Test code
```

## Running Tests

### Run All Tests
```bash
pytest
```

### Run Specific Module
```bash
pytest deploy/common/tests/unit/test_database.py -v
```

### Run with Coverage
```bash
pytest --cov=deploy/common/app/src --cov-report=html --cov-report=term-missing
```

### Run Only Fast Tests (Exclude Slow/Integration)
```bash
pytest -m "not slow and not integration"
```

### Run with Random Order (Check Test Independence)
```bash
pytest --randomly-seed=1337
```

## Priority Testing Roadmap

### Phase 1: Core Infrastructure (In Progress)
- [x] database.py - 41 tests ✓
- [x] health_check.py - 49 tests ✓
- [ ] unified_database.py
- [ ] concurrent_database.py
- [ ] web_ui.py
- [ ] agent.py

### Phase 2: JSA Core
- [ ] diagnostic.py
- [ ] error_formatter.py
- [ ] db_optimize.py
- [ ] backup_restore.py
- [ ] logging.py
- [ ] privacy_dashboard.py

### Phase 3: Domain Services
- [ ] domains/observability.py
- [ ] domains/security.py
- [ ] domains/intelligence.py
- [ ] domains/validation_framework.py

### Phase 4: ML & Detection
- [ ] domains/detection/job_quality_detector.py
- [ ] domains/detection/resume_quality_detector.py
- [ ] domains/detection/skills_gap_analyzer.py
- [ ] domains/ml/sentiment_analyzer.py
- [ ] domains/ml/keyword_extractor.py

### Phase 5: Resume & ATS
- [ ] domains/resume/service.py
- [ ] domains/resume/models.py
- [ ] domains/ats/service.py
- [ ] domains/ats/models.py

## Test Quality Guidelines

### DO:
✅ Use descriptive test names that explain intent
✅ Follow AAA pattern consistently
✅ Use parametrize for multiple similar cases
✅ Mock external dependencies (network, filesystem, time)
✅ Test edge cases and boundary conditions
✅ Assert on specific values, not just truthiness
✅ Keep tests isolated and independent

### DON'T:
❌ Share mutable state between tests
❌ Test implementation details
❌ Use real network calls
❌ Use sleep() (use time mocking instead)
❌ Have tests that depend on execution order
❌ Create overly complex test setup
❌ Test multiple behaviors in one test

## Coverage Exclusions

The following patterns are excluded from coverage requirements:

```python
# pragma: no cover
def __repr__
raise AssertionError
raise NotImplementedError
if __name__ == .__main__.:
if TYPE_CHECKING:
@abstractmethod
```

## Continuous Integration

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Nightly builds

CI Configuration:
- Python versions: 3.11, 3.12
- Coverage threshold: 75% (increasing to 90%)
- Branch coverage threshold: 85%
- All tests must pass before merge

## Mutation Testing

For critical modules, run mutation tests:

```bash
mutmut run --paths-to-mutate=deploy/common/app/src/database.py
mutmut results
```

Target mutation score: ≥ 85%

## Performance Benchmarks

Unit tests should be fast:
- Individual test: < 100ms typical, < 500ms worst case
- Full test suite: < 2 minutes

Use `pytest-benchmark` for performance-critical code:

```python
def test_benchmark_function(benchmark):
    result = benchmark(my_function, arg1, arg2)
    assert result == expected
```

## Resources

- **Pytest Documentation**: https://docs.pytest.org
- **Coverage.py**: https://coverage.readthedocs.io
- **Pytest Best Practices**: https://docs.pytest.org/en/latest/goodpractices.html
- **SWEBOK v4.0a**: https://computer.org/swebok (Quality Assurance)

## Contributing

When adding new code:

1. Write tests FIRST (TDD encouraged)
2. Ensure tests are deterministic and isolated
3. Run full test suite before committing
4. Maintain or improve coverage percentage
5. Document complex test scenarios
6. Add integration tests for new features

## Contact

For questions about testing:
- Review existing test modules for patterns
- Check this guide for best practices
- Consult the Pytest Architect playbook in the issue description
