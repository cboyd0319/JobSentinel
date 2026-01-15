//! Job Board Scrapers
//!
//! Implementations for scraping various job boards.

use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;

pub mod greenhouse;
pub mod http_client;
pub mod indeed;
pub mod jobswithgpt;
pub mod lever;
pub mod linkedin;
pub mod rate_limiter;

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

/// Run all enabled scrapers
pub async fn scrape_all() -> Vec<Job> {
    // TODO: Implement parallel scraping
    vec![]
}
