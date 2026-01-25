//! Scraper Health Monitoring
//!
//! Comprehensive health tracking for job board scrapers including execution history,
//! performance metrics, retry logic, and credential validation.
//!
//! ## Features
//!
//! - **Run Tracking**: Record each scraper execution with timing, status, jobs found
//! - **Health Metrics**: Calculate success rate, average duration, last success time
//! - **Retry Logic**: Exponential backoff for transient failures (429, 503, timeouts)
//! - **Smoke Tests**: Live API connectivity verification before scraping
//! - **Credential Health**: Track LinkedIn cookie expiry and validation status
//! - **Selector Monitoring**: Detect broken HTML selectors for HTML scrapers
//!
//! ## Architecture
//!
//! Health data is stored in SQLite tables:
//! - `scraper_runs` - Individual execution records
//! - `scraper_config` - Per-scraper configuration and health metadata
//! - `scraper_health_status` (view) - Aggregated metrics
//!
//! ## Health Status Levels
//!
//! - **Healthy**: Success in last 24 hours
//! - **Degraded**: Success in last 7 days but not 24h
//! - **Down**: No success in 7+ days
//! - **Disabled**: Scraper intentionally disabled
//! - **Unknown**: No runs recorded yet
//!
//! ## Examples
//!
//! ```no_run
//! # use jobsentinel::core::{Database, Config};
//! # use jobsentinel::core::health::HealthManager;
//! # use std::sync::Arc;
//! # async fn example(db: Arc<Database>, config: &Config) -> anyhow::Result<()> {
//! let health = HealthManager::new(db);
//!
//! // Get all scraper health metrics
//! let metrics = health.get_all_health().await?;
//! for metric in metrics {
//!     println!("{}: {:?}", metric.display_name, metric.health_status);
//! }
//!
//! // Run smoke test
//! let result = health.run_smoke_test("greenhouse", config).await?;
//! println!("Smoke test passed: {}", result.passed);
//! # Ok(())
//! # }
//! ```

mod credential_health;
mod metrics;
mod retry;
mod smoke_tests;
mod tracking;
mod types;

#[cfg(test)]
mod tests;

pub use credential_health::*;
pub use metrics::*;
pub use retry::*;
pub use smoke_tests::*;
pub use tracking::*;
pub use types::*;

use crate::core::{Config, Database};
use anyhow::Result;
use std::sync::Arc;

/// Central manager for scraper health monitoring and diagnostics.
///
/// Aggregates health data from multiple submodules (tracking, metrics, smoke tests)
/// and provides a unified API for health queries.
pub struct HealthManager {
    database: Arc<Database>,
}

impl HealthManager {
    /// Create a new health manager with database connection.
    pub fn new(database: Arc<Database>) -> Self {
        Self { database }
    }

    /// Get aggregated health metrics for all scrapers.
    ///
    /// Queries the `scraper_health_status` view which calculates metrics
    /// from the last 24 hours of run history.
    ///
    /// # Returns
    ///
    /// Vector of metrics sorted by health status (worst first), then by name.
    /// Includes success rates, timing, job counts, and status information.
    pub async fn get_all_health(&self) -> Result<Vec<ScraperHealthMetrics>> {
        get_all_scraper_health(&self.database).await
    }

    /// Get recent execution history for a specific scraper.
    ///
    /// # Arguments
    ///
    /// * `scraper_name` - Scraper identifier (e.g. "greenhouse", "linkedin")
    /// * `limit` - Maximum number of runs to return
    ///
    /// # Returns
    ///
    /// Vector of runs ordered by start time (newest first).
    pub async fn get_runs(&self, scraper_name: &str, limit: i32) -> Result<Vec<ScraperRun>> {
        get_scraper_runs(&self.database, scraper_name, limit).await
    }

    /// Run a live connectivity smoke test for a scraper.
    ///
    /// Tests basic connectivity and authentication before running a full scrape.
    /// Useful for diagnosing failures and validating credentials.
    ///
    /// # Arguments
    ///
    /// * `scraper_name` - Scraper to test (e.g. "greenhouse", "linkedin")
    /// * `config` - Application config (contains API keys, rate limits)
    ///
    /// # Returns
    ///
    /// Test result including success status, duration, and error details.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use jobsentinel::core::{Database, Config};
    /// # use jobsentinel::core::health::HealthManager;
    /// # use std::sync::Arc;
    /// # async fn example(manager: &HealthManager, config: &Config) -> anyhow::Result<()> {
    /// let result = manager.run_smoke_test("linkedin", config).await?;
    /// if !result.passed {
    ///     eprintln!("Smoke test failed: {:?}", result.error);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn run_smoke_test(
        &self,
        scraper_name: &str,
        config: &Config,
    ) -> Result<SmokeTestResult> {
        run_smoke_test(&self.database, config, scraper_name).await
    }
}
