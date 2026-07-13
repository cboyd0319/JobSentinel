# Database Integration Testing

This guide owns SQLite integration setup, migrations, constraints, and
concurrency coverage. See [Integration Testing Guide](INTEGRATION_TESTING.md)
for scraper, command, fixture, and troubleshooting patterns.

## Database Tests

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
