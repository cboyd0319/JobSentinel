# Testing Guide

**Complete guide to testing in JobSentinel v2.6.3**

---

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Organization](#test-organization)
- [Testing Patterns](#testing-patterns)
- [Writing New Tests](#writing-new-tests)
- [Test Coverage](#test-coverage)
- [End-to-End Tests](#end-to-end-tests)
- [CI/CD Integration](#cicd-integration)

---

## Overview

JobSentinel uses a comprehensive testing strategy across all layers:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test interaction between modules
- **End-to-End Tests**: Test complete workflows with Playwright

### Testing Philosophy

> **"If it's hard to test, the design is probably wrong."**

We prioritize:

1. **Fast, deterministic tests** (<100ms each)
2. **Clear test names** describing behavior, conditions, and outcomes
3. **Isolated tests** using in-memory databases and mocks
4. **Comprehensive coverage** of happy paths, edge cases, and failure modes

---

## Running Tests

### Run All Tests

```bash
cd src-tauri
cargo test
```

### Run Tests in a Specific Module

```bash
# Test only config module
cargo test --lib core::config

# Test only database module
cargo test --lib core::db

# Test only Slack notifications
cargo test --lib core::notify::slack
```

### Run a Specific Test

```bash
cargo test test_negative_salary_floor_fails
```

### Run Tests with Output

```bash
cargo test -- --nocapture
```

### Run Tests in Parallel (Default)

```bash
cargo test -- --test-threads=4
```

### Run Tests Sequentially

```bash
cargo test -- --test-threads=1
```

---

## Test Organization

### Directory Structure

```text
src-tauri/
├── src/
│   ├── core/
│   │   ├── config/
│   │   │   ├── mod.rs       # Config logic
│   │   │   └── tests.rs     # 51 unit tests (extracted)
│   │   ├── db/
│   │   │   ├── mod.rs       # Database operations
│   │   │   └── tests.rs     # 21 unit tests (extracted)
│   │   ├── scoring/
│   │   │   ├── mod.rs       # Scoring logic
│   │   │   └── tests.rs     # 3 unit tests (extracted)
│   │   ├── scheduler/
│   │   │   ├── mod.rs       # Job scheduling
│   │   │   └── tests.rs     # 1 unit test (extracted)
│   │   ├── notify/
│   │   │   ├── mod.rs       # Notification dispatch
│   │   │   ├── slack.rs     # Slack channel
│   │   │   └── tests.rs     # 10 unit tests (extracted)
│   │   └── scrapers/
│   │       ├── greenhouse.rs # Greenhouse scraper
│   │       ├── lever.rs      # Lever scraper
│   │       ├── jobswithgpt.rs # JobsWithGPT scraper
│   │       └── tests.rs      # Scraper unit tests (extracted)
│   ├── commands/
│   │   ├── mod.rs           # Tauri RPC handlers
│   │   └── tests.rs         # 13 integration tests (extracted)
│   └── platforms/
│       ├── windows/mod.rs   # Windows platform code
│       ├── macos/mod.rs     # macOS platform code
│       ├── linux/mod.rs     # Linux platform code
│       └── tests.rs         # 10 platform tests (extracted)
└── tests/                   # Integration tests (40 tests)
```

**Note**: As of v1.5.0, test files have been extracted to separate `tests.rs` files within each
module directory. This improves code organization and keeps module files under 500 lines for
easier maintenance and regeneration.

### Test Counts by Module

| Module                       | Tests              | Coverage                               |
| ---------------------------- | ------------------ | -------------------------------------- |
| `core/config`                | 51                 | 100% validation                        |
| `core/db`                    | 21                 | All CRUD + edge cases                  |
| `core/db/integrity`          | 12                 | Health checks, backups                 |
| `core/notify/*`              | 55                 | Slack, Discord, Teams, Telegram, Email |
| `commands`                   | 13                 | All Tauri RPC                          |
| `core/scoring`               | 3                  | Happy + edge cases                     |
| `core/scheduler`             | 12                 | Lifecycle + shutdown                   |
| `core/scrapers/greenhouse`   | 19                 | 12 unit + 7 properties                 |
| `core/scrapers/lever`        | 22                 | Unit + properties                      |
| `core/scrapers/jobswithgpt`  | 21                 | Unit + properties                      |
| `core/scrapers/linkedin`     | 4                  | Basic functionality                    |
| `core/scrapers/rate_limiter` | 5                  | Token bucket algorithm                 |
| `core/ats`                   | 4                  | Application tracking (ignored)         |
| `core/resume`                | 14                 | Parser + matcher + skills              |
| `core/salary`                | 8                  | Benchmarks + negotiation               |
| `core/market_intelligence`   | 12                 | Trends + alerts + analytics            |
| `platforms/macos`            | 6                  | Paths + initialization                 |
| `cloud/common`               | 1                  | Deployment mode detection              |
| **Backend Unit Tests**       | **2,263+**         | **Core module coverage**               |
| **Frontend Tests**           | **2,403+**         | **Component and integration**          |
| **Total**                    | **~4,666 passing** | **26 ignored**                         |

---

## Testing Patterns

### Pattern 1: In-Memory Database Tests

**Use for**: Testing database operations in isolation

```rust
#[tokio::test]
async fn test_upsert_job() {
    // Create in-memory database
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job("hash123", "Test Job", 0.95);

    let id = db.upsert_job(&job).await.unwrap();
    assert!(id > 0);

    // Database is automatically cleaned up when dropped
}
```

**Benefits:**

- Fast (no disk I/O)
- Isolated (no shared state)
- Auto-cleanup

### Pattern 2: Temporary Files/Directories

**Use for**: Testing file operations

```rust
#[test]
fn test_save_and_load_config() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");

    let config = create_valid_config();
    config.save(&config_path).expect("Failed to save");

    let loaded = Config::load(&config_path).expect("Failed to load");
    assert_eq!(loaded.salary_floor_usd, config.salary_floor_usd);

    // TempDir is automatically cleaned up when dropped
}
```

**Benefits:**

- Isolated filesystem operations
- No cleanup code needed
- Works across all OSes

### Pattern 3: Helper Functions

**Use for**: Reducing test boilerplate

```rust
/// Helper to create a valid test config
fn create_valid_config() -> Config {
    Config {
        title_allowlist: vec!["Security Engineer".to_string()],
        salary_floor_usd: 150000,
        // ... other fields
    }
}

#[test]
fn test_something() {
    let config = create_valid_config();
    // Test logic here
}
```

**Benefits:**

- DRY (Don't Repeat Yourself)
- Easy to update test data
- Self-documenting

### Pattern 4: Testing Validation Logic

**Use for**: Testing input validation

```rust
#[test]
fn test_negative_salary_floor_fails() {
    let mut config = create_valid_config();
    config.salary_floor_usd = -1000;

    let result = config.validate();
    assert!(result.is_err(), "Negative salary should fail");
    assert!(result.unwrap_err().to_string().contains("negative"));
}
```

**Benefits:**

- Clear intent
- Tests error messages
- Documents validation rules

### Pattern 5: Boundary Testing

**Use for**: Testing edge cases at boundaries

```rust
#[test]
fn test_salary_floor_at_boundary_passes() {
    let mut config = create_valid_config();
    config.salary_floor_usd = 10_000_000; // Exactly at $10M limit

    assert!(config.validate().is_ok());
}
```

**Benefits:**

- Catches off-by-one errors
- Documents boundaries
- High bug-finding potential

---

## Writing New Tests

### 1. Test Naming Convention

Use descriptive names that explain:

- **What** is being tested
- **Under what conditions**
- **What the expected outcome is**

```rust
// Good ✅
#[test]
fn test_negative_salary_floor_fails() { ... }

#[test]
fn test_upsert_job_increments_times_seen() { ... }

// Bad ❌
#[test]
fn test1() { ... }

#[test]
fn test_config() { ... }
```

### 2. Test Structure (Arrange-Act-Assert)

```rust
#[test]
fn test_example() {
    // Arrange: Set up test data
    let db = Database::connect_memory().await.unwrap();
    let job = create_test_job("hash", "Title", 0.9);

    // Act: Perform the operation
    let result = db.upsert_job(&job).await;

    // Assert: Verify expectations
    assert!(result.is_ok());
    let id = result.unwrap();
    assert!(id > 0);
}
```

### 3. Testing Async Code

Use `#[tokio::test]` for async tests:

```rust
#[tokio::test]
async fn test_async_operation() {
    let db = Database::connect_memory().await.unwrap();
    // Async operations...
}
```

### 4. Testing Error Cases

Always test both success and failure:

```rust
#[test]
fn test_valid_webhook_url_passes() {
    let result = validate_webhook_url("https://hooks.slack.com/services/...");
    assert!(result.is_ok());
}

#[test]
fn test_invalid_webhook_url_fails() {
    let result = validate_webhook_url("https://evil.com/webhook");
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
}
```

---

## Test Coverage

### Current Coverage Summary

As of the latest test suite addition:

- **Config validation**: 100% of validation rules tested
- **Database operations**: All CRUD operations + edge cases
- **Slack notifications**: Webhook validation + message formatting
- **Tauri commands**: All RPC endpoints tested
- **Scraper hashing**: Comprehensive hash computation tests

### Checking Coverage (Manual)

Run tests with coverage flags:

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage
```

Open `coverage/index.html` to view detailed coverage.

### Coverage Goals

| Category            | Target | Status         |
| ------------------- | ------ | -------------- |
| Core business logic | 90%+   | ✅ Achieved    |
| Database layer      | 85%+   | ✅ Achieved    |
| Configuration       | 100%   | ✅ Achieved    |
| Tauri commands      | 80%+   | ✅ Achieved    |
| Scrapers            | 70%+   | ⚠️ In Progress |
| Platform-specific   | 60%+   | ✅ Achieved    |

---

## CI/CD Integration

### GitHub Actions workflow

CI runs on every push and pull request targeting `main`. All jobs run on `ubuntu-latest` with
the stable Rust toolchain — there is no OS matrix and no beta toolchain run.

The three CI jobs are:

- **test-rust** — runs `cargo fmt --all -- --check`, `cargo clippy -- -D warnings`, and `cargo test --lib`
- **test-frontend** — runs `npx tsc --noEmit`, `npm run lint`, and `npm test -- --run`
- **security** — runs `npm audit --audit-level=moderate` and `cargo deny check advisories`

Note that CI runs `cargo test --lib`, which covers unit tests only. Integration tests in `tests/`
that require a file-based database or external services are excluded from CI and run locally with
`cargo test --ignored`.

For full CI/CD documentation see [CI_CD.md](./CI_CD.md).

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
cd src-tauri
cargo test --quiet
if [ $? -ne 0 ]; then
    echo "Tests failed! Commit aborted."
    exit 1
fi
```

---

## Best Practices

### DO ✅

- Write tests FIRST when fixing bugs (TDD)
- Test edge cases and boundary conditions
- Use descriptive test names
- Keep tests fast (<100ms each)
- Use helper functions to reduce boilerplate
- Clean up resources automatically (use RAII)
- Test both success and failure paths

### DON'T ❌

- Don't write flaky tests (use deterministic data)
- Don't test implementation details
- Don't share state between tests
- Don't skip tests (fix or remove them)
- Don't write tests without assertions
- Don't commit failing tests

---

## Debugging Failed Tests

### 1. Run with Output

```bash
cargo test test_name -- --nocapture
```

### 2. Run Single Test

```bash
cargo test test_specific_function -- --exact
```

### 3. Enable Logging

```bash
RUST_LOG=debug cargo test
```

### 4. Use `dbg!()` Macro

```rust
#[test]
fn test_example() {
    let result = calculate_something();
    dbg!(&result); // Prints value with file/line info
    assert_eq!(result, expected);
}
```

---

## End-to-End Tests

E2E tests use Playwright to test complete workflows in the built app.

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in interactive UI mode
npm run test:e2e:ui
```

### E2E Test Coverage

| Page            | Test File                | Tests                                          |
| --------------- | ------------------------ | ---------------------------------------------- |
| Dashboard       | `dashboard.e2e.js`       | Load, nav, stats, search, shortcuts            |
| Settings        | `settings.e2e.js`        | Nav, preferences, notifications, save          |
| Applications    | `applications.e2e.js`    | Kanban, stats, cards, reminders                |
| Market          | `market.e2e.js`          | Tabs, snapshot, charts, heatmap, alerts        |
| Resume          | `resume.e2e.js`          | Upload, skills, categories, gap analysis       |
| Resume Builder  | `resume-builder.e2e.js`  | Wizard, steps, templates, export               |
| Salary          | `salary.e2e.js`          | Prediction, benchmark, comparison, negotiation |
| One-Click Apply | `one-click-apply.e2e.js` | Profile, screening, ATS detection              |

### Writing E2E Tests

```javascript
describe("Feature", () => {
  it("should do something", async () => {
    // Find elements
    const button = await $("button.primary");

    // Interact
    await button.click();

    // Assert
    await expect(button).toBeDisplayed();
  });
});
```

See [tests/README.md](../../tests/README.md) for full documentation.

---

## Future Improvements

### Planned Additions

- [x] E2E tests for all pages
- [ ] Integration tests for full scraping pipeline
- [ ] Property-based testing with `proptest`
- [ ] Mutation testing with `cargo-mutants`
- [ ] Benchmark tests with `criterion`
- [ ] Mock HTTP servers for scraper tests
- [ ] Snapshot testing for JSON outputs

---

## Resources

- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [tokio Testing](https://tokio.rs/tokio/topics/testing)
- [tempfile Crate](https://docs.rs/tempfile/)
- [SQLx Testing](https://github.com/launchbadge/sqlx#testing)
- [Playwright documentation](https://playwright.dev/docs/intro)

---

**Last Updated:** March 18, 2026
**Test count:** ~4,666 passing (2,403 frontend + 2,263 Rust)
**Version:** v2.6.3
