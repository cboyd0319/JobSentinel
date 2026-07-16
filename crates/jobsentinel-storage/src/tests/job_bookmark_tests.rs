use super::*;

mod bookmark_coverage {
    use super::*;

    #[tokio::test]
    async fn test_get_bookmarked_jobs_ordered_by_score() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert bookmarked jobs with different scores
        let job1 = create_test_job("bm1", "Low Score", 0.5);
        let id1 = db.upsert_job(&job1).await.unwrap();
        db.set_bookmark(id1, true).await.unwrap();

        let job2 = create_test_job("bm2", "High Score", 0.95);
        let id2 = db.upsert_job(&job2).await.unwrap();
        db.set_bookmark(id2, true).await.unwrap();

        let job3 = create_test_job("bm3", "Mid Score", 0.8);
        let id3 = db.upsert_job(&job3).await.unwrap();
        db.set_bookmark(id3, true).await.unwrap();

        let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();

        // Should be ordered by score DESC
        assert_eq!(bookmarked[0].title, "High Score");
        assert_eq!(bookmarked[1].title, "Mid Score");
        assert_eq!(bookmarked[2].title, "Low Score");
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs_with_zero_limit() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("bm_zero", "Test", 0.9);
        let id = db.upsert_job(&job).await.unwrap();
        db.set_bookmark(id, true).await.unwrap();

        let results = db.get_bookmarked_jobs(0).await.unwrap();
        assert_eq!(results.len(), 0);
    }
}
