//! Job Board Scrapers
//!
//! Implementations for scraping various job boards.

use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;

pub mod builtin;
pub mod cache;
pub mod dice;
pub mod greenhouse;
pub mod hn_hiring;
pub mod http_client;
pub mod indeed;
pub mod jobswithgpt;
pub mod lever;
pub mod linkedin;
pub mod location_utils;
pub mod rate_limiter;
pub mod remoteok;
pub mod title_utils;
pub mod url_utils;
pub mod wellfound;
pub mod weworkremotely;
pub mod yc_startup;
pub mod ziprecruiter;

/// Scraper result using anyhow for automatic Send + Sync
pub type ScraperResult = Result<Vec<Job>>;

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
pub async fn scrape_all_parallel(scrapers: Vec<Box<dyn JobScraper>>) -> Vec<Job> {
    use tokio::task::JoinSet;

    if scrapers.is_empty() {
        return vec![];
    }

    tracing::info!("Starting parallel scrape of {} sources", scrapers.len());

    // Use JoinSet for parallel execution with proper ownership
    let mut join_set = JoinSet::new();

    for scraper in scrapers {
        join_set.spawn(async move {
            let name = scraper.name();
            let start = std::time::Instant::now();
            let result = scraper.scrape().await;
            let elapsed = start.elapsed();

            match result {
                Ok(jobs) => {
                    tracing::info!("{}: found {} jobs in {:?}", name, jobs.len(), elapsed);
                    jobs
                }
                Err(e) => {
                    tracing::error!("{}: scraping failed after {:?}: {}", name, elapsed, e);
                    vec![]
                }
            }
        });
    }

    // Collect all results
    let mut all_jobs = Vec::new();
    while let Some(result) = join_set.join_next().await {
        match result {
            Ok(jobs) => all_jobs.extend(jobs),
            Err(e) => tracing::error!("Scraper task panicked: {}", e),
        }
    }

    tracing::info!("Parallel scrape complete: {} total jobs", all_jobs.len());
    all_jobs
}

/// Run all enabled scrapers (legacy function, use scrape_all_parallel for new code)
#[deprecated(since = "1.3.0", note = "Use scrape_all_parallel instead")]
pub async fn scrape_all() -> Vec<Job> {
    vec![]
}
