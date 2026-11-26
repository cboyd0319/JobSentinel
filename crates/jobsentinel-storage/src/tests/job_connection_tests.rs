//! Proves in-memory and file-backed database connections, reopening and pool access.

use super::*;

mod connection_tests {
    use super::*;
    use std::path::Path;

    #[tokio::test]
    async fn test_connect_memory_and_migrate() {
        let db = Database::connect_memory().await.unwrap();
        let result = db.migrate().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_connect_creates_parent_directory() {
        let temp_dir = tempfile::tempdir().unwrap();
        let test_db_dir = temp_dir.path().join("missing-parent");
        let db_path = test_db_dir.join("test_create_parent.db");
        assert!(!test_db_dir.exists());

        let db = Database::connect(&db_path).await.unwrap();
        db.migrate().await.unwrap();
        db.pool().close().await;

        assert!(test_db_dir.is_dir());
    }

    #[tokio::test]
    async fn test_connect_with_existing_file() {
        // A unique directory keeps SQLite sidecars from other runs out of this test.
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("test_existing.db");

        // Create database
        let db1 = Database::connect(&db_path).await.unwrap();
        db1.migrate().await.unwrap();

        // Insert a job
        let job = create_test_job("existing_test", "Test Job", 0.9);
        let id = db1.upsert_job(&job).await.unwrap();
        db1.pool().close().await;
        drop(db1);

        // Reconnect to same database
        let db2 = Database::connect(&db_path).await.unwrap();

        // Should be able to read the job
        let fetched = db2.get_job_by_id(id).await.unwrap();
        assert!(fetched.is_some());
        db2.pool().close().await;
    }

    #[tokio::test]
    async fn test_connect_without_parent_directory() {
        // A bare file name has an empty parent; connect must not try to create one.
        let bare = Path::new("test_no_parent.db");
        Database::ensure_database_parent(bare).unwrap();

        // Parent resolution is covered by `bare_file_name_bootstraps_in_the_current_directory`;
        // the rest of connect is path-agnostic, so prove it in an isolated directory.
        let temp_dir = tempfile::tempdir().unwrap();
        let db = Database::connect(&temp_dir.path().join(bare))
            .await
            .unwrap();
        db.migrate().await.unwrap();
        db.pool().close().await;
    }

    #[tokio::test]
    async fn test_pool_accessor() {
        let db = crate::test_support::migrated_database().await;

        let pool = db.pool();

        // Verify pool is usable
        let result = sqlx::query("SELECT COUNT(*) FROM jobs")
            .fetch_one(pool)
            .await;
        assert!(result.is_ok());
    }
}
