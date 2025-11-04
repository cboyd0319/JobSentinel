//! Job Scraping Scheduler
//!
//! Manages periodic job scraping based on user configuration.

use crate::core::config::Config;
use std::time::Duration;
use tokio::time;

/// Schedule configuration
#[derive(Debug, Clone)]
pub struct ScheduleConfig {
    /// Interval between scraping runs (in hours)
    pub interval_hours: u64,

    /// Whether auto-scheduling is enabled
    pub enabled: bool,
}

impl From<&Config> for ScheduleConfig {
    fn from(config: &Config) -> Self {
        ScheduleConfig {
            interval_hours: config.scraping_interval_hours,
            enabled: true, // TODO: Make this configurable
        }
    }
}

/// Scheduler handle
pub struct Scheduler {
    config: ScheduleConfig,
}

impl Scheduler {
    pub fn new(config: ScheduleConfig) -> Self {
        Self { config }
    }

    /// Start the scheduler
    ///
    /// This runs in the background and triggers job scraping at regular intervals.
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        if !self.config.enabled {
            tracing::info!("Scheduler disabled");
            return Ok(());
        }

        let interval = Duration::from_secs(self.config.interval_hours * 3600);
        tracing::info!("Starting scheduler with interval: {} hours", self.config.interval_hours);

        loop {
            tracing::info!("Scheduler: Running job scraping");

            // TODO: Call scraping logic
            // - Load configuration
            // - Run scrapers
            // - Score jobs
            // - Send notifications

            // Wait for next run
            time::sleep(interval).await;
        }
    }

    /// Run a single scraping cycle (manual trigger)
    pub async fn run_once(&self) -> Result<(), Box<dyn std::error::Error>> {
        tracing::info!("Manual scraping triggered");

        // TODO: Call scraping logic
        Ok(())
    }
}
