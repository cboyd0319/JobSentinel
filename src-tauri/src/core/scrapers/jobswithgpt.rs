//! JobsWithGPT MCP Client
//!
//! Integrates with JobsWithGPT via Model Context Protocol for 500K+ job listings.

use super::{JobScraper, ScraperResult};
use crate::core::db::Job;

pub struct JobsWithGptScraper {
    // TODO: Add MCP client configuration
}

impl JobsWithGptScraper {
    pub fn new() -> Self {
        Self {}
    }
}

// Uncomment when async_trait is added to Cargo.toml
// #[async_trait::async_trait]
// impl JobScraper for JobsWithGptScraper {
//     async fn scrape(&self) -> ScraperResult {
//         // TODO: Implement JobsWithGPT MCP integration
//         Ok(vec![])
//     }
//
//     fn name(&self) -> &'static str {
//         "jobswithgpt"
//     }
// }
