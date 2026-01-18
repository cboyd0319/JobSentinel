//! Scraper Health Monitoring
//!
//! Track scraper execution history, health metrics, retry logic, and credential status.
//!
//! ## Features
//!
//! - **Run Tracking**: Record each scraper execution with timing, status, jobs found
//! - **Health Metrics**: Calculate success rate, average duration, last success
//! - **Retry Logic**: Exponential backoff for transient failures (429, 503)
//! - **Smoke Tests**: Live API connectivity verification
//! - **Credential Health**: Track LinkedIn cookie expiry

mod types;
mod tracking;
mod metrics;
mod retry;
mod smoke_tests;
mod credential_health;

#[cfg(test)]
mod tests;

pub use types::*;
pub use tracking::*;
pub use metrics::*;
pub use retry::*;
pub use smoke_tests::*;
pub use credential_health::*;

use crate::core::{Config, Database};
use anyhow::Result;
use std::sync::Arc;

/// Health manager for all scrapers
pub struct HealthManager {
    database: Arc<Database>,
}

impl HealthManager {
    pub fn new(database: Arc<Database>) -> Self {
        Self { database }
    }

    /// Get health status for all scrapers
    pub async fn get_all_health(&self) -> Result<Vec<ScraperHealthMetrics>> {
        get_all_scraper_health(&self.database).await
    }

    /// Get recent runs for a specific scraper
    pub async fn get_runs(&self, scraper_name: &str, limit: i32) -> Result<Vec<ScraperRun>> {
        get_scraper_runs(&self.database, scraper_name, limit).await
    }

    /// Run smoke test for a scraper
    pub async fn run_smoke_test(
        &self,
        scraper_name: &str,
        config: &Config,
    ) -> Result<SmokeTestResult> {
        run_smoke_test(&self.database, config, scraper_name).await
    }
}
