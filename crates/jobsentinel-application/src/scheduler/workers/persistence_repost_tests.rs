//! Proves scheduler persistence records repost history only under successful canonical job identity.

use super::*;
use crate::test_support::{minimal_test_config, test_job};

async fn setup() -> (Arc<Config>, Arc<Database>, Arc<CredentialService>) {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let credentials = Arc::new(CredentialService::with_fixed_master_key(
        database.credentials(),
        [13; 32],
        false,
    ));
    (Arc::new(minimal_test_config()), database, credentials)
}

#[tokio::test]
async fn successful_persistence_tracks_reposts_under_the_job_identity() {
    let (config, database, credentials) = setup().await;
    let job = test_job("correct-repost", "Care Coordinator", "Community Care");

    persist_and_notify(
        &[(job.clone(), test_high_score())],
        &config,
        &database,
        &credentials,
    )
    .await;

    assert_eq!(
        database
            .get_repost_count(&job.company, &job.title, &job.source)
            .await
            .unwrap(),
        1
    );
    assert_eq!(
        database
            .get_repost_count(&job.hash, &job.company, &job.title)
            .await
            .unwrap(),
        0
    );
}

#[tokio::test]
async fn failed_save_does_not_create_canonical_or_wrongly_keyed_repost_history() {
    let (config, database, credentials) = setup().await;
    let mut job = test_job("failed-repost", "Care Coordinator", "Community Care");
    job.url = "http://invalid.example.test".to_string();

    persist_and_notify(
        &[(job.clone(), test_high_score())],
        &config,
        &database,
        &credentials,
    )
    .await;

    for (company, title, source) in [
        (&job.company, &job.title, &job.source),
        (&job.hash, &job.company, &job.title),
    ] {
        assert_eq!(
            database
                .get_repost_count(company, title, source)
                .await
                .unwrap(),
            0
        );
    }
}
