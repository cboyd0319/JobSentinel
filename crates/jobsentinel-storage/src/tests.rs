#[cfg(test)]
use crate::{Database, DuplicateGroup, Statistics};
#[cfg(test)]
use jobsentinel_domain::Job;
#[cfg(test)]
use {chrono::Utc, jobsentinel_domain::calculate_job_hash as hash};

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

mod core_database_tests;

// ============================================================
// UNIT TESTS (No Database Required)
// ============================================================

#[path = "tests/model_tests.rs"]
mod model_tests;

// ============================================================
// COMPREHENSIVE DATABASE OPERATION TESTS
// ============================================================

#[path = "tests/job_visibility_tests.rs"]
mod job_visibility_tests;

#[path = "tests/job_notes_tests.rs"]
mod job_notes_tests;

#[path = "tests/job_search_tests.rs"]
mod job_search_tests;

#[path = "tests/job_duplicate_tests.rs"]
mod job_duplicate_tests;

#[path = "tests/job_edge_case_tests.rs"]
mod job_edge_case_tests;

mod accessor_tests {
    use super::*;

    #[tokio::test]
    async fn test_pool_accessor() {
        let db = crate::test_support::migrated_database().await;

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

#[path = "tests/job_query_error_tests.rs"]
mod job_query_error_tests;

#[path = "tests/job_statistics_tests.rs"]
mod job_statistics_tests;

#[path = "tests/job_upsert_tests.rs"]
mod job_upsert_tests;

#[path = "tests/job_bookmark_tests.rs"]
mod job_bookmark_tests;

#[path = "tests/job_duplicate_merge_tests.rs"]
mod job_duplicate_merge_tests;

#[path = "tests/job_get_jobs_by_tests.rs"]
mod job_get_jobs_by_tests;

mod job_hash_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_job_by_hash_success() {
        let db = crate::test_support::migrated_database().await;

        let job = create_test_job("hash_test", "Test Job", 0.9);
        let hash = job.hash.clone();
        db.upsert_job(&job).await.unwrap();

        let found = db.get_job_by_hash(&hash).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().hash, hash);
    }

    #[tokio::test]
    async fn test_get_job_by_hash_returns_hidden_jobs() {
        let db = crate::test_support::migrated_database().await;

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
        let db = crate::test_support::migrated_database().await;

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
        let db = crate::test_support::migrated_database().await;

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

#[path = "tests/job_connection_tests.rs"]
mod job_connection_tests;

mod toggle_bookmark_edge_cases {
    use super::*;

    #[tokio::test]
    async fn test_toggle_bookmark_handles_unexpected_values() {
        let db = crate::test_support::migrated_database().await;

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
        let db = crate::test_support::migrated_database().await;

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

#[path = "tests/job_validation_tests.rs"]
mod job_validation_tests;

#[path = "tests/statistics_edge_cases.rs"]
mod statistics_edge_cases;

#[path = "tests/duplicate_edge_cases.rs"]
mod duplicate_edge_cases;

#[path = "tests/job_field_update_tests.rs"]
mod job_field_updates;

#[path = "tests/job_insert_tests.rs"]
mod job_insert_tests;
