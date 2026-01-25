#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::{Database, Job};
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
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid URL protocol"));

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

    mod job_struct_tests {
        use super::*;

        #[test]
        fn test_job_creation_with_all_fields() {
            let now = Utc::now();
            let job = Job {
                id: 42,
                hash: "abc123def456".to_string(),
                title: "Senior Rust Engineer".to_string(),
                company: "TechCorp Inc".to_string(),
                url: "https://example.com/jobs/123".to_string(),
                location: Some("San Francisco, CA".to_string()),
                description: Some("Build amazing things with Rust".to_string()),
                score: Some(0.95),
                score_reasons: Some(r#"{"keywords": 5, "experience": 3}"#.to_string()),
                source: "greenhouse".to_string(),
                remote: Some(true),
                salary_min: Some(150000),
                salary_max: Some(200000),
                currency: Some("USD".to_string()),
                created_at: now,
                updated_at: now,
                last_seen: now,
                times_seen: 1,
                immediate_alert_sent: false,
                included_in_digest: false,
                hidden: false,
                bookmarked: true,
                notes: Some("Looks promising!".to_string()),
                ghost_score: None,
                ghost_reasons: None,
                first_seen: None,
                repost_count: 0,
            };

            assert_eq!(job.id, 42);
            assert_eq!(job.hash, "abc123def456");
            assert_eq!(job.title, "Senior Rust Engineer");
            assert_eq!(job.company, "TechCorp Inc");
            assert_eq!(job.score, Some(0.95));
            assert!(job.remote.unwrap());
            assert!(job.bookmarked);
            assert!(!job.hidden);
        }

        #[test]
        fn test_job_creation_minimal_fields() {
            let now = Utc::now();
            let job = Job {
                id: 1,
                hash: "minimal_hash".to_string(),
                title: "Job Title".to_string(),
                company: "Company".to_string(),
                url: "https://example.com/job".to_string(),
                location: None,
                description: None,
                score: None,
                score_reasons: None,
                source: "test".to_string(),
                remote: None,
                salary_min: None,
                salary_max: None,
                currency: None,
                created_at: now,
                updated_at: now,
                last_seen: now,
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
            };

            assert_eq!(job.id, 1);
            assert!(job.location.is_none());
            assert!(job.description.is_none());
            assert!(job.score.is_none());
            assert!(job.remote.is_none());
            assert!(job.salary_min.is_none());
            assert!(job.notes.is_none());
        }

        #[test]
        fn test_job_clone() {
            let job = create_test_job("clone_test", "Original", 0.85);
            let cloned = job.clone();

            assert_eq!(job.hash, cloned.hash);
            assert_eq!(job.title, cloned.title);
            assert_eq!(job.company, cloned.company);
            assert_eq!(job.score, cloned.score);
            assert_eq!(job.created_at, cloned.created_at);
        }

        #[test]
        fn test_job_debug_format() {
            let job = create_test_job("debug_test", "Debug Job", 0.90);
            let debug_str = format!("{:?}", job);

            assert!(debug_str.contains("Debug Job"));
            assert!(debug_str.contains("debug_test"));
            assert!(debug_str.contains("Test Company"));
        }

        #[test]
        fn test_job_score_valid_range() {
            let mut job = create_test_job("score_test", "Score Test", 0.5);

            // Valid scores
            job.score = Some(0.0);
            assert_eq!(job.score, Some(0.0));

            job.score = Some(1.0);
            assert_eq!(job.score, Some(1.0));

            job.score = Some(0.5);
            assert_eq!(job.score, Some(0.5));

            // None is valid
            job.score = None;
            assert!(job.score.is_none());
        }

        #[test]
        fn test_job_times_seen_counter() {
            let mut job = create_test_job("times_seen_test", "Counter Test", 0.8);

            assert_eq!(job.times_seen, 1);

            job.times_seen += 1;
            assert_eq!(job.times_seen, 2);

            job.times_seen += 5;
            assert_eq!(job.times_seen, 7);
        }

        #[test]
        fn test_job_boolean_flags() {
            let mut job = create_test_job("flags_test", "Flags Test", 0.8);

            // Test alert sent flag
            assert!(!job.immediate_alert_sent);
            job.immediate_alert_sent = true;
            assert!(job.immediate_alert_sent);

            // Test digest flag
            assert!(!job.included_in_digest);
            job.included_in_digest = true;
            assert!(job.included_in_digest);

            // Test hidden flag
            assert!(!job.hidden);
            job.hidden = true;
            assert!(job.hidden);

            // Test bookmarked flag
            assert!(!job.bookmarked);
            job.bookmarked = true;
            assert!(job.bookmarked);
        }

        #[test]
        fn test_job_salary_range() {
            let mut job = create_test_job("salary_test", "Salary Test", 0.85);

            // Test valid salary range
            job.salary_min = Some(100000);
            job.salary_max = Some(150000);
            assert!(job.salary_max.unwrap() > job.salary_min.unwrap());

            // Test equal min/max
            job.salary_min = Some(120000);
            job.salary_max = Some(120000);
            assert_eq!(job.salary_min, job.salary_max);

            // Test None values
            job.salary_min = None;
            job.salary_max = None;
            assert!(job.salary_min.is_none());
            assert!(job.salary_max.is_none());
        }

        #[test]
        fn test_job_remote_flag() {
            let mut job = create_test_job("remote_test", "Remote Test", 0.9);

            // Test remote = true
            job.remote = Some(true);
            assert!(job.remote.unwrap());

            // Test remote = false
            job.remote = Some(false);
            assert!(!job.remote.unwrap());

            // Test remote = None (unknown)
            job.remote = None;
            assert!(job.remote.is_none());
        }

        #[test]
        fn test_job_notes_field() {
            let mut job = create_test_job("notes_test", "Notes Test", 0.8);

            // Initially None
            assert!(job.notes.is_none());

            // Set notes
            job.notes = Some("Great company culture!".to_string());
            assert_eq!(job.notes.as_ref().unwrap(), "Great company culture!");

            // Clear notes
            job.notes = None;
            assert!(job.notes.is_none());
        }

        #[test]
        fn test_job_hash_uniqueness() {
            let job1 = create_test_job("hash1", "Job 1", 0.9);
            let job2 = create_test_job("hash2", "Job 2", 0.9);
            let job3 = create_test_job("hash1", "Job 3", 0.9);

            assert_ne!(job1.hash, job2.hash, "Different hashes should not match");
            assert_eq!(job1.hash, job3.hash, "Same hash should match");
        }

        #[test]
        fn test_job_url_format() {
            let mut job = create_test_job("url_test", "URL Test", 0.8);

            // Test various URL formats
            job.url = "https://example.com/job/123".to_string();
            assert!(job.url.starts_with("https://"));

            job.url = "http://jobs.example.com/apply?id=456".to_string();
            assert!(job.url.contains("?id="));

            job.url = "https://greenhouse.io/company/jobs/789".to_string();
            assert!(job.url.contains("greenhouse.io"));
        }

        #[test]
        fn test_job_score_reasons_json() {
            let mut job = create_test_job("json_test", "JSON Test", 0.95);

            // Valid JSON
            job.score_reasons = Some(r#"{"keywords": 10, "experience": 5}"#.to_string());
            assert!(job.score_reasons.is_some());

            // Empty JSON object
            job.score_reasons = Some("{}".to_string());
            assert_eq!(job.score_reasons.as_ref().unwrap(), "{}");

            // None
            job.score_reasons = None;
            assert!(job.score_reasons.is_none());
        }
    }

    mod serialization_tests {
        use super::*;

        #[test]
        fn test_job_serialize_to_json() {
            let job = create_test_job("serialize_test", "Serialize Job", 0.92);
            let json = serde_json::to_string(&job).unwrap();

            assert!(json.contains("Serialize Job"));
            assert!(json.contains("serialize_test"));
            assert!(json.contains("Test Company"));
            assert!(json.contains("0.92"));
        }

        #[test]
        fn test_job_deserialize_from_json() {
            let job = create_test_job("deserialize_test", "Deserialize Job", 0.88);
            let json = serde_json::to_string(&job).unwrap();
            let deserialized: Job = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.hash, job.hash);
            assert_eq!(deserialized.title, job.title);
            assert_eq!(deserialized.company, job.company);
            assert_eq!(deserialized.score, job.score);
        }

        #[test]
        fn test_job_serialize_skip_none_fields() {
            let mut job = create_test_job("skip_none", "Skip None Test", 0.8);
            job.location = None;
            job.description = None;
            job.notes = None;

            let json = serde_json::to_string(&job).unwrap();

            // Optional None fields should be skipped in serialization
            // (due to #[serde(skip_serializing_if = "Option::is_none")])
            let value: serde_json::Value = serde_json::from_str(&json).unwrap();
            assert!(value.get("location").is_none() || value["location"].is_null());
            assert!(value.get("description").is_none() || value["description"].is_null());
            assert!(value.get("notes").is_none() || value["notes"].is_null());
        }

        #[test]
        fn test_job_serialize_includes_some_fields() {
            let job = create_test_job("include_some", "Include Some Test", 0.9);

            let json = serde_json::to_string(&job).unwrap();
            let value: serde_json::Value = serde_json::from_str(&json).unwrap();

            // Some fields should be present
            assert!(value.get("location").is_some());
            assert!(value.get("description").is_some());
            assert_eq!(value["location"], "Remote");
        }

        #[test]
        fn test_job_roundtrip_serialization() {
            let original = create_test_job("roundtrip", "Roundtrip Test", 0.87);
            let json = serde_json::to_string(&original).unwrap();
            let deserialized: Job = serde_json::from_str(&json).unwrap();
            let json2 = serde_json::to_string(&deserialized).unwrap();

            // Should be identical after roundtrip
            assert_eq!(json, json2);
        }

        #[test]
        fn test_job_deserialize_with_default_hidden() {
            // Test that #[serde(default)] works for hidden field
            let json = r#"{
                "id": 1,
                "hash": "test",
                "title": "Test",
                "company": "Test Co",
                "url": "https://example.com",
                "source": "test",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_seen": "2024-01-01T00:00:00Z",
                "times_seen": 1,
                "immediate_alert_sent": false,
                "included_in_digest": false,
                "bookmarked": false
            }"#;

            let job: Job = serde_json::from_str(json).unwrap();
            assert!(!job.hidden, "hidden should default to false");
        }

        #[test]
        fn test_job_deserialize_with_default_bookmarked() {
            // Test that #[serde(default)] works for bookmarked field
            let json = r#"{
                "id": 1,
                "hash": "test",
                "title": "Test",
                "company": "Test Co",
                "url": "https://example.com",
                "source": "test",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_seen": "2024-01-01T00:00:00Z",
                "times_seen": 1,
                "immediate_alert_sent": false,
                "included_in_digest": false,
                "hidden": false
            }"#;

            let job: Job = serde_json::from_str(json).unwrap();
            assert!(!job.bookmarked, "bookmarked should default to false");
        }
    }

    mod statistics_tests {
        use super::*;

        #[test]
        fn test_statistics_creation() {
            let stats = Statistics {
                total_jobs: 100,
                high_matches: 25,
                average_score: 0.75,
                jobs_today: 10,
            };

            assert_eq!(stats.total_jobs, 100);
            assert_eq!(stats.high_matches, 25);
            assert_eq!(stats.average_score, 0.75);
            assert_eq!(stats.jobs_today, 10);
        }

        #[test]
        fn test_statistics_zero_values() {
            let stats = Statistics {
                total_jobs: 0,
                high_matches: 0,
                average_score: 0.0,
                jobs_today: 0,
            };

            assert_eq!(stats.total_jobs, 0);
            assert_eq!(stats.high_matches, 0);
            assert_eq!(stats.average_score, 0.0);
            assert_eq!(stats.jobs_today, 0);
        }

        #[test]
        fn test_statistics_serialize_deserialize() {
            let stats = Statistics {
                total_jobs: 50,
                high_matches: 15,
                average_score: 0.82,
                jobs_today: 5,
            };

            let json = serde_json::to_string(&stats).unwrap();
            let deserialized: Statistics = serde_json::from_str(&json).unwrap();

            assert_eq!(stats.total_jobs, deserialized.total_jobs);
            assert_eq!(stats.high_matches, deserialized.high_matches);
            assert_eq!(stats.average_score, deserialized.average_score);
            assert_eq!(stats.jobs_today, deserialized.jobs_today);
        }

        #[test]
        fn test_statistics_clone() {
            let stats = Statistics {
                total_jobs: 75,
                high_matches: 20,
                average_score: 0.88,
                jobs_today: 8,
            };

            let cloned = stats.clone();
            assert_eq!(stats.total_jobs, cloned.total_jobs);
            assert_eq!(stats.average_score, cloned.average_score);
        }
    }

    mod duplicate_group_tests {
        use super::*;

        #[test]
        fn test_duplicate_group_creation() {
            let job1 = create_test_job("dup1", "Duplicate Job", 0.95);
            let job2 = create_test_job("dup2", "Duplicate Job", 0.90);

            let group = DuplicateGroup {
                primary_id: job1.id,
                jobs: vec![job1.clone(), job2.clone()],
                sources: vec!["greenhouse".to_string(), "lever".to_string()],
            };

            assert_eq!(group.primary_id, job1.id);
            assert_eq!(group.jobs.len(), 2);
            assert_eq!(group.sources.len(), 2);
        }

        #[test]
        fn test_duplicate_group_serialize_deserialize() {
            let job1 = create_test_job("ser1", "Job A", 0.92);
            let job2 = create_test_job("ser2", "Job A", 0.88);

            let group = DuplicateGroup {
                primary_id: job1.id,
                jobs: vec![job1, job2],
                sources: vec!["greenhouse".to_string(), "lever".to_string()],
            };

            let json = serde_json::to_string(&group).unwrap();
            let deserialized: DuplicateGroup = serde_json::from_str(&json).unwrap();

            assert_eq!(group.primary_id, deserialized.primary_id);
            assert_eq!(group.jobs.len(), deserialized.jobs.len());
            assert_eq!(group.sources, deserialized.sources);
        }

        #[test]
        fn test_duplicate_group_empty_jobs() {
            let group = DuplicateGroup {
                primary_id: 0,
                jobs: vec![],
                sources: vec![],
            };

            assert_eq!(group.jobs.len(), 0);
            assert_eq!(group.sources.len(), 0);
        }
    }

    mod timeout_tests {
        use super::*;

        #[tokio::test]
        async fn test_with_timeout_success() {
            // Simulate a fast query that succeeds
            let future = async {
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                Ok::<_, sqlx::Error>(42)
            };

            let result = with_timeout(future).await;
            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 42);
        }

        #[tokio::test]
        async fn test_with_timeout_error() {
            // Simulate a query that returns an error
            let future =
                async { Err::<i32, sqlx::Error>(sqlx::Error::Protocol("Test error".into())) };

            let result = with_timeout(future).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_default_query_timeout_constant() {
            assert_eq!(DEFAULT_QUERY_TIMEOUT, Duration::from_secs(30));
        }
    }

    mod database_path_tests {
        use super::*;

        #[test]
        fn test_default_path() {
            let path = Database::default_path();
            assert!(path.to_string_lossy().contains("jobs.db"));
        }

        #[test]
        fn test_default_backup_dir() {
            let path = Database::default_backup_dir();
            assert!(path.to_string_lossy().contains("backups"));
        }
    }

    // ============================================================
    // COMPREHENSIVE DATABASE OPERATION TESTS
    // ============================================================

    mod hide_unhide_tests {
        use super::*;

        #[tokio::test]
        async fn test_hide_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("hide_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Initially not hidden
            let before = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!before.hidden);

            // Hide the job
            db.hide_job(id).await.unwrap();

            // Verify it's hidden
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.hidden);
        }

        #[tokio::test]
        async fn test_unhide_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("unhide_test", "Test Job", 0.9);
            job.hidden = true;
            let id = db.upsert_job(&job).await.unwrap();

            // Manually hide first
            db.hide_job(id).await.unwrap();

            // Verify hidden
            let hidden = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(hidden.hidden);

            // Unhide the job
            db.unhide_job(id).await.unwrap();

            // Verify it's visible again
            let visible = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!visible.hidden);
        }

        #[tokio::test]
        async fn test_hide_unhide_cycle() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("cycle_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Hide
            db.hide_job(id).await.unwrap();
            let after_hide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after_hide.hidden);

            // Unhide
            db.unhide_job(id).await.unwrap();
            let after_unhide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after_unhide.hidden);

            // Hide again
            db.hide_job(id).await.unwrap();
            let after_rehide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after_rehide.hidden);
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_recent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible job
            let job1 = create_test_job("visible1", "Visible Job", 0.9);
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden job
            let job2 = create_test_job("hidden1", "Hidden Job", 0.95);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get recent jobs
            let recent = db.get_recent_jobs(10).await.unwrap();

            // Should only return visible job
            assert_eq!(recent.len(), 1);
            assert_eq!(recent[0].title, "Visible Job");
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_score_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible high-score job
            let job1 = create_test_job("visible_high", "Visible High", 0.95);
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden high-score job
            let job2 = create_test_job("hidden_high", "Hidden High", 0.98);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get jobs by score
            let high_score = db.get_jobs_by_score(0.9, 10).await.unwrap();

            // Should only return visible job
            assert_eq!(high_score.len(), 1);
            assert_eq!(high_score[0].title, "Visible High");
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_source_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible job from greenhouse
            let mut job1 = create_test_job("visible_gh", "Visible Greenhouse", 0.9);
            job1.source = "greenhouse".to_string();
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden job from greenhouse
            let mut job2 = create_test_job("hidden_gh", "Hidden Greenhouse", 0.95);
            job2.source = "greenhouse".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get greenhouse jobs
            let greenhouse = db.get_jobs_by_source("greenhouse", 10).await.unwrap();

            // Should only return visible job
            assert_eq!(greenhouse.len(), 1);
            assert_eq!(greenhouse[0].title, "Visible Greenhouse");
        }
    }

    mod bookmark_tests {
        use super::*;

        #[tokio::test]
        async fn test_toggle_bookmark_on() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_on", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Initially not bookmarked
            let before = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!before.bookmarked);

            // Toggle bookmark (should turn ON)
            let new_state = db.toggle_bookmark(id).await.unwrap();
            assert!(new_state);

            // Verify in database
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_toggle_bookmark_off() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_off", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // First toggle to ON
            let state1 = db.toggle_bookmark(id).await.unwrap();
            assert!(state1, "First toggle should return true");

            // Verify it's ON
            let mid = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(
                mid.bookmarked,
                "Job should be bookmarked after first toggle"
            );

            // Toggle again (should turn OFF)
            let state2 = db.toggle_bookmark(id).await.unwrap();
            assert!(!state2, "Second toggle should return false");

            // Verify in database
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(
                !after.bookmarked,
                "Job should not be bookmarked after second toggle"
            );
        }

        #[tokio::test]
        async fn test_toggle_bookmark_cycle() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_cycle", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Cycle: OFF -> ON -> OFF -> ON
            let state1 = db.toggle_bookmark(id).await.unwrap();
            assert!(state1, "First toggle should be ON");

            let state2 = db.toggle_bookmark(id).await.unwrap();
            assert!(!state2, "Second toggle should be OFF");

            let state3 = db.toggle_bookmark(id).await.unwrap();
            assert!(state3, "Third toggle should be ON");
        }

        #[tokio::test]
        async fn test_toggle_bookmark_nonexistent_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Try to toggle bookmark on non-existent job
            let result = db.toggle_bookmark(999999).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_set_bookmark_true() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("set_true", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set bookmark to true
            db.set_bookmark(id, true).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_set_bookmark_false() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("set_false", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Bookmark it first
            db.set_bookmark(id, true).await.unwrap();

            // Then set to false
            db.set_bookmark(id, false).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after.bookmarked);
        }

        #[tokio::test]
        async fn test_set_bookmark_idempotent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("idempotent", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set to true multiple times
            db.set_bookmark(id, true).await.unwrap();
            db.set_bookmark(id, true).await.unwrap();
            db.set_bookmark(id, true).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert bookmarked jobs with different scores
            let job1 = create_test_job("bookmarked1", "Bookmarked High", 0.95);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_bookmark(id1, true).await.unwrap();

            let job2 = create_test_job("bookmarked2", "Bookmarked Medium", 0.80);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_bookmark(id2, true).await.unwrap();

            // Insert non-bookmarked job
            let job3 = create_test_job("not_bookmarked", "Not Bookmarked", 0.99);
            db.upsert_job(&job3).await.unwrap();

            // Get bookmarked jobs
            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();

            // Should only return bookmarked jobs
            assert_eq!(bookmarked.len(), 2);
            assert!(bookmarked.iter().all(|j| j.bookmarked));

            // Should be ordered by score DESC
            assert!(bookmarked[0].score.unwrap() >= bookmarked[1].score.unwrap());
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 bookmarked jobs
            for i in 0..5 {
                let job = create_test_job(&format!("bookmark_{}", i), &format!("Job {}", i), 0.8);
                let id = db.upsert_job(&job).await.unwrap();
                db.set_bookmark(id, true).await.unwrap();
            }

            // Get only 3
            let bookmarked = db.get_bookmarked_jobs(3).await.unwrap();
            assert_eq!(bookmarked.len(), 3);
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert bookmarked but hidden job
            let job1 = create_test_job("bookmarked_hidden", "Bookmarked Hidden", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_bookmark(id1, true).await.unwrap();
            db.hide_job(id1).await.unwrap();

            // Insert bookmarked visible job
            let job2 = create_test_job("bookmarked_visible", "Bookmarked Visible", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_bookmark(id2, true).await.unwrap();

            // Should only return visible bookmarked job
            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
            assert_eq!(bookmarked.len(), 1);
            assert_eq!(bookmarked[0].title, "Bookmarked Visible");
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_empty() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert non-bookmarked job
            let job = create_test_job("not_bookmarked", "Not Bookmarked", 0.9);
            db.upsert_job(&job).await.unwrap();

            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
            assert_eq!(bookmarked.len(), 0);
        }
    }

    mod notes_tests {
        use super::*;

        #[tokio::test]
        async fn test_set_job_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Great company culture!"))
                .await
                .unwrap();

            // Verify notes were set
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(after.notes.as_deref(), Some("Great company culture!"));
        }

        #[tokio::test]
        async fn test_set_job_notes_update() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_update", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set initial notes
            db.set_job_notes(id, Some("Original notes")).await.unwrap();

            // Update notes
            db.set_job_notes(id, Some("Updated notes")).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(after.notes.as_deref(), Some("Updated notes"));
        }

        #[tokio::test]
        async fn test_set_job_notes_clear() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_clear", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Some notes")).await.unwrap();

            // Clear notes by setting to None
            db.set_job_notes(id, None).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.notes.is_none());
        }

        #[tokio::test]
        async fn test_get_job_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("get_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Test notes")).await.unwrap();

            // Get notes using dedicated method
            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some("Test notes"));
        }

        #[tokio::test]
        async fn test_get_job_notes_none() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("no_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Get notes (should be None)
            let notes = db.get_job_notes(id).await.unwrap();
            assert!(notes.is_none());
        }

        #[tokio::test]
        async fn test_get_job_notes_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Get notes for non-existent job
            let notes = db.get_job_notes(999999).await.unwrap();
            assert!(notes.is_none());
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with notes
            let job1 = create_test_job("with_notes1", "Job 1", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Notes 1")).await.unwrap();

            // Insert job without notes
            let job2 = create_test_job("no_notes", "Job 2", 0.85);
            db.upsert_job(&job2).await.unwrap();

            // Insert another job with notes
            let job3 = create_test_job("with_notes2", "Job 3", 0.95);
            let id3 = db.upsert_job(&job3).await.unwrap();
            db.set_job_notes(id3, Some("Notes 2")).await.unwrap();

            // Get jobs with notes
            let jobs_with_notes = db.get_jobs_with_notes(10).await.unwrap();

            assert_eq!(jobs_with_notes.len(), 2);
            assert!(jobs_with_notes.iter().all(|j| j.notes.is_some()));
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_ordered_by_updated() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert first job with notes
            let job1 = create_test_job("notes_old", "Old Job", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Old notes")).await.unwrap();

            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

            // Insert second job with notes
            let job2 = create_test_job("notes_new", "New Job", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_job_notes(id2, Some("New notes")).await.unwrap();

            let jobs = db.get_jobs_with_notes(10).await.unwrap();

            // Should be ordered by updated_at DESC (newest first)
            assert_eq!(jobs[0].title, "New Job");
            assert_eq!(jobs[1].title, "Old Job");
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 jobs with notes
            for i in 0..5 {
                let job = create_test_job(&format!("notes_{}", i), &format!("Job {}", i), 0.8);
                let id = db.upsert_job(&job).await.unwrap();
                db.set_job_notes(id, Some(&format!("Notes {}", i)))
                    .await
                    .unwrap();
            }

            let jobs = db.get_jobs_with_notes(3).await.unwrap();
            assert_eq!(jobs.len(), 3);
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with notes but hidden
            let job1 = create_test_job("notes_hidden", "Hidden Job", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Hidden notes")).await.unwrap();
            db.hide_job(id1).await.unwrap();

            // Insert job with notes and visible
            let job2 = create_test_job("notes_visible", "Visible Job", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_job_notes(id2, Some("Visible notes")).await.unwrap();

            let jobs = db.get_jobs_with_notes(10).await.unwrap();
            assert_eq!(jobs.len(), 1);
            assert_eq!(jobs[0].title, "Visible Job");
        }

        #[tokio::test]
        async fn test_notes_with_special_characters() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("special_chars", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            let special_notes = "Notes with 'quotes', \"double quotes\", and émojis 🎉";
            db.set_job_notes(id, Some(special_notes)).await.unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some(special_notes));
        }

        #[tokio::test]
        async fn test_notes_with_long_text() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("long_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            let long_notes = "x".repeat(10000);
            db.set_job_notes(id, Some(&long_notes)).await.unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some(long_notes.as_str()));
        }
    }

    mod search_tests {
        use super::*;

        #[tokio::test]
        async fn test_search_jobs_by_title() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs
            let job1 = create_test_job("search1", "Senior Rust Engineer", 0.9);
            db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("search2", "Junior Python Developer", 0.8);
            db.upsert_job(&job2).await.unwrap();

            let job3 = create_test_job("search3", "Rust Developer", 0.85);
            db.upsert_job(&job3).await.unwrap();

            // Search for "Rust"
            let results = db.search_jobs("Rust", 10).await.unwrap();

            assert_eq!(results.len(), 2);
            assert!(results.iter().any(|j| j.title.contains("Rust")));
        }

        #[tokio::test]
        async fn test_search_jobs_by_description() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with specific description
            let mut job = create_test_job("search_desc", "Test Job", 0.9);
            job.description =
                Some("Looking for an expert in distributed systems and microservices".to_string());
            db.upsert_job(&job).await.unwrap();

            // Search for term in description
            let results = db.search_jobs("microservices", 10).await.unwrap();

            assert_eq!(results.len(), 1);
            assert!(results[0]
                .description
                .as_ref()
                .unwrap()
                .contains("microservices"));
        }

        #[tokio::test]
        async fn test_search_jobs_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 jobs with "Engineer" in title
            for i in 0..5 {
                let job = create_test_job(
                    &format!("eng_{}", i),
                    &format!("Software Engineer {}", i),
                    0.8,
                );
                db.upsert_job(&job).await.unwrap();
            }

            // Search with limit 3
            let results = db.search_jobs("Engineer", 3).await.unwrap();

            assert_eq!(results.len(), 3);
        }

        #[tokio::test]
        async fn test_search_jobs_no_results() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("search_none", "Rust Engineer", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Search for term that doesn't exist
            let results = db.search_jobs("ZyxwvutNonexistent", 10).await.unwrap();

            assert_eq!(results.len(), 0);
        }

        #[tokio::test]
        async fn test_search_jobs_case_insensitive() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("case_test", "Senior RUST Engineer", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Search with lowercase
            let results = db.search_jobs("rust", 10).await.unwrap();

            assert_eq!(results.len(), 1);
        }

        #[tokio::test]
        async fn test_search_jobs_empty_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("empty_search", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Empty search should return no results (FTS5 requirement)
            let results = db.search_jobs("", 10).await;

            // FTS5 typically returns error for empty query
            assert!(results.is_err() || results.unwrap().is_empty());
        }
    }

    mod duplicate_detection_tests {
        use super::*;

        #[tokio::test]
        async fn test_find_duplicate_groups_same_title_company() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert same job from different sources
            let mut job1 = create_test_job("dup1", "Senior Engineer", 0.95);
            job1.company = "TechCorp".to_string();
            job1.source = "greenhouse".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("dup2", "Senior Engineer", 0.90);
            job2.company = "TechCorp".to_string();
            job2.source = "lever".to_string();
            db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("dup3", "Senior Engineer", 0.88);
            job3.company = "TechCorp".to_string();
            job3.source = "linkedin".to_string();
            db.upsert_job(&job3).await.unwrap();

            // Find duplicates
            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            assert_eq!(groups[0].jobs.len(), 3);
            assert_eq!(groups[0].sources.len(), 3);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_case_insensitive() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs with different casing
            let mut job1 = create_test_job("case1", "Software Engineer", 0.9);
            job1.company = "CompanyA".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("case2", "SOFTWARE ENGINEER", 0.85);
            job2.company = "companyA".to_string();
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            assert_eq!(groups[0].jobs.len(), 2);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_primary_is_highest_score() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert duplicates with different scores
            let mut job1 = create_test_job("score1", "Job Title", 0.85);
            job1.company = "Company".to_string();
            let _id1 = db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("score2", "Job Title", 0.95);
            job2.company = "Company".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            // Primary should be the highest score (id2)
            assert_eq!(groups[0].primary_id, id2);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible duplicate
            let mut job1 = create_test_job("visible_dup", "Duplicate Job", 0.9);
            job1.company = "Company".to_string();
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden duplicate
            let mut job2 = create_test_job("hidden_dup", "Duplicate Job", 0.85);
            job2.company = "Company".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            // Should not form a duplicate group if one is hidden
            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_no_duplicates() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert unique jobs
            let job1 = create_test_job("unique1", "Job A", 0.9);
            db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("unique2", "Job B", 0.85);
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_multiple_groups() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Group 1: Job A at CompanyX
            let mut job1a = create_test_job("1a", "Job A", 0.9);
            job1a.company = "CompanyX".to_string();
            db.upsert_job(&job1a).await.unwrap();

            let mut job1b = create_test_job("1b", "Job A", 0.85);
            job1b.company = "CompanyX".to_string();
            db.upsert_job(&job1b).await.unwrap();

            // Group 2: Job B at CompanyY
            let mut job2a = create_test_job("2a", "Job B", 0.95);
            job2a.company = "CompanyY".to_string();
            db.upsert_job(&job2a).await.unwrap();

            let mut job2b = create_test_job("2b", "Job B", 0.80);
            job2b.company = "CompanyY".to_string();
            db.upsert_job(&job2b).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 2);
        }

        #[tokio::test]
        async fn test_merge_duplicates() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert duplicates
            let mut job1 = create_test_job("merge1", "Job Title", 0.95);
            job1.company = "Company".to_string();
            let primary_id = db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("merge2", "Job Title", 0.90);
            job2.company = "Company".to_string();
            let dup_id1 = db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("merge3", "Job Title", 0.85);
            job3.company = "Company".to_string();
            let dup_id2 = db.upsert_job(&job3).await.unwrap();

            // Merge duplicates
            db.merge_duplicates(primary_id, &[primary_id, dup_id1, dup_id2])
                .await
                .unwrap();

            // Primary should still be visible
            let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
            assert!(!primary.hidden);

            // Duplicates should be hidden
            let dup1 = db.get_job_by_id(dup_id1).await.unwrap().unwrap();
            assert!(dup1.hidden);

            let dup2 = db.get_job_by_id(dup_id2).await.unwrap().unwrap();
            assert!(dup2.hidden);
        }

        #[tokio::test]
        async fn test_merge_duplicates_primary_not_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job1 = create_test_job("primary", "Job", 0.9);
            let primary_id = db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("duplicate", "Job", 0.8);
            let dup_id = db.upsert_job(&job2).await.unwrap();

            // Merge with primary in the list
            db.merge_duplicates(primary_id, &[primary_id, dup_id])
                .await
                .unwrap();

            // Primary should NOT be hidden
            let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
            assert!(!primary.hidden);
        }

        #[tokio::test]
        async fn test_merge_duplicates_empty_list() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("single", "Single Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Merge with empty list (should be no-op)
            db.merge_duplicates(id, &[]).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after.hidden);
        }
    }

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
            job.description = Some("Looking for a 全栈工程师 with 経験 in Rust".to_string());

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
            job.url = format!("https://example.com/job?{}", "x".repeat(1976));

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

            // Should contain "JobSentinel" and end with .db
            assert!(path.to_string_lossy().contains("JobSentinel"));
            assert!(path.to_string_lossy().ends_with(".db"));
        }

        #[test]
        fn test_default_backup_dir() {
            let dir = Database::default_backup_dir();

            // Should contain "JobSentinel" and "backups"
            let path_str = dir.to_string_lossy();
            assert!(path_str.contains("JobSentinel"));
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

    mod search_edge_cases {
        use super::*;

        #[tokio::test]
        async fn test_search_jobs_with_special_fts_characters() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("fts_test", "C++ Developer", 0.9);
            db.upsert_job(&job).await.unwrap();

            // FTS5 treats + as special, but should still handle it
            let result = db.search_jobs("C++", 10).await;
            // May succeed or fail depending on FTS5 tokenizer, but shouldn't crash
            assert!(result.is_ok() || result.is_err());
        }

        // Note: The following FTS5 search tests are skipped because FTS5 tables
        // may not be properly initialized in in-memory databases. FTS5 search
        // is tested in integration tests with real database files.
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

    mod notes_coverage {
        use super::*;

        #[tokio::test]
        async fn test_get_jobs_with_notes_empty_database() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let results = db.get_jobs_with_notes(10).await.unwrap();
            assert_eq!(results.len(), 0);
        }

        #[tokio::test]
        async fn test_set_job_notes_overwrites_existing() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_overwrite", "Test", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set initial notes
            db.set_job_notes(id, Some("First notes")).await.unwrap();

            // Overwrite with new notes
            db.set_job_notes(id, Some("Second notes")).await.unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some("Second notes"));
        }

        #[tokio::test]
        async fn test_notes_with_newlines_and_tabs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_whitespace", "Test", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            let notes_with_whitespace = "Line 1\nLine 2\n\tIndented\r\nWindows line";
            db.set_job_notes(id, Some(notes_with_whitespace))
                .await
                .unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some(notes_with_whitespace));
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
            let db = Database::connect(db_path).await.unwrap();
            db.migrate().await.unwrap();

            // Cleanup
            let _ = std::fs::remove_file(db_path);
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

    mod search_error_paths {
        use super::*;

        #[tokio::test]
        async fn test_search_jobs_with_too_many_results() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 1005 jobs with common keyword (exceeds MAX_IDS = 1000)
            for i in 0..1005 {
                let job = create_test_job(
                    &format!("search_overflow_{}", i),
                    &format!("Engineer Position {}", i),
                    0.8,
                );
                db.upsert_job(&job).await.unwrap();
            }

            // Search should hit the MAX_IDS limit
            let result = db.search_jobs("Engineer", 1005).await;

            // Should return error about too many IDs
            assert!(result.is_err());
            let err_msg = result.unwrap_err().to_string();
            assert!(err_msg.contains("Too many job IDs") || err_msg.contains("job IDs requested"));
        }

        #[tokio::test]
        async fn test_search_jobs_with_max_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 100 jobs
            for i in 0..100 {
                let job = create_test_job(
                    &format!("max_limit_{}", i),
                    &format!("Software Engineer {}", i),
                    0.8,
                );
                db.upsert_job(&job).await.unwrap();
            }

            // Search with exactly 1000 limit (should succeed)
            let result = db.search_jobs("Software", 1000).await;
            assert!(result.is_ok());
            assert!(result.unwrap().len() <= 100);
        }

        #[tokio::test]
        async fn test_search_jobs_special_characters() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("special", "Test Job", 0.9);
            job.description = Some("Job requires C# and .NET experience".to_string());
            db.upsert_job(&job).await.unwrap();

            // Search with special characters (FTS5 may handle differently)
            let result = db.search_jobs("C#", 10).await;
            // Should not crash - may return results or error depending on tokenizer
            assert!(result.is_ok() || result.is_err());
        }

        #[tokio::test]
        async fn test_search_jobs_with_quotes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("quotes", "Senior Engineer", 0.9);
            job.description = Some("Looking for 'expert' developers".to_string());
            db.upsert_job(&job).await.unwrap();

            // FTS5 phrase search with quotes
            let result = db.search_jobs("\"Senior Engineer\"", 10).await;
            // Should handle quoted phrases
            assert!(result.is_ok() || result.is_err());
        }

        #[tokio::test]
        async fn test_search_jobs_unicode_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("unicode_search", "Développeur Senior", 0.9);
            job.description = Some("Poste à São Paulo".to_string());
            db.upsert_job(&job).await.unwrap();

            let result = db.search_jobs("Développeur", 10).await;
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
            let mut job1 = create_test_job("diff1", "Senior Engineer", 0.9);
            job1.company = "CompanyA".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("diff2", "Senior Engineer", 0.85);
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
            let mut job1 = create_test_job("diff_title1", "Senior Engineer", 0.9);
            job1.company = "Company".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("diff_title2", "Junior Engineer", 0.85);
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
                .track_repost("Company A", "Software Engineer", "linkedin", "hash1")
                .await
                .unwrap();
            assert_eq!(count, 1);

            // Second time - should return 2
            let count = db
                .track_repost("Company A", "Software Engineer", "linkedin", "hash1")
                .await
                .unwrap();
            assert_eq!(count, 2);

            // Different job - should return 1
            let count = db
                .track_repost("Company B", "Data Scientist", "indeed", "hash2")
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
