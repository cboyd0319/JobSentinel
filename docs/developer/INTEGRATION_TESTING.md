# Integration Testing Guide

**Comprehensive guide to integration testing in JobSentinel's Rust backend**

---

## Table of Contents

- [Overview](#overview)
- [Test Organization](#test-organization)
- [Running Integration Tests](#running-integration-tests)
- [Database Testing](#database-testing)
- [Testing Scrapers](#testing-scrapers)
- [Testing Commands](#testing-commands)
- [Test Helpers and Fixtures](#test-helpers-and-fixtures)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

Integration tests verify interactions between modules and ensure complete workflows function
correctly. Unlike unit tests that isolate individual functions, integration tests exercise
real dependencies.

### Integration vs Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Scope | Single function/module | Multiple modules working together |
| Location | `tests.rs` within module | `src-tauri/tests/` directory |
| Database | In-memory (mocked) | Real SQLite schema with migrations |
| Dependencies | Mocked | Real implementations |
| Speed | Fast (<10ms) | Slower (100ms+) |
| Coverage | 70%+ lines | End-to-end workflows |

### What Integration Tests Cover

- **Database persistence** - Data survives migrations and schema changes
- **Schema constraints** - Foreign keys, unique constraints, triggers
- **Concurrent operations** - Multiple connections writing simultaneously
- **API contracts** - Tauri commands match expected signatures
- **Full pipelines** - Scraper → Scorer → Database → Notifications
- **Scheduler lifecycle** - Startup, shutdown, error handling

---

## Test Organization

### Directory Structure

```text
src-tauri/tests/
├── api_contract_test.rs              # Tauri command signatures (26 KB)
├── database_integration_test.rs       # Database layer (26 KB)
├── scheduler_integration_test.rs      # Scheduling workflow (20 KB)
├── scraper_integration_test.rs        # Scraper trait interface (17 KB)
├── scraping_pipeline_integration.rs   # Full pipeline (25 KB)
├── automation_integration_test.rs     # One-click apply (5 KB)
└── fixtures/                          # Test HTML/JSON responses
```

### Test File Naming

- `*_integration_test.rs` - Integration test file
- `*_contract_test.rs` - API contract verification
- `*_pipeline*` - End-to-end workflows

### File Organization

Each integration test file follows this structure:

```rust
//! Module documentation - explain what's being tested

use crate::core::{ /* imports */ };

// ============================================================================
// Setup Functions
// ============================================================================

/// Create test environment (database, config, etc.)
async fn setup_test_env() -> (Arc<Database>, Arc<Config>, TempDir) {
    // Setup logic
}

// ============================================================================
// Test Fixtures - Sample Data
// ============================================================================

const SAMPLE_JSON: &str = r#"{ ... }"#;

// ============================================================================
// Category Name - Grouped tests
// ============================================================================

#[tokio::test]
async fn test_specific_behavior() {
    // Arrange, Act, Assert
}
```

---

## Running Integration Tests

### Run All Integration Tests

```bash
cd src-tauri
cargo test --test '*'
```

### Run Specific Integration Test File

```bash
# Test database integration
cargo test --test database_integration_test

# Test scheduler
cargo test --test scheduler_integration_test

# Test scrapers
cargo test --test scraper_integration_test
```

### Run Specific Test

```bash
cargo test --test database_integration_test test_migrations_run_successfully -- --exact
```

### Run with Output and Single Thread

```bash
# Single-threaded execution (useful for debugging)
cargo test --test database_integration_test -- --test-threads=1 --nocapture
```

### List Available Integration Tests

```bash
cargo test --test '*' -- --list
```

---

## Database Testing

### In-Memory Database Setup

Integration tests use in-memory SQLite databases for speed:

```rust
/// Setup test database with migrations
async fn setup_test_db() -> (Database, TempDir) {
    let temp_dir = TempDir::new().unwrap();

    // Use in-memory database (no disk I/O)
    let db = Database::connect_memory().await.unwrap();

    // Run all migrations
    db.migrate().await.unwrap();

    (db, temp_dir)
}
```

**Why in-memory?**

- Fast: No disk I/O
- Isolated: Each test has clean state
- Auto-cleanup: Dropped when test ends

### File-Based Database for Backup Tests

Some tests require persistent file operations:

```rust
/// Setup persistent database on disk
async fn setup_file_db() -> (Database, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    let db = Database::connect(&db_path).await.unwrap();
    db.migrate().await.unwrap();

    (db, temp_dir)
}
```

### Testing Migrations

Verify migrations run correctly and are idempotent:

```rust
#[tokio::test]
async fn test_migrations_run_successfully() {
    let (db, _temp_dir) = setup_test_db().await;

    // If setup succeeded, migrations ran
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);
}

#[tokio::test]
async fn test_migrations_are_idempotent() {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // Run migrations twice
    let db1 = Database::connect(&db_path).await.unwrap();
    db1.migrate().await.unwrap();

    let db2 = Database::connect(&db_path).await.unwrap();
    db2.migrate().await.unwrap(); // Should not fail

    assert!(db2.get_statistics().await.is_ok());
}
```

### Testing Schema Constraints

Verify foreign keys, unique constraints work:

```rust
#[tokio::test]
async fn test_foreign_key_constraint() {
    let (db, _) = setup_test_db().await;

    let job = create_test_job("hash1", "Test Job", "Company");
    let job_id = db.upsert_job(&job).await.unwrap();

    // Constraint should prevent orphaned records
    let result = db.query_raw("DELETE FROM jobs WHERE id = ?").await;
    assert!(result.is_ok());
}
```

### Concurrent Operations

Test thread-safe database operations:

```rust
#[tokio::test]
async fn test_concurrent_writes() {
    let (db, _) = setup_test_db().await;
    let db = Arc::new(db);

    let mut tasks = vec![];

    for i in 0..10 {
        let db = Arc::clone(&db);
        let task = tokio::spawn(async move {
            let job = create_test_job(
                &format!("hash_{}", i),
                "Job Title",
                "Company"
            );
            db.upsert_job(&job).await
        });
        tasks.push(task);
    }

    // All tasks complete without error
    for task in tasks {
        assert!(task.await.unwrap().is_ok());
    }

    // All jobs persisted
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 10);
}
```

---

## Testing Scrapers

### Mock HTTP Responses with Wiremock

Scrapers are tested using `wiremock` for HTTP mocking without hitting real servers:

```rust
use wiremock::{Mock, MockServer, ResponseTemplate};
use wiremock::matchers::method;

const SAMPLE_JSON: &str = r#"{
    "jobs": [
        {
            "id": "123",
            "title": "Senior Engineer",
            "location": "Remote"
        }
    ]
}"#;

#[tokio::test]
async fn test_scraper_calls_correct_endpoint() {
    // Start mock HTTP server
    let mock_server = MockServer::start().await;

    // Mock the response
    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_JSON))
        .mount(&mock_server)
        .await;

    // Test scraper with mock URL
    let scraper = GreenhouseScraper::new(mock_server.uri());
    let jobs = scraper.scrape().await.unwrap();

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Senior Engineer");
}
```

### HTML Fixture Files

Test HTML responses stored in `fixtures/`:

```rust
// Verify scraper can parse real HTML structure
const GREENHOUSE_HTML: &str = r#"
<html>
    <body>
        <div class="job-item">
            <h2>Senior Rust Developer</h2>
            <span class="location">Remote</span>
        </div>
    </body>
</html>
"#;

#[test]
fn test_scraper_parses_html_structure() {
    let jobs = parse_greenhouse_html(GREENHOUSE_HTML);
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].location, Some("Remote".to_string()));
}
```

### Rate Limiting in Tests

Verify rate limiting doesn't interfere with tests:

```rust
#[tokio::test]
async fn test_scraper_respects_rate_limits() {
    let config = create_test_config();

    // Scraper should wait before making requests
    let now = std::time::Instant::now();

    let scraper = GreenhouseScraper::with_config(config);
    let _result = scraper.scrape().await;

    // Should take at least minimum rate limit time
    assert!(now.elapsed().as_millis() >= config.min_request_delay_ms);
}
```

---

## Testing Commands

### API Contract Tests

Verify Tauri command signatures:

```rust
#[tokio::test]
async fn test_command_accepts_correct_types() {
    let (db, config, _) = setup_test_env().await;

    // Command should accept Arc<Database> and Arc<Config>
    let job = create_test_job("hash", "Title", "Company");

    let result = db.upsert_job(&job).await;

    assert!(result.is_ok());
    assert!(result.unwrap() > 0);
}

#[tokio::test]
async fn test_command_returns_expected_type() {
    let (db, _config, _) = setup_test_env().await;

    // Command should return Result<i64, String>
    let job = create_test_job("hash", "Title", "Company");
    let result = db.upsert_job(&job).await;

    match result {
        Ok(id) => assert!(id > 0),
        Err(e) => panic!("Expected Ok, got error: {}", e),
    }
}
```

### End-to-End Command Flows

Test complete command workflow:

```rust
#[tokio::test]
async fn test_search_command_returns_scored_jobs() {
    let (db, config, _) = setup_test_env().await;

    // Insert jobs
    let job1 = create_test_job("hash1", "Security Engineer", "TechCorp");
    let job2 = create_test_job("hash2", "Backend Developer", "StartupXYZ");

    db.upsert_job(&job1).await.unwrap();
    db.upsert_job(&job2).await.unwrap();

    // Search command should find and score
    let results = db.search_jobs("Security").await.unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].title, "Security Engineer");
}
```

---

## Test Helpers and Fixtures

### Creating Test Jobs

Standard helper for creating jobs with all fields:

```rust
/// Create a job with realistic test data
fn create_test_job(hash: &str, title: &str, company: &str) -> Job {
    Job {
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{}", hash),
        location: Some("Remote".to_string()),
        description: Some("Test job description".to_string()),
        score: Some(0.85),
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: Some(120000),
        salary_max: Some(180000),
        currency: Some("USD".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    }
}
```

### Creating Test Config

Standard config for integration tests:

```rust
/// Create minimal test config for integration tests
fn create_test_config() -> Config {
    Config {
        title_allowlist: vec!["Security Engineer".to_string()],
        title_blocklist: vec!["Manager".to_string()],
        keywords_boost: vec!["Rust".to_string()],
        keywords_exclude: vec!["PHP".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 100000,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.85,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        // ... other fields with defaults
    }
}
```

### Shared Setup Functions

Reuse environment setup across tests:

```rust
/// Complete test environment with database and config
async fn setup_test_env() -> (Arc<Database>, Arc<Config>, TempDir) {
    let temp_dir = TempDir::new().unwrap();

    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let config = Arc::new(create_test_config());

    (database, config, temp_dir)
}
```

---

## Common Patterns

### Pattern 1: Database Workflow Tests

Test complete database operations:

```rust
#[tokio::test]
async fn test_upsert_and_retrieve_job() {
    let (db, _) = setup_test_db().await;

    // Arrange
    let job = create_test_job("hash123", "Engineer", "TechCorp");

    // Act
    let id = db.upsert_job(&job).await.unwrap();
    let retrieved = db.get_job(id).await.unwrap();

    // Assert
    assert_eq!(retrieved.title, "Engineer");
    assert_eq!(retrieved.company, "TechCorp");
}
```

### Pattern 2: Error Handling

Test both success and failure paths:

```rust
#[tokio::test]
async fn test_invalid_job_data_returns_error() {
    let (db, _) = setup_test_db().await;

    let mut job = create_test_job("hash", "Title", "Company");
    job.title = String::new(); // Invalid: empty title

    let result = db.upsert_job(&job).await;
    assert!(result.is_err());
}
```

### Pattern 3: Concurrent Access

Verify thread safety:

```rust
#[tokio::test]
async fn test_concurrent_database_reads() {
    let (db, _) = setup_test_db().await;
    let db = Arc::new(db);

    // Insert a job
    let job = create_test_job("hash", "Title", "Company");
    db.upsert_job(&job).await.unwrap();

    // Multiple concurrent reads
    let mut tasks = vec![];
    for _ in 0..10 {
        let db = Arc::clone(&db);
        tasks.push(tokio::spawn(async move {
            db.search_jobs("Title").await
        }));
    }

    for task in tasks {
        assert!(task.await.unwrap().is_ok());
    }
}
```

### Pattern 4: Async Lifecycle

Test async resource cleanup:

```rust
#[tokio::test]
async fn test_scheduler_starts_and_stops() {
    let (db, config, _) = setup_test_env().await;

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&db));

    // Start
    scheduler.start().await.unwrap();

    // Verify running
    assert!(scheduler.is_running());

    // Stop
    scheduler.stop().await.unwrap();

    // Verify stopped
    assert!(!scheduler.is_running());
}
```

---

## Troubleshooting

### Test Panics with "Database Already Exists"

**Problem**: Multiple tests using file-based databases conflict.

**Solution**: Use in-memory databases or unique temp directories:

```rust
// Good: in-memory
let db = Database::connect_memory().await?;

// Good: unique temp dir
let temp_dir = TempDir::new()?;
let db_path = temp_dir.path().join("unique.db");
```

### Tests Hang or Timeout

**Problem**: Deadlock or missing `.await` in async code.

**Solution**: Run single-threaded and check async/await:

```bash
# Single thread for easier debugging
cargo test --test database_integration_test -- --test-threads=1 --nocapture
```

Check for missing `.await`:

```rust
// Wrong: returns Future, doesn't execute
let result = db.upsert_job(&job); // Missing .await

// Right: executes async function
let result = db.upsert_job(&job).await;
```

### Assertion Failures on Timestamps

**Problem**: Time-sensitive tests fail due to clock differences.

**Solution**: Use fixed timestamps or time ranges:

```rust
// Good: use fixed time
let job = Job {
    created_at: chrono::DateTime::parse_from_rfc3339("2026-01-17T00:00:00Z")?,
    ..
};

// Good: check range instead of exact match
assert!(job.created_at < chrono::Utc::now());
```

### Scraper Tests Fail with "Connection Refused"

**Problem**: Wiremock server not started or wrong URL.

**Solution**: Ensure MockServer is created and URI passed:

```rust
let mock_server = MockServer::start().await; // Must await
let url = mock_server.uri(); // Use this URL in scraper
```

### Integration Tests Pass Locally But Fail in CI

**Problem**: Timing assumptions, resource limits, or platform differences.

**Solution**: Make tests deterministic:

```rust
// Bad: depends on system clock
tokio::time::sleep(Duration::from_millis(100)).await;

// Good: poll until condition
for _ in 0..50 {
    if condition_met { break; }
    tokio::time::sleep(Duration::from_millis(10)).await;
}
```

---

## Best Practices

### DO ✅

- Use in-memory databases for speed
- Test both success and error paths
- Isolate tests with temporary directories
- Use descriptive test names
- Clean up resources (Arc, TempDir auto-cleanup)
- Run tests single-threaded when debugging
- Document test fixtures with module comments

### DON'T ❌

- Don't share state between tests
- Don't use hardcoded file paths
- Don't mix unit and integration tests
- Don't skip error case testing
- Don't commit flaky tests (fix or remove)
- Don't assume test order (they run in parallel)

---

## Resources

- [Integration Tests - Rust Book](https://doc.rust-lang.org/book/ch11-03-test-organization.html#integration-tests)
- [tokio Testing](https://tokio.rs/tokio/topics/testing)
- [wiremock Documentation](https://docs.rs/wiremock/)
- [SQLx Testing](https://github.com/launchbadge/sqlx#testing)
- [tempfile Crate](https://docs.rs/tempfile/)

---

**Last Updated**: January 25, 2026
**Test Count**: 75+ integration tests across 6 files
**Version**: v2.6.3
