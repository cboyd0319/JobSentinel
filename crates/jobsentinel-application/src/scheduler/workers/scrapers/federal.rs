use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use crate::{
    config::Config,
    credentials::{CredentialKey, CredentialService},
};
use jobsentinel_domain::Job;
use jobsentinel_sources::UsaJobsScraper;
use jobsentinel_storage::Database;

use super::{record_source_credential_failure, run_scraper};

pub(super) async fn run_usajobs(
    config: &Arc<Config>,
    db: &Arc<Database>,
    credentials: &CredentialService,
    shutdown_requested: &AtomicBool,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    // 11. USAJobs federal government scraper - requires API key from keyring
    if config.usajobs.enabled && !config.usajobs.email.is_empty() {
        if shutdown_requested.load(Ordering::Acquire) {
            return;
        }
        match credentials.retrieve(CredentialKey::UsaJobsApiKey).await {
            Ok(Some(api_key)) => {
                tracing::info!("Running USAJobs scraper");
                let mut scraper = UsaJobsScraper::new(api_key, config.usajobs.email.clone());

                // Apply configuration
                if let Some(ref kw) = config.usajobs.keywords {
                    scraper = scraper.with_keywords(kw.clone());
                }
                if let Some(ref loc) = config.usajobs.location {
                    scraper = scraper.with_location(loc.clone(), config.usajobs.radius);
                }
                if config.usajobs.remote_only {
                    scraper = scraper.remote_only();
                }
                if config.usajobs.pay_grade_min.is_some() || config.usajobs.pay_grade_max.is_some()
                {
                    scraper = scraper
                        .with_pay_grade(config.usajobs.pay_grade_min, config.usajobs.pay_grade_max);
                }
                scraper = scraper
                    .posted_within_days(config.usajobs.date_posted_days)
                    .with_limit(config.usajobs.limit);

                run_scraper(
                    db,
                    &scraper,
                    "usajobs",
                    "USAJobs",
                    shutdown_requested,
                    all_jobs,
                    errors,
                )
                .await;
            }
            Ok(None) => {
                tracing::warn!("USAJobs enabled but API key not configured in keyring");
            }
            Err(_e) => {
                record_source_credential_failure(errors, "USAJobs");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::minimal_test_config;

    #[tokio::test]
    async fn shutdown_skips_usajobs_before_credential_access() {
        let database = Arc::new(Database::connect_memory().await.unwrap());
        database.migrate().await.unwrap();
        let credentials =
            CredentialService::with_fixed_master_key(database.credentials(), [7; 32], false);
        database.close().await;
        let mut config = minimal_test_config();
        config.usajobs.enabled = true;
        config.usajobs.email = "test@example.com".to_string();
        let shutdown_requested = AtomicBool::new(true);
        let mut jobs = Vec::new();
        let mut errors = Vec::new();

        run_usajobs(
            &Arc::new(config),
            &database,
            &credentials,
            &shutdown_requested,
            &mut jobs,
            &mut errors,
        )
        .await;

        assert!(jobs.is_empty());
        assert!(errors.is_empty());
    }
}
