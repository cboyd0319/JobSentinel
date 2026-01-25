//! Job Board Scrapers
//!
//! Implementations for scraping various job boards.

use crate::core::db::Job;
use async_trait::async_trait;

pub mod builtin;
pub mod cache;
pub mod dice;
pub mod error;
pub mod glassdoor;
pub mod greenhouse;
pub mod hn_hiring;
pub mod http_client;
pub mod jobswithgpt;
pub mod lever;
pub mod linkedin;
pub mod location_utils;
pub mod rate_limiter;
pub mod remoteok;
pub mod simplyhired;
pub mod title_utils;
pub mod url_utils;
pub mod usajobs;
pub mod weworkremotely;
pub mod yc_startup;

// Re-export error types
pub use error::{ScraperError, ScraperResult as TypedScraperResult};

// NOTE: SimplyHired and Glassdoor have Cloudflare protection.
// These scrapers attempt to use RSS/JSON-LD but may return empty if blocked.

// NOTE: GovernmentJobs.com and ClearanceJobs.com explicitly prohibit scraping in their ToS.
// We provide Deep Link Generator and Bookmarklet features instead. See docs/CLAUDE.md for details.

/// Scraper result type using ScraperError for better error context
///
/// This provides structured errors with helpful context for debugging and user messages.
/// All scrapers now use this typed error approach instead of anyhow::Error.
pub type ScraperResult = Result<Vec<Job>, ScraperError>;

/// Job scraper trait
#[async_trait]
pub trait JobScraper: Send + Sync {
    /// Scrape jobs from this source
    async fn scrape(&self) -> ScraperResult;

    /// Get scraper name
    fn name(&self) -> &'static str;
}

/// Run multiple scrapers in parallel and collect results
///
/// Takes a vector of boxed scrapers and executes them concurrently using tokio.
/// Results from all scrapers are combined into a single vector.
/// Errors from individual scrapers are logged but don't stop other scrapers.
///
/// # Example
/// ```ignore
/// let scrapers: Vec<Box<dyn JobScraper>> = vec![
///     Box::new(GreenhouseScraper::new(companies)),
///     Box::new(LeverScraper::new(companies)),
/// ];
/// let jobs = scrape_all_parallel(scrapers).await;
/// ```
#[tracing::instrument(skip_all, fields(scraper_count = scrapers.len()))]
pub async fn scrape_all_parallel(scrapers: Vec<Box<dyn JobScraper>>) -> Vec<Job> {
    use tokio::task::JoinSet;

    if scrapers.is_empty() {
        tracing::debug!("No scrapers provided, returning empty result");
        return vec![];
    }

    let scraper_count = scrapers.len();
    tracing::info!(scraper_count, "Starting parallel scrape");

    // Use JoinSet for parallel execution with proper ownership
    let mut join_set = JoinSet::new();

    for scraper in scrapers {
        join_set.spawn(async move {
            let name = scraper.name();
            let start = std::time::Instant::now();

            tracing::debug!(scraper = name, "Starting scraper");
            let result = scraper.scrape().await;
            let elapsed = start.elapsed();

            match result {
                Ok(jobs) => {
                    let job_count = jobs.len();
                    tracing::info!(
                        scraper = name,
                        job_count,
                        elapsed_ms = elapsed.as_millis(),
                        "Scraper completed successfully"
                    );
                    jobs
                }
                Err(e) => {
                    tracing::error!(
                        scraper = name,
                        elapsed_ms = elapsed.as_millis(),
                        error = %e,
                        "Scraper failed"
                    );
                    vec![]
                }
            }
        });
    }

    // Collect all results - pre-allocate with estimated capacity
    let mut all_jobs = Vec::with_capacity(scraper_count * 20);
    while let Some(result) = join_set.join_next().await {
        match result {
            Ok(jobs) => all_jobs.extend(jobs),
            Err(e) => {
                tracing::error!(error = %e, "Scraper task panicked");
            }
        }
    }

    let total_jobs = all_jobs.len();
    tracing::info!(total_jobs, "Parallel scrape complete");
    all_jobs
}

/// Run all enabled scrapers (legacy function, use scrape_all_parallel for new code)
#[deprecated(since = "1.3.0", note = "Use scrape_all_parallel instead")]
pub async fn scrape_all() -> Vec<Job> {
    vec![]
}
