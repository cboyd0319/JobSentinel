//! Proves ordinary physical names preserve rows, roots, guards and interrupted-v3 recovery.

use super::*;
use std::collections::BTreeMap;

const TABLES: &[&str] = &[
    "compatibility_metadata",
    "evidence_packet_boundaries",
    "evidence_packet_evidence",
    "evidence_packets",
    "job_events",
    "outside_ai_operations",
    "pack_publishers",
    "pack_releases",
    "pack_streams",
    "privacy_receipts",
    "recovery_operations",
    "source_consent_events",
    "source_manifests",
    "source_policies",
    "source_policy_ledger",
];

async fn table_rows(pool: &SqlitePool, table: &str) -> Vec<String> {
    let columns: Vec<String> =
        sqlx::query_as::<_, (i64, String, String, bool, Option<String>, i64)>(sqlx::AssertSqlSafe(
            format!("PRAGMA table_info(\"{table}\")"),
        ))
        .fetch_all(pool)
        .await
        .unwrap()
        .into_iter()
        .map(|row| row.1)
        .filter(|column| {
            !(table.ends_with("compatibility_metadata") && column == "migration_version")
        })
        .collect();
    let projection = columns
        .iter()
        .map(|column| format!("typeof(\"{column}\") || ':' || hex(CAST(\"{column}\" AS BLOB))"))
        .collect::<Vec<_>>()
        .join(" || '|' || ");
    sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT {projection} AS exact_row FROM \"{table}\" ORDER BY exact_row"
    )))
    .fetch_all(pool)
    .await
    .unwrap()
}

fn canonical_sql(sql: &str) -> String {
    let mut canonical = String::new();
    let mut quoted = false;
    let mut word = String::new();
    for character in sql.chars().chain(std::iter::once(' ')) {
        if !quoted && (character.is_ascii_alphanumeric() || character == '_') {
            word.push(character);
            continue;
        }
        if !word.is_empty() {
            canonical.push_str(&word.replacen("v3_", "", 1));
            word.clear();
        }
        if character == '\'' {
            quoted = !quoted;
        }
        if quoted || (!character.is_whitespace() && character != '"') {
            canonical.push(character);
        }
    }
    canonical.trim_end_matches(';').to_string()
}

#[tokio::test]
async fn physical_schema_rename_preserves_rows_roots_and_every_guard() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(32, database.pool()).await.unwrap();
    sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES ('kept','Role','Example','https://example.test/job','test')")
        .execute(database.pool()).await.unwrap();
    sqlx::query("INSERT INTO opportunity_case_files(case_file_id,job_hash,created_at) VALUES ('case','kept','2026-10-28')")
        .execute(database.pool()).await.unwrap();
    sqlx::query("INSERT INTO v3_job_events(event_id,case_file_id,event_kind,origin,user_action,local_only,sensitive,metadata_json,created_at) VALUES ('event','case','case_created','user',1,1,1,'{\"kind\":\"empty\"}','2026-10-28')")
        .execute(database.pool()).await.unwrap();
    super::pack_migration_tests::seed_pack_lifecycle(&database, &"a".repeat(64), &"b".repeat(64))
        .await;
    let mut rows = BTreeMap::new();
    let mut roots = BTreeMap::new();
    for table in TABLES {
        let old = format!("v3_{table}");
        rows.insert(*table, table_rows(database.pool(), &old).await);
        let root: i64 =
            sqlx::query_scalar("SELECT rootpage FROM sqlite_master WHERE type='table' AND name=?")
                .bind(&old)
                .fetch_one(database.pool())
                .await
                .unwrap();
        roots.insert(*table, root);
    }
    let objects: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT type,name,sql FROM sqlite_master WHERE type IN ('index','trigger') AND sql IS NOT NULL ORDER BY type,name",
    ).fetch_all(database.pool()).await.unwrap();
    MIGRATOR.run(database.pool()).await.unwrap();
    for table in TABLES {
        assert_eq!(
            table_rows(database.pool(), table).await,
            rows[table],
            "{table}"
        );
        let root: i64 =
            sqlx::query_scalar("SELECT rootpage FROM sqlite_master WHERE type='table' AND name=?")
                .bind(table)
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(root, roots[table], "{table}");
    }
    for (kind, name, sql) in objects {
        let renamed = name.replacen("v3_", "", 1);
        let actual: String =
            sqlx::query_scalar("SELECT sql FROM sqlite_master WHERE type=? AND name=?")
                .bind(&kind)
                .bind(&renamed)
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(canonical_sql(&actual), canonical_sql(&sql), "{kind} {name}");
    }
    let remaining: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE name GLOB 'v3_*' OR name GLOB 'idx_v3_*'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(remaining, 0);
    let foreign_keys: Vec<(String, i64, String, i64)> = sqlx::query_as("PRAGMA foreign_key_check")
        .fetch_all(database.pool())
        .await
        .unwrap();
    assert!(foreign_keys.is_empty());
}

#[tokio::test]
async fn interrupted_physical_rename_reopens_with_pack_guards_and_retries() {
    use sqlx::{
        migrate::{Migration, MigrationType, Migrator},
        SqlSafeStr,
    };
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let key = load_or_create_database_key().await.unwrap();
    let pool = connect_encrypted_pool(&path, &key, true).await.unwrap();
    MIGRATOR.run_to(32, &pool).await.unwrap();
    sqlx::query("PRAGMA user_version=2")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES ('kept','Role','Example','https://example.test/job','test')")
        .execute(&pool).await.unwrap();
    pool.close().await;
    let database = Database::connect(&path).await.unwrap();
    super::pack_migration_tests::seed_pack_lifecycle(&database, &"a".repeat(64), &"b".repeat(64))
        .await;
    let migrations = MIGRATOR
        .iter()
        .filter(|migration| migration.version < 34)
        .cloned()
        .chain(std::iter::once(Migration::new(
            34,
            "injected failure".into(),
            MigrationType::Simple,
            "SELECT missing_function();".into_sql_str(),
            false,
        )))
        .collect();
    assert!(database
        .migrate_with(&Migrator::with_migrations(migrations))
        .await
        .is_err());
    let version: i64 = sqlx::query_scalar("SELECT migration_version FROM compatibility_metadata")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(version, 33);
    assert!(
        sqlx::query("UPDATE pack_releases SET signed_release_sha256 = ?")
            .bind("c".repeat(64))
            .execute(database.pool())
            .await
            .is_err()
    );
    database.pool.close().await;
    drop(database);
    let reopened = Database::connect(&path).await.unwrap();
    reopened.migrate().await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT title FROM jobs WHERE hash='kept'")
            .fetch_one(reopened.pool())
            .await
            .unwrap(),
        "Role"
    );
    let ordinary_guard: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='pack_releases_immutable_fields'")
        .fetch_one(reopened.pool()).await.unwrap();
    assert_eq!(ordinary_guard, 1);
    assert!(root.path().join("backups").exists());
}

#[tokio::test]
async fn inconsistent_physical_layouts_and_rename_checksums_preserve_main_and_wal() {
    for corruption in [
        "CREATE TABLE v3_compatibility_metadata AS SELECT * FROM compatibility_metadata",
        "CREATE TABLE v3_recovery_operations AS SELECT * FROM recovery_operations",
        "ALTER TABLE recovery_operations RENAME TO v3_recovery_operations",
        "ALTER TABLE job_events RENAME TO v3_job_events",
        "DROP TABLE source_manifests",
        "CREATE TABLE v3_source_manifests AS SELECT * FROM source_manifests",
        "CREATE TABLE v3_local_vectors AS SELECT * FROM local_vectors",
        "DROP TABLE local_vectors",
        "DELETE FROM _sqlx_migrations WHERE version=33",
        "UPDATE _sqlx_migrations SET checksum=X'00' WHERE version=33",
        "UPDATE _sqlx_migrations SET success=0 WHERE version=33",
    ] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let database = Database::connect(&path).await.unwrap();
        sqlx::query("PRAGMA wal_autocheckpoint=0")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query(corruption)
            .execute(database.pool())
            .await
            .unwrap();
        let pool = database.pool().clone();
        drop(database);
        let wal = crate::encryption::sqlite_sidecar_path(&path, "-wal");
        let before = (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap());
        let error = Database::connect(&path).await.unwrap_err();
        assert!(
            error
                .to_string()
                .contains("inconsistent; requires recovery"),
            "{error}"
        );
        assert_eq!(
            before,
            (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap())
        );
        pool.close().await;
    }
}

#[tokio::test]
async fn both_physical_metadata_names_keep_future_refusal_before_identity_checks() {
    for table in ["v3_compatibility_metadata", "compatibility_metadata"] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let key = load_or_create_database_key().await.unwrap();
        let pool = connect_encrypted_pool(&path, &key, true).await.unwrap();
        sqlx::query("PRAGMA wal_autocheckpoint=0")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("PRAGMA user_version=2")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!("CREATE TABLE {table}(compatibility_line INTEGER,database_schema INTEGER,migration_version INTEGER)")))
            .execute(&pool).await.unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "INSERT INTO {table} VALUES(4,2,11)"
        )))
        .execute(&pool)
        .await
        .unwrap();
        let wal = crate::encryption::sqlite_sidecar_path(&path, "-wal");
        let before = (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap());
        let error = Database::connect(&path).await.unwrap_err();
        assert!(error.to_string().contains("Unsupported newer"), "{error}");
        assert_eq!(
            before,
            (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap())
        );
        pool.close().await;
    }
}

#[tokio::test]
async fn every_supported_pre_rename_schema_reopens_at_its_original_sequence() {
    for version in 11..=32 {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let key = load_or_create_database_key().await.unwrap();
        let pool = connect_encrypted_pool(&path, &key, true).await.unwrap();
        MIGRATOR.run_to(version, &pool).await.unwrap();
        pool.close().await;
        let reopened = Database::connect(&path).await.unwrap();
        let applied: i64 = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
            .fetch_one(reopened.pool())
            .await
            .unwrap();
        assert_eq!(applied, version);
        reopened.pool.close().await;
    }
}
