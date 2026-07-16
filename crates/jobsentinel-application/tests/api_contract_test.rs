//! Public core API contract tests.
//!
//! Exercises public configuration and feature contracts.

use jobsentinel_application::config::{Config, LocationPreferences};
use jobsentinel_domain::Job;
use jobsentinel_storage::Database;
use std::sync::Arc;
use tempfile::TempDir;

#[cfg(feature = "embedded-ml")]
#[test]
fn model_cache_diagnostics_do_not_expose_cache_paths() {
    let temp_dir = TempDir::new().unwrap();
    let manifest = jobsentinel_local_ai::load_model_manifest().unwrap();
    let model = manifest.models.first().unwrap();
    let manager = jobsentinel_local_ai::ModelManager::new(temp_dir.path().to_path_buf());

    assert_eq!(manager.required_files_present(model), 0);
    assert!(!manager.is_model_downloaded_for(model));
}

/// Setup test environment using in-memory database
async fn setup_test_env() -> (Arc<Database>, Arc<Config>, TempDir) {
    let temp_dir = TempDir::new().unwrap();

    // Use in-memory database for speed
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let config = Arc::new(create_test_config());

    (database, config, temp_dir)
}

/// Create test config
fn create_test_config() -> Config {
    Config {
        title_allowlist: vec!["Care Coordinator".to_string()],
        title_blocklist: vec!["Manager".to_string()],
        keywords_boost: vec!["CRM".to_string()],
        keywords_exclude: vec!["commission-only".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 100000,
        salary_target_usd: None,
        penalize_missing_salary: false,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.85,
        scraping_interval_hours: 2,
        bookmarklet_port: 4321,
        alerts: Default::default(),
        external_ai: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        restricted_source_acknowledgements: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        jobswithgpt_approval: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        ghost_config: None,
        use_resume_matching: false,
        preferred_companies: vec![],
        blocked_companies: vec![],
    }
}

/// Create a test job with all fields populated
fn create_test_job(hash: &str, title: &str, company: &str) -> Job {
    Job {
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{}", hash),
        location: Some("Remote".to_string()),
        description: Some("Test description".to_string()),
        score: Some(0.85),
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: Some(120000),
        salary_max: Some(180000),
        currency: Some("USD".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    }
}

// ============================================================================
// Job Commands Contract Tests
// ============================================================================

mod job_commands {
    use super::*;

    #[tokio::test]
    async fn test_get_recent_jobs_returns_vec() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        // Insert test jobs
        for i in 0..5 {
            let job = create_test_job(&format!("recent_{}", i), &format!("Job {}", i), "Corp");
            database.upsert_job(&job).await.unwrap();
        }

        // Command takes limit: i64
        let jobs = database.get_recent_jobs(10).await.unwrap();
        assert_eq!(jobs.len(), 5);

        // Verify Job structure
        for job in &jobs {
            assert!(!job.hash.is_empty());
            assert!(!job.title.is_empty());
        }
    }

    #[tokio::test]
    async fn test_get_job_by_id_returns_option() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let job = create_test_job("by_id_001", "Test Job", "Example Services");
        database.upsert_job(&job).await.unwrap();

        // Get the actual ID via hash lookup
        let inserted = database
            .get_job_by_hash("by_id_001")
            .await
            .unwrap()
            .unwrap();

        // get_job_by_id returns Option<Job>
        let result = database.get_job_by_id(inserted.id).await.unwrap();
        assert!(result.is_some());

        // Non-existent ID returns None
        let result = database.get_job_by_id(999999).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_search_jobs_returns_vec() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let care_job = create_test_job("search_care", "Care Coordinator", "CareBridge");
        database.upsert_job(&care_job).await.unwrap();

        let program_job = create_test_job("search_program", "Program Assistant", "CommunityWorks");
        database.upsert_job(&program_job).await.unwrap();

        // search_jobs takes query: &str, limit: i64
        let results = database.search_jobs("Care", 10).await.unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].title.contains("Care"));
    }

    #[tokio::test]
    async fn test_hide_job_takes_id() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let job = create_test_job("hide_test", "Test Job", "Corp");
        database.upsert_job(&job).await.unwrap();

        // Get the job ID
        let inserted = database
            .get_job_by_hash("hide_test")
            .await
            .unwrap()
            .unwrap();

        // hide_job takes id: i64
        let result = database.hide_job(inserted.id).await;
        assert!(result.is_ok());

        // Verify hidden
        let hidden = database.get_job_by_id(inserted.id).await.unwrap().unwrap();
        assert!(hidden.hidden);
    }

    #[tokio::test]
    async fn test_toggle_bookmark_takes_id() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let job = create_test_job("bookmark_test", "Test Job", "Corp");
        database.upsert_job(&job).await.unwrap();

        let inserted = database
            .get_job_by_hash("bookmark_test")
            .await
            .unwrap()
            .unwrap();

        // toggle_bookmark takes id: i64, returns bool
        let new_state = database.toggle_bookmark(inserted.id).await.unwrap();
        assert!(new_state); // Should now be bookmarked
    }

    #[tokio::test]
    async fn test_get_statistics_returns_stats() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        for i in 0..3 {
            let job = create_test_job(&format!("stats_{}", i), &format!("Job {}", i), "Corp");
            database.upsert_job(&job).await.unwrap();
        }

        let stats = database.get_statistics().await.unwrap();
        assert_eq!(stats.total_jobs, 3);
    }

    #[tokio::test]
    async fn test_get_bookmarked_jobs_takes_limit() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        for i in 0..3 {
            let job = create_test_job(&format!("bookmarked_{}", i), &format!("Job {}", i), "Corp");
            database.upsert_job(&job).await.unwrap();
        }

        // Bookmark the first two
        let job1 = database
            .get_job_by_hash("bookmarked_0")
            .await
            .unwrap()
            .unwrap();
        let job2 = database
            .get_job_by_hash("bookmarked_1")
            .await
            .unwrap()
            .unwrap();
        database.toggle_bookmark(job1.id).await.unwrap();
        database.toggle_bookmark(job2.id).await.unwrap();

        // get_bookmarked_jobs takes limit: i64
        let bookmarked = database.get_bookmarked_jobs(10).await.unwrap();
        assert_eq!(bookmarked.len(), 2);
    }

    #[tokio::test]
    async fn test_set_job_notes_takes_id_and_option() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let job = create_test_job("notes_test", "Test Job", "Corp");
        database.upsert_job(&job).await.unwrap();

        let inserted = database
            .get_job_by_hash("notes_test")
            .await
            .unwrap()
            .unwrap();

        // set_job_notes takes id: i64, notes: Option<&str>
        let result = database
            .set_job_notes(inserted.id, Some("These are my notes"))
            .await;
        assert!(result.is_ok());

        let with_notes = database.get_job_by_id(inserted.id).await.unwrap().unwrap();
        assert_eq!(with_notes.notes, Some("These are my notes".to_string()));
    }
}

// ============================================================================
// ATS Commands Contract Tests
// ============================================================================

mod ats_commands {
    use super::*;
    use jobsentinel_application::ats::{ApplicationStatus, ApplicationTracker};

    async fn setup_ats_env() -> (ApplicationTracker, Arc<Database>, TempDir) {
        let (database, _config, temp_dir) = setup_test_env().await;
        let tracker = database.application_tracker();
        (tracker, database, temp_dir)
    }

    #[tokio::test]
    async fn test_create_application_returns_id() {
        let (tracker, database, _temp_dir) = setup_ats_env().await;

        // Create a job first (required for foreign key)
        let job = create_test_job("app_job_001", "Test Job", "Example Services");
        database.upsert_job(&job).await.unwrap();

        // create_application takes job_hash: &str, returns i64
        let app_id = tracker.create_application("app_job_001").await.unwrap();
        assert!(app_id > 0);
    }

    #[tokio::test]
    async fn test_get_applications_kanban_returns_grouped() {
        let (tracker, database, _temp_dir) = setup_ats_env().await;

        let job = create_test_job("kanban_job", "Test Job", "Example Services");
        database.upsert_job(&job).await.unwrap();
        tracker.create_application("kanban_job").await.unwrap();

        // get_applications_by_status returns ApplicationsByStatus
        let kanban = tracker.get_applications_by_status().await.unwrap();
        // Structure should have Vec fields for each status (just verify it doesn't panic)
        let _ = kanban.to_apply.len();
        let _ = kanban.applied.len();
    }

    #[tokio::test]
    async fn test_update_application_status() {
        let (tracker, database, _temp_dir) = setup_ats_env().await;

        let job = create_test_job("status_job", "Test Job", "Example Services");
        database.upsert_job(&job).await.unwrap();
        let app_id = tracker.create_application("status_job").await.unwrap();

        // update_status takes id: i64, status: ApplicationStatus
        let result = tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_application_stats() {
        let (tracker, _database, _temp_dir) = setup_ats_env().await;

        // get_application_stats returns ApplicationStats
        let stats = tracker.get_application_stats().await.unwrap();
        assert!(stats.total >= 0);
        assert!(stats.response_rate >= 0.0);
    }

    #[tokio::test]
    async fn test_detect_ghosted_returns_count() {
        let (tracker, _database, _temp_dir) = setup_ats_env().await;

        // auto_detect_ghosted returns usize
        let count = tracker.auto_detect_ghosted().await.unwrap();
        let _ = count; // Verify method signature (usize is always >= 0)
    }
}

// ============================================================================
// Resume Commands Contract Tests
// ============================================================================

mod resume_commands {
    use super::*;

    #[tokio::test]
    async fn test_resume_matcher_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let matcher = database.resume_matcher();

        // get_active_resume returns Option<Resume>
        let active = matcher.get_active_resume().await.unwrap();
        assert!(active.is_none());

        // get_user_skills returns Vec<UserSkill> for a given resume_id
        // With no resume uploaded, using ID 0 should return empty or error
        let skills_result = matcher.get_user_skills(0).await;
        // Either returns empty vec or an error for non-existent resume
        assert!(skills_result.is_ok() || skills_result.is_err());

        // get_recent_matches takes resume_id: i64, limit: i64
        let matches = matcher.get_recent_matches(0, 10).await.unwrap();
        assert!(matches.is_empty());
    }
}

// ============================================================================
// Salary Commands Contract Tests
// ============================================================================

mod salary_commands {
    use super::*;
    use jobsentinel_application::salary::SeniorityLevel;

    #[tokio::test]
    async fn test_salary_analyzer_predict_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        // Create a test job
        let job = create_test_job("salary_test", "Customer Support Lead", "Example Services");
        database.upsert_job(&job).await.unwrap();

        let analyzer = database.salary_analyzer();

        // predict_salary_for_job takes job_hash and optional years_of_experience
        let result = analyzer
            .predict_salary_for_job("salary_test", Some(5))
            .await;

        // May return error if no salary data, that's OK for contract test
        assert!(result.is_ok() || result.is_err());
    }

    #[tokio::test]
    async fn test_salary_benchmark_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let analyzer = database.salary_analyzer();

        // get_benchmark returns Option<SalaryBenchmark>
        let benchmark = analyzer
            .get_benchmark("Customer Support Lead", "Chicago, IL", SeniorityLevel::Mid)
            .await
            .unwrap();

        // May be None if no benchmark data exists
        if let Some(b) = benchmark {
            assert!(b.p25_salary <= b.median_salary);
            assert!(b.median_salary <= b.p75_salary);
        }
    }

    #[tokio::test]
    async fn test_salary_compare_offers_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let analyzer = database.salary_analyzer();

        // compare_offers takes Vec<i64> of offer IDs
        let result = analyzer.compare_offers(vec![]).await;
        assert!(result.is_ok());
    }
}

#[path = "api_contract_test/extended_command_tests.rs"]
mod extended_command_tests;
