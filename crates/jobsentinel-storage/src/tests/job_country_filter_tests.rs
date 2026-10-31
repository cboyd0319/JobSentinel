//! Proves ordered retrieval fills its requested limit after application filtering.

use super::*;

#[tokio::test]
async fn recent_matching_retrieval_scans_past_high_scoring_rejections() {
    let database = crate::test_support::migrated_database().await;
    for (hash, title, score) in [
        ("country-high-one", "reject one", 0.99),
        ("country-high-two", "reject two", 0.98),
        ("country-match", "accept match", 0.80),
        ("country-unknown", "accept unknown", 0.70),
    ] {
        let job = create_test_job(hash, title, score);
        database.upsert_job(&job).await.unwrap();
    }

    let jobs = database
        .get_recent_jobs_matching(2, |job| !job.title.starts_with("reject"))
        .await
        .unwrap();

    assert_eq!(
        jobs.iter().map(|job| job.hash.as_str()).collect::<Vec<_>>(),
        vec!["country-match", "country-unknown"]
    );
}
