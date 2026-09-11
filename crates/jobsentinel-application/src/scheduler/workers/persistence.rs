//! Persists scheduler jobs and makes country-filtered at-most-once immediate-alert claims.

use crate::{
    config::Config,
    country_search::{classify_country_scope, CountryScope},
    credentials::CredentialService,
    notify::{Notification, NotificationService},
    scoring::{JobScore, ScoringEngine},
};
use jobsentinel_storage::Database;
use std::sync::Arc;

use jobsentinel_storage::database_error_kind;

/// Statistics from persistence and notification operations
#[derive(Debug)]
pub(crate) struct PersistenceStats {
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}

#[cfg(test)]
fn test_high_score() -> JobScore {
    JobScore {
        total: 1.0,
        breakdown: crate::scoring::ScoreBreakdown {
            skills: 0.4,
            salary: 0.25,
            location: 0.2,
            company: 0.1,
            recency: 0.05,
        },
        reasons: Vec::new(),
    }
}

/// Persist jobs to database and send notifications for high-scoring jobs
#[tracing::instrument(skip_all, fields(job_count = scored_jobs.len()), level = "info")]
pub(crate) async fn persist_and_notify(
    scored_jobs: &[(jobsentinel_domain::Job, JobScore)],
    config: &Arc<Config>,
    database: &Arc<Database>,
    credentials: &Arc<CredentialService>,
) -> PersistenceStats {
    use std::time::Instant;

    let start = Instant::now();
    let mut jobs_new = 0;
    let mut jobs_updated = 0;
    let mut high_matches = 0;
    let mut alerts_sent = 0;
    let mut errors = Vec::new();
    let mut persisted_candidates = Vec::with_capacity(scored_jobs.len());

    // Store in database
    let job_count = scored_jobs.len();
    tracing::debug!(job_count, "Starting database persistence");

    for (job, _score) in scored_jobs {
        // Check if job exists before upserting
        let was_existing = database
            .get_job_by_hash(&job.hash)
            .await
            .ok()
            .flatten()
            .is_some();

        if was_existing {
            jobs_updated += 1;
        } else {
            jobs_new += 1;
        }

        let persisted = match database.upsert_job(job).await {
            Ok(_) => true,
            Err(e) => {
                tracing::error!(
                    job_hash = %job.hash,
                    error_kind = database_error_kind(&e),
                    "Failed to upsert job"
                );
                errors.push(format!(
                    "Database error while saving one job ({})",
                    database_error_kind(&e)
                ));
                false
            }
        };
        persisted_candidates.push(persisted);

        if persisted {
            // Track reposts only after the canonical job record exists.
            if let Err(e) = database
                .track_repost(&job.company, &job.title, &job.source, &job.hash)
                .await
            {
                tracing::debug!(
                    job_hash = %job.hash,
                    error_kind = database_error_kind(&e),
                    "Failed to track repost"
                );
            }
        }
    }

    let persist_duration = start.elapsed();
    tracing::info!(
        jobs_new,
        jobs_updated,
        elapsed_ms = persist_duration.as_millis(),
        "Database persistence complete"
    );

    // Send notifications for high-scoring jobs
    let notify_start = Instant::now();
    tracing::debug!("Processing notifications");
    let notification_service =
        NotificationService::with_credentials(Arc::clone(config), Arc::clone(credentials));
    let scoring_engine = ScoringEngine::new(Arc::clone(config));

    for ((job, score), persisted) in scored_jobs.iter().zip(persisted_candidates) {
        if !persisted || !scoring_engine.should_alert_immediately(score) {
            continue;
        }

        let persisted_job = match database.get_job_by_hash(&job.hash).await {
            Ok(Some(job)) => job,
            Ok(None) => {
                tracing::error!(job_hash = %job.hash, "Persisted job was unavailable for alert");
                errors.push("Database error while reading one persisted job (missing)".to_string());
                continue;
            }
            Err(e) => {
                tracing::error!(
                    job_hash = %job.hash,
                    error_kind = database_error_kind(&e),
                    "Failed to read persisted job for alert"
                );
                errors.push(format!(
                    "Database error while reading one persisted job ({})",
                    database_error_kind(&e)
                ));
                continue;
            }
        };

        if classify_country_scope(
            &persisted_job,
            config.location_preferences.search_country.as_deref(),
        ) == CountryScope::Mismatch
        {
            continue;
        }

        high_matches += 1;

        // Claim before delivery to preserve at-most-once external alert attempts.
        // Ambiguous or failed attempts are visible but never retried automatically.
        match database.claim_immediate_alert(&job.hash).await {
            Ok(true) => {}
            Ok(false) => continue,
            Err(e) => {
                tracing::error!(
                    job_hash = %job.hash,
                    error_kind = database_error_kind(&e),
                    "Failed to claim alert delivery"
                );
                errors.push(format!(
                    "Database error while claiming one alert ({})",
                    database_error_kind(&e)
                ));
                continue;
            }
        }

        let notification = Notification {
            job: persisted_job,
            score: score.clone(),
        };

        match notification_service
            .send_immediate_alert(&notification)
            .await
        {
            Ok(()) => {
                tracing::info!(
                    job_hash = %job.hash,
                    job_score = score.total,
                    "Notification alert sent"
                );
                alerts_sent += 1;
            }
            Err(_e) => {
                tracing::error!(
                    job_hash = %job.hash,
                    error_kind = "notification_delivery",
                    "Failed to send notification alert"
                );
                errors.push("Notification delivery error for one job".to_string());
            }
        }
    }

    let notify_duration = notify_start.elapsed();
    tracing::info!(
        high_matches,
        alerts_sent,
        elapsed_ms = notify_duration.as_millis(),
        "Notifications complete"
    );

    PersistenceStats {
        jobs_new,
        jobs_updated,
        high_matches,
        alerts_sent,
        errors,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::{minimal_test_config, test_job};
    use jobsentinel_domain::{CountryObservation, JobGeography, LocationObservation};

    fn observed_geography(
        worksites: &[Option<&str>],
        remote_applicants: &[Option<&str>],
    ) -> JobGeography {
        let observation = |country: Option<&str>| LocationObservation {
            raw_location: country.unwrap_or("Not stated").to_string(),
            country: country.map(|raw_country| CountryObservation {
                raw_country: raw_country.to_string(),
                alpha2: Some(
                    jobsentinel_domain::normalize_country_code(raw_country)
                        .unwrap()
                        .to_string(),
                ),
            }),
        };
        JobGeography {
            worksite_locations: worksites.iter().copied().map(observation).collect(),
            remote_applicant_locations: remote_applicants
                .iter()
                .copied()
                .map(observation)
                .collect(),
        }
    }
    fn job_with_geography(
        hash: &str,
        remote: bool,
        worksites: &[Option<&str>],
        remote_applicants: &[Option<&str>],
    ) -> jobsentinel_domain::Job {
        let mut job = test_job(hash, "Care Coordinator", "Community Care");
        job.remote = remote.then_some(true);
        job.location = None;
        job.geography = Some(observed_geography(worksites, remote_applicants));
        job
    }

    fn config_snapshot(country: &str) -> Arc<Config> {
        let mut config = minimal_test_config();
        config.immediate_alert_threshold = 0.5;
        config.location_preferences.search_country = Some(country.to_string());
        Arc::new(config)
    }

    async fn setup(country: &str) -> (Arc<Config>, Arc<Database>, Arc<CredentialService>) {
        let config = config_snapshot(country);
        let database = Arc::new(Database::connect_memory().await.unwrap());
        database.migrate().await.unwrap();
        let credentials = Arc::new(CredentialService::with_fixed_master_key(
            database.credentials(),
            [11; 32],
            false,
        ));
        (config, database, credentials)
    }

    async fn persisted_job(database: &Database, hash: &str) -> jobsentinel_domain::Job {
        database.get_job_by_hash(hash).await.unwrap().unwrap()
    }

    async fn persist_high(
        job: jobsentinel_domain::Job,
        config: &Arc<Config>,
        database: &Arc<Database>,
        credentials: &Arc<CredentialService>,
    ) -> PersistenceStats {
        persist_and_notify(&[(job, test_high_score())], config, database, credentials).await
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
            false,
        ));
        let job = test_job("notification-failure", "Care Coordinator", "Community Care");
        let score = test_high_score();

        let first = persist_and_notify(
            &[(job.clone(), score.clone())],
            &config,
            &database,
            &credentials,
        )
        .await;
        let second = persist_and_notify(&[(job, score)], &config, &database, &credentials).await;

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

    #[tokio::test]
    async fn incoming_mismatch_is_stored_but_not_a_high_match_or_alert_claim() {
        let (config, database, credentials) = setup("GB").await;
        let job = job_with_geography("us-mismatch", false, &[Some("United States")], &[]);

        let stats = persist_high(job, &config, &database, &credentials).await;

        assert_eq!(stats.high_matches, 0);
        assert!(stats.errors.is_empty());
        assert!(
            !persisted_job(&database, "us-mismatch")
                .await
                .immediate_alert_sent
        );
    }

    #[tokio::test]
    async fn remote_uses_applicant_locations_not_us_headquarters() {
        let remote_job = job_with_geography(
            "remote-gb",
            true,
            &[Some("United States")],
            &[Some("United Kingdom")],
        );
        let (gb_config, gb_database, gb_credentials) = setup("GB").await;
        let gb_stats = persist_high(
            remote_job.clone(),
            &gb_config,
            &gb_database,
            &gb_credentials,
        )
        .await;
        assert_eq!(gb_stats.high_matches, 1);
        assert!(gb_stats.errors.is_empty());
        assert!(
            persisted_job(&gb_database, "remote-gb")
                .await
                .immediate_alert_sent
        );

        let (us_config, us_database, us_credentials) = setup("US").await;
        let us_stats = persist_high(remote_job, &us_config, &us_database, &us_credentials).await;
        assert_eq!(us_stats.high_matches, 0);
        assert!(us_stats.errors.is_empty());
        assert!(
            !persisted_job(&us_database, "remote-gb")
                .await
                .immediate_alert_sent
        );
    }

    #[tokio::test]
    async fn missing_and_mixed_country_observations_remain_alert_eligible() {
        let (config, database, credentials) = setup("US").await;
        let missing = job_with_geography("missing-country", false, &[None], &[]);
        let mixed = job_with_geography("mixed-country", false, &[Some("Canada"), None], &[]);
        let mut no_geography = test_job("no-geography", "Care Coordinator", "Community Care");
        no_geography.location = None;
        no_geography.geography = None;

        let stats = persist_and_notify(
            &[
                (missing, test_high_score()),
                (mixed, test_high_score()),
                (no_geography, test_high_score()),
            ],
            &config,
            &database,
            &credentials,
        )
        .await;

        assert_eq!(stats.high_matches, 3);
        assert!(stats.errors.is_empty());
        for hash in ["missing-country", "mixed-country", "no-geography"] {
            assert!(persisted_job(&database, hash).await.immediate_alert_sent);
        }
    }

    #[tokio::test]
    async fn legacy_incoming_none_uses_preserved_persisted_geography_for_alert_gating() {
        let (config, database, credentials) = setup("GB").await;
        let existing = job_with_geography("legacy-geography", false, &[Some("United States")], &[]);
        database.upsert_job(&existing).await.unwrap();
        let mut incoming = existing;
        incoming.geography = None;

        let stats = persist_high(incoming, &config, &database, &credentials).await;

        assert_eq!(stats.high_matches, 0);
        assert!(stats.errors.is_empty());
        let stored = persisted_job(&database, "legacy-geography").await;
        assert_eq!(
            stored.geography.as_ref().unwrap().worksite_locations.len(),
            1
        );
        assert!(!stored.immediate_alert_sent);
    }

    #[tokio::test]
    async fn failed_save_does_not_claim_an_existing_job() {
        let (config, database, credentials) = setup("GB").await;
        let existing = job_with_geography("failed-save", false, &[Some("United Kingdom")], &[]);
        database.upsert_job(&existing).await.unwrap();
        let mut incoming = existing;
        incoming.url = "http://invalid.example.test".to_string();

        let stats = persist_high(incoming, &config, &database, &credentials).await;

        assert_eq!(stats.high_matches, 0);
        assert_eq!(stats.errors.len(), 1);
        assert!(
            !persisted_job(&database, "failed-save")
                .await
                .immediate_alert_sent
        );
    }

    #[tokio::test]
    async fn later_reobservation_can_claim_a_previously_excluded_job() {
        let (gb_config, database, credentials) = setup("GB").await;
        let job = job_with_geography("later-match", false, &[Some("United States")], &[]);
        let excluded_stats = persist_high(job.clone(), &gb_config, &database, &credentials).await;
        assert_eq!(excluded_stats.high_matches, 0);
        assert_eq!(
            persisted_job(&database, "later-match")
                .await
                .geography
                .unwrap()
                .worksite_locations[0]
                .country
                .as_ref()
                .unwrap()
                .alpha2
                .as_deref(),
            Some("US")
        );

        let us_config = config_snapshot("US");
        let matched_stats = persist_high(job, &us_config, &database, &credentials).await;
        assert_eq!(matched_stats.high_matches, 1);
        assert!(matched_stats.errors.is_empty());
        assert!(
            persisted_job(&database, "later-match")
                .await
                .immediate_alert_sent
        );
    }
}

#[cfg(test)]
#[path = "persistence_repost_tests.rs"]
mod persistence_repost_tests;
