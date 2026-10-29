//! Verifies persisted identity, cancellation and at-most-once notification attempts.

use super::*;
use crate::test_support::{minimal_test_config, test_job};
use std::sync::atomic::AtomicBool;

async fn setup() -> (Arc<Config>, Arc<Database>, Arc<CredentialService>) {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let credentials = Arc::new(CredentialService::with_fixed_master_key(
        database.credentials(),
        [13; 32],
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
        &AtomicBool::new(false),
        &tokio::sync::broadcast::channel(1).0,
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
        &AtomicBool::new(false),
        &tokio::sync::broadcast::channel(1).0,
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

#[tokio::test]
async fn privacy_cancellation_preserves_jobs_without_claiming_or_sending_alerts() {
    let (config, database, credentials) = setup().await;
    let jobs = [(
        test_job("private-session", "Care Coordinator", "Community Care"),
        test_high_score(),
    )];
    let result = persist_and_notify(
        &jobs,
        &config,
        &database,
        &credentials,
        &AtomicBool::new(true),
        &tokio::sync::broadcast::channel(1).0,
    )
    .await;
    assert_eq!(result.jobs_new, 1);
    assert_eq!(result.alerts_sent, 0);
    assert!(result.errors.is_empty());
    assert!(
        !database
            .get_job_by_hash("private-session")
            .await
            .unwrap()
            .unwrap()
            .immediate_alert_sent
    );
    let resumed = persist_and_notify(
        &jobs,
        &config,
        &database,
        &credentials,
        &AtomicBool::new(false),
        &tokio::sync::broadcast::channel(1).0,
    )
    .await;
    assert_eq!(resumed.alerts_sent, 1);
}

#[tokio::test]
async fn privacy_cancellation_drops_active_delivery_before_later_channels() {
    let (_, database, _) = setup().await;
    let job = test_job("cancelled-delivery", "Care Coordinator", "Community Care");
    database.upsert_job(&job).await.unwrap();
    assert!(database.claim_immediate_alert(&job.hash).await.unwrap());
    let cancelled = Arc::new(AtomicBool::new(false));
    let (signal, _) = tokio::sync::broadcast::channel(1);
    let began = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let later_channel = Arc::new(AtomicBool::new(false));
    let (task_cancelled, task_signal, task_began, task_release, task_later) = (
        cancelled.clone(),
        signal.clone(),
        began.clone(),
        release.clone(),
        later_channel.clone(),
    );
    let task = tokio::spawn(async move {
        deliver_unless_cancelled(
            async {
                task_began.notify_one();
                task_release.notified().await;
                task_later.store(true, Ordering::Release);
                Ok(())
            },
            &task_cancelled,
            &task_signal,
        )
        .await
    });
    tokio::time::timeout(std::time::Duration::from_secs(2), began.notified())
        .await
        .unwrap();
    cancelled.store(true, Ordering::Release);
    signal.send(()).unwrap();
    assert!(
        tokio::time::timeout(std::time::Duration::from_secs(2), task)
            .await
            .unwrap()
            .unwrap()
            .is_none()
    );
    release.notify_one();
    assert!(!later_channel.load(Ordering::Acquire));
    assert!(
        database
            .get_job_by_hash(&job.hash)
            .await
            .unwrap()
            .unwrap()
            .immediate_alert_sent
    );
}

#[tokio::test]
async fn failed_notification_is_not_retried_automatically() {
    let mut config = minimal_test_config();
    config.alerts.slack.enabled = true;
    let config = Arc::new(config);
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let credentials = Arc::new(CredentialService::with_fixed_master_key(
        database.credentials(),
        [7; 32],
    ));
    let job = test_job("notification-failure", "Care Coordinator", "Community Care");
    let jobs = [(job, test_high_score())];
    let signal = tokio::sync::broadcast::channel(1).0;
    let first = persist_and_notify(
        &jobs,
        &config,
        &database,
        &credentials,
        &AtomicBool::new(false),
        &signal,
    )
    .await;
    let second = persist_and_notify(
        &jobs,
        &config,
        &database,
        &credentials,
        &AtomicBool::new(false),
        &signal,
    )
    .await;

    assert_eq!(first.alerts_sent, 0);
    assert_eq!(first.errors, ["Notification delivery error for one job"]);
    assert!(second.errors.is_empty());
    assert!(
        database
            .get_job_by_hash("notification-failure")
            .await
            .unwrap()
            .unwrap()
            .immediate_alert_sent
    );
}
