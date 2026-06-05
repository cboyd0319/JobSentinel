use super::*;

mod get_jobs_by_functions {
    use super::*;

    #[tokio::test]
    async fn test_get_jobs_by_score_boundary() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Job exactly at threshold
        let job1 = create_test_job("exact", "Exact Match", 0.8);
        db.upsert_job(&job1).await.unwrap();

        // Job above threshold
        let job2 = create_test_job("above", "Above Match", 0.81);
        db.upsert_job(&job2).await.unwrap();

        // Job below threshold
        let job3 = create_test_job("below", "Below Match", 0.79);
        db.upsert_job(&job3).await.unwrap();

        let results = db.get_jobs_by_score(0.8, 10).await.unwrap();
        // Should include jobs with score >= 0.8
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|j| j.score.unwrap() >= 0.8));
    }

    #[tokio::test]
    async fn test_get_jobs_by_source_case_sensitive() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("source_case", "Test Job", 0.9);
        job.source = "LinkedIn".to_string();
        db.upsert_job(&job).await.unwrap();

        // Query with different case - should not match (exact match)
        let results1 = db.get_jobs_by_source("linkedin", 10).await.unwrap();
        assert_eq!(results1.len(), 0);

        // Query with exact case - should match
        let results2 = db.get_jobs_by_source("LinkedIn", 10).await.unwrap();
        assert_eq!(results2.len(), 1);
    }

    #[tokio::test]
    async fn test_get_recent_jobs_ordered_by_score_then_date() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with same score but different times
        let job1 = create_test_job("recent1", "Old Job", 0.9);
        db.upsert_job(&job1).await.unwrap();

        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

        let job2 = create_test_job("recent2", "New Job Same Score", 0.9);
        db.upsert_job(&job2).await.unwrap();

        // Insert job with lower score
        let job3 = create_test_job("recent3", "Lower Score", 0.8);
        db.upsert_job(&job3).await.unwrap();

        let results = db.get_recent_jobs(10).await.unwrap();

        // Higher scores first, then newer jobs
        assert_eq!(results[0].title, "New Job Same Score");
        assert_eq!(results[1].title, "Old Job");
        assert_eq!(results[2].title, "Lower Score");
    }
}
