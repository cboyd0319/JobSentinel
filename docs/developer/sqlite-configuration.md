# SQLite Configuration

> **Source:** `crates/jobsentinel-storage/src/connection.rs`,
> `crates/jobsentinel-storage/src/encryption.rs`, and
> `crates/jobsentinel-storage/src/integrity/`

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
| `secure_delete` | `ON` | Overwrites deleted row content for stronger local privacy. |
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

## Migration Backup And Startup Integrity

`Database::migrate` owns the full data-safety sequence:

1. For an existing migrated database, create an encrypted SQLite snapshot with
   `VACUUM INTO` in the adjacent `backups` directory.
2. Apply private directory and file permissions.
3. Run `PRAGMA quick_check` against the snapshot before accepting it.
4. Keep the five newest pre-migration snapshots.
5. Apply SQLx migrations only after the required snapshot succeeds.
6. Run `PRAGMA quick_check` and `PRAGMA foreign_key_check` on the migrated
   database. Run `PRAGMA integrity_check` when the last full check is at least
   seven days old.

A required snapshot failure stops migration. A failed integrity or foreign-key
check stops initialization. Runtime errors and logs use generic messages or
non-identifying path labels; they do not expose local database paths or check
details. Check history and the last successful full-check timestamp remain in
the encrypted local database.

The integrity implementation is private to the database owner. Callers use
`Database::migrate` instead of coordinating backup, migration, and verification
steps independently.

## Operational Guidance

- Keep `WAL`, `synchronous = NORMAL`, and `busy_timeout = 5000` unless a
  measured issue requires a different tradeoff.
- Keep `foreign_keys = ON`; tests and production behavior rely on it.
- Use `PRAGMA optimize` after bulk writes or schema work.
- Use `VACUUM` only for explicit maintenance because it rebuilds the database.
- Never continue an existing-database migration after its required verified
  snapshot fails.
- Keep backup and database paths sanitized in logs.
- Do not inspect `jobs.db` with raw `sqlite3`; it is SQLCipher encrypted and
  must be opened through the keyed connection path.
- Do not add cloud backup behavior without an explicit product decision.

## Verification

Use focused tests to verify:

- `journal_mode` returns `wal` for file-backed databases.
- `foreign_keys` returns `1`.
- `cache_size` returns `-128000` for file-backed databases.
- `temp_store` returns `2`.
- `application_id` returns `1246970946`.
- `user_version` returns `2`.
- `quick_check` returns `ok`.
- A verified pre-migration snapshot includes committed WAL data.
- Migration stops when the required snapshot cannot be created.
- Successful migration records a passing startup integrity check.

Run focused Rust checks after SQLite configuration changes:

```bash
cargo test -p jobsentinel-storage
cargo test -p jobsentinel-storage --test database_integration_test
npm run lint:sqlx
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
