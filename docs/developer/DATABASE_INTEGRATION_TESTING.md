<!-- Documents synthetic SQLite fixtures, owner locking and database integration coverage. -->

# Database integration testing

Storage owns SQL, migrations and database fixtures. Use
[the maintained integration tests](../../crates/jobsentinel-storage/tests/database_integration_test.rs)
and owner-local tests under `crates/jobsentinel-storage/src/connection/tests/`
as executable examples. [Integration testing](INTEGRATION_TESTING.md) covers
cross-owner behavior.

## In-memory fixtures

`Database::connect_memory` creates a real isolated SQLite database. Apply the
production migrations before testing repositories:

```rust
use jobsentinel_storage::Database;

#[tokio::test]
async fn empty_database_has_no_jobs() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    assert_eq!(database.get_statistics().await.unwrap().total_jobs, 0);
    database.close().await;
}
```

An in-memory fixture cannot establish encryption, file permissions, WAL,
exclusive profile ownership or restart behavior.

## File-backed fixtures

Do not call production `Database::connect` casually from tests: installed-mode
startup can access the real OS database key. Storage's owner-local fixtures use
synthetic keys. The explicit `test-support` feature exposes
`Database::connect_test_fixture` for a new destination; it refuses existing files.
Its fixed test key must never become a production key path.

Keep fixture directories private and test data synthetic. Close each database
before reopening its path; a live owner reservation intentionally prevents a
second independent startup. Use shared pool transactions to test concurrent work
inside one owner, rather than bypassing the owner lock.

## Required boundaries

- Migrations preserve rows and enforce current schema identity.
- Required snapshot failure stops migration; a failed migration preserves recovery.
- Foreign keys and uniqueness reject invalid writes through the owning storage API.
- Concurrent writes preserve records and report contention without silent loss.
- Wrong-key and unsupported-data startup do not authorize primary writers.
- Portable authentication includes committed WAL data and preserves durable bytes;
  transient SQLite shared-memory read marks may change.
- Restore and update tests retain their journal, snapshot and rollback provenance.

SQL-only schema fixtures may open a raw SQLite pool inside the storage test owner.
That is not encrypted-runtime evidence, and it does not authorize SQL in application
or Tauri owners. There is no public `Database::query_raw` escape hatch.

## Commands

```bash
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-storage --test database_integration_test
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-storage --lib bootstrap_tests
npm run lint:sqlx
```

Select additional recovery or migration filters for the changed boundary. Record
the actual result and platform; listing a command here is not a passing result.
