# Comprehensive Test Plan for JobSentinel Repository

## Executive Summary

This document outlines the comprehensive testing strategy for all Python modules in the JobSentinel repository, following the PyTest Architect Agent persona and playbook specifications.

### Current Status (October 16, 2025)

- **Total Python Modules**: 113 (excluding __init__.py files)
- **Modules with Tests**: 42 existing test files
- **New Tests Created**: 89 comprehensive unit tests (3 modules)
- **Test Pass Rate**: 100% (89/89 passing)
- **Coverage Target**: 90% lines, 85% branches (per module)
- **Current Overall Coverage**: ~7% (target: 33%, goal: 90%)

## Testing Framework & Standards

### Core Principles

1. **Framework**: Pure pytest (no unittest.TestCase style)
2. **Pattern**: AAA (Arrange-Act-Assert) in every test
3. **Naming**: `test_<unit>_<scenario>_<expected>()` with readable, intent-revealing names
4. **Determinism**: Seeded RNG, frozen time (freezegun), no network calls
5. **Isolation**: Each test standalone, tmp_path for files, monkeypatch for env vars
6. **Parametrization**: Extensive use of @pytest.mark.parametrize with descriptive IDs
7. **Coverage Focus**: Meaningful paths, edge cases, error handling, security

### Quality Gates

- **Line Coverage**: ≥90% per module
- **Branch Coverage**: ≥85% per module
- **Test Execution**: <100ms typical, <500ms worst case per test
- **Mutation Testing** (optional): ≥85% kill rate for core logic
- **Randomized Order**: Use pytest-randomly to catch order dependencies

### Tooling Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["deploy/common/tests"]
addopts = "-q --strict-config --strict-markers --maxfail=1 --disable-warnings --randomly-seed=1337 --cov=src --cov-report=term-missing:skip-covered --cov-branch"
xfail_strict = true
filterwarnings = ["error::DeprecationWarning"]

[tool.coverage.run]
branch = true
source = ["deploy/common/app/src"]

[tool.coverage.report]
fail_under = 90
skip_covered = true
show_missing = true
```

## Module Coverage Status

### ✅ Completed Modules (3 modules, 89 tests)

#### 1. jsa/http/sanitization.py (51 tests)
**Coverage**: 100% (all tests passing)

**Test Areas**:
- Valid URL preservation (http/https)
- Fragment stripping (#anchors)
- Security scheme filtering (reject javascript:, data:, file:, etc.)
- URLs without netloc (protocol-relative, relative paths)
- Malformed URL handling (empty, whitespace, invalid syntax)
- Non-string input types (None, int, bool, list, dict)
- Unicode domain support
- Very long URLs
- Percent-encoded characters
- Special characters in query strings
- IPv4 and IPv6 addresses
- Localhost URLs
- Case-insensitive scheme handling

**Key Patterns**:
- Parametrized tests with descriptive IDs
- Security-focused test cases
- Edge case coverage
- Documented current bugs (AttributeError for int/bool inputs)

#### 2. jsa/config.py (22 tests)
**Coverage**: 100% (all tests passing)

**Test Areas**:
- UserPreferences dataclass creation
- Immutability (frozen dataclass)
- Empty/zero/negative values
- ConfigService initialization
- raw() method returning full config dict
- user_preferences() type conversion
- Missing fields with defaults
- Invalid type validation
- keywords_boost list validation
- digest_min_score range validation (0-1)
- filter_config() legacy type access
- Unicode keyword support
- Large keyword lists (1000 items)
- Extreme score values
- Special characters in keywords (C++, C#, .NET, @angular)
- Invalid JSON handling
- Missing config file handling
- Empty config file handling

**Key Patterns**:
- Fixture for valid config data
- Factory fixture for writing test configs
- tmp_path for file isolation
- Comprehensive validation testing
- Error message matching with pytest.raises

#### 3. jsa/fastapi_app/dependencies.py (16 tests)
**Coverage**: 100% (all tests passing)

**Test Areas**:
- get_session_context() yields database session
- Generator pattern validation
- Session cleanup on exit
- Exception handling in handlers
- Multiple independent sessions
- Session usability for operations
- SessionDep type alias verification
- FastAPI Depends integration
- Module exports (__all__)
- Import validation
- Complete session lifecycle
- Session availability within context

**Key Patterns**:
- Mock-based testing with unittest.mock
- Context manager testing
- Generator testing
- Integration with FastAPI patterns
- Type annotation testing

### 🔄 In Progress / Planned (110 modules)

#### High Priority - Core Functionality

1. **database.py** (300+ LOC)
   - Job model tests
   - Database URL derivation
   - Engine configuration
   - Session management
   - CRUD operations

2. **unified_database.py** (300+ LOC)
   - Unified database initialization
   - Migration handling
   - Connection pooling
   - Transaction management

3. **agent.py** (500+ LOC)
   - Job board URL extraction
   - User preferences loading
   - Job processing pipeline
   - Scoring integration
   - Notification triggers

#### High Priority - Detection Systems

4. **domains/detection/job_quality_detector.py** (400+ LOC)
   - Quality level classification
   - Red flag detection
   - Scam pattern matching
   - MLM detection
   - Salary alignment validation
   - Description quality analysis
   - Company reputation scoring

5. **domains/detection/ml_scam_classifier.py** (300+ LOC)
   - ML-based scam classification
   - Feature extraction
   - Model training and evaluation
   - Prediction confidence scoring

6. **domains/detection/resume_quality_detector.py** (250+ LOC)
   - Resume parsing quality
   - Content completeness
   - ATS compatibility scoring
   - Formatting issues detection

7. **domains/detection/skills_gap_analyzer.py** (200+ LOC)
   - Job requirement extraction
   - Resume skill extraction
   - Gap identification
   - Recommendation generation

#### High Priority - ML/AI Systems

8. **domains/ml/semantic_matcher.py** (350+ LOC)
   - Sentence embedding generation
   - Semantic similarity calculation
   - Job-resume matching
   - Ranking algorithm

9. **domains/ml/sentiment_analyzer.py** (200+ LOC)
   - Job description sentiment
   - Tone analysis
   - Bias detection integration

10. **domains/ml/keyword_extractor.py** (150+ LOC)
    - TF-IDF keyword extraction
    - Named entity recognition
    - Technical term identification

11. **domains/ml/enhanced_matcher.py** (300+ LOC)
    - Multi-modal matching
    - Feature combination
    - Score normalization

#### High Priority - LLM Integration

12. **domains/llm/resilient_client.py** (400+ LOC)
    - Retry logic with exponential backoff
    - Rate limiting
    - Circuit breaker pattern
    - Error handling
    - Response caching

13. **domains/llm/client.py** (250+ LOC)
    - LLM API integration
    - Prompt engineering
    - Response parsing
    - Token management

14. **domains/llm/providers.py** (200+ LOC)
    - Provider abstraction
    - OpenAI integration
    - Anthropic integration
    - Litellm fallback

#### Medium Priority - ATS Systems

15. **domains/ats/service.py** (300+ LOC)
    - Resume parsing orchestration
    - Format detection
    - Content extraction
    - Compatibility analysis

16. **domains/ats/parsers/pdf_parser.py** (200+ LOC)
    - PDF text extraction
    - Layout preservation
    - Table detection
    - OCR fallback

17. **domains/ats/parsers/docx_parser.py** (150+ LOC)
    - DOCX parsing
    - Formatting preservation
    - Section detection

18. **domains/ats/scoring/compatibility_scorer.py** (200+ LOC)
    - ATS compatibility scoring
    - Format score calculation
    - Content score calculation

#### Medium Priority - Web/API

19. **jsa/fastapi_app/routers/health.py** (100+ LOC)
    - Health check endpoints
    - Dependency status
    - Version information

20. **jsa/fastapi_app/routers/jobs.py** (200+ LOC)
    - Job CRUD endpoints
    - Search and filtering
    - Pagination

21. **jsa/fastapi_app/routers/llm.py** (300+ LOC)
    - LLM enhancement endpoints
    - Job analysis
    - Resume optimization

22. **jsa/fastapi_app/middleware/auth.py** (80+ LOC)
    - Authentication
    - Token validation
    - Permission checking

23. **jsa/fastapi_app/middleware/rate_limit.py** (150+ LOC)
    - Rate limiting
    - Token bucket algorithm
    - Per-user limits

#### Low Priority - Utilities

24-50. Various utility modules (helpers, formatters, validators)

### 📋 Existing Tests Needing Fixes (27 modules)

These existing test files have import errors and need to be fixed:

1. test_angellist_scraper.py
2. test_ats_analyzer.py
3. test_ats_plugins.py
4. test_company_career_scraper.py
5. test_error_taxonomy.py
6. test_generic_js_scraper.py
7. test_hackernews_scraper.py
8. test_jobspy_mcp_extended.py
9. test_jobspy_mcp_scraper.py
10. test_jobswithgpt_scraper.py
11. test_jsa_errors.py
12. test_linkedin_scraper.py
13. test_llm_resilient_client.py
14. test_notify_emailer.py
15. test_reed_mcp_extended.py
16. test_reed_mcp_scraper.py
17. test_remoteok_scraper.py
18. test_taxonomy_and_parser_integration.py
19. test_weworkremotely_scraper.py
20-27. Cloud module tests (7 files)

## Test Implementation Strategy

### Phase 1: Foundation (Completed)
✅ Simple utility modules (3 modules, 89 tests)
- HTTP sanitization
- Configuration management
- FastAPI dependencies

### Phase 2: Core Systems (Next Priority)
Target: 10 modules, ~400 tests
- Database layers (database, unified_database, concurrent_database)
- Agent orchestration
- Basic detection systems (job quality, scam detection)
- Configuration utilities

### Phase 3: ML/AI Systems
Target: 10 modules, ~300 tests
- Semantic matching
- Sentiment analysis
- Keyword extraction
- Resume quality detection
- Skills gap analysis

### Phase 4: LLM Integration
Target: 5 modules, ~200 tests
- Resilient client
- Provider abstraction
- Prompt engineering
- Response parsing

### Phase 5: Web/API Layer
Target: 15 modules, ~350 tests
- FastAPI routers
- Middleware
- Validation
- Authentication

### Phase 6: Fix Existing Tests
Target: 27 modules, 238 existing tests
- Resolve import issues
- Update for API changes
- Ensure compatibility

### Phase 7: Cloud Deployment
Target: 10 modules, ~150 tests
- Bootstrap scripts
- Provider integration
- Cloud functions
- Infrastructure utilities

## Test Patterns & Best Practices

### 1. Parametrization Examples

```python
@pytest.mark.parametrize(
    "url,expected",
    [
        ("http://example.com", "http://example.com"),
        ("https://example.com", "https://example.com"),
        ("javascript:alert(1)", "#"),
    ],
    ids=["http", "https", "javascript_blocked"]
)
def test_url_sanitization(url, expected):
    assert safe_external_url(url) == expected
```

### 2. Fixture Patterns

```python
@pytest.fixture
def temp_config(tmp_path):
    """Factory fixture for test configurations."""
    def _make_config(**overrides):
        config = {"default": "value"}
        config.update(overrides)
        path = tmp_path / "config.json"
        path.write_text(json.dumps(config))
        return path
    return _make_config
```

### 3. Mock Patterns

```python
def test_external_api_call(mocker):
    """Mock external dependencies."""
    mock_response = mocker.patch("module.requests.get")
    mock_response.return_value.json.return_value = {"status": "ok"}
    result = function_under_test()
    assert result["status"] == "ok"
```

### 4. Async Testing

```python
@pytest.mark.asyncio
async def test_async_operation():
    """Test async functions."""
    result = await async_function()
    assert result is not None
```

### 5. Time Control

```python
def test_time_dependent_logic(freezegun):
    """Control time for deterministic tests."""
    with freeze_time("2025-01-01 00:00:00"):
        result = time_sensitive_function()
        assert result.date == date(2025, 1, 1)
```

## Coverage Tracking

### Module-Level Coverage Targets

| Module Category | Line Coverage | Branch Coverage | Status |
|----------------|---------------|-----------------|---------|
| Utilities | ≥95% | ≥90% | ✅ 100% (3/3) |
| Core | ≥90% | ≥85% | 🔄 0% (0/4) |
| Detection | ≥90% | ≥85% | 🔄 33% (2/6) |
| ML/AI | ≥90% | ≥85% | 🔄 25% (3/12) |
| LLM | ≥85% | ≥80% | 🔄 25% (1/4) |
| Web/API | ≥85% | ≥80% | 🔄 0% (0/15) |
| Cloud | ≥80% | ≥75% | 🔄 0% (0/10) |

### Overall Progress

```
Total Modules: 113
Tested (New): 3 (3%)
Tested (Existing, Working): 15 (13%)
Tested (Existing, Broken): 27 (24%)
Untested: 68 (60%)
```

## Continuous Integration

### GitHub Actions Workflow (Planned)

```yaml
name: Comprehensive Test Suite
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
      
      - name: Install dependencies
        run: pip install -e .[dev]
      
      - name: Run linters
        run: |
          ruff check .
          black --check .
          mypy deploy/common/app/src/jsa
      
      - name: Run unit tests
        run: pytest deploy/common/tests/unit -v --cov=deploy/common/app/src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Documentation Standards

### Test Docstrings

Every test should have a clear docstring explaining:
1. What is being tested
2. The expected behavior
3. Why this test matters (for complex tests)

```python
def test_config_validation_rejects_invalid_score():
    """ConfigService should raise ValueError for out-of-range digest_min_score.
    
    The digest_min_score must be between 0 and 1 per the FilterConfig validation.
    This test ensures the validation catches values outside this range early.
    """
    # Test implementation
```

## Next Steps

1. ✅ Complete Phase 1 (utility modules) - **DONE**
2. 🔄 Start Phase 2 (core systems) - **IN PROGRESS**
3. 📝 Create test templates for common patterns
4. 📊 Set up coverage monitoring dashboard
5. 🔧 Fix existing broken tests (27 modules)
6. 📚 Document module-specific test strategies
7. 🚀 Implement CI/CD pipeline
8. 📈 Track coverage improvements over time

## Resources

- **pytest documentation**: https://docs.pytest.org/
- **pytest-cov**: https://pytest-cov.readthedocs.io/
- **pytest-asyncio**: https://pytest-asyncio.readthedocs.io/
- **freezegun**: https://github.com/spulec/freezegun
- **hypothesis**: https://hypothesis.readthedocs.io/
- **mutmut**: https://mutmut.readthedocs.io/

---

**Last Updated**: October 16, 2025
**Status**: Phase 1 Complete (3 modules, 89 tests, 100% pass rate)
**Next Target**: Core database modules and agent orchestration
