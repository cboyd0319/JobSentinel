use super::*;

mod query_error_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_jobs_by_score_with_zero_limit() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("score_limit", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        let results = db.get_jobs_by_score(0.8, 0).await.unwrap();
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_get_jobs_by_source_empty_results() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("source_test", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Query for a source that doesn't exist
        let results = db
            .get_jobs_by_source("nonexistent_source", 10)
            .await
            .unwrap();
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_get_job_by_hash_not_found() {
        let db = crate::test_support::migrated_database().await;

        let result = db.get_job_by_hash("nonexistent_hash").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_mark_alert_sent_nonexistent_job() {
        let db = crate::test_support::migrated_database().await;

        // Should succeed (SQL UPDATE with no matches is not an error)
        let result = db.mark_alert_sent(999999).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_hide_job_nonexistent() {
        let db = crate::test_support::migrated_database().await;

        // Should succeed (UPDATE with no matches)
        let result = db.hide_job(999999).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_unhide_job_nonexistent() {
        let db = crate::test_support::migrated_database().await;

        // Should succeed (UPDATE with no matches)
        let result = db.unhide_job(999999).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_set_bookmark_nonexistent() {
        let db = crate::test_support::migrated_database().await;

        // Should succeed (UPDATE with no matches)
        let result = db.set_bookmark(999999, true).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_set_job_notes_nonexistent() {
        let db = crate::test_support::migrated_database().await;

        // Should succeed (UPDATE with no matches)
        let result = db.set_job_notes(999999, Some("Notes")).await;
        assert!(result.is_ok());
    }
}
