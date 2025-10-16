# Test Architecture for Cloud Deployment Modules

## Overview

This document describes the comprehensive test suite for the cloud deployment modules in the JobSentinel project. The test suite follows industry best practices and pytest ecosystem conventions to ensure high-quality, maintainable, and deterministic tests.

## Test Framework

- **Primary Framework**: pytest (v8.4+)
- **Async Support**: pytest-asyncio (v1.2+)
- **Mocking**: pytest-mock (wraps unittest.mock)
- **Time Control**: freezegun (for deterministic timestamps)
- **Coverage**: pytest-cov with branch coverage enabled

## Test Organization

```
deploy/common/tests/
├── conftest.py                 # Root test configuration
├── unit/
│   └── cloud/
│       ├── conftest.py         # Cloud module-specific configuration
│       ├── test_exceptions.py  # Exception classes (100% coverage)
│       ├── test_style.py       # Styling constants (100% coverage)
│       ├── test_receipt.py     # Receipt generation (100% coverage)
│       ├── test_utils.py       # Utility functions (85.52% coverage)
│       ├── test_teardown.py    # Teardown CLI (100% coverage)
│       ├── test_update.py      # Update CLI (100% coverage)
│       └── test_terraform_installer.py  # Terraform installation (88.46% coverage)
└── integration/                # Integration tests (future)
```

## Test Principles

### 1. AAA Pattern (Arrange-Act-Assert)

Every test follows the AAA pattern:

```python
def test_function_behavior_expected():
    # Arrange: Set up test data and mocks
    test_input = "value"
    
    # Act: Execute the function under test
    result = function_under_test(test_input)
    
    # Assert: Verify expectations
    assert result == expected_output
```

### 2. Naming Conventions

Tests use descriptive names following the pattern:
```
test_<unit>_<scenario>_<expected>
```

### 3. Test Coverage

**Target Coverage Levels:**
- New/Pure Functions: ~100% lines + branches
- Module Level: ≥90% lines, ≥85% branches
- Overall Project: ≥33% (gradually increasing)

**Current Status: 324 tests, 20.23% overall cloud coverage**

## Running Tests

```bash
# Run all cloud tests
pytest deploy/common/tests/unit/cloud/

# Run with coverage
pytest deploy/common/tests/unit/cloud/ --cov=deploy/cloud/common --cov-branch

# Run specific module
pytest deploy/common/tests/unit/cloud/test_receipt.py -v
```

See full documentation in the file for detailed testing patterns, CI integration, and best practices.
