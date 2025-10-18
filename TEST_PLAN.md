# JobSentinel Comprehensive Test Plan

## Overview
This document outlines the comprehensive test suite implementation following pytest best practices and the PyTest Architect principles.

## Current Status
**Overall JSA Coverage: 34.70% → 35.50% (+0.80%)**

## Test Architecture Principles

### Framework
- **pytest** for all tests (no unittest style)
- **AAA Pattern**: Arrange – Act – Assert
- **Naming**: `test_<unit>_<scenario>_<expected>()`

### Quality Standards
- **Coverage Gates**: 
  - Lines ≥ 90% (target)
  - Branches ≥ 85% (target)
  - Current threshold: 75% (will be increased incrementally)
- **Determinism**: Seeded RNG, frozen time, no network
- **Isolation**: Each test stands alone
- **Speed**: Unit tests < 100ms typical

### Testing Priorities
1. ✅ Public API contracts (happy paths)
2. ✅ Error handling and exceptions
3. ✅ Boundary/edge inputs
4. ✅ Branching logic
5. ✅ State & side-effects
6. ⏳ Concurrency/async

## Modules at 100% Coverage

### Achieved (3 modules)
- ✅ `jsa/http/sanitization.py` - 50 tests
- ✅ `jsa/error_formatter.py` - 31 tests
- ✅ `jsa/config.py` - 7 tests

### Pre-existing (13+ modules)
- ✅ `jsa/errors.py`
- ✅ `jsa/__init__.py`
- ✅ `jsa/logging.py`
- ✅ `jsa/tracker/__init__.py`
- ✅ `jsa/tracker/models.py`
- ✅ `jsa/fastapi_app/__init__.py`
- ✅ `jsa/fastapi_app/middleware/__init__.py`
- ✅ `jsa/fastapi_app/middleware/request_id.py`
- ✅ `jsa/fastapi_app/routers/__init__.py`
- ✅ `jsa/web/__init__.py`
- ✅ Multiple blueprint __init__.py files

## High-Coverage Modules (90%+)

### Can Push to 100% (Priority)
- [ ] `jsa/fastapi_app/app.py` (96.77%) - 1-2 tests needed
- [ ] `jsa/db.py` (95.00%) - 1-2 tests needed
- [ ] `jsa/web/blueprints/api/auth.py` (94.00%) - 1-2 tests
- [ ] `jsa/fastapi_app/routers/health.py` (93.62%) - 2-3 tests
- [ ] `jsa/fastapi_app/routers/jobs.py` (92.13%) - 3-4 tests
- [ ] `jsa/tracker/service.py` (92.17%) - 3-4 tests
- [ ] `jsa/fastapi_app/middleware/input_validation.py` (91.30%) - 3-4 tests

## Medium-Coverage Modules (50-85%)

### High Value (Should improve to 80%+)
- [ ] `jsa/fastapi_app/middleware/security.py` (81.82%) - Security critical
- [ ] `jsa/fastapi_app/dependencies.py` (81.82%)
- [ ] `jsa/web/app.py` (76.00%)
- [ ] `jsa/web/blueprints/slack.py` (74.07%)
- [ ] `jsa/web/blueprints/api/v1/tracker.py` (72.09%)
- [ ] `jsa/fastapi_app/routers/resume.py` (65.38%)
- [ ] `jsa/health_check.py` (65.02%)
- [ ] `jsa/fastapi_app/errors.py` (61.36%)
- [ ] `jsa/web/blueprints/review.py` (59.38%)
- [ ] `jsa/web/middleware.py` (58.70%)
- [ ] `jsa/db_optimize.py` (55.69%)
- [ ] `jsa/fastapi_app/validation.py` (55.71%)
- [ ] `jsa/diagnostic.py` (53.92%)

## Low-Coverage Modules (<50%)

### Complex Routers (40-50%)
- [ ] `jsa/web/blueprints/main.py` (46.07%)
- [ ] `jsa/web/blueprints/skills.py` (45.95%)
- [ ] `jsa/fastapi_app/middleware/auth.py` (41.94%)
- [ ] `jsa/fastapi_app/routers/skills_taxonomy.py` (41.42%)
- [ ] `jsa/fastapi_app/routers/ml.py` (41.18%)
- [ ] `jsa/fastapi_app/routers/tracker.py` (39.62%)
- [ ] `jsa/fastapi_app/routers/llm.py` (38.41%)
- [ ] `jsa/fastapi_app/routers/websocket.py` (31.87%)

### Low Priority Complex Modules
- [ ] `jsa/auto_update.py` (26.75%)
- [ ] `jsa/cli.py` (27.67%)
- [ ] `jsa/notify_email.py` (26.32%)
- [ ] `jsa/web/blueprints/api/v1/jobs.py` (26.56%)
- [ ] `jsa/web/blueprints/api/v1/scores.py` (24.14%)
- [ ] `jsa/web/blueprints/tracker.py` (21.01%)

## Zero-Coverage Modules (Skip for now)

### Platform-Specific & GUI
- `jsa/backup_restore.py` (0.00%) - Large, complex
- `jsa/gui_launcher.py` (0.00%) - GUI, platform-specific
- `jsa/macos_precheck.py` (0.00%)
- `jsa/macos_shortcuts.py` (0.00%)
- `jsa/preflight_check.py` (0.00%)
- `jsa/privacy_dashboard.py` (0.00%)
- `jsa/setup_wizard.py` (0.00%)
- `jsa/windows_precheck.py` (0.00%)
- `jsa/windows_shortcuts.py` (0.00%)

## Test Infrastructure

### Fixtures (in conftest.py)
```python
@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed RNG for determinism"""
    random.seed(1337)

@pytest.fixture
def temp_dir():
    """Temporary directory for isolation"""
    
@pytest.fixture
def mock_env(monkeypatch):
    """Set environment variables safely"""
```

### Configurations
- ✅ pytest.ini configured
- ✅ Coverage branch tracking enabled
- ✅ Coverage thresholds set (75%, target 90%)
- ⏳ pytest-randomly (to add)
- ⏳ mutmut configuration (to add)

## Test Examples

### Parametrized Test Pattern
```python
@pytest.mark.parametrize(
    "value,expected",
    [
        (0, 0),
        (1, 1),
        (-1, 1),
    ],
    ids=["zero", "one", "neg_one"]
)
def test_square_value_returns_square(value, expected):
    result = square(value)
    assert result == expected
```

### Error Handling Pattern
```python
def test_parse_config_raises_on_missing_field(tmp_path):
    cfg = tmp_path / "cfg.json"
    cfg.write_text('{"host": "x"}')
    with pytest.raises(KeyError, match="port"):
        parse_config(cfg)
```

### Mocking Pattern
```python
def test_fetch_user_uses_auth_header(mocker):
    mocked = mocker.patch(
        "mypkg.client.requests.get",
        autospec=True,
        return_value=FakeResp(200, {"id": 1})
    )
    fetch_user("tok123", user_id=1)
    mocked.assert_called_once()
```

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Analyze existing coverage
- [x] Identify priorities
- [x] Create test plan
- [x] Set up test infrastructure

### Phase 2: High-Value Modules (In Progress)
- [x] Push 3 modules to 100%
- [ ] Push 7 modules from 90%+ to 100%
- [ ] Improve 13 modules from 50-85% to 80%+

### Phase 3: Medium Coverage
- [ ] Improve 10+ modules to 70%+
- [ ] Add async test patterns
- [ ] Add property-based tests where applicable

### Phase 4: Configuration & Tooling
- [ ] Install pytest-randomly
- [ ] Configure mutation testing (mutmut)
- [ ] Set up pre-commit hooks
- [ ] Update CI/CD pipelines

### Phase 5: Validation
- [ ] Run full test suite
- [ ] Generate coverage reports
- [ ] Run mutation tests
- [ ] Code review
- [ ] Security scan

## Success Metrics

### Coverage Targets
- **Module-level**: 90% lines, 85% branches
- **Overall**: 75% minimum, 90% target
- **Critical modules**: 95%+ (security, auth, etc.)

### Quality Metrics
- **Test execution time**: < 5 minutes for full suite
- **Mutation kill rate**: ≥ 85% for core logic
- **No flaky tests**: 100% reproducible
- **Test independence**: Order-independent (pytest-randomly)

## Contributing

### Test Writing Guidelines
1. Follow AAA pattern
2. Use descriptive names
3. One behavior per test
4. Parametrize input matrices
5. Mock external dependencies
6. Document complex scenarios
7. Keep tests fast (< 100ms)

### Code Review Checklist
- [ ] Tests follow AAA pattern
- [ ] Parametrization used appropriately
- [ ] Mocks patch at import site
- [ ] No sleeps or network calls
- [ ] Coverage increased
- [ ] Tests are deterministic

## Resources
- [Pytest Documentation](https://docs.pytest.org/)
- [Coverage.py](https://coverage.readthedocs.io/)
- [Hypothesis (Property Testing)](https://hypothesis.readthedocs.io/)
- [pytest-mock](https://pytest-mock.readthedocs.io/)

---

**Last Updated**: 2025-10-18
**Status**: Phase 2 In Progress
**Overall Coverage**: 35.50%
