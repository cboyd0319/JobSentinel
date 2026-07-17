use super::*;

#[tokio::test]
async fn test_upsert_updates_optional_fields_to_none() {
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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

#[tokio::test]
async fn test_update_ghost_analysis() {
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
    let db = crate::test_support::migrated_database().await;

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
