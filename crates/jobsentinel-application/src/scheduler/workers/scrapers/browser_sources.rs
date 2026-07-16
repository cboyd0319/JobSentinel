use std::sync::Arc;

use crate::config::Config;
use jobsentinel_domain::Job;
use jobsentinel_sources::{GlassdoorScraper, JobScraper, SimplyHiredScraper};
use jobsentinel_storage::Database;

use super::{
    record_restricted_source_acknowledgement_missing, record_scraper_failure,
    restricted_source_acknowledged,
};

pub(super) async fn run_restricted_browser_sources(
    config: &Arc<Config>,
    db: &Arc<Database>,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    // 12. SimplyHired job aggregator (v2.5.5) - may be blocked by Cloudflare
    if config.simplyhired.enabled && !config.simplyhired.query.is_empty() {
        if !restricted_source_acknowledged(config, "simplyhired") {
            record_restricted_source_acknowledgement_missing(errors, "simplyhired", "SimplyHired");
        } else {
            tracing::info!("Running SimplyHired scraper");
            let simplyhired = SimplyHiredScraper::new(
                config.simplyhired.query.clone(),
                config.simplyhired.location.clone(),
                config.simplyhired.limit,
            );

            {
                let _tid = crate::health::start_run(db, "simplyhired")
                    .await
                    .unwrap_or(0);
                let _ts = std::time::Instant::now();
                match simplyhired.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        if jobs.is_empty() {
                            tracing::warn!("SimplyHired: 0 jobs (may be Cloudflare blocked)");
                        } else {
                            tracing::info!("SimplyHired: {} jobs found", jobs.len());
                        }
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "SimplyHired", &e, errors).await;
                    }
                }
            }
        }
    }

    // 13. Glassdoor job board (v2.5.5) - may be blocked by Cloudflare
    if config.glassdoor.enabled && !config.glassdoor.query.is_empty() {
        if !restricted_source_acknowledged(config, "glassdoor") {
            record_restricted_source_acknowledgement_missing(errors, "glassdoor", "Glassdoor");
        } else {
            tracing::info!("Running Glassdoor scraper");
            let glassdoor = GlassdoorScraper::new(
                config.glassdoor.query.clone(),
                config.glassdoor.location.clone(),
                config.glassdoor.limit,
            );

            {
                let _tid = crate::health::start_run(db, "glassdoor").await.unwrap_or(0);
                let _ts = std::time::Instant::now();
                match glassdoor.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        if jobs.is_empty() {
                            tracing::warn!("Glassdoor: 0 jobs (may be Cloudflare blocked)");
                        } else {
                            tracing::info!("Glassdoor: {} jobs found", jobs.len());
                        }
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "Glassdoor", &e, errors).await;
                    }
                }
            }
        }
    }
}
