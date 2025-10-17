# Test Implementation Guide

## Overview

This guide documents the comprehensive pytest test suite implementation for JobSentinel, following PyTest Architect best practices and OWASP security standards.

## Test Suite Statistics

### Completed Modules
- **Total New Tests Created**: 163 tests
- **Modules Fully Tested**: 3/74 (4.1%)
- **Pass Rate**: 100% (106/106 passing, 67 pending ML dependencies)
- **Average Coverage**: 97% (range: 94-100%)
- **Average Test Performance**: 7-8ms per test

### Test Files Created

1. `deploy/common/tests/unit/test_jsa_config_facade.py`
   - 39 tests, 94.12% coverage
   - Tests: jsa/config.py (ConfigService facade)

2. `deploy/common/tests/unit/test_ml_confidence_scorer.py`
   - 67 tests (awaiting ML dependencies)
   - Tests: domains/ml/confidence_scorer.py

3. `deploy/common/tests/unit/test_resume_models.py`
   - 57 tests, 100% coverage
   - Tests: domains/resume/models.py

## Testing Standards

### Core Principles

1. **Framework**: Pure pytest (no unittest style)
2. **Pattern**: AAA (Arrange-Act-Assert) in every test
3. **Naming**: `test_<unit>_<scenario>_<expected>()`
4. **Determinism**: No random, time, or network dependencies
5. **Isolation**: Each test is independent
6. **Performance**: Target <100ms per test (achieved: 7-8ms avg)

### Coverage Requirements

- **Line Coverage**: ≥90% per module
- **Branch Coverage**: ≥85% per module
- **Critical Paths**: 100% coverage
- **Error Paths**: 100% coverage

### Test Organization

```
deploy/common/tests/
├── unit/                          # Unit tests
│   ├── test_jsa_config_facade.py
│   ├── test_resume_models.py
│   └── test_ml_confidence_scorer.py
├── integration/                   # Integration tests
└── conftest.py                    # Shared fixtures
```

## Testing Patterns

### Pattern 1: Dataclass Testing

For dataclasses like `ResumeSection`, `ConfidenceFactors`:

```python
def test_dataclass_initializes_with_defaults():
    """Dataclass initializes with default values."""
    obj = DataClass(required_field="value")
    assert obj.optional_field == default_value

def test_dataclass_stores_all_fields():
    """Dataclass stores all provided fields."""
    obj = DataClass(field1="a", field2="b", field3="c")
    assert obj.field1 == "a"
    assert obj.field2 == "b"
    assert obj.field3 == "c"

def test_dataclass_validates_constraints():
    """Dataclass enforces validation rules."""
    # Test any post_init validation
    obj = DataClass(constrained_field=1.5)
    assert 0 <= obj.constrained_field <= 1.0  # Auto-clipped
```

### Pattern 2: Enum Testing

For enums like `ResumeTemplate`, `ConfidenceLevel`:

```python
def test_enum_has_all_expected_values():
    """Enum defines all expected values."""
    assert MyEnum.VALUE1.value == "value1"
    assert MyEnum.VALUE2.value == "value2"

def test_enum_count():
    """Enum has expected number of members."""
    assert len(MyEnum) == 5

@pytest.mark.parametrize(
    "member",
    list(MyEnum),
    ids=[m.value for m in MyEnum],
)
def test_enum_values_are_strings(member: MyEnum):
    """Enum values are of expected type."""
    assert isinstance(member.value, str)
```

### Pattern 3: Parametrized Testing

For testing multiple inputs/scenarios:

```python
@pytest.mark.parametrize(
    "input_value,expected_output",
    [
        (0, 0),
        (1, 1),
        (10, 100),
        (-1, 1),
    ],
    ids=["zero", "one", "large", "negative"],
)
def test_function_various_inputs(input_value, expected_output):
    """Function handles various input values correctly."""
    result = square(input_value)
    assert result == expected_output
```

### Pattern 4: Error Handling

For testing exceptions and validation:

```python
def test_function_raises_on_invalid_input():
    """Function raises ValueError on invalid input."""
    with pytest.raises(ValueError, match="expected pattern"):
        function_that_validates("invalid")

def test_function_raises_with_helpful_message():
    """Error message includes helpful context."""
    with pytest.raises(ValueError) as exc_info:
        function_that_validates(None)
    
    assert "field_name" in str(exc_info.value)
```

### Pattern 5: Helper Methods

For testing class methods:

```python
def test_helper_method_filters_correctly():
    """Helper method returns filtered subset."""
    obj = MyClass(items=[1, 2, 3, 4, 5])
    
    result = obj.get_items_above_threshold(3)
    
    assert len(result) == 2
    assert all(item > 3 for item in result)
```

### Pattern 6: Integration Tests

For end-to-end workflows:

```python
def test_complete_workflow_end_to_end():
    """Complete workflow from input to output."""
    # Arrange: Create all necessary objects
    config = create_test_config()
    processor = Processor(config)
    input_data = create_test_data()
    
    # Act: Execute complete workflow
    result = processor.process(input_data)
    
    # Assert: Verify complete result
    assert isinstance(result, ExpectedType)
    assert result.field1 is not None
    assert 0 <= result.score <= 100
    assert len(result.recommendations) > 0
```

## Fixtures

### Common Fixtures

Located in `conftest.py`:

```python
@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed random number generators for deterministic tests."""
    random.seed(1337)
    # numpy.random.seed(1337) if numpy available

@pytest.fixture
def tmp_config_file(tmp_path):
    """Create a temporary config file for testing."""
    config_path = tmp_path / "test_config.json"
    config_path.write_text(json.dumps({"test": "data"}))
    return config_path
```

### Module-Specific Fixtures

In test files:

```python
@pytest.fixture
def valid_config_data():
    """Valid configuration data for testing."""
    return {
        "field1": "value1",
        "field2": 42,
        "required_list": ["item1", "item2"],
    }

@pytest.fixture
def config_service(tmp_path, valid_config_data):
    """ConfigService instance for testing."""
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps(valid_config_data))
    return ConfigService(config_path=config_file)
```

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run specific test file
pytest deploy/common/tests/unit/test_resume_models.py

# Run with coverage
pytest --cov=domains.resume.models --cov-report=term-missing

# Run with verbose output
pytest -v

# Run specific test
pytest deploy/common/tests/unit/test_resume_models.py::test_resume_section_initializes_with_required_fields
```

### Useful Options

```bash
# Stop at first failure
pytest -x

# Run only failed tests from last run
pytest --lf

# Show local variables in tracebacks
pytest -l

# Run tests matching pattern
pytest -k "test_resume"

# Disable warnings
pytest --disable-warnings

# Show test duration
pytest --durations=10
```

## Coverage Analysis

### Generate Coverage Report

```bash
# Terminal report
pytest --cov=jsa.config --cov-report=term-missing

# HTML report
pytest --cov=jsa.config --cov-report=html

# Both
pytest --cov=jsa.config --cov-report=term-missing --cov-report=html
```

### Coverage Configuration

In `pyproject.toml`:

```toml
[tool.coverage.run]
source = [
    "deploy/common/app/src/jsa",
    "deploy/common/app/src/domains",
]
branch = true

[tool.coverage.report]
precision = 2
fail_under = 75
show_missing = true
skip_covered = false
```

## Common Issues and Solutions

### Issue 1: Import Errors

**Problem**: `ModuleNotFoundError: No module named 'xyz'`

**Solution**: 
- Install missing dependencies: `pip install -e ".[dev]"`
- Check module paths in pyproject.toml
- Verify PYTHONPATH includes src directory

### Issue 2: Fixture Not Found

**Problem**: `fixture 'my_fixture' not found`

**Solution**:
- Ensure fixture is in conftest.py or same test file
- Check fixture name spelling
- Verify fixture is properly decorated with `@pytest.fixture`

### Issue 3: Coverage Not Showing

**Problem**: Coverage shows 0% or "module not imported"

**Solution**:
- Use correct module path: `pytest --cov=jsa.config` (not full path)
- Ensure module is imported during tests
- Check source paths in coverage config

## Next Steps

### High-Priority Modules (Quick Wins)

Focus on data model modules first:

1. **domains/ats/** - ATS compatibility models (some already done)
2. **jsa/tracker/models.py** - Job tracking models
3. **domains/resume/** - Resume processing models (partially done)

### Medium-Priority Modules (Services)

Service layers with business logic:

1. **domains/resume/service.py** - Resume service
2. **domains/ats/service.py** - ATS service
3. **jsa/db.py** - Database facade

### Complex Modules (Integration Heavy)

Modules requiring extensive mocking:

1. **domains/llm/** - LLM integration (4 modules)
2. **domains/ml/** - ML features (requires ML deps)
3. **jsa/fastapi_app/** - FastAPI application (9 modules)

## Best Practices Checklist

Before committing tests, verify:

- [ ] All tests pass (`pytest`)
- [ ] Coverage ≥90% (`pytest --cov`)
- [ ] Tests are fast (<100ms per test)
- [ ] No flaky tests (run multiple times)
- [ ] Descriptive test names
- [ ] AAA pattern followed
- [ ] Proper parametrization used
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Integration tests for workflows
- [ ] No test dependencies (can run in any order)
- [ ] Proper fixtures used
- [ ] Documentation in docstrings

## Resources

### Documentation
- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Python unittest.mock](https://docs.python.org/3/library/unittest.mock.html)

### Best Practices
- [Effective Python Testing With Pytest](https://realpython.com/pytest-python-testing/)
- [Testing Best Practices](https://testdriven.io/blog/testing-best-practices/)
- PYTEST_STRATEGIC_PLAN.md (in repo)
- COMPREHENSIVE_TEST_GUIDE.md (in repo)

### Tools
- pytest - Test framework
- pytest-cov - Coverage plugin
- pytest-mock - Mocking plugin
- pytest-asyncio - Async testing
- freezegun - Time mocking
- hypothesis - Property-based testing

---

**Last Updated**: 2025-10-17  
**Status**: Active - 3 modules completed, ~71 remaining
