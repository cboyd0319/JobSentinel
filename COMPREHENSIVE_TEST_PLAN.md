# Comprehensive Test Suite Plan for JobSentinel Cloud Modules

## Overview

This document outlines the comprehensive test suite specification for all Python modules in the JobSentinel repository, following PyTest Architect Agent best practices and requirements.

## Executive Summary

- **Total Modules to Test**: 326 Python files across the repository
- **Cloud Modules Requiring Tests**: 17 untested modules in deploy/cloud/common
- **Testing Framework**: pytest with pytest-asyncio, pytest-mock, freezegun
- **Coverage Target**: 90% line coverage, 85% branch coverage
- **Test Execution Target**: <30 seconds for full suite

## Testing Principles

### Core Principles (from PyTest Architect Agent Specification)

1. **Framework**: Pure pytest (no unittest.TestCase)
2. **AAA Pattern**: Arrange-Act-Assert in every test
3. **Naming**: `test_<unit>_<scenario>_<expected>()` with readable names
4. **Determinism**: No hidden time, randomness, network, or environment coupling
5. **Isolation**: Each test stands alone, no inter-test dependencies
6. **Coverage**: Focus on meaningful paths, edge cases, failure handling
7. **Small Tests**: One behavior per test, use parametrization for matrices
8. **Explicitness**: Prefer explicit fixtures, clear mocks, precise assertions

### Quality Gates

- **Coverage**:
  - Lines ≥ 90%, Branches ≥ 85% (module-level)
  - New/changed pure functions: ~100% line + branch
- **Mutation Testing** (optional): ≥85% kill rate for core logic
- **Randomized Order**: Use pytest-randomly to catch order dependencies
- **No Flakes**: Ban `sleep()` unless justified

## Current State

### Existing Tests

Located in `deploy/common/tests/unit/cloud/`:
1. test_exceptions.py (43 tests) - ✅ Complete, but has import issues
2. test_style.py (55 tests) - ✅ Complete, but has import issues  
3. test_utils.py (80 tests) - ✅ 89% coverage, but has import issues
4. test_receipt.py (tests) - Has import issues
5. test_teardown.py (tests) - Has import issues
6. test_update.py (tests) - Has import issues
7. test_terraform_installer.py (tests) - Has import issues

**Status**: All 7 existing test files have module import conflicts due to complex `cloud.` namespace setup. Tests cannot currently run.

### Untested Cloud Modules

#### High Priority - Core Functionality (11 modules)

1. **bootstrap.py** (255 LOC)
   - Main deployment CLI entrypoint
   - Argument parsing, provider loading, version display
   - Tests needed: CLI args, provider selection, error handling

2. **functions/budget_alerter.py** (55 LOC)
   - Cloud Function for budget alerts
   - Tests needed: Event parsing, threshold logic, scheduler pause

3. **functions/main.py** (55 LOC)
   - Duplicate of budget_alerter (should consolidate)
   - Tests needed: Same as budget_alerter

4. **providers/gcp/auth.py** (40 LOC)
   - GCP authentication flow
   - Tests needed: Auth check, ADC setup, login flow

5. **providers/gcp/budget.py** (50 LOC)
   - Budget alert setup
   - Tests needed: Function deployment, error handling

6. **providers/gcp/project.py** (80 LOC)
   - Project management
   - Tests needed: Project selection, creation, validation

7. **providers/gcp/regions.py** (50 LOC)
   - Region selection
   - Tests needed: Region list, user choice, scheduler mapping

8. **providers/gcp/scheduler.py** (56 LOC)
   - Job scheduler setup
   - Tests needed: Scheduler creation, configuration

9. **providers/gcp/security.py** (45 LOC)
   - Security configuration
   - Tests needed: IAM, permissions, service accounts

10. **providers/gcp/cloud_run.py** (162 LOC)
    - Cloud Run deployment
    - Tests needed: Service deployment, configuration

11. **providers/gcp/utils.py** (147 LOC)
    - GCP utility functions
    - Tests needed: Helper functions, error handling

#### Medium Priority - Integration (6 modules)

12. **providers/gcp/project_detection.py** (242 LOC)
    - Project detection logic
    - Tests needed: Auto-detection, validation

13. **providers/gcp/sdk.py** (188 LOC)
    - GCP SDK wrapper
    - Tests needed: SDK installation, version check

14. **providers/gcp/summary.py** (182 LOC)
    - Deployment summary display
    - Tests needed: Summary generation, formatting

15. **providers/gcp/cloud_database.py** (292 LOC)
    - Database setup
    - Tests needed: DB creation, configuration

16. **providers/gcp/teardown.py** (423 LOC)
    - Infrastructure teardown
    - Tests needed: Resource deletion, cleanup

17. **providers/gcp/gcp.py** (893 LOC)
    - Main GCP orchestrator
    - Tests needed: Full deployment flow (integration-style)

## Detailed Test Specifications

### Module: functions/budget_alerter.py

**Purpose**: Cloud Function that pauses scheduler when budget exceeds threshold

**Test Classes**:
1. `TestBudgetAlertHandler` - Main entry point tests
2. `TestPauseSchedulerJob` - Scheduler pause logic
3. `TestIntegration` - Full flow tests

**Test Cases** (26 tests total):

```python
class TestBudgetAlertHandler:
    - test_budget_alert_handler_exceeds_budget_triggers_pause()
    - test_budget_alert_handler_within_budget_no_pause()
    - test_budget_alert_handler_equal_budget_triggers_pause()
    - test_budget_alert_handler_cost_thresholds[zero_cost]()
    - test_budget_alert_handler_cost_thresholds[equal_budget]()
    - test_budget_alert_handler_cost_thresholds[slightly_over]()
    - test_budget_alert_handler_cost_thresholds[double_budget]()
    - test_budget_alert_handler_cost_thresholds[just_under]()
    - test_budget_alert_handler_missing_cost_amount_uses_default()
    - test_budget_alert_handler_missing_budget_amount_uses_default()
    - test_budget_alert_handler_missing_data_key_handles_gracefully()
    - test_budget_alert_handler_invalid_json_handles_gracefully()
    - test_budget_alert_handler_invalid_base64_handles_gracefully()

class TestPauseSchedulerJob:
    - test_pause_scheduler_job_success()
    - test_pause_scheduler_job_missing_project_id()
    - test_pause_scheduler_job_missing_location()
    - test_pause_scheduler_job_missing_job_id()
    - test_pause_scheduler_job_all_missing()
    - test_pause_scheduler_job_scheduler_api_error()
    - test_pause_scheduler_job_constructs_correct_job_name()

class TestIntegration:
    - test_full_flow_budget_exceeded_pauses_job()
```

**Mocking Strategy**:
- Mock `google.cloud.scheduler_v1.CloudSchedulerClient`
- Mock environment variables via `monkeypatch`
- Use `capsys` for print output verification
- Mock subprocess calls for gcloud commands

**Coverage**: Target 95%+ line and branch coverage

### Module: providers/gcp/regions.py

**Purpose**: Region selection for Cloud Run and Scheduler

**Test Classes**:
1. `TestSelectRegion` - Cloud Run region selection
2. `TestSelectSchedulerRegion` - Scheduler region logic

**Test Cases** (15 tests total):

```python
class TestSelectRegion:
    - test_select_region_with_prompt_returns_chosen_region()
    - test_select_region_no_prompt_returns_first_region()
    - test_select_region_calls_gcloud_config_set()
    - test_select_region_all_regions_present()
    - test_select_region_order_preserved()
    
class TestSelectSchedulerRegion:
    - test_select_scheduler_region_supported_returns_same()
    - test_select_scheduler_region_unsupported_prompts_choice()
    - test_select_scheduler_region_all_supported_regions_valid()
    - test_select_scheduler_region_no_prompt_fallback()
```

**Test Patterns**:
- Parametrize region lists
- Mock `choose()` and `run_command()`
- Test async function behavior
- Verify gcloud command construction

### Module: providers/gcp/auth.py

**Purpose**: GCP authentication flow

**Test Cases** (12 tests total):

```python
class TestAuthenticate:
    - test_authenticate_already_authenticated_skips_login()
    - test_authenticate_missing_adc_runs_adc_login()
    - test_authenticate_no_active_account_runs_full_login()
    - test_authenticate_gcloud_auth_list_failure_runs_login()
    - test_authenticate_calls_correct_gcloud_commands()
    - test_authenticate_logs_active_account()
    - test_authenticate_async_execution()
```

**Mocking**:
- Mock `run_command()` for gcloud calls
- Simulate auth check responses
- Verify command sequences

### Module: providers/gcp/budget.py

**Purpose**: Budget alert function deployment

**Test Cases** (10 tests total):

```python
class TestSetupBudgetAlerts:
    - test_setup_budget_alerts_success()
    - test_setup_budget_alerts_deployment_failure_warns()
    - test_setup_budget_alerts_constructs_correct_command()
    - test_setup_budget_alerts_sets_env_vars()
    - test_setup_budget_alerts_uses_correct_paths()
```

## Test Infrastructure Requirements

### Fixtures (conftest.py)

```python
@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed random number generators."""
    random.seed(1337)

@pytest.fixture
def mock_gcp_env(monkeypatch):
    """Mock GCP environment variables."""
    monkeypatch.setenv("GCP_PROJECT", "test-project")
    monkeypatch.setenv("GCP_REGION", "us-central1")

@pytest.fixture
def mock_logger():
    """Provide mock logger."""
    return MagicMock(spec=logging.Logger)

@pytest.fixture
def mock_run_command(mocker):
    """Mock cloud.utils.run_command."""
    return mocker.patch("cloud.utils.run_command", new_callable=AsyncMock)

@pytest.fixture
def sample_deployment_config():
    """Sample deployment configuration."""
    return {
        "project_id": "test-project-123",
        "region": "us-central1",
        "budget": 100.0,
    }
```

### Test Configuration (pyproject.toml updates needed)

```toml
[tool.pytest.ini_options]
addopts = """
  -q
  --strict-config
  --strict-markers
  --maxfail=1
  --disable-warnings
  --randomly-seed=1337
  --cov=deploy/cloud/common
  --cov-report=term-missing:skip-covered
  --cov-branch
"""
testpaths = ["deploy/common/tests"]
markers = [
  "cloud: marks tests for cloud deployment modules",
  "gcp: marks GCP-specific tests",
]

[tool.coverage.run]
source = ["deploy/cloud/common"]
branch = true
omit = ["*/tests/*", "*/__pycache__/*"]

[tool.coverage.report]
precision = 2
fail_under = 90
skip_covered = true
show_missing = true
```

## Implementation Approach

### Phase 1: Fix Import Issues (BLOCKED)

- [ ] Resolve cloud.* namespace collision
- [ ] Fix existing 7 test files to run successfully
- [ ] Verify 178 existing tests pass

**Status**: BLOCKED due to complex module import structure where:
- Modules in `deploy/cloud/common/` use `from cloud.X` imports
- Test directory is named `cloud/` causing pytest collection conflicts
- Would require significant refactoring to resolve

**Recommendation**: Document existing tests as reference but focus on new tests

### Phase 2: Create New Tests (PRIORITY)

Create comprehensive test files for 17 untested modules:

**Week 1 - High Priority Functions (5 modules)**:
- [x] test_budget_alerter.py - 26 tests (CREATED but cannot run due to import issues)
- [ ] test_gcp_auth.py - 12 tests
- [ ] test_gcp_regions.py - 15 tests
- [ ] test_gcp_budget.py - 10 tests
- [ ] test_gcp_security.py - 8 tests

**Week 2 - GCP Provider Core (4 modules)**:
- [ ] test_gcp_project.py - 18 tests
- [ ] test_gcp_scheduler.py - 12 tests
- [ ] test_gcp_cloud_run.py - 25 tests
- [ ] test_gcp_utils.py - 20 tests

**Week 3 - Integration Modules (4 modules)**:
- [ ] test_gcp_project_detection.py - 22 tests
- [ ] test_gcp_sdk.py - 15 tests
- [ ] test_gcp_summary.py - 10 tests
- [ ] test_gcp_cloud_database.py - 30 tests

**Week 4 - Complex Modules (3 modules)**:
- [ ] test_gcp_teardown.py - 35 tests
- [ ] test_bootstrap.py - 40 tests (CLI integration)
- [ ] test_gcp_orchestrator.py - 50 tests (main flow)

**Total New Tests**: ~348 tests

### Phase 3: Coverage and Quality

- [ ] Run coverage reports
- [ ] Identify gaps < 90%
- [ ] Add edge case tests
- [ ] Run mutation testing (mutmut)
- [ ] Ensure 85%+ mutation kill rate

### Phase 4: CI Integration

- [ ] Update GitHub Actions workflow
- [ ] Add matrix testing (Python 3.9-3.12)
- [ ] Add coverage reporting
- [ ] Add pre-commit hooks

## Challenges and Blockers

### Critical Blocker: Module Import Structure

**Problem**: The cloud modules use a complex import pattern:
- Files in `deploy/cloud/common/` import as `from cloud.X`
- No clear way to make `cloud.X` resolve to `deploy/cloud/common/X`
- Test directory named `cloud/` causes pytest to treat tests as `cloud.test_X`

**Impact**: Cannot run ANY cloud module tests currently

**Possible Solutions**:
1. **Rename test directory** from `cloud/` to `cloud_tests/` ✅ BEST
2. **Refactor cloud modules** to use absolute imports - BREAKING
3. **Complex conftest magic** to manipulate sys.modules - FRAGILE
4. **Separate test execution** outside pytest - NON-STANDARD

**Recommendation**: Rename test directory to `cloud_tests/` and update all test imports

### Secondary Issues

1. **Mock Dependencies**: Need to mock GCP APIs (scheduler, cloud run, etc.)
2. **Async Testing**: Many functions are async, need pytest-asyncio
3. **Subprocess Mocking**: gcloud commands need careful mocking
4. **Environment State**: Tests must isolate environment variables

## Test Patterns and Examples

### Pattern 1: Async Function Testing

```python
@pytest.mark.asyncio
async def test_async_function_succeeds(mock_run_command):
    # Arrange
    mock_run_command.return_value = subprocess.CompletedProcess(
        args=[], returncode=0, stdout="success"
    )
    logger = MagicMock()
    
    # Act
    result = await authenticate(logger)
    
    # Assert
    assert mock_run_command.call_count == 2
    logger.info.assert_called()
```

### Pattern 2: Parametrized Edge Cases

```python
@pytest.mark.parametrize(
    "cost,budget,expected_pause",
    [
        (0, 100, False),
        (50, 100, False),
        (100, 100, True),  # Boundary
        (150, 100, True),
    ],
    ids=["zero", "under", "equal", "over"],
)
def test_budget_threshold_logic(cost, budget, expected_pause, mocker):
    # Test implementation
```

### Pattern 3: Exception Handling

```python
def test_function_handles_api_error_gracefully(mocker, capsys):
    # Arrange
    mock_client = mocker.patch("module.CloudClient")
    mock_client.side_effect = Exception("API Error")
    
    # Act
    function_under_test()
    
    # Assert
    captured = capsys.readouterr()
    assert "Error" in captured.out
```

## Success Metrics

### Quantitative
- [ ] 348+ new tests created
- [ ] 90%+ line coverage on cloud modules
- [ ] 85%+ branch coverage on cloud modules
- [ ] <30 second test suite execution
- [ ] 0 flaky tests
- [ ] 85%+ mutation kill rate

### Qualitative
- [ ] Clear, descriptive test names
- [ ] Comprehensive docstrings
- [ ] Well-organized test classes
- [ ] Minimal mocking complexity
- [ ] Easy to extend and maintain

## Timeline

**Total Estimated Effort**: 4 weeks (1 developer)

- Week 1: Fix imports + 5 high-priority modules (55 tests)
- Week 2: Core GCP modules (75 tests)
- Week 3: Integration modules (77 tests)  
- Week 4: Complex modules (125 tests) + coverage gaps

## Conclusion

This comprehensive test suite will provide:
1. **Confidence** in refactoring cloud deployment code
2. **Documentation** of expected behavior
3. **Regression** prevention for future changes
4. **Quality** gates for CI/CD pipeline

The main blocker is the module import structure which requires resolution before tests can run. Once resolved, the test implementation can proceed systematically through the prioritized module list.

## Next Steps

1. ✅ **COMPLETED**: Document comprehensive test plan
2. **IMMEDIATE**: Resolve module import issues (rename test directory)
3. **SHORT-TERM**: Implement Phase 2 high-priority tests
4. **MEDIUM-TERM**: Complete all module tests
5. **LONG-TERM**: Add mutation testing and advanced coverage analysis
