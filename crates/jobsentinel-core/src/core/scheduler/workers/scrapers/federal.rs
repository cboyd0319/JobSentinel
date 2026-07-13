use std::sync::Arc;

use crate::core::{
    config::Config,
    credentials::{CredentialKey, CredentialService},
    db::Database,
    scrapers::{JobScraper, UsaJobsScraper},
    Job,
};

use super::{record_scraper_failure, record_source_credential_failure};

pub(super) async fn run_usajobs(
    config: &Arc<Config>,
    db: &Arc<Database>,
    credentials: &CredentialService,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    // 11. USAJobs federal government scraper - requires API key from keyring
    if config.usajobs.enabled && !config.usajobs.email.is_empty() {
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

                {
                    let _tid = crate::core::health::start_run(db, "usajobs")
                        .await
                        .unwrap_or(0);
                    let _ts = std::time::Instant::now();
                    match scraper.scrape().await {
                        Ok(jobs) => {
                            let _ = crate::core::health::complete_run(
                                db,
                                _tid,
                                _ts.elapsed().as_millis() as i64,
                                jobs.len(),
                                0,
                            )
                            .await;
                            tracing::info!("USAJobs: {} jobs found", jobs.len());
                            all_jobs.extend(jobs);
                        }
                        Err(e) => {
                            let _dur = _ts.elapsed().as_millis() as i64;
                            record_scraper_failure(db, _tid, _dur, "USAJobs", &e, errors).await;
                        }
                    }
                }
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
