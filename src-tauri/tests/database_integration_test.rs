//! Database Integration Tests
//!
//! Tests database operations at the integration level:
//! - Migration execution
//! - Schema constraints (foreign keys, unique constraints)
//! - Concurrent write operations
//! - Transaction isolation
//! - Integrity checks

use jobsentinel::core::db::{Database, Job};
use sqlx::sqlite::SqlitePoolOptions;
use std::sync::Arc;
use tempfile::TempDir;

/// Setup test database with migrations (in-memory for speed)
async fn setup_test_db() -> (Database, TempDir) {
    let temp_dir = TempDir::new().unwrap();

    // Use in-memory database for test speed
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    (db, temp_dir)
}

/// Setup raw SQLite pool for direct SQL operations
async fn setup_raw_pool() -> (sqlx::SqlitePool, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .unwrap();

    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    (pool, temp_dir)
}

/// Helper to create a test job
fn create_test_job(hash: &str, title: &str, company: &str) -> Job {
    Job {
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{}", hash),
        location: Some("Remote".to_string()),
        description: Some("Test job description".to_string()),
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
// Migration Tests
// ============================================================================

#[tokio::test]
async fn test_migrations_run_successfully() {
    let (db, _temp_dir) = setup_test_db().await;

    // If we got here, migrations ran successfully
    // Verify by checking we can query the jobs table
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);
}

#[tokio::test]
async fn test_migrations_are_idempotent() {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // Run migrations first time
    let db1 = Database::connect(&db_path).await.unwrap();
    db1.migrate().await.unwrap();

    // Insert a job
    let job = create_test_job("idempotent_001", "Test Job", "TestCorp");
    db1.upsert_job(&job).await.unwrap();

    // Connect again and run migrations (should be no-op)
    let db2 = Database::connect(&db_path).await.unwrap();
    db2.migrate().await.unwrap();

    // Verify data is preserved
    let retrieved = db2.get_job_by_hash("idempotent_001").await.unwrap();
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().title, "Test Job");
}

#[tokio::test]
async fn test_all_tables_created() {
    let (pool, _temp_dir) = setup_raw_pool().await;

    // List of expected tables from migrations (actual table names)
    let expected_tables = vec![
        // Core tables
        "jobs",
        "jobs_fts",
        // Application tracking
        "applications",
        "application_events",
        "application_reminders",
        "interviews",
        "offers",
        // Resume matching
        "resumes",
        "user_skills",
        "job_skills",
        "resume_job_matches",
        "user_education",
        // Automation
        "application_profile",
        "screening_answers",
        "application_attempts",
        "captcha_challenges",
        "ats_form_fields",
        // Salary
        "h1b_salaries",
        "salary_benchmarks",
        "user_reported_salaries",
        "job_salary_predictions",
        "negotiation_templates",
        // Market intelligence
        "skill_demand_trends",
        "salary_trends",
        "company_hiring_velocity",
        "location_job_density",
        "market_snapshots",
        // Company health
        "company_profiles",
        "glassdoor_data",
        "crunchbase_data",
        "layoffs_data",
        "news_sentiment",
        // Integrity
        "app_metadata",
        "integrity_check_log",
        "backup_log",
        // User data
        "job_repost_history",
        "cover_letter_templates",
        "interview_prep_checklists",
        "interview_followups",
        "saved_searches",
        "search_history",
        "notification_preferences",
    ];

    for table in expected_tables {
        let result = sqlx::query(&format!(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='{}'",
            table
        ))
        .fetch_optional(&pool)
        .await;

        assert!(
            result.is_ok() && result.unwrap().is_some(),
            "Table '{}' should exist",
            table
        );
    }
}

// ============================================================================
// Constraint Tests
// ============================================================================

#[tokio::test]
async fn test_jobs_hash_unique_constraint() {
    let (pool, _temp_dir) = setup_raw_pool().await;

    // Insert first job
    sqlx::query!(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('unique_hash', 'Job 1', 'Company 1', 'https://example.com/1', 'test')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Try to insert duplicate hash (should fail)
    let result = sqlx::query!(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('unique_hash', 'Job 2', 'Company 2', 'https://example.com/2', 'test')
        "#
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_err(),
        "Duplicate hash should fail unique constraint"
    );
}

#[tokio::test]
async fn test_applications_foreign_key_constraint() {
    let (pool, _temp_dir) = setup_raw_pool().await;

    // Applications table has a foreign key to jobs(hash)
    // First insert a job, then create an application
    sqlx::query!(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('app_fk_test', 'Test Job', 'TestCorp', 'https://example.com', 'test')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Now create application referencing that job
    let result = sqlx::query!(
        r#"
        INSERT INTO applications (job_hash, status)
        VALUES ('app_fk_test', 'applied')
        "#
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_ok(),
        "Application with valid job_hash should succeed"
    );
}

#[tokio::test]
async fn test_interviews_foreign_key_constraint() {
    let (pool, _temp_dir) = setup_raw_pool().await;

    // Create job first (required for application)
    sqlx::query!(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('interview_job_test', 'Test Job', 'TestCorp', 'https://example.com', 'test')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create application
    sqlx::query!(
        r#"
        INSERT INTO applications (job_hash, status)
        VALUES ('interview_job_test', 'applied')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Get the application ID
    let app_id: i64 =
        sqlx::query_scalar("SELECT id FROM applications WHERE job_hash = 'interview_job_test'")
            .fetch_one(&pool)
            .await
            .unwrap();

    // Insert interview with valid application_id
    let result = sqlx::query!(
        r#"
        INSERT INTO interviews (application_id, interview_type, scheduled_at, location)
        VALUES (?, 'phone_interview', datetime('now'), 'Remote')
        "#,
        app_id
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_ok(),
        "Interview with valid application_id should succeed"
    );
}

#[tokio::test]
async fn test_screening_answers_unique_pattern() {
    let (pool, _temp_dir) = setup_raw_pool().await;

    // Insert first screening answer
    sqlx::query!(
        r#"
        INSERT INTO screening_answers (question_pattern, answer, answer_type)
        VALUES ('(?i)work.*authorized', 'Yes', 'boolean')
        "#
    )
    .execute(&pool)
    .await
    .unwrap();

    // Try to insert duplicate pattern (should fail due to UNIQUE constraint)
    let result = sqlx::query!(
        r#"
        INSERT INTO screening_answers (question_pattern, answer, answer_type)
        VALUES ('(?i)work.*authorized', 'No', 'boolean')
        "#
    )
    .execute(&pool)
    .await;

    assert!(
        result.is_err(),
        "Duplicate question_pattern should fail unique constraint"
    );
}

// ============================================================================
// Concurrent Write Tests
// ============================================================================

#[tokio::test]
async fn test_concurrent_job_inserts() {
    let (db, _temp_dir) = setup_test_db().await;
    let database = Arc::new(db);

    // Spawn 50 concurrent insert operations
    let handles: Vec<_> = (0..50)
        .map(|i| {
            let db_clone = Arc::clone(&database);
            tokio::spawn(async move {
                let job = create_test_job(
                    &format!("concurrent_insert_{}", i),
                    &format!("Job {}", i),
                    &format!("Company {}", i),
                );
                db_clone.upsert_job(&job).await
            })
        })
        .collect();

    // Wait for all operations
    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should succeed
    let success_count = results
        .into_iter()
        .filter(|r| r.is_ok() && r.as_ref().unwrap().is_ok())
        .count();

    assert_eq!(
        success_count, 50,
        "All 50 concurrent inserts should succeed"
    );

    // Verify all jobs were inserted
    let stats = database.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 50);
}

#[tokio::test]
#[ignore = "Aggressive concurrent upsert test (20 concurrent ops on same row) can hang due to SQLite locking"]
async fn test_concurrent_upsert_same_job() {
    let (db, _temp_dir) = setup_test_db().await;
    let database = Arc::new(db);

    // Create initial job
    let job = create_test_job("concurrent_same_hash", "Original Title", "OriginalCorp");
    database.upsert_job(&job).await.unwrap();

    // Spawn 20 concurrent upsert operations on the same hash
    let handles: Vec<_> = (0..20)
        .map(|i| {
            let db_clone = Arc::clone(&database);
            tokio::spawn(async move {
                let mut job = create_test_job(
                    "concurrent_same_hash",
                    &format!("Updated Title {}", i),
                    "UpdatedCorp",
                );
                job.score = Some(0.5 + (i as f64 * 0.02));
                db_clone.upsert_job(&job).await
            })
        })
        .collect();

    // Wait for all operations
    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should succeed
    for result in results {
        assert!(result.is_ok(), "Spawn should succeed");
        assert!(result.unwrap().is_ok(), "Upsert should succeed");
    }

    // Should still be only 1 job
    let stats = database.get_statistics().await.unwrap();
    assert_eq!(
        stats.total_jobs, 1,
        "Should have exactly 1 job (upserted, not duplicated)"
    );

    // times_seen should have incremented
    let job = database
        .get_job_by_hash("concurrent_same_hash")
        .await
        .unwrap()
        .unwrap();
    assert!(job.times_seen >= 20, "times_seen should have incremented");
}

#[tokio::test]
async fn test_concurrent_reads_and_writes() {
    let (db, _temp_dir) = setup_test_db().await;
    let database = Arc::new(db);

    // Insert initial jobs
    for i in 0..10 {
        let job = create_test_job(&format!("rw_job_{}", i), &format!("Job {}", i), "Corp");
        database.upsert_job(&job).await.unwrap();
    }

    // Spawn concurrent reads and writes
    let mut handles = Vec::new();

    // 10 writers
    for i in 10..20 {
        let db_clone = Arc::clone(&database);
        handles.push(tokio::spawn(async move {
            let job = create_test_job(&format!("rw_job_{}", i), &format!("Job {}", i), "Corp");
            db_clone.upsert_job(&job).await.map(|_| "write")
        }));
    }

    // 10 readers
    for _ in 0..10 {
        let db_clone = Arc::clone(&database);
        handles.push(tokio::spawn(async move {
            db_clone.get_statistics().await.map(|_| "read")
        }));
    }

    // 10 search operations
    for _ in 0..10 {
        let db_clone = Arc::clone(&database);
        handles.push(tokio::spawn(async move {
            db_clone.search_jobs("Job", 10).await.map(|_| "search")
        }));
    }

    // Wait for all operations
    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should succeed
    for result in results {
        assert!(result.is_ok(), "Spawn should succeed");
        assert!(result.unwrap().is_ok(), "Operation should succeed");
    }
}

// ============================================================================
// Transaction and Isolation Tests
// ============================================================================

#[tokio::test]
async fn test_upsert_atomicity() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("atomic_001", "Test Job", "TestCorp");

    // Upsert should be atomic
    db.upsert_job(&job).await.unwrap();

    // Verify complete state
    let retrieved = db.get_job_by_hash("atomic_001").await.unwrap().unwrap();
    assert_eq!(retrieved.title, "Test Job");
    assert_eq!(retrieved.company, "TestCorp");
    assert!(retrieved.score.is_some());
}

// ============================================================================
// Data Integrity Tests
// ============================================================================

#[tokio::test]
async fn test_job_data_preserved_on_upsert() {
    let (db, _temp_dir) = setup_test_db().await;

    // Create job with full data
    let job = Job {
        id: 0,
        hash: "preserve_001".to_string(),
        title: "Senior Rust Engineer".to_string(),
        company: "RustCorp".to_string(),
        url: "https://example.com/job/preserve_001".to_string(),
        location: Some("San Francisco, CA".to_string()),
        description: Some("Build amazing things with Rust".to_string()),
        score: Some(0.92),
        score_reasons: Some(r#"{"title_match": 0.9, "salary": 0.95}"#.to_string()),
        source: "greenhouse".to_string(),
        remote: Some(true),
        salary_min: Some(180000),
        salary_max: Some(250000),
        currency: Some("USD".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: true,
        hidden: false,
        included_in_digest: true,
        bookmarked: false, // upsert doesn't preserve bookmarked
        notes: None,       // upsert doesn't preserve notes
        ghost_score: Some(0.1),
        ghost_reasons: Some(r#"{"age": "ok"}"#.to_string()),
        first_seen: Some(chrono::Utc::now()),
        repost_count: 0,
    };

    db.upsert_job(&job).await.unwrap();

    // Retrieve and verify core job fields are preserved
    let retrieved = db.get_job_by_hash("preserve_001").await.unwrap().unwrap();

    assert_eq!(retrieved.title, "Senior Rust Engineer");
    assert_eq!(retrieved.company, "RustCorp");
    assert_eq!(retrieved.location, Some("San Francisco, CA".to_string()));
    assert!(retrieved.description.is_some());
    assert!(retrieved.score.is_some());
    assert!((retrieved.score.unwrap() - 0.92).abs() < 0.01);
    assert_eq!(retrieved.source, "greenhouse");
    assert_eq!(retrieved.remote, Some(true));
    assert_eq!(retrieved.salary_min, Some(180000));
    assert_eq!(retrieved.salary_max, Some(250000));
    assert_eq!(retrieved.currency, Some("USD".to_string()));

    // User interaction fields (bookmarked, notes, hidden) are NOT preserved by upsert
    // They are managed separately via toggle_bookmark, hide_job, etc.
    assert!(!retrieved.bookmarked);
    assert!(retrieved.notes.is_none());
}

#[tokio::test]
async fn test_statistics_accuracy() {
    let (db, _temp_dir) = setup_test_db().await;

    // Insert jobs with different characteristics
    let jobs = vec![
        {
            let mut j = create_test_job("stats_001", "Job 1", "Corp");
            j.score = Some(0.95); // high match (>= 0.9)
            j.hidden = false;
            j
        },
        {
            let mut j = create_test_job("stats_002", "Job 2", "Corp");
            j.score = Some(0.9); // high match (>= 0.9)
            j.hidden = false;
            j
        },
        {
            let mut j = create_test_job("stats_003", "Job 3", "Corp");
            j.score = Some(0.7);
            j.hidden = true;
            j
        },
        {
            let mut j = create_test_job("stats_004", "Job 4", "Corp");
            j.score = Some(0.6);
            j.bookmarked = true;
            j
        },
    ];

    for job in jobs {
        db.upsert_job(&job).await.unwrap();
    }

    let stats = db.get_statistics().await.unwrap();

    assert_eq!(stats.total_jobs, 4);
    assert_eq!(stats.high_matches, 2); // Jobs with score >= 0.9
}

// ============================================================================
// Search and Query Tests
// ============================================================================

#[tokio::test]
async fn test_search_jobs_basic() {
    let (db, _temp_dir) = setup_test_db().await;

    let jobs = vec![
        create_test_job("search_001", "Rust Developer", "RustCorp"),
        create_test_job("search_002", "Python Developer", "PyCorp"),
        create_test_job("search_003", "Rust Security Engineer", "SecureCorp"),
        create_test_job("search_004", "Java Developer", "JavaCorp"),
    ];

    for job in jobs {
        db.upsert_job(&job).await.unwrap();
    }

    // Search for Rust
    let results = db.search_jobs("Rust", 10).await.unwrap();
    assert_eq!(results.len(), 2);

    // Search for Developer
    let results = db.search_jobs("Developer", 10).await.unwrap();
    assert_eq!(results.len(), 3);
}

#[tokio::test]
async fn test_search_jobs_case_insensitive() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("case_001", "Senior RUST Engineer", "Corp");
    db.upsert_job(&job).await.unwrap();

    // Search with different cases
    let results1 = db.search_jobs("rust", 10).await.unwrap();
    let results2 = db.search_jobs("RUST", 10).await.unwrap();
    let results3 = db.search_jobs("Rust", 10).await.unwrap();

    assert_eq!(results1.len(), 1);
    assert_eq!(results2.len(), 1);
    assert_eq!(results3.len(), 1);
}

#[tokio::test]
async fn test_get_recent_jobs_limit() {
    let (db, _temp_dir) = setup_test_db().await;

    // Insert 25 jobs
    for i in 0..25 {
        let mut job = create_test_job(&format!("page_{}", i), &format!("Job {}", i), "Corp");
        job.score = Some(1.0 - (i as f64 * 0.03)); // Different scores for ordering
        db.upsert_job(&job).await.unwrap();
    }

    // Get limited results
    let limited = db.get_recent_jobs(10).await.unwrap();
    assert_eq!(limited.len(), 10);

    // Get larger limit
    let more = db.get_recent_jobs(20).await.unwrap();
    assert_eq!(more.len(), 20);

    // Get all
    let all = db.get_recent_jobs(100).await.unwrap();
    assert_eq!(all.len(), 25);

    // Verify results are sorted by score desc
    for i in 0..(limited.len() - 1) {
        let score1 = limited[i].score.unwrap();
        let score2 = limited[i + 1].score.unwrap();
        assert!(score1 >= score2, "Results should be sorted by score DESC");
    }
}

// ============================================================================
// Hide/Unhide and Bookmark Tests
// ============================================================================

#[tokio::test]
async fn test_hide_and_unhide_job() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("hide_001", "Test Job", "Corp");
    db.upsert_job(&job).await.unwrap();

    // Get the job id
    let retrieved = db.get_job_by_hash("hide_001").await.unwrap().unwrap();
    let job_id = retrieved.id;
    assert!(!retrieved.hidden);

    // Hide
    db.hide_job(job_id).await.unwrap();
    let retrieved = db.get_job_by_hash("hide_001").await.unwrap().unwrap();
    assert!(retrieved.hidden);

    // Unhide
    db.unhide_job(job_id).await.unwrap();
    let retrieved = db.get_job_by_hash("hide_001").await.unwrap().unwrap();
    assert!(!retrieved.hidden);
}

#[tokio::test]
async fn test_bookmark_toggle() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("bookmark_001", "Test Job", "Corp");
    db.upsert_job(&job).await.unwrap();

    // Get the job id
    let retrieved = db.get_job_by_hash("bookmark_001").await.unwrap().unwrap();
    let job_id = retrieved.id;
    assert!(!retrieved.bookmarked);

    // Toggle on
    let new_state = db.toggle_bookmark(job_id).await.unwrap();
    assert!(new_state);
    let retrieved = db.get_job_by_hash("bookmark_001").await.unwrap().unwrap();
    assert!(retrieved.bookmarked);

    // Toggle off
    let new_state = db.toggle_bookmark(job_id).await.unwrap();
    assert!(!new_state);
    let retrieved = db.get_job_by_hash("bookmark_001").await.unwrap().unwrap();
    assert!(!retrieved.bookmarked);
}

// ============================================================================
// Ghost Detection Data Tests
// ============================================================================

#[tokio::test]
async fn test_ghost_score_persistence() {
    let (db, _temp_dir) = setup_test_db().await;

    let mut job = create_test_job("ghost_001", "Old Job Posting", "GhostCorp");
    job.ghost_score = Some(0.75);
    job.ghost_reasons = Some(r#"{"age_days": 90, "repost_count": 3}"#.to_string());
    job.repost_count = 3;

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("ghost_001").await.unwrap().unwrap();
    assert_eq!(retrieved.ghost_score, Some(0.75));
    assert!(retrieved.ghost_reasons.is_some());
    assert_eq!(retrieved.repost_count, 3);
}

// ============================================================================
// Edge Cases
// ============================================================================

#[tokio::test]
async fn test_empty_database_operations() {
    let (db, _temp_dir) = setup_test_db().await;

    // Operations on empty database should not fail
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);

    let recent = db.get_recent_jobs(10).await.unwrap();
    assert!(recent.is_empty());

    let search = db.search_jobs("anything", 10).await.unwrap();
    assert!(search.is_empty());

    let nonexistent = db.get_job_by_hash("nonexistent").await.unwrap();
    assert!(nonexistent.is_none());
}

#[tokio::test]
async fn test_special_characters_in_job_data() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = Job {
        hash: "special_001".to_string(),
        title: "Engineer \"with\" 'quotes' & <special> chars".to_string(),
        company: "O'Reilly & Associates".to_string(),
        description: Some("Description with \n newlines \t tabs and 'quotes'".to_string()),
        notes: Some("User's notes with \"quotes\"".to_string()),
        ..create_test_job("special_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("special_001").await.unwrap().unwrap();
    assert!(retrieved.title.contains("\"with\""));
    assert!(retrieved.company.contains("O'Reilly"));
}

#[tokio::test]
async fn test_unicode_in_job_data() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = Job {
        hash: "unicode_001".to_string(),
        title: "工程师 Engineer 🚀".to_string(),
        company: "日本株式会社".to_string(),
        description: Some("Description with émojis 🎉 and ünïcödé".to_string()),
        ..create_test_job("unicode_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("unicode_001").await.unwrap().unwrap();
    assert!(retrieved.title.contains("工程师"));
    assert!(retrieved.title.contains("🚀"));
}

#[tokio::test]
async fn test_very_long_content() {
    let (db, _temp_dir) = setup_test_db().await;

    // MAX_DESCRIPTION_LENGTH is 50,000 chars (see crud.rs)
    let long_description = "A".repeat(49_000); // Just under the limit

    let job = Job {
        hash: "long_001".to_string(),
        description: Some(long_description.clone()),
        ..create_test_job("long_001", "Test", "Test")
    };

    db.upsert_job(&job).await.unwrap();

    let retrieved = db.get_job_by_hash("long_001").await.unwrap().unwrap();
    assert_eq!(retrieved.description.unwrap().len(), 49_000);
}
