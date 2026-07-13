use super::record_scraper_failure;
use crate::core::{
    config::Config,
    db::Database,
    health::SourceRequestOutcome,
    scrapers::{
        jobswithgpt::{JobQuery, JobsWithGptScraper},
        JobScraper, ScraperError,
    },
    Job,
};
use std::sync::Arc;

fn endpoint_host_for_source_request(endpoint: &str) -> Option<String> {
    url::Url::parse(endpoint)
        .ok()
        .and_then(|url| url.host_str().map(ToOwned::to_owned))
}

async fn finish_source_request_if_recorded(
    db: &Arc<Database>,
    request_id: Option<i64>,
    outcome: SourceRequestOutcome,
) {
    if let Some(request_id) = request_id {
        let _ = crate::core::health::finish_source_request(db, request_id, outcome).await;
    }
}

pub(super) async fn run_jobswithgpt_scraper(
    config: &Config,
    db: &Arc<Database>,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    let Some(jobswithgpt_payload) = config.jobswithgpt_payload_preview() else {
        return;
    };

    if !config.jobswithgpt_payload_approved() {
        tracing::warn!(
            source = "JobsWithGPT",
            title_count = jobswithgpt_payload.titles.len(),
            has_location = jobswithgpt_payload.location.is_some(),
            remote_only = jobswithgpt_payload.remote_only,
            limit = jobswithgpt_payload.limit,
            "JobsWithGPT source check skipped because the exact payload has not been reviewed and approved"
        );
        return;
    }

    let jobswithgpt_query = JobQuery {
        titles: jobswithgpt_payload.titles.clone(),
        location: jobswithgpt_payload.location.clone(),
        remote_only: jobswithgpt_payload.remote_only,
        limit: jobswithgpt_payload.limit,
    };

    let jobswithgpt =
        JobsWithGptScraper::new(jobswithgpt_payload.endpoint.clone(), jobswithgpt_query);

    tracing::info!(
        source = "JobsWithGPT",
        title_count = jobswithgpt_payload.titles.len(),
        has_location = jobswithgpt_payload.location.is_some(),
        remote_only = jobswithgpt_payload.remote_only,
        limit = jobswithgpt_payload.limit,
        "JobsWithGPT source check approved; sending minimized payload"
    );

    let run_id = crate::core::health::start_run(db, "jobswithgpt")
        .await
        .unwrap_or(0);
    let started_at = std::time::Instant::now();
    let endpoint_host = endpoint_host_for_source_request(&jobswithgpt_payload.endpoint);
    let source_request_id = match crate::core::health::record_source_request_started(
        db,
        "jobswithgpt",
        endpoint_host.as_deref(),
        jobswithgpt_payload.titles.len(),
        jobswithgpt_payload.location.is_some(),
        jobswithgpt_payload.remote_only,
        jobswithgpt_payload.limit,
    )
    .await
    {
        Ok(request_id) => Some(request_id),
        Err(_) => {
            tracing::warn!(
                source = "JobsWithGPT",
                "Could not record minimized source request metadata"
            );
            None
        }
    };

    match jobswithgpt.scrape().await {
        Ok(jobs) => {
            let _ = crate::core::health::complete_run(
                db,
                run_id,
                started_at.elapsed().as_millis() as i64,
                jobs.len(),
                0,
            )
            .await;
            finish_source_request_if_recorded(db, source_request_id, SourceRequestOutcome::Success)
                .await;
            tracing::info!("JobsWithGPT: {} jobs found", jobs.len());
            all_jobs.extend(jobs);
        }
        Err(error) => {
            let duration_ms = started_at.elapsed().as_millis() as i64;
            let source_request_outcome = if matches!(error, ScraperError::Timeout { .. }) {
                SourceRequestOutcome::Timeout
            } else {
                SourceRequestOutcome::Failure
            };
            record_scraper_failure(db, run_id, duration_ms, "JobsWithGPT", &error, errors).await;
            finish_source_request_if_recorded(db, source_request_id, source_request_outcome).await;
        }
    }
}
