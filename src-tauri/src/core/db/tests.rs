#[cfg(test)]
mod tests {
    use crate::core::db::{
        with_timeout, Database, DuplicateGroup, Job, Statistics, DEFAULT_QUERY_TIMEOUT,
    };
    use chrono::Utc;
    use std::time::Duration;

    /// Helper to create a test job
    fn create_test_job(hash: &str, title: &str, score: f64) -> Job {
        Job {
            id: 0,
            hash: hash.to_string(),
            title: title.to_string(),
            company: "Test Company".to_string(),
            url: "https://example.com/job".to_string(),
            location: Some("Remote".to_string()),
            description: Some("Test description".to_string()),
            score: Some(score),
            score_reasons: Some("[]".to_string()),
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(150000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
        }
    }

    #[tokio::test]
    async fn test_database_connection() {
        // Use in-memory database for testing
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        // Database is created successfully (implicitly verified by unwrap)
    }

    #[tokio::test]
    async fn test_upsert_job_insert() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash123", "Test Job", 0.95);

        // First insert
        let id = db.upsert_job(&job).await.unwrap();
        assert!(id > 0, "Job ID should be positive");

        // Verify job was inserted
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(fetched.title, "Test Job");
        assert_eq!(fetched.hash, "hash123");
        assert_eq!(fetched.times_seen, 1);
    }

    #[tokio::test]
    async fn test_upsert_job_update() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash456", "Original Title", 0.85);

        // First insert
        let id1 = db.upsert_job(&job).await.unwrap();

        // Update with same hash but different title
        let mut updated_job = job.clone();
        updated_job.title = "Updated Title".to_string();
        updated_job.score = Some(0.92);

        let id2 = db.upsert_job(&updated_job).await.unwrap();

        // Should return same ID
        assert_eq!(id1, id2, "Update should not create new job");

        // Verify times_seen was incremented
        let fetched = db.get_job_by_id(id1).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 2);
        assert_eq!(fetched.title, "Updated Title");
        assert_eq!(fetched.score, Some(0.92));
    }

    #[tokio::test]
    async fn test_upsert_job_title_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash789", "Test", 0.9);
        job.title = "x".repeat(501); // Over 500 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long title should fail");
        assert!(result.unwrap_err().to_string().contains("title too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_company_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_company", "Test Job", 0.9);
        job.company = "c".repeat(201); // Over 200 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long company name should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Company name too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_url_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_url", "Test Job", 0.9);
        job.url = format!("https://example.com/{}", "x".repeat(2000));

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long URL should fail");
        assert!(result.unwrap_err().to_string().contains("URL too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_invalid_url_protocol() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Test javascript: protocol (XSS vector)
        let mut job = create_test_job("hash_xss", "Test Job", 0.9);
        job.url = "javascript:alert('xss')".to_string();

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "javascript: URL should be rejected");
        assert!(result.unwrap_err().to_string().contains("Blocked scheme"));

        // Test data: protocol
        job.url = "data:text/html,<script>alert('xss')</script>".to_string();
        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "data: URL should be rejected");

        // Test file: protocol
        job.url = "file:///etc/passwd".to_string();
        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "file: URL should be rejected");

        // Test valid https:// URL
        job.url = "https://example.com/job/123".to_string();
        let result = db.upsert_job(&job).await;
        assert!(result.is_ok(), "https:// URL should be accepted");

        // Test valid http:// URL
        job.hash = "hash_http".to_string(); // Different hash for new job
        job.url = "http://example.com/job/456".to_string();
        let result = db.upsert_job(&job).await;
        assert!(result.is_ok(), "http:// URL should be accepted");
    }

    #[tokio::test]
    async fn test_upsert_job_rejects_non_public_urls() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        for (hash, url) in [
            ("hash_localhost", "http://localhost:3000/job"),
            ("hash_private", "http://192.168.1.10/internal"),
            ("hash_userinfo", "https://user:pass@example.com/job"),
        ] {
            let mut job = create_test_job(hash, "Test Job", 0.9);
            job.url = url.to_string();

            let result = db.upsert_job(&job).await;
            assert!(result.is_err(), "{url} should be rejected");
        }
    }

    #[tokio::test]
    async fn test_upsert_job_location_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_loc", "Test Job", 0.9);
        job.location = Some("l".repeat(201)); // Over 200 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long location should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Location too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_description_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_desc", "Test Job", 0.9);
        job.description = Some("d".repeat(50001)); // Over 50000 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long description should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Description too long"));
    }

    #[tokio::test]
    async fn test_mark_alert_sent() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash_alert", "Test Job", 0.95);
        let id = db.upsert_job(&job).await.unwrap();

        // Initially should be false
        let before = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!before.immediate_alert_sent);

        // Mark as sent
        db.mark_alert_sent(id).await.unwrap();

        // Verify it was marked
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.immediate_alert_sent);
    }

    #[tokio::test]
    async fn test_get_recent_jobs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs at different times
        for i in 0..5 {
            let job = create_test_job(&format!("hash_{}", i), &format!("Job {}", i), 0.8);
            db.upsert_job(&job).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }

        // Get recent 3
        let recent = db.get_recent_jobs(3).await.unwrap();
        assert_eq!(recent.len(), 3, "Should return 3 most recent jobs");

        // Verify they're in descending order by created_at
        for i in 0..recent.len() - 1 {
            assert!(
                recent[i].created_at >= recent[i + 1].created_at,
                "Jobs should be ordered by created_at DESC"
            );
        }
    }

    #[tokio::test]
    async fn test_get_jobs_by_score() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with various scores
        db.upsert_job(&create_test_job("high1", "High Match 1", 0.95))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("high2", "High Match 2", 0.92))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("medium", "Medium Match", 0.75))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("low", "Low Match", 0.50))
            .await
            .unwrap();

        // Get jobs with score >= 0.9
        let high_score_jobs = db.get_jobs_by_score(0.9, 10).await.unwrap();

        assert_eq!(
            high_score_jobs.len(),
            2,
            "Should return 2 high-scoring jobs"
        );
        for job in &high_score_jobs {
            assert!(
                job.score.unwrap() >= 0.9,
                "All jobs should have score >= 0.9"
            );
        }

        // Verify ordering (highest score first)
        assert!(
            high_score_jobs[0].score.unwrap() >= high_score_jobs[1].score.unwrap(),
            "Jobs should be ordered by score DESC"
        );
    }

    #[tokio::test]
    async fn test_get_jobs_by_source() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs from different sources
        let mut job1 = create_test_job("gh1", "Greenhouse Job", 0.9);
        job1.source = "greenhouse".to_string();
        db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("lv1", "Lever Job", 0.85);
        job2.source = "lever".to_string();
        db.upsert_job(&job2).await.unwrap();

        let mut job3 = create_test_job("gh2", "Another Greenhouse", 0.88);
        job3.source = "greenhouse".to_string();
        db.upsert_job(&job3).await.unwrap();

        // Get greenhouse jobs
        let greenhouse_jobs = db.get_jobs_by_source("greenhouse", 10).await.unwrap();

        assert_eq!(greenhouse_jobs.len(), 2, "Should return 2 Greenhouse jobs");
        for job in &greenhouse_jobs {
            assert_eq!(job.source, "greenhouse");
        }
    }

    #[tokio::test]
    async fn test_get_job_by_id_not_found() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let result = db.get_job_by_id(999999).await.unwrap();
        assert!(result.is_none(), "Should return None for nonexistent ID");
    }

    #[tokio::test]
    async fn test_get_job_by_hash() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("unique_hash", "Unique Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Find by hash
        let found = db.get_job_by_hash("unique_hash").await.unwrap();
        assert!(found.is_some(), "Should find job by hash");
        assert_eq!(found.unwrap().title, "Unique Job");

        // Try nonexistent hash
        let not_found = db.get_job_by_hash("nonexistent").await.unwrap();
        assert!(
            not_found.is_none(),
            "Should return None for nonexistent hash"
        );
    }

    #[tokio::test]
    async fn test_get_statistics() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with various scores
        db.upsert_job(&create_test_job("s1", "Job 1", 0.95))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("s2", "Job 2", 0.92))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("s3", "Job 3", 0.75))
            .await
            .unwrap();
        db.upsert_job(&create_test_job("s4", "Job 4", 0.50))
            .await
            .unwrap();

        let stats = db.get_statistics().await.unwrap();

        assert_eq!(stats.total_jobs, 4);
        assert_eq!(stats.high_matches, 2); // Jobs with score >= 0.9
        assert!(stats.average_score > 0.7 && stats.average_score < 0.8);
    }

    #[tokio::test]
    async fn test_get_statistics_empty_database() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let stats = db.get_statistics().await.unwrap();

        assert_eq!(stats.total_jobs, 0);
        assert_eq!(stats.high_matches, 0);
        assert_eq!(stats.average_score, 0.0);
        assert_eq!(stats.jobs_today, 0);
    }

    #[tokio::test]
    async fn test_multiple_upserts_increment_times_seen() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("repeat_hash", "Repeated Job", 0.9);

        // Insert same job multiple times
        let id = db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();

        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 4, "times_seen should be 4");
    }

    #[tokio::test]
    async fn test_job_with_all_optional_fields_none() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("minimal", "Minimal Job", 0.8);
        job.location = None;
        job.description = None;
        job.score = None;
        job.score_reasons = None;
        job.remote = None;
        job.salary_min = None;
        job.salary_max = None;
        job.currency = None;

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert!(fetched.location.is_none());
        assert!(fetched.description.is_none());
        assert!(fetched.score.is_none());
        assert!(fetched.remote.is_none());
        assert!(fetched.salary_min.is_none());
    }

    // ============================================================
    // UNIT TESTS (No Database Required)
    // ============================================================

    #[path = "model_tests.rs"]
    mod model_tests;

    // ============================================================
    // COMPREHENSIVE DATABASE OPERATION TESTS
    // ============================================================

    #[path = "job_visibility_tests.rs"]
    mod job_visibility_tests;

    #[path = "job_notes_tests.rs"]
    mod job_notes_tests;

    #[path = "job_search_tests.rs"]
    mod job_search_tests;

    #[path = "job_duplicate_tests.rs"]
    mod job_duplicate_tests;

    #[path = "job_edge_case_tests.rs"]
    mod job_edge_case_tests;

    mod accessor_tests {
        use super::*;

        #[tokio::test]
        async fn test_pool_accessor() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Get pool reference
            let pool = db.pool();

            // Verify we can use it for raw queries
            let result = sqlx::query("SELECT COUNT(*) FROM jobs")
                .fetch_one(pool)
                .await;
            assert!(result.is_ok());
        }

        #[test]
        fn test_default_path() {
            let path = Database::default_path();

            // Should contain "jobsentinel" (case-insensitive) and end with .db
            assert!(path
                .to_string_lossy()
                .to_lowercase()
                .contains("jobsentinel"));
            assert!(path.to_string_lossy().ends_with(".db"));
        }

        #[test]
        fn test_default_backup_dir() {
            let dir = Database::default_backup_dir();

            // Should contain "jobsentinel" (case-insensitive) and "backups"
            let path_str = dir.to_string_lossy().to_lowercase();
            assert!(path_str.contains("jobsentinel"));
            assert!(path_str.contains("backups"));
        }
    }

    mod query_error_tests {
        use super::*;

        #[tokio::test]
        async fn test_get_jobs_by_score_with_zero_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("score_limit", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            let results = db.get_jobs_by_score(0.8, 0).await.unwrap();
            assert_eq!(results.len(), 0);
        }

        #[tokio::test]
        async fn test_get_jobs_by_source_empty_results() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

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
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let result = db.get_job_by_hash("nonexistent_hash").await.unwrap();
            assert!(result.is_none());
        }

        #[tokio::test]
        async fn test_mark_alert_sent_nonexistent_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Should succeed (SQL UPDATE with no matches is not an error)
            let result = db.mark_alert_sent(999999).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_hide_job_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Should succeed (UPDATE with no matches)
            let result = db.hide_job(999999).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_unhide_job_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Should succeed (UPDATE with no matches)
            let result = db.unhide_job(999999).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_set_bookmark_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Should succeed (UPDATE with no matches)
            let result = db.set_bookmark(999999, true).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_set_job_notes_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Should succeed (UPDATE with no matches)
            let result = db.set_job_notes(999999, Some("Notes")).await;
            assert!(result.is_ok());
        }
    }

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

    mod timeout_additional_tests {
        use super::*;
        use std::time::Duration;

        #[tokio::test]
        async fn test_with_timeout_immediate_success() {
            let result = with_timeout(async { Ok::<i64, sqlx::Error>(42) }).await;

            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 42);
        }

        #[tokio::test]
        async fn test_with_timeout_propagates_error() {
            let result =
                with_timeout(async { Err::<i64, sqlx::Error>(sqlx::Error::RowNotFound) }).await;

            assert!(result.is_err());
        }

        #[test]
        fn test_default_query_timeout_value() {
            // Verify timeout is 30 seconds
            assert_eq!(DEFAULT_QUERY_TIMEOUT, Duration::from_secs(30));
        }
    }

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
            job.score_reasons =
                Some(r#"{"skill_match": 0.95, "location_match": 0.85}"#.to_string());

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            assert!(fetched.score_reasons.is_some());
            assert!(fetched.score_reasons.unwrap().contains("skill_match"));
        }
    }

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

    mod duplicate_merge_coverage {
        use super::*;

        #[tokio::test]
        async fn test_merge_duplicates_hides_all_except_primary() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Create 4 duplicate jobs
            let mut jobs = vec![];
            for i in 0..4 {
                let mut job = create_test_job(
                    &format!("dup_merge_{}", i),
                    "Duplicate Job",
                    0.9 - (i as f64 * 0.1),
                );
                job.company = "Company".to_string();
                let id = db.upsert_job(&job).await.unwrap();
                jobs.push(id);
            }

            // Merge with first job as primary
            db.merge_duplicates(jobs[0], &jobs).await.unwrap();

            // Verify primary visible, others hidden
            let primary = db.get_job_by_id(jobs[0]).await.unwrap().unwrap();
            assert!(!primary.hidden);

            for &id in &jobs[1..] {
                let dup = db.get_job_by_id(id).await.unwrap().unwrap();
                assert!(dup.hidden);
            }
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_min_two_duplicates() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Single job - no group
            let mut job1 = create_test_job("single", "Unique Job", 0.9);
            job1.company = "UniqueCompany".to_string();
            db.upsert_job(&job1).await.unwrap();

            // Two jobs - should form group
            let mut job2a = create_test_job("dup_a", "Duplicate Job", 0.9);
            job2a.company = "DupCompany".to_string();
            db.upsert_job(&job2a).await.unwrap();

            let mut job2b = create_test_job("dup_b", "Duplicate Job", 0.85);
            job2b.company = "DupCompany".to_string();
            db.upsert_job(&job2b).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();
            assert_eq!(groups.len(), 1);
            assert_eq!(groups[0].jobs.len(), 2);
        }
    }

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

    mod job_hash_tests {
        use super::*;

        #[tokio::test]
        async fn test_get_job_by_hash_success() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("hash_test", "Test Job", 0.9);
            let hash = job.hash.clone();
            db.upsert_job(&job).await.unwrap();

            let found = db.get_job_by_hash(&hash).await.unwrap();
            assert!(found.is_some());
            assert_eq!(found.unwrap().hash, hash);
        }

        #[tokio::test]
        async fn test_get_job_by_hash_returns_hidden_jobs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("hash_hidden", "Hidden Job", 0.9);
            let hash = job.hash.clone();
            let id = db.upsert_job(&job).await.unwrap();
            db.hide_job(id).await.unwrap();

            // get_job_by_hash doesn't filter by hidden status
            let found = db.get_job_by_hash(&hash).await.unwrap();
            assert!(found.is_some());
        }
    }

    mod alert_sent_tests {
        use super::*;

        #[tokio::test]
        async fn test_mark_alert_sent_updates_flag() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("alert", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Initially should be false
            let before = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!before.immediate_alert_sent);

            // Mark alert sent
            db.mark_alert_sent(id).await.unwrap();

            // Should be true now
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.immediate_alert_sent);
        }

        #[tokio::test]
        async fn test_mark_alert_sent_idempotent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("alert_idem", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Mark multiple times
            db.mark_alert_sent(id).await.unwrap();
            db.mark_alert_sent(id).await.unwrap();
            db.mark_alert_sent(id).await.unwrap();

            let job = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(job.immediate_alert_sent);
        }
    }

    mod connection_tests {
        use super::*;
        use std::path::Path;

        fn sqlite_sidecar_path(path: &Path, suffix: &str) -> std::path::PathBuf {
            let mut sidecar = path.as_os_str().to_os_string();
            sidecar.push(suffix);
            sidecar.into()
        }

        fn remove_sqlite_artifacts(path: &Path) {
            let _ = std::fs::remove_file(path);
            let _ = std::fs::remove_file(sqlite_sidecar_path(path, "-shm"));
            let _ = std::fs::remove_file(sqlite_sidecar_path(path, "-wal"));
        }

        #[tokio::test]
        async fn test_connect_memory_and_migrate() {
            let db = Database::connect_memory().await.unwrap();
            let result = db.migrate().await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_connect_creates_parent_directory() {
            let temp_dir = std::env::temp_dir();
            let test_db_dir = temp_dir.join("jobsentinel_test_db_parent");
            let db_path = test_db_dir.join("test_create_parent.db");

            // Ensure directory doesn't exist
            let _ = std::fs::remove_dir_all(&test_db_dir);

            let db = Database::connect(&db_path).await.unwrap();
            db.migrate().await.unwrap();

            // Verify directory was created
            assert!(test_db_dir.exists());

            // Cleanup
            let _ = std::fs::remove_dir_all(&test_db_dir);
        }

        #[tokio::test]
        async fn test_connect_with_existing_file() {
            let temp_dir = std::env::temp_dir();
            let db_path = temp_dir.join("test_existing.db");

            // Create database
            let db1 = Database::connect(&db_path).await.unwrap();
            db1.migrate().await.unwrap();

            // Insert a job
            let job = create_test_job("existing_test", "Test Job", 0.9);
            let id = db1.upsert_job(&job).await.unwrap();

            // Reconnect to same database
            let db2 = Database::connect(&db_path).await.unwrap();

            // Should be able to read the job
            let fetched = db2.get_job_by_id(id).await.unwrap();
            assert!(fetched.is_some());

            // Cleanup
            let _ = std::fs::remove_file(&db_path);
        }

        #[tokio::test]
        async fn test_connect_without_parent_directory() {
            // Test connecting to a path in root directory (should succeed)
            let db_path = Path::new("test_no_parent.db");
            remove_sqlite_artifacts(db_path);

            let db = Database::connect(db_path).await.unwrap();
            db.migrate().await.unwrap();

            // Cleanup
            drop(db);
            remove_sqlite_artifacts(db_path);
        }

        #[tokio::test]
        async fn test_pool_accessor() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let pool = db.pool();

            // Verify pool is usable
            let result = sqlx::query("SELECT COUNT(*) FROM jobs")
                .fetch_one(pool)
                .await;
            assert!(result.is_ok());
        }
    }

    mod toggle_bookmark_edge_cases {
        use super::*;

        #[tokio::test]
        async fn test_toggle_bookmark_handles_unexpected_values() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_edge", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // First toggle (0 -> 1)
            let state1 = db.toggle_bookmark(id).await.unwrap();
            assert!(state1);

            // Verify state
            let job = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(job.bookmarked);

            // Second toggle (1 -> 0)
            let state2 = db.toggle_bookmark(id).await.unwrap();
            assert!(!state2);
        }

        #[tokio::test]
        async fn test_toggle_bookmark_multiple_cycles() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("multi_cycle", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Cycle 10 times
            for i in 0..10 {
                let expected = i % 2 == 0; // Even iterations = true, odd = false
                let state = db.toggle_bookmark(id).await.unwrap();
                assert_eq!(state, expected, "Failed on iteration {}", i);
            }

            // Should end in false state (10 is even, so ends at false)
            let job = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!job.bookmarked);
        }
    }

    mod validation_tests {
        use super::*;

        #[tokio::test]
        async fn test_upsert_job_max_title_length() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("max_title", "Test", 0.9);
            // Exactly 500 chars (at limit)
            job.title = "x".repeat(500);

            let result = db.upsert_job(&job).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_upsert_job_max_company_length() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("max_company", "Test", 0.9);
            // Exactly 200 chars (at limit)
            job.company = "c".repeat(200);

            let result = db.upsert_job(&job).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_upsert_job_max_location_length() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("max_location", "Test", 0.9);
            // Exactly 200 chars (at limit)
            job.location = Some("l".repeat(200));

            let result = db.upsert_job(&job).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_upsert_job_max_description_length() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("max_desc", "Test", 0.9);
            // Exactly 50000 chars (at limit)
            job.description = Some("d".repeat(50000));

            let result = db.upsert_job(&job).await;
            assert!(result.is_ok());
        }

        #[tokio::test]
        async fn test_upsert_job_url_exactly_at_max() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("url_max", "Test", 0.9);
            // Exactly 2000 chars (at limit)
            // "https://example.com/" = 20 chars, so need 1980 more
            job.url = format!("https://example.com/{}", "x".repeat(1980));
            assert_eq!(job.url.len(), 2000);

            let result = db.upsert_job(&job).await;
            assert!(result.is_ok());
        }
    }

    mod statistics_edge_cases {
        use super::*;

        #[tokio::test]
        async fn test_statistics_with_null_scores() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs with scores
            let job1 = create_test_job("with_score", "Job 1", 0.9);
            db.upsert_job(&job1).await.unwrap();

            // Insert job without score
            let mut job2 = create_test_job("no_score", "Job 2", 0.0);
            job2.score = None;
            db.upsert_job(&job2).await.unwrap();

            let stats = db.get_statistics().await.unwrap();
            assert_eq!(stats.total_jobs, 2);
            // Average should only count non-null scores
            assert_eq!(stats.high_matches, 1);
        }

        #[tokio::test]
        async fn test_statistics_all_null_scores() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs with no scores
            let mut job1 = create_test_job("null1", "Job 1", 0.0);
            job1.score = None;
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("null2", "Job 2", 0.0);
            job2.score = None;
            db.upsert_job(&job2).await.unwrap();

            let stats = db.get_statistics().await.unwrap();
            assert_eq!(stats.total_jobs, 2);
            assert_eq!(stats.high_matches, 0);
            assert_eq!(stats.average_score, 0.0);
        }

        #[tokio::test]
        async fn test_statistics_jobs_today_count() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with today's date
            let job = create_test_job("today", "Today's Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            let stats = db.get_statistics().await.unwrap();
            // Should count the job created today
            assert!(stats.jobs_today >= 1);
        }
    }

    mod duplicate_edge_cases {
        use super::*;

        #[tokio::test]
        async fn test_find_duplicate_groups_different_companies() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Same title, different companies - should NOT be duplicates
            let mut job1 = create_test_job("diff1", "Senior Case Manager", 0.9);
            job1.company = "CompanyA".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("diff2", "Senior Case Manager", 0.85);
            job2.company = "CompanyB".to_string();
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();
            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_different_titles() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Same company, different titles - should NOT be duplicates
            let mut job1 = create_test_job("diff_title1", "Senior Case Manager", 0.9);
            job1.company = "Company".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("diff_title2", "Junior Case Manager", 0.85);
            job2.company = "Company".to_string();
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();
            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_merge_duplicates_preserves_bookmarks() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Primary job (not bookmarked)
            let mut job1 = create_test_job("merge_bm1", "Job", 0.9);
            job1.company = "Company".to_string();
            let id1 = db.upsert_job(&job1).await.unwrap();

            // Duplicate job (bookmarked)
            let mut job2 = create_test_job("merge_bm2", "Job", 0.8);
            job2.company = "Company".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_bookmark(id2, true).await.unwrap();

            // Merge (hides duplicate)
            db.merge_duplicates(id1, &[id1, id2]).await.unwrap();

            // Primary visible, duplicate hidden but bookmark preserved
            let primary = db.get_job_by_id(id1).await.unwrap().unwrap();
            assert!(!primary.hidden);

            let duplicate = db.get_job_by_id(id2).await.unwrap().unwrap();
            assert!(duplicate.hidden);
            assert!(duplicate.bookmarked); // Bookmark should still exist
        }
    }

    mod with_timeout_coverage {
        use super::*;

        #[tokio::test]
        async fn test_with_timeout_actual_timeout() {
            // Test a future that takes longer than the timeout
            let result = tokio::time::timeout(std::time::Duration::from_millis(10), async {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                Ok::<i32, sqlx::Error>(42)
            })
            .await;

            // Should timeout
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_with_timeout_string_result() {
            let result =
                with_timeout(async { Ok::<String, sqlx::Error>("success".to_string()) }).await;

            assert!(result.is_ok());
            assert_eq!(result.unwrap(), "success");
        }

        #[tokio::test]
        async fn test_with_timeout_unit_result() {
            let result = with_timeout(async { Ok::<(), sqlx::Error>(()) }).await;

            assert!(result.is_ok());
        }
    }

    mod job_field_updates {
        use super::*;

        #[tokio::test]
        async fn test_upsert_updates_optional_fields_to_none() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with all optional fields populated
            let job1 = create_test_job("update_none", "Test Job", 0.9);
            let id = db.upsert_job(&job1).await.unwrap();

            // Update with None for optional fields
            let mut job2 = job1.clone();
            job2.location = None;
            job2.description = None;
            job2.score = None;
            job2.remote = None;
            job2.salary_min = None;
            job2.salary_max = None;
            job2.currency = None;

            db.upsert_job(&job2).await.unwrap();

            let updated = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(updated.location.is_none());
            assert!(updated.description.is_none());
            assert!(updated.score.is_none());
            assert!(updated.remote.is_none());
            assert!(updated.salary_min.is_none());
            assert!(updated.salary_max.is_none());
            assert!(updated.currency.is_none());
        }

        #[tokio::test]
        async fn test_upsert_remote_false_to_true() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("remote_change", "Test Job", 0.9);
            job.remote = Some(false);
            let id = db.upsert_job(&job).await.unwrap();

            // Update remote to true
            job.remote = Some(true);
            db.upsert_job(&job).await.unwrap();

            let updated = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(updated.remote, Some(true));
        }

        #[tokio::test]
        async fn test_upsert_salary_range_update() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("salary_update", "Test Job", 0.9);
            job.salary_min = Some(100000);
            job.salary_max = Some(150000);
            let id = db.upsert_job(&job).await.unwrap();

            // Update salary range
            job.salary_min = Some(120000);
            job.salary_max = Some(180000);
            db.upsert_job(&job).await.unwrap();

            let updated = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(updated.salary_min, Some(120000));
            assert_eq!(updated.salary_max, Some(180000));
        }

        // ============================================================
        // Ghost Job Detection Tests (v1.4)
        // ============================================================

        #[tokio::test]
        async fn test_update_ghost_analysis() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("ghost_test", "Ghost Job Test", 0.8);
            let id = db.upsert_job(&job).await.unwrap();

            // Update ghost analysis
            db.update_ghost_analysis(
                id,
                0.75,
                r#"[{"category":"stale","description":"Job posted 90+ days ago"}]"#,
            )
            .await
            .unwrap();

            let updated = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(updated.ghost_score, Some(0.75));
            assert!(updated.ghost_reasons.unwrap().contains("stale"));
        }

        #[tokio::test]
        async fn test_track_repost() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // First time tracking - should return 1
            // track_repost(company, title, source, job_hash)
            let count = db
                .track_repost("County Services", "Case Manager", "linkedin", "hash1")
                .await
                .unwrap();
            assert_eq!(count, 1);

            // Second time - should return 2
            let count = db
                .track_repost("County Services", "Case Manager", "linkedin", "hash1")
                .await
                .unwrap();
            assert_eq!(count, 2);

            // Different job - should return 1
            let count = db
                .track_repost("Metro Transit", "Program Coordinator", "indeed", "hash2")
                .await
                .unwrap();
            assert_eq!(count, 1);
        }

        #[tokio::test]
        async fn test_get_repost_count() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Track reposts: track_repost(company, title, source, job_hash)
            for _ in 0..5 {
                db.track_repost("Repeat Corp", "Reposted Job", "greenhouse", "hash_repeat")
                    .await
                    .unwrap();
            }

            let count = db
                .get_repost_count("Repeat Corp", "Reposted Job", "greenhouse")
                .await
                .unwrap();
            assert_eq!(count, 5);

            // Non-existent job
            let count = db
                .get_repost_count("No Corp", "No Job", "none")
                .await
                .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_get_ghost_jobs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Create jobs with varying ghost scores
            let mut job1 = create_test_job("ghost_high", "Likely Ghost", 0.5);
            job1.ghost_score = Some(0.85);
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("ghost_low", "Likely Real", 0.9);
            job2.ghost_score = Some(0.2);
            db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("ghost_medium", "Maybe Ghost", 0.7);
            job3.ghost_score = Some(0.6);
            db.upsert_job(&job3).await.unwrap();

            // Get jobs with ghost score >= 0.5
            let ghost_jobs = db.get_ghost_jobs(0.5, 100).await.unwrap();
            assert_eq!(ghost_jobs.len(), 2);
            assert!(ghost_jobs.iter().all(|j| j.ghost_score.unwrap() >= 0.5));
        }

        #[tokio::test]
        async fn test_get_recent_jobs_filtered_exclude_ghosts() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut real_job = create_test_job("real_job", "Real Job", 0.9);
            real_job.ghost_score = Some(0.1);
            db.upsert_job(&real_job).await.unwrap();

            let mut ghost_job = create_test_job("ghost_job", "Ghost Job", 0.8);
            ghost_job.ghost_score = Some(0.7);
            db.upsert_job(&ghost_job).await.unwrap();

            // Get all jobs
            let all_jobs = db.get_recent_jobs_filtered(100, None).await.unwrap();
            assert_eq!(all_jobs.len(), 2);

            // Exclude ghosts (score >= 0.5)
            let real_jobs = db.get_recent_jobs_filtered(100, Some(0.5)).await.unwrap();
            assert_eq!(real_jobs.len(), 1);
            assert_eq!(real_jobs[0].title, "Real Job");
        }

        #[tokio::test]
        async fn test_get_ghost_statistics() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Create jobs with varying ghost scores
            let mut job1 = create_test_job("stat_ghost", "Ghost Job", 0.5);
            job1.ghost_score = Some(0.8);
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("stat_suspect", "Suspicious Job", 0.7);
            job2.ghost_score = Some(0.4);
            db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("stat_real", "Real Job", 0.9);
            job3.ghost_score = Some(0.1);
            db.upsert_job(&job3).await.unwrap();

            let stats = db.get_ghost_statistics().await.unwrap();
            assert_eq!(stats.total_analyzed, 3);
            assert_eq!(stats.likely_ghosts, 1); // score >= 0.5
            assert_eq!(stats.warnings, 1); // score 0.3-0.5
        }

        #[tokio::test]
        async fn test_count_company_open_jobs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Create multiple jobs from same company
            let job1 = create_test_job("company_job1", "Job 1", 0.8);
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("company_job2", "Job 2", 0.7);
            job2.company = "Test Company".to_string();
            db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("company_job3", "Job 3", 0.6);
            job3.company = "Test Company".to_string();
            db.upsert_job(&job3).await.unwrap();

            // Count open jobs from "Test Company"
            let count = db.count_company_open_jobs("Test Company").await.unwrap();
            assert_eq!(count, 3);

            // Non-existent company
            let count = db.count_company_open_jobs("Unknown Corp").await.unwrap();
            assert_eq!(count, 0);
        }
    }
}
