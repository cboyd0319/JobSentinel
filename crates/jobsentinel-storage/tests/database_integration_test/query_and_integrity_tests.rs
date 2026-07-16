use super::*;

// ============================================================================
// Transaction and Isolation Tests
// ============================================================================

#[tokio::test]
async fn test_upsert_atomicity() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("atomic_001", "Program Coordinator", "Example Services");

    // Upsert should be atomic
    db.upsert_job(&job).await.unwrap();

    // Verify complete state
    let retrieved = db.get_job_by_hash("atomic_001").await.unwrap().unwrap();
    assert_eq!(retrieved.title, "Program Coordinator");
    assert_eq!(retrieved.company, "Example Services");
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
        title: "Senior Care Coordinator".to_string(),
        company: "CareBridge".to_string(),
        url: "https://example.com/job/preserve_001".to_string(),
        location: Some("Chicago, IL".to_string()),
        description: Some(
            "Coordinate care plans with CRM records and patient scheduling.".to_string(),
        ),
        score: Some(0.92),
        score_reasons: Some(r#"{"title_match": 0.9, "salary": 0.95}"#.to_string()),
        source: "greenhouse".to_string(),
        remote: Some(true),
        salary_min: Some(65000),
        salary_max: Some(85000),
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

    assert_eq!(retrieved.title, "Senior Care Coordinator");
    assert_eq!(retrieved.company, "CareBridge");
    assert_eq!(retrieved.location, Some("Chicago, IL".to_string()));
    assert!(retrieved.description.is_some());
    assert!(retrieved.score.is_some());
    assert!((retrieved.score.unwrap() - 0.92).abs() < 0.01);
    assert_eq!(retrieved.source, "greenhouse");
    assert_eq!(retrieved.remote, Some(true));
    assert_eq!(retrieved.salary_min, Some(65000));
    assert_eq!(retrieved.salary_max, Some(85000));
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
        create_test_job("search_001", "Care Coordinator", "WellBridge"),
        create_test_job("search_002", "Support Specialist", "SupportWorks"),
        create_test_job("search_003", "Patient Care Specialist", "HealthBridge"),
        create_test_job("search_004", "Program Assistant", "CommunityWorks"),
    ];

    for job in jobs {
        db.upsert_job(&job).await.unwrap();
    }

    // Search for care
    let results = db.search_jobs("Care", 10).await.unwrap();
    assert_eq!(results.len(), 2);

    // Search for Specialist
    let results = db.search_jobs("Specialist", 10).await.unwrap();
    assert_eq!(results.len(), 2);
}

#[tokio::test]
async fn test_search_jobs_case_insensitive() {
    let (db, _temp_dir) = setup_test_db().await;

    let job = create_test_job("case_001", "Senior CARE Coordinator", "Corp");
    db.upsert_job(&job).await.unwrap();

    // Search with different cases
    let results1 = db.search_jobs("care", 10).await.unwrap();
    let results2 = db.search_jobs("CARE", 10).await.unwrap();
    let results3 = db.search_jobs("Care", 10).await.unwrap();

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
