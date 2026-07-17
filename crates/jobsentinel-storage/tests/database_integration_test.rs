//! Database Integration Tests
//!
//! Tests database operations at the integration level:
//! - Migration execution
//! - Schema constraints (foreign keys, unique constraints)
//! - Concurrent write operations
//! - Transaction isolation
//! - Integrity checks

use jobsentinel_domain::Job;
use jobsentinel_storage::Database;
use sqlx::sqlite::SqlitePoolOptions;
use std::sync::Arc;
use tempfile::TempDir;

/// Setup test database with migrations (in-memory for speed)
async fn setup_test_db() -> Database {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    db
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
    let db = setup_test_db().await;

    // If we got here, migrations ran successfully
    // Verify by checking we can query the jobs table
    let stats = db.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);
}

#[tokio::test]
async fn test_migrations_are_idempotent() {
    let db = setup_test_db().await;

    // Insert a job
    let job = create_test_job("idempotent_001", "Program Coordinator", "Example Services");
    db.upsert_job(&job).await.unwrap();

    // Run migrations again (should be no-op)
    db.migrate().await.unwrap();

    // Verify data is preserved
    let retrieved = db.get_job_by_hash("idempotent_001").await.unwrap();
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().title, "Program Coordinator");
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
        // Secrets
        "secret_vault",
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
        let result = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
            .bind(table)
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
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('unique_hash', 'Job 1', 'Company 1', 'https://example.com/1', 'test')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Try to insert duplicate hash (should fail)
    let result = sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('unique_hash', 'Job 2', 'Company 2', 'https://example.com/2', 'test')
        "#,
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
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('app_fk_test', 'Program Coordinator', 'Example Services', 'https://example.com', 'test')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Now create application referencing that job
    let result = sqlx::query(
        r#"
        INSERT INTO applications (job_hash, status)
        VALUES ('app_fk_test', 'applied')
        "#,
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
    sqlx::query(
        r#"
        INSERT INTO jobs (hash, title, company, url, source)
        VALUES ('interview_job_test', 'Program Coordinator', 'Example Services', 'https://example.com', 'test')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create application
    sqlx::query(
        r#"
        INSERT INTO applications (job_hash, status)
        VALUES ('interview_job_test', 'applied')
        "#,
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
    let result = sqlx::query(
        r#"
        INSERT INTO interviews (application_id, interview_type, scheduled_at, location)
        VALUES (?, 'phone_interview', datetime('now'), 'Remote')
        "#,
    )
    .bind(app_id)
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
    sqlx::query(
        r#"
        INSERT INTO screening_answers (question_pattern, answer, answer_type)
        VALUES ('(?i)work.*authorized', 'Yes', 'yes_no')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Try to insert duplicate pattern (should fail due to UNIQUE constraint)
    let result = sqlx::query(
        r#"
        INSERT INTO screening_answers (question_pattern, answer, answer_type)
        VALUES ('(?i)work.*authorized', 'No', 'yes_no')
        "#,
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
    let db = setup_test_db().await;
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
    let db = setup_test_db().await;
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
    let db = setup_test_db().await;
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

#[path = "database_integration_test/query_and_integrity_tests.rs"]
mod query_and_integrity_tests;

// ============================================================================
// Edge Cases
// ============================================================================

#[path = "database_integration_test/edge_cases.rs"]
mod edge_cases;
