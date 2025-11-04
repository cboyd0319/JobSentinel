//! Lever ATS Scraper
//!
//! Scrapes jobs from Lever-powered career pages.

use super::{JobScraper, ScraperResult};
use crate::core::db::Job;

pub struct LeverScraper {
    // TODO: Add configuration
}

impl LeverScraper {
    pub fn new() -> Self {
        Self {}
    }
}

// Uncomment when async_trait is added to Cargo.toml
// #[async_trait::async_trait]
// impl JobScraper for LeverScraper {
//     async fn scrape(&self) -> ScraperResult {
//         // TODO: Implement Lever scraping
//         Ok(vec![])
//     }
//
//     fn name(&self) -> &'static str {
//         "lever"
//     }
// }
