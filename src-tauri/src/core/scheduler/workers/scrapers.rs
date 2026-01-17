//! Scraper execution logic
//!
//! Runs all configured scrapers and collects jobs

use crate::core::{
    config::Config,
    credentials::{CredentialKey, CredentialStore},
    db::Job,
    scrapers::{
        greenhouse::{GreenhouseCompany, GreenhouseScraper},
        indeed::IndeedScraper,
        jobswithgpt::{JobQuery, JobsWithGptScraper},
        lever::{LeverCompany, LeverScraper},
        linkedin::LinkedInScraper,
        JobScraper,
    },
};
use std::sync::Arc;

/// Run all configured scrapers and return jobs and errors
pub async fn run_scrapers(config: &Arc<Config>) -> (Vec<Job>, Vec<String>) {
    let mut all_jobs = Vec::new();
    let mut errors = Vec::new();

    // Greenhouse scraper - use URLs from config
    if !config.greenhouse_urls.is_empty() {
        let greenhouse_companies: Vec<GreenhouseCompany> = config
            .greenhouse_urls
            .iter()
            .filter_map(|url| {
                // Extract company ID from URL (e.g., "https://boards.greenhouse.io/cloudflare" -> "cloudflare")
                url.strip_prefix("https://boards.greenhouse.io/")
                    .map(|id| GreenhouseCompany {
                        id: id.to_string(),
                        name: id.to_string(), // Use ID as name for simplicity
                        url: url.clone(),
                    })
            })
            .collect();

        if !greenhouse_companies.is_empty() {
            let greenhouse = GreenhouseScraper::new(greenhouse_companies);
            match greenhouse.scrape().await {
                Ok(jobs) => {
                    tracing::info!("Greenhouse: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("Greenhouse scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }
    }

    // Lever scraper - use URLs from config
    if !config.lever_urls.is_empty() {
        let lever_companies: Vec<LeverCompany> = config
            .lever_urls
            .iter()
            .filter_map(|url| {
                // Extract company ID from URL (e.g., "https://jobs.lever.co/netflix" -> "netflix")
                url.strip_prefix("https://jobs.lever.co/")
                    .map(|id| LeverCompany {
                        id: id.to_string(),
                        name: id.to_string(), // Use ID as name for simplicity
                        url: url.clone(),
                    })
            })
            .collect();

        if !lever_companies.is_empty() {
            let lever = LeverScraper::new(lever_companies);
            match lever.scrape().await {
                Ok(jobs) => {
                    tracing::info!("Lever: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("Lever scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }
    }

    // JobsWithGPT MCP scraper
    if !config.title_allowlist.is_empty() {
        let jobswithgpt_query = JobQuery {
            titles: config.title_allowlist.clone(),
            location: None,
            remote_only: config.location_preferences.allow_remote
                && !config.location_preferences.allow_onsite,
            limit: 100,
        };

        let jobswithgpt =
            JobsWithGptScraper::new(config.jobswithgpt_endpoint.clone(), jobswithgpt_query);

        match jobswithgpt.scrape().await {
            Ok(jobs) => {
                tracing::info!("JobsWithGPT: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("JobsWithGPT scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // LinkedIn scraper - requires session cookie from secure storage
    if config.linkedin.enabled {
        match CredentialStore::retrieve(CredentialKey::LinkedInCookie) {
            Ok(Some(session_cookie)) => {
                tracing::info!("Running LinkedIn scraper");
                let linkedin = LinkedInScraper {
                    session_cookie,
                    query: config.linkedin.query.clone(),
                    location: config.linkedin.location.clone(),
                    remote_only: config.linkedin.remote_only,
                    limit: config.linkedin.limit,
                };

                match linkedin.scrape().await {
                    Ok(jobs) => {
                        tracing::info!("LinkedIn: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let error_msg = format!("LinkedIn scraper failed: {}", e);
                        tracing::error!("{}", error_msg);
                        errors.push(error_msg);
                    }
                }
            }
            Ok(None) => {
                tracing::warn!("LinkedIn enabled but session cookie not configured in keyring");
            }
            Err(e) => {
                let error_msg = format!("Failed to retrieve LinkedIn cookie from keyring: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // Indeed scraper - no authentication required
    if config.indeed.enabled && !config.indeed.query.is_empty() {
        tracing::info!("Running Indeed scraper");
        let indeed =
            IndeedScraper::new(config.indeed.query.clone(), config.indeed.location.clone())
                .with_radius(config.indeed.radius)
                .with_limit(config.indeed.limit);

        match indeed.scrape().await {
            Ok(jobs) => {
                tracing::info!("Indeed: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("Indeed scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    tracing::info!("Total jobs scraped: {}", all_jobs.len());

    (all_jobs, errors)
}
