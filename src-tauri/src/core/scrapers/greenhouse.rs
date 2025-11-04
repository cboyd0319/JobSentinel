//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.

use super::{JobScraper, ScraperResult};
use crate::core::db::Job;

pub struct GreenhouseScraper {
    // TODO: Add configuration
}

impl GreenhouseScraper {
    pub fn new() -> Self {
        Self {}
    }
}

// Uncomment when async_trait is added to Cargo.toml
// #[async_trait::async_trait]
// impl JobScraper for GreenhouseScraper {
//     async fn scrape(&self) -> ScraperResult {
//         // TODO: Implement Greenhouse scraping
//         Ok(vec![])
//     }
//
//     fn name(&self) -> &'static str {
//         "greenhouse"
//     }
// }
