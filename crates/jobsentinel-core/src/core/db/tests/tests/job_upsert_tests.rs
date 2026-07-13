use super::*;

mod upsert_coverage_tests {
    use super::*;

    #[tokio::test]
    async fn test_upsert_updates_all_fields() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert initial job
        let job1 = create_test_job("update_test", "Original Title", 0.7);
        let id = db.upsert_job(&job1).await.unwrap();

        // Update with different values
        let mut job2 = job1.clone();
        job2.title = "Updated Title".to_string();
        job2.score = Some(0.9);
        job2.remote = Some(true);
        job2.salary_min = Some(100000);
        job2.salary_max = Some(150000);
        job2.currency = Some("USD".to_string());
        job2.location = Some("Remote".to_string());
        job2.description = Some("Updated description".to_string());

        db.upsert_job(&job2).await.unwrap();

        // Verify all fields updated
        let updated = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.score, Some(0.9));
        assert_eq!(updated.remote, Some(true));
        assert_eq!(updated.salary_min, Some(100000));
        assert_eq!(updated.salary_max, Some(150000));
        assert_eq!(updated.currency.as_deref(), Some("USD"));
        assert_eq!(updated.times_seen, 2);
    }

    #[tokio::test]
    async fn test_upsert_preserves_alert_and_digest_flags() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert job and mark alert sent
        let mut job = create_test_job("alert_test", "Test Job", 0.9);
        job.immediate_alert_sent = true;
        job.included_in_digest = true;
        let id = db.upsert_job(&job).await.unwrap();

        // Verify flags were set
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(fetched.immediate_alert_sent);
        assert!(fetched.included_in_digest);
    }

    #[tokio::test]
    async fn test_upsert_with_score_reasons() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("score_reasons", "Test Job", 0.9);
        job.score_reasons = Some(r#"{"skill_match": 0.95, "location_match": 0.85}"#.to_string());

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert!(fetched.score_reasons.is_some());
        assert!(fetched.score_reasons.unwrap().contains("skill_match"));
    }
}
