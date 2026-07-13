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
