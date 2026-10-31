//! Verifies vector-table migration preserves supported encrypted data, recovery and export privacy.

use super::{freshness, model};
use crate::{
    connection::MIGRATOR,
    encryption::{
        connect_encrypted_pool, connect_encrypted_read_only_pool, load_or_create_database_key,
    },
    vectors::StoredVectorRead,
    Database, ReviewedExportSelection,
};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};

type VectorRow = (Vec<u8>, i64, Vec<u8>, i64, String);

fn current_sequence() -> i64 {
    MIGRATOR
        .iter()
        .map(|migration| migration.version)
        .max()
        .unwrap()
}

async fn prior_vector(pool: &SqlitePool) -> VectorRow {
    sqlx::query_as(
        "SELECT CAST(freshness_json AS BLOB), dimension, vector_blob, revision, updated_at
         FROM v3_local_vectors WHERE subject_id = 'resume:17'",
    )
    .fetch_one(pool)
    .await
    .unwrap()
}

async fn current_vector(pool: &SqlitePool) -> VectorRow {
    sqlx::query_as(
        "SELECT CAST(freshness_json AS BLOB), dimension, vector_blob, revision, updated_at
         FROM local_vectors WHERE subject_id = 'resume:17'",
    )
    .fetch_one(pool)
    .await
    .unwrap()
}

async fn supported_31_fixture(path: &Path) -> (VectorRow, i64) {
    let key = load_or_create_database_key().await.unwrap();
    let pool = connect_encrypted_pool(path, &key, true).await.unwrap();
    MIGRATOR.run_to(31, &pool).await.unwrap();
    sqlx::query("PRAGMA user_version = 2")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO resumes (id, name, file_path, parsed_text, updated_at) VALUES (17, 'Resume', 'resume.txt', 'Rust', '2026-10-28 01:02:03.456')")
        .execute(&pool).await.unwrap();
    sqlx::query(
        "INSERT INTO v3_local_vectors
         (subject_id, freshness_json, dimension, vector_blob, revision, updated_at)
         VALUES ('resume:17', ?, 3, ?, 7, '2026-10-28T01:02:03.456Z')",
    )
    .bind(serde_json::to_string_pretty(&freshness(&model())).unwrap())
    .bind(
        [0.25_f32, -0.5, 1.0]
            .into_iter()
            .flat_map(f32::to_le_bytes)
            .collect::<Vec<_>>(),
    )
    .execute(&pool)
    .await
    .unwrap();
    let row = prior_vector(&pool).await;
    let root_page =
        sqlx::query_scalar("SELECT rootpage FROM sqlite_master WHERE name = 'v3_local_vectors'")
            .fetch_one(&pool)
            .await
            .unwrap();
    pool.close().await;
    (row, root_page)
}

fn migration_snapshot(root: &Path) -> PathBuf {
    let scope = std::fs::read_dir(root.join("backups"))
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let snapshots: Vec<_> = std::fs::read_dir(scope)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect();
    assert_eq!(snapshots.len(), 1);
    assert!(snapshots[0]
        .file_name()
        .unwrap()
        .to_string_lossy()
        .starts_with(&format!(
            "migration_snapshot_v31_to_v{}_",
            current_sequence()
        )));
    snapshots[0].clone()
}

#[tokio::test]
async fn fresh_database_publishes_only_the_current_vector_table() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    let tables: (i64, i64) = sqlx::query_as(
        "SELECT
            EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'local_vectors'),
            EXISTS(SELECT 1 FROM sqlite_master WHERE name = 'v3_local_vectors')",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(tables, (1, 0));
    assert_eq!(
        database.update_schema_inventory().await.unwrap(),
        (2, u64::try_from(current_sequence()).unwrap())
    );
    let provenance = model();
    let current = freshness(&provenance);
    database
        .store_vector("fresh-vector", &current, &provenance, &[0.25, -0.5, 1.0])
        .await
        .unwrap();
    assert_eq!(
        database
            .read_vector("fresh-vector", &current, Some(&provenance))
            .await
            .unwrap(),
        StoredVectorRead::Ready(vec![0.25, -0.5, 1.0])
    );
    database.pool().close().await;
}

#[tokio::test]
async fn encrypted_31_vectors_preserve_bytes_revisions_and_recovery() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let (original, root_page) = supported_31_fixture(&path).await;
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    assert_eq!(current_vector(database.pool()).await, original);
    assert_eq!(
        sqlx::query_scalar::<_, i64>(
            "SELECT rootpage FROM sqlite_master WHERE name = 'local_vectors'"
        )
        .fetch_one(database.pool())
        .await
        .unwrap(),
        root_page
    );
    assert_eq!(
        sqlx::query_scalar::<_, i64>(
            "SELECT migration_version FROM compatibility_metadata WHERE singleton = 1"
        )
        .fetch_one(database.pool())
        .await
        .unwrap(),
        current_sequence()
    );
    assert_eq!(
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'v3_local_vectors'"
        )
        .fetch_one(database.pool())
        .await
        .unwrap(),
        0
    );
    let provenance = model();
    let current = freshness(&provenance);
    assert_eq!(
        database
            .read_vector("resume:17", &current, Some(&provenance))
            .await
            .unwrap(),
        StoredVectorRead::Ready(vec![0.25, -0.5, 1.0])
    );

    let snapshot = migration_snapshot(root.path());
    let key = load_or_create_database_key().await.unwrap();
    let backup = connect_encrypted_read_only_pool(&snapshot, &key)
        .await
        .unwrap();
    assert_eq!(prior_vector(&backup).await, original);
    assert_eq!(
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'local_vectors'"
        )
        .fetch_one(&backup)
        .await
        .unwrap(),
        0
    );
    assert_eq!(
        sqlx::query_scalar::<_, i64>(
            "SELECT migration_version FROM v3_compatibility_metadata WHERE singleton = 1"
        )
        .fetch_one(&backup)
        .await
        .unwrap(),
        31
    );
    backup.close().await;

    let matcher = database.resume_matcher();
    let captured = matcher
        .get_resume_evidence_snapshot(17)
        .await
        .unwrap()
        .unwrap();
    database
        .store_resume_vector_if_current(17, &captured, &current, &provenance, &[1.0, 0.5, -0.25])
        .await
        .unwrap();
    assert_eq!(current_vector(database.pool()).await.3, 8);
    matcher
        .add_user_skill(
            17,
            crate::resume::NewSkill {
                skill_name: "Rust".into(),
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(
        database
            .read_vector("resume:17", &current, Some(&provenance))
            .await
            .unwrap(),
        StoredVectorRead::Missing
    );
    database
        .store_vector("resume:17", &current, &provenance, &[0.25, -0.5, 1.0])
        .await
        .unwrap();
    matcher.delete_resume(17).await.unwrap();
    assert_eq!(
        database
            .read_vector("resume:17", &current, Some(&provenance))
            .await
            .unwrap(),
        StoredVectorRead::Missing
    );
    database.pool().close().await;
    drop(matcher);
    drop(database);

    std::fs::copy(&snapshot, &path).unwrap();
    crate::encryption::remove_sqlite_sidecars(&path);
    let restored = Database::connect(&path).await.unwrap();
    assert_eq!(prior_vector(restored.pool()).await, original);
    restored.migrate().await.unwrap();
    assert_eq!(current_vector(restored.pool()).await, original);
    restored.pool().close().await;
}

#[tokio::test]
async fn reviewed_export_excludes_current_vector_rows_and_their_content() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    let provenance = model();
    database
        .store_vector(
            "private-vector-export-marker",
            &freshness(&provenance),
            &provenance,
            &[0.25, -0.5, 1.0],
        )
        .await
        .unwrap();
    let destination = root.path().join("reviewed.jsonl");
    let plan = database
        .review_plaintext_export(ReviewedExportSelection::default())
        .await
        .unwrap();
    database
        .create_reviewed_export(&destination, plan)
        .await
        .unwrap();
    let contents = std::fs::read_to_string(destination).unwrap();
    for private in [
        "local_vectors",
        "private-vector-export-marker",
        "model_manifest_sha256",
        "vector_blob",
    ] {
        assert!(!contents.contains(private), "export leaked {private}");
    }
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM local_vectors")
            .fetch_one(database.pool())
            .await
            .unwrap(),
        1
    );
    database.pool().close().await;
}
