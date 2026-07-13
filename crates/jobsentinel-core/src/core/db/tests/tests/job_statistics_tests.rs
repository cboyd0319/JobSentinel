use super::*;

mod statistics_coverage_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_statistics_with_mixed_jobs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with different attributes
        let mut job1 = create_test_job("stat1", "Job 1", 0.9);
        job1.remote = Some(true);
        db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("stat2", "Job 2", 0.5);
        job2.remote = Some(false);
        db.upsert_job(&job2).await.unwrap();

        let mut job3 = create_test_job("stat3", "Job 3", 0.7);
        job3.remote = None;
        db.upsert_job(&job3).await.unwrap();

        let stats = db.get_statistics().await.unwrap();
        assert_eq!(stats.total_jobs, 3);
        assert_eq!(stats.high_matches, 1); // Only job1 with score >= 0.8
    }

    #[tokio::test]
    async fn test_get_statistics_with_high_score_threshold() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with scores around 0.9 threshold (high_matches >= 0.9)
        let job1 = create_test_job("high1", "Job 1", 0.95);
        db.upsert_job(&job1).await.unwrap();

        let job2 = create_test_job("high2", "Job 2", 0.9);
        db.upsert_job(&job2).await.unwrap();

        let job3 = create_test_job("low", "Job 3", 0.89);
        db.upsert_job(&job3).await.unwrap();

        let stats = db.get_statistics().await.unwrap();
        assert_eq!(stats.high_matches, 2); // >= 0.9
        assert_eq!(stats.total_jobs, 3);
    }

    #[tokio::test]
    async fn test_get_statistics_includes_all_jobs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert visible job
        let job1 = create_test_job("visible", "Visible Job", 0.9);
        db.upsert_job(&job1).await.unwrap();

        // Insert hidden job (get_statistics counts ALL jobs, including hidden)
        let job2 = create_test_job("hidden", "Hidden Job", 0.85);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.hide_job(id2).await.unwrap();

        let stats = db.get_statistics().await.unwrap();
        assert_eq!(stats.total_jobs, 2); // Counts all jobs including hidden
    }
}
