# SQLite Configuration

> **Source:** `src-tauri/src/core/db/connection.rs`,
> `src-tauri/src/core/db/encryption.rs`, and
> `src-tauri/src/core/db/integrity/`

JobSentinel uses SQLite with SQLx and an on-disk database by default. The
connection layer opens file-backed databases through SQLCipher, then applies
PRAGMA settings for crash recovery, local data integrity, and read-heavy
desktop performance. Test databases use a smaller in-memory configuration where
WAL and file-backed features do not apply.

## On-Disk Startup Settings

`Database::connect` creates the parent directory, loads or creates the
OS-protected `jobsentinel_database_key`, opens the database with SQLCipher and
`mode=rwc`, and calls `Database::configure_pragmas`. If a legacy plaintext
database is detected, startup exports it into a new encrypted database, verifies
the encrypted copy, replaces the original file, and deletes the temporary
plaintext backup after success.

| Setting | Value | Purpose |
| --- | --- | --- |
| `journal_mode` | `WAL` | Allows readers while writes commit and improves crash recovery. |
| `synchronous` | `NORMAL` | Balances fsync cost with reasonable crash safety. |
| `wal_autocheckpoint` | `1000` pages | Keeps WAL growth bounded during normal use. |
| `foreign_keys` | `ON` | Enforces relational integrity. |
| `defer_foreign_keys` | `OFF` | Checks foreign keys immediately. |
| `cell_size_check` | `ON` | Adds B-tree corruption checks. |
| `checksum_verification` | `ON` when supported | Enables SQLite checksum verification on supported builds. |
| `trusted_schema` | `OFF` when supported | Disables unsafe schema-controlled SQL behavior. |
| `secure_delete` | `FAST` | Overwrites free pages without the full cost of `ON`. |
| `reverse_unordered_selects` | `ON` in debug builds | Exposes tests that rely on undefined row ordering. |
| `cache_size` | `-128000` KB | Uses an approximately 128 MB page cache. |
| `temp_store` | `MEMORY` | Keeps temporary tables and indexes in RAM. |
| `mmap_size` | `268435456` bytes | Allows up to 256 MB of memory-mapped reads. |
| `locking_mode` | `NORMAL` | Allows multi-connection access. |
| `busy_timeout` | `5000` ms | Waits for short lock contention before failing. |
| `page_size` | `4096` bytes | Applies to new databases before tables exist. |
| `auto_vacuum` | `INCREMENTAL` | Enables controlled space reclamation. |
| `incremental_vacuum(100)` | Startup attempt | Reclaims a small amount of free space when available. |
| `application_id` | `0x4A534442` | Marks files as JobSentinel databases. |
| `user_version` | `2` | Tracks the current major schema generation. |
| `optimize` | Startup run | Updates query planner statistics. |

Unsupported optional PRAGMAs are logged and skipped instead of failing startup.
This applies to `checksum_verification` and `trusted_schema` on older SQLite
builds.

## In-Memory Test Settings

`Database::connect_memory` uses `Database::configure_memory_pragmas` because
some file-backed settings are invalid for `:memory:` databases.

| Setting | Value |
| --- | --- |
| `foreign_keys` | `ON` |
| `defer_foreign_keys` | `OFF` |
| `cell_size_check` | `ON` |
| `journal_mode` | `DELETE` |
| `synchronous` | `NORMAL` |
| `temp_store` | `MEMORY` |
| `cache_size` | `-32000` KB |
| `busy_timeout` | `5000` ms |
| `reverse_unordered_selects` | `ON` in debug builds |

WAL mode, memory-mapped I/O, auto-vacuum, WAL checkpointing, and application
metadata belong to file-backed databases and are not part of the in-memory
configuration.

## Integrity Tools

The integrity module wraps common maintenance and diagnostic operations.

| API | Behavior |
| --- | --- |
| `quick_check` | Runs `PRAGMA quick_check`. |
| `full_integrity_check` | Runs `PRAGMA integrity_check` and records the result. |
| `foreign_key_check` | Runs `PRAGMA foreign_key_check`. |
| `create_backup` | Uses `VACUUM INTO` to create a compact backup file. |
| `backup_before_operation` | Creates a named pre-operation backup. |
| `restore_from_backup` | Quarantines the current database plus `-wal` and `-shm` sidecars, then copies the backup into place. |
| `cleanup_old_backups` | Deletes older backup files beyond a caller-provided keep count. |
| `get_backup_history` | Reads backup metadata from `backup_log`. |
| `checkpoint_wal` | Runs `PRAGMA wal_checkpoint(TRUNCATE)`. |
| `optimize_query_planner` | Runs `PRAGMA optimize`. |
| `get_pragma_diagnostics` | Reads current PRAGMA values for debugging. |

Backup reason strings are sanitized before becoming part of backup filenames.
Backup and database paths are logged through non-identifying path labels.
Pre-migration backups use SQLite `VACUUM INTO` so committed WAL frames are
included in the snapshot, and they inherit the SQLCipher encryption key.
Restore callers must close the active pool first; the restore helper then moves
the main database and SQLite sidecars out of the way before copying the backup
and applying private file permissions.

## Health Metrics

`DatabaseIntegrity::get_health_metrics` reports:

- Database, free-list, and WAL sizes.
- Fragmentation percentage.
- `user_version` and `application_id`.
- Integrity-check and backup freshness.
- Total jobs.
- Integrity-check and backup history counts.

`integrity_check_overdue` becomes true when the last full integrity check is
more than seven days old. `backup_overdue` becomes true when the last backup is
more than 24 hours old.

## Diagnostics Example

```rust
let integrity = DatabaseIntegrity::new(pool.clone(), backup_dir);

let health = integrity.get_health_metrics().await?;
let diagnostics = integrity.get_pragma_diagnostics().await?;

assert_eq!(diagnostics.journal_mode, "wal");
assert!(diagnostics.foreign_keys);
assert_eq!(diagnostics.cache_size, -128000);

if health.backup_overdue {
    tracing::warn!(
        hours_since_last_backup = health.hours_since_last_backup,
        "Database backup overdue"
    );
}
```

## Operational Guidance

- Keep `WAL`, `synchronous = NORMAL`, and `busy_timeout = 5000` unless a
  measured issue requires a different tradeoff.
- Keep `foreign_keys = ON`; tests and production behavior rely on it.
- Use `PRAGMA optimize` after bulk writes or schema work.
- Run a WAL checkpoint before backup-sensitive size checks.
- Use `VACUUM` only for explicit maintenance because it rebuilds the database.
- Keep backup and diagnostic paths sanitized in logs.
- Do not inspect `jobs.db` with raw `sqlite3`; it is SQLCipher encrypted and
  must be opened through the keyed connection path.
- Do not add cloud backup behavior without an explicit product decision.

## Verification

Use PRAGMA diagnostics or integration tests to verify:

- `journal_mode` returns `wal` for file-backed databases.
- `foreign_keys` returns `1`.
- `cache_size` returns `-128000` for file-backed databases.
- `temp_store` returns `2`.
- `application_id` returns `1246970946`.
- `user_version` returns `2`.
- `quick_check` returns `ok`.
- Backup creation succeeds through `backup_before_operation`.

Run focused Rust checks after SQLite configuration changes:

```bash
cd src-tauri && cargo test db --lib
cd src-tauri && cargo test --test database_integration_test
```

Also run the docs gate after changing this document:

```bash
npm run lint:docs
```

## References

- [SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html)
- [SQLite WAL mode](https://www.sqlite.org/wal.html)
- [SQLite query planner overview](https://www.sqlite.org/optoverview.html)
- [SQLite security considerations](https://www.sqlite.org/security.html)
