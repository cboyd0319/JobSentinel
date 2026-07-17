use super::*;

#[path = "model_tests/database_path_tests.rs"]
mod database_path_tests;

mod job_struct_tests {
    use super::*;

    #[test]
    fn test_job_creation_with_all_fields() {
        let now = Utc::now();
        let job = Job {
            id: 42,
            hash: "abc123def456".to_string(),
            title: "Senior Case Manager".to_string(),
            company: "CommunityCare Inc".to_string(),
            url: "https://example.com/jobs/123".to_string(),
            location: Some("San Francisco, CA".to_string()),
            description: Some("Help neighbors navigate care services".to_string()),
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
        assert_eq!(job.title, "Senior Case Manager");
        assert_eq!(job.company, "CommunityCare Inc");
        assert_eq!(job.score, Some(0.95));
        assert!(job.remote.unwrap());
        assert!(job.bookmarked);
        assert!(!job.hidden);
    }

    #[test]
    fn test_job_creation_minimal_fields() {
        let now = Utc::now();
        let mut job = Job::newly_discovered(
            "Job Title",
            "Company",
            "https://example.com/job",
            None,
            "test",
            now,
        );
        job.id = 1;
        job.hash = "minimal_hash".to_string();
        job.first_seen = None;

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
