use super::*;

mod edge_case_tests {
    use super::*;

    #[tokio::test]
    async fn test_job_with_empty_strings() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("empty_strings", "Valid Title", 0.9);
        job.location = Some("".to_string());
        job.description = Some("".to_string());
        job.currency = Some("".to_string());

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        // Empty strings should be preserved (not converted to None)
        assert_eq!(fetched.location.as_deref(), Some(""));
        assert_eq!(fetched.description.as_deref(), Some(""));
        assert_eq!(fetched.currency.as_deref(), Some(""));
    }

    #[tokio::test]
    async fn test_job_with_zero_salary() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("zero_salary", "Test Job", 0.9);
        job.salary_min = Some(0);
        job.salary_max = Some(0);

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert_eq!(fetched.salary_min, Some(0));
        assert_eq!(fetched.salary_max, Some(0));
    }

    #[tokio::test]
    async fn test_job_with_negative_salary() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("negative_salary", "Test Job", 0.9);
        job.salary_min = Some(-1000);
        job.salary_max = Some(-500);

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        // Negative salaries are stored (validation is application-level)
        assert_eq!(fetched.salary_min, Some(-1000));
        assert_eq!(fetched.salary_max, Some(-500));
    }

    #[tokio::test]
    async fn test_job_with_score_boundary_values() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Score = 0.0
        let job1 = create_test_job("score_zero", "Zero Score", 0.0);
        let id1 = db.upsert_job(&job1).await.unwrap();
        let fetched1 = db.get_job_by_id(id1).await.unwrap().unwrap();
        assert_eq!(fetched1.score, Some(0.0));

        // Score = 1.0
        let job2 = create_test_job("score_one", "Perfect Score", 1.0);
        let id2 = db.upsert_job(&job2).await.unwrap();
        let fetched2 = db.get_job_by_id(id2).await.unwrap().unwrap();
        assert_eq!(fetched2.score, Some(1.0));
    }

    #[tokio::test]
    async fn test_get_recent_jobs_with_limit_zero() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("limit_zero", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        let results = db.get_recent_jobs(0).await.unwrap();
        assert_eq!(results.len(), 0);
    }

    #[tokio::test]
    async fn test_get_recent_jobs_with_negative_limit() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("negative_limit", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // SQLite treats negative LIMIT as unlimited
        let results = db.get_recent_jobs(-1).await.unwrap();
        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_unicode_in_job_fields() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("unicode", "Développeur Senior 🚀", 0.9);
        job.company = "株式会社テスト".to_string();
        job.location = Some("São Paulo, Brasil 🇧🇷".to_string());
        job.description = Some("Looking for a 双语个案经理 with 経験 in scheduling".to_string());

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert_eq!(fetched.title, "Développeur Senior 🚀");
        assert_eq!(fetched.company, "株式会社テスト");
        assert_eq!(fetched.location.as_deref(), Some("São Paulo, Brasil 🇧🇷"));
    }

    #[tokio::test]
    async fn test_sql_injection_protection_in_search() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("injection_test", "Test Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Try SQL injection in search query
        let malicious_query = "'; DROP TABLE jobs; --";
        let _result = db.search_jobs(malicious_query, 10).await;

        // Should either return empty results or FTS5 error, NOT drop the table
        // The table should still exist after this
        let jobs = db.get_recent_jobs(10).await.unwrap();
        assert_eq!(jobs.len(), 1, "Table should not be dropped");
    }

    #[tokio::test]
    async fn test_very_large_times_seen() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("large_times_seen", "Popular Job", 0.9);
        let id = db.upsert_job(&job).await.unwrap();

        // Upsert many times
        for _ in 0..100 {
            db.upsert_job(&job).await.unwrap();
        }

        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 101);
    }

    #[tokio::test]
    async fn test_job_with_very_long_url() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("long_url", "Test Job", 0.9);
        // Create a URL at the limit (2000 chars exactly)
        job.url = format!("https://example.com/job/{}", "x".repeat(1976));

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert_eq!(fetched.url.len(), 2000);
    }

    #[tokio::test]
    async fn test_concurrent_upserts_same_hash() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("concurrent", "Test Job", 0.9);

        // First insert the job once to establish the row
        db.upsert_job(&job).await.unwrap();

        // Then do concurrent updates
        let mut handles = vec![];
        for _ in 0..10 {
            let job_clone = job.clone();
            let db_pool = db.pool().clone();
            let handle = tokio::spawn(async move {
                let db = Database::from_pool(db_pool);
                db.upsert_job(&job_clone).await
            });
            handles.push(handle);
        }

        // Wait for all to complete
        let mut ids = vec![];
        for handle in handles {
            let id = handle.await.unwrap().unwrap();
            ids.push(id);
        }

        // All should return the same ID (deduplication worked)
        assert!(ids.iter().all(|&id| id == ids[0]));

        // Verify times_seen incremented correctly (1 initial + 10 concurrent = 11)
        let fetched = db.get_job_by_id(ids[0]).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 11);
    }
}
