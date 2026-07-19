use std::sync::{atomic::AtomicBool, Arc};

use crate::config::Config;
use jobsentinel_domain::Job;
use jobsentinel_sources::{GlassdoorScraper, SimplyHiredScraper};
use jobsentinel_storage::Database;

use super::{
    record_restricted_source_acknowledgement_missing, restricted_source_acknowledged, run_scraper,
    ScraperRunOutcome,
};

pub(super) async fn run_restricted_browser_sources(
    config: &Arc<Config>,
    db: &Arc<Database>,
    shutdown_requested: &AtomicBool,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    // 12. SimplyHired job aggregator (v2.5.5) - may be blocked by Cloudflare
    if config.simplyhired.enabled && !config.simplyhired.query.is_empty() {
        if !restricted_source_acknowledged(db, config, "simplyhired").await {
            record_restricted_source_acknowledgement_missing(errors, "simplyhired", "SimplyHired");
        } else {
            tracing::info!("Running SimplyHired scraper");
            let simplyhired = SimplyHiredScraper::new(
                config.simplyhired.query.clone(),
                config.simplyhired.location.clone(),
                config.simplyhired.limit,
            );

            if matches!(
                run_scraper(
                    db,
                    &simplyhired,
                    "simplyhired",
                    "SimplyHired",
                    shutdown_requested,
                    all_jobs,
                    errors,
                )
                .await,
                ScraperRunOutcome::Success { jobs_found: 0 }
            ) {
                tracing::warn!("SimplyHired: 0 jobs (may be Cloudflare blocked)");
            }
        }
    }

    // 13. Glassdoor job board (v2.5.5) - may be blocked by Cloudflare
    if config.glassdoor.enabled && !config.glassdoor.query.is_empty() {
        if !restricted_source_acknowledged(db, config, "glassdoor").await {
            record_restricted_source_acknowledgement_missing(errors, "glassdoor", "Glassdoor");
        } else {
            tracing::info!("Running Glassdoor scraper");
            let glassdoor = GlassdoorScraper::new(
                config.glassdoor.query.clone(),
                config.glassdoor.location.clone(),
                config.glassdoor.limit,
            );

            if matches!(
                run_scraper(
                    db,
                    &glassdoor,
                    "glassdoor",
                    "Glassdoor",
                    shutdown_requested,
                    all_jobs,
                    errors,
                )
                .await,
                ScraperRunOutcome::Success { jobs_found: 0 }
            ) {
                tracing::warn!("Glassdoor: 0 jobs (may be Cloudflare blocked)");
            }
        }
    }
}
