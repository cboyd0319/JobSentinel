//! Verifies update snapshots preserve live WAL data and refuse corruption without modifying current data.

use super::*;

#[tokio::test]
async fn update_snapshot_preserves_wal_and_refuses_tampering() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    database.migrate().await.unwrap();
    sqlx::query("CREATE TABLE update_test (value TEXT)")
        .execute(&database.pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO update_test VALUES ('wal data')")
        .execute(&database.pool)
        .await
        .unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    assert_eq!(
        database
            .inspect_update_snapshot(Uuid::parse_str(&snapshot.operation_id).unwrap())
            .await
            .unwrap(),
        snapshot
    );
    let path = database
        .update_snapshot_directory(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .unwrap()
        .join("snapshot.db");
    let mut conn = database.pool.acquire().await.unwrap();
    sqlx::query("ATTACH DATABASE ? AS snapshot_test")
        .bind(path.to_str().unwrap())
        .execute(&mut *conn)
        .await
        .unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM snapshot_test.update_test")
        .fetch_one(&mut *conn)
        .await
        .unwrap();
    assert_eq!(value, "wal data");
    sqlx::query("DETACH DATABASE snapshot_test")
        .execute(&mut *conn)
        .await
        .unwrap();
    drop(conn);
    let id = Uuid::parse_str(&snapshot.operation_id).unwrap();
    let receipt_path = database
        .update_snapshot_directory(id)
        .unwrap()
        .join("receipt.json");
    let mut changed = snapshot.clone();
    changed.database_schema += 1;
    std::fs::write(&receipt_path, serde_json::to_vec(&changed).unwrap()).unwrap();
    assert!(database.inspect_update_snapshot(id).await.is_err());
    std::fs::write(receipt_path, serde_json::to_vec(&snapshot).unwrap()).unwrap();
    std::fs::write(path, b"corrupt").unwrap();
    assert!(database
        .inspect_update_snapshot(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .await
        .is_err());
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM update_test")
            .fetch_one(&database.pool)
            .await
            .unwrap(),
        "wal data"
    );
}

#[tokio::test]
async fn update_snapshot_refuses_memory_database() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    assert!(database.create_update_snapshot().await.is_err());
}

#[tokio::test]
async fn cancelled_snapshot_attachment_does_not_poison_pool() {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    let (ready, attached) = tokio::sync::oneshot::channel();
    let task_pool = pool.clone();
    let task = tokio::spawn(async move {
        let mut conn = Database::snapshot_connection(&task_pool).await.unwrap();
        sqlx::query("ATTACH DATABASE ':memory:' AS update_snapshot_check")
            .execute(&mut *conn)
            .await
            .unwrap();
        ready.send(()).unwrap();
        std::future::pending::<()>().await;
    });
    attached.await.unwrap();
    task.abort();
    assert!(task.await.unwrap_err().is_cancelled());
    let mut conn = tokio::time::timeout(std::time::Duration::from_secs(5), pool.acquire())
        .await
        .unwrap()
        .unwrap();
    sqlx::query("ATTACH DATABASE ':memory:' AS update_snapshot_check")
        .execute(&mut *conn)
        .await
        .unwrap();
    sqlx::query("DETACH DATABASE update_snapshot_check")
        .execute(&mut *conn)
        .await
        .unwrap();
}
