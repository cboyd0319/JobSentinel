# Testing Guide

Complete guide to testing in JobSentinel.

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
- src/core/config/: config logic and tests
- src/core/db/: database operations and tests
- src/core/scoring/: scoring logic and tests
- src/core/scheduler/: job scheduling and tests
- src/core/notify/: notification dispatch and channel tests
- src/core/scrapers/: scraper adapters and unit tests
- src/commands/: Tauri RPC handlers and command tests
- src/platforms/: Windows, macOS, and Linux platform code
- tests/: integration test crates
```

**Note**: Large Rust modules keep most tests in separate `tests.rs` files or
feature-specific test subdirectories. This improves code organization and keeps
module files easier to maintain under the current
[harness file-size policy](../harness/README.md), enforced by
`validation/file_size_contract.json` through `npm run lint:bloat`.

### Test Coverage Map

Test counts change as features move. Use fresh command output as source of truth.

| Area | Coverage |
| ---- | -------- |
| `core/config` | Validation and defaults |
| `core/db` | CRUD, queries, analytics, integrity checks |
| `core/notify/*` | Slack, Discord, Teams, Telegram, email |
| `commands` | Tauri RPC handler behavior |
| `core/scoring` | Scoring config and score calculations |
| `core/scheduler` | Lifecycle, workers, shutdown |
| `core/scrapers/*` | Parser behavior, rate limiting, error handling |
| `core/ats` | Application tracking |
| `core/resume` | Parser, matcher, builder, export |
| `core/salary` | Benchmarks, prediction, offer comparison |
| `core/market_intelligence` | Trends, alerts, analytics |
| `src/**/*.test.*` | React components, hooks, contexts, pages |
| `tests/e2e/playwright/*` | Browser-level user flows |

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
        title_allowlist: vec!["Program Analyst".to_string()],
        salary_floor_usd: 85000,
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
// Good: descriptive behavior and expected outcome
#[test]
fn test_negative_salary_floor_fails() { ... }

#[test]
fn test_upsert_job_increments_times_seen() { ... }

// Bad: unclear behavior and expected outcome
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
cargo install cargo-tarpaulin --version 0.35.4 --locked

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage
```

Open `coverage/index.html` to view detailed coverage.

### Coverage Goals

| Category            | Target | Status         |
| ------------------- | ------ | -------------- |
| Core business logic | 90%+   | Achieved       |
| Database layer      | 85%+   | Achieved       |
| Configuration       | 100%   | Achieved       |
| Tauri commands      | 80%+   | Achieved       |
| Scrapers            | 70%+   | In progress    |
| Platform-specific   | 60%+   | Achieved       |

---

## CI/CD Integration

### GitHub Actions workflow

CI runs on every push and pull request targeting `main`. Jobs run on
`ubuntu-24.04` with Rust 1.96.0; there is no OS matrix and no beta toolchain
run. CI first classifies changed files, then runs only the relevant harness,
frontend, Rust, Node security, and Rust security jobs.

The main CI jobs are:

- **harness** — runs `npm run harness:check`, dependency/action pin checks,
  harness script tests, and markdown lint for docs/harness changes
- **test-rust** — runs `cargo fmt --all -- --check`, `cargo clippy -- -D warnings`, and `cargo test --lib`
- **test-frontend** — runs `npx --no-install tsc --noEmit`, `npm run lint`, and `npm test -- --run`
- **security-node** — runs security sensors, workflow static analysis,
  `npm audit --audit-level=moderate`, and scheduled/manual dependency drift checks
- **security-rust** — runs `cargo deny check advisories bans licenses sources`

Note that CI runs `cargo test --lib`, which covers unit tests only. Normal
integration tests in `tests/` run locally with `cargo test`. Ignored or live
integration tests should use targeted commands such as
`cargo test --test live_scraper_test -- --ignored --nocapture`.

Credential-store roundtrips are opt-in because macOS Keychain and equivalent
stores can prompt for user approval. Default credential tests stay
non-interactive. Run live keyring checks only when you are ready for OS prompts:

```bash
cd src-tauri
JOBSENTINEL_LIVE_KEYRING_TESTS=1 cargo test --test credential_test
```

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

### Do

- Write tests FIRST when fixing bugs (TDD)
- Test edge cases and boundary conditions
- Use descriptive test names
- Keep tests fast (<100ms each)
- Use helper functions to reduce boilerplate
- Clean up resources automatically (use RAII)
- Test both success and failure paths

### Do Not

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

E2E tests use Playwright against the Vite mock dev server to test complete
browser workflows.

The `test:e2e*` npm scripts run Playwright through
`scripts/run-playwright.mjs`. That wrapper keeps local and CI output readable
on current Node versions by removing conflicting color environment settings and
silencing the known upstream `DEP0205` deprecation warning from Playwright or
Tailwind internals. It does not silence test failures or application warnings.

### Running E2E Tests

Run `npm run doctor:e2e` when setting up Playwright locally or when browser
tests fail before app code loads. It makes Playwright Chromium launch a hard
readiness gate and prints the install command if the browser is missing.

```bash
# Check local E2E readiness
npm run doctor:e2e

# Run local Chromium functional E2E tests
npm run test:e2e

# Run full cross-browser E2E tests
npm run test:e2e:all

# Run full cross-browser E2E tests with the maintained four-minute budget
npm run test:e2e:all:budget

# Run in interactive UI mode
npm run test:e2e:ui
```

### E2E Test Coverage

| Page            | Test File                | Tests                                          |
| --------------- | ------------------------ | ---------------------------------------------- |
| Dashboard       | `app.spec.ts`, `job-search-filtering.spec.ts` | Load, nav, search, filters, job cards |
| Settings        | `settings-save-load.spec.ts` | Modal nav, basic preferences, advanced notifications, credentials, ghost detection, save/load |
| Applications    | `application-tracking.spec.ts` | Kanban, cards, drag/drop, detail modal, status and notes, reminders |
| Market          | `market-intelligence.spec.ts` | Tabs, snapshot, charts, locations, alert read state |
| Resume          | `resume-upload-matching.spec.ts` | No-resume state, active resume, skill CRUD, library switching, match results |
| Resume Builder  | `resume-builder.spec.ts` | Draft init, contact/summary validation, experience, education, skills/import, preview/template, PDF/DOCX/JSON export |
| Keyboard        | `keyboard-navigation.spec.ts` | Page shortcuts, command palette, help modal, search focus, focus trap, skip link |
| Application Assist | `one-click-apply.spec.ts` | Settings stats, profile validation/save/load, screening answers, human-review guardrails |

Documentation screenshots live in `screenshots.spec.ts` and run only through
`npm run docs:screenshots`.

### Writing E2E Tests

```typescript
import { expect, test } from "@playwright/test";

test.describe("Feature", () => {
  test("does something", async ({ page }) => {
    await page.goto("/");

    const button = page.getByRole("button", { name: "Search Now" });
    await button.click();

    await expect(button).toBeVisible();
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
