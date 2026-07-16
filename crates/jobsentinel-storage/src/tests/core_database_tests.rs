use super::*;

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

    // Test public http:// URL
    job.hash = "hash_http".to_string(); // Different hash for new job
    job.url = "http://example.com/job/456".to_string();
    let result = db.upsert_job(&job).await;
    assert!(result.is_err(), "http:// URL should be rejected");
    assert!(result.unwrap_err().to_string().contains("https required"));
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
async fn test_upsert_job_canonicalizes_stored_url() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let mut job = create_test_job("hash_canonical_url", "Test Job", 0.9);
    job.url = "https://example.com/jobs/123?gh_jid=123&utm_source=newsletter&token=secret&candidate_email=person@example.com&redirect=https%3A%2F%2Fprivate.example%2Fcallback%3Ftoken%3Draw#private".to_string();

    let id = db.upsert_job(&job).await.unwrap();
    let stored = db.get_job_by_id(id).await.unwrap().unwrap();

    assert_eq!(stored.url, "https://example.com/jobs/123?gh_jid=123");
}

#[tokio::test]
async fn test_upsert_job_dedupes_urls_that_only_differ_by_fragment() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let title = "Care Coordinator";
    let company = "Community Care";
    let location = Some("Remote");
    let base_url = "https://example.com/jobs/123?gh_jid=123";
    let fragment_url = "https://example.com/jobs/123?gh_jid=123#apply";

    let base_hash = hash(company, title, location, base_url);
    let fragment_hash = hash(company, title, location, fragment_url);
    assert_eq!(base_hash, fragment_hash);

    let mut base_job = create_test_job(&base_hash, title, 0.9);
    base_job.company = company.to_string();
    base_job.location = location.map(str::to_string);
    base_job.url = base_url.to_string();

    let mut fragment_job = base_job.clone();
    fragment_job.hash = fragment_hash;
    fragment_job.url = fragment_url.to_string();

    let first_id = db.upsert_job(&base_job).await.unwrap();
    let second_id = db.upsert_job(&fragment_job).await.unwrap();

    assert_eq!(first_id, second_id);

    let stored = db.get_job_by_id(first_id).await.unwrap().unwrap();
    assert_eq!(stored.url, base_url);
    assert_eq!(stored.times_seen, 2);
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
async fn test_claim_immediate_alert_is_atomic() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job("hash_alert_claim", "Test Job", 0.95);
    let id = db.upsert_job(&job).await.unwrap();

    let (first, second) = tokio::join!(
        db.claim_immediate_alert("hash_alert_claim"),
        db.claim_immediate_alert("hash_alert_claim")
    );

    let claimed_count = [first.unwrap(), second.unwrap()]
        .into_iter()
        .filter(|claimed| *claimed)
        .count();
    assert_eq!(claimed_count, 1);

    let after = db.get_job_by_id(id).await.unwrap().unwrap();
    assert!(after.immediate_alert_sent);
    assert!(!db.claim_immediate_alert("missing_hash").await.unwrap());
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
