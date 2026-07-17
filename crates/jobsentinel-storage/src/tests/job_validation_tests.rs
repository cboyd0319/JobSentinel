use super::*;

mod validation_tests {
    use super::*;

    #[tokio::test]
    async fn test_upsert_job_max_title_length() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("max_title", "Test", 0.9);
        // Exactly 500 chars (at limit)
        job.title = "x".repeat(500);

        let result = db.upsert_job(&job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upsert_job_max_company_length() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("max_company", "Test", 0.9);
        // Exactly 200 chars (at limit)
        job.company = "c".repeat(200);

        let result = db.upsert_job(&job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upsert_job_max_location_length() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("max_location", "Test", 0.9);
        // Exactly 200 chars (at limit)
        job.location = Some("l".repeat(200));

        let result = db.upsert_job(&job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upsert_job_max_description_length() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("max_desc", "Test", 0.9);
        // Exactly 50000 chars (at limit)
        job.description = Some("d".repeat(50000));

        let result = db.upsert_job(&job).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_upsert_job_url_exactly_at_max() {
        let db = crate::test_support::migrated_database().await;

        let mut job = create_test_job("url_max", "Test", 0.9);
        // Exactly 2000 chars (at limit)
        // "https://example.com/" = 20 chars, so need 1980 more
        job.url = format!("https://example.com/{}", "x".repeat(1980));
        assert_eq!(job.url.len(), 2000);

        let result = db.upsert_job(&job).await;
        assert!(result.is_ok());
    }
}
