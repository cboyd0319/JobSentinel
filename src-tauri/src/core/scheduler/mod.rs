//! Job Scraping Scheduler
//!
//! Manages periodic job scraping based on user configuration.

use anyhow::Result;
use std::time::Duration;
use tokio::time;

// Module declarations
mod pipeline;
mod types;
mod workers;

// Re-exports
pub use types::{ScheduleConfig, Scheduler, ScrapingResult};

impl Scheduler {
    pub fn new(
        config: std::sync::Arc<crate::core::config::Config>,
        database: std::sync::Arc<crate::core::db::Database>,
    ) -> Self {
        let (shutdown_tx, _) = tokio::sync::broadcast::channel(1);
        Self {
            config,
            database,
            shutdown_tx,
        }
    }

    /// Get a shutdown signal receiver
    ///
    /// This can be used to gracefully stop the scheduler
    pub fn subscribe_shutdown(&self) -> tokio::sync::broadcast::Receiver<()> {
        self.shutdown_tx.subscribe()
    }

    /// Shutdown the scheduler gracefully
    pub fn shutdown(&self) -> Result<()> {
        tracing::info!("Shutting down scheduler");
        self.shutdown_tx.send(()).ok();
        Ok(())
    }

    /// Start the scheduler
    ///
    /// This runs in the background and triggers job scraping at regular intervals.
    /// The scheduler will continue running until a shutdown signal is received.
    ///
    /// # Cancellation
    ///
    /// The scheduler can be stopped gracefully by calling `shutdown()` on the Scheduler instance.
    pub async fn start(&self) -> Result<()> {
        let interval = Duration::from_secs(self.config.scraping_interval_hours * 3600);
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tracing::info!(
            "Starting scheduler with interval: {} hours",
            self.config.scraping_interval_hours
        );

        loop {
            tracing::info!("Scheduler: Running job scraping cycle");

            match self.run_scraping_cycle().await {
                Ok(result) => {
                    tracing::info!(
                        "Scraping cycle complete: {} jobs found, {} new, {} high matches, {} alerts sent",
                        result.jobs_found,
                        result.jobs_new,
                        result.high_matches,
                        result.alerts_sent
                    );

                    if !result.errors.is_empty() {
                        tracing::warn!("Errors during scraping: {:?}", result.errors);
                    }
                }
                Err(e) => {
                    tracing::error!("Scraping cycle failed: {}", e);
                }
            }

            // Wait for next run or shutdown signal
            tracing::info!(
                "Next scraping cycle in {} hours",
                self.config.scraping_interval_hours
            );

            tokio::select! {
                _ = time::sleep(interval) => {
                    // Continue to next iteration
                }
                _ = shutdown_rx.recv() => {
                    tracing::info!("Scheduler received shutdown signal, stopping gracefully");
                    break;
                }
            }
        }

        tracing::info!("Scheduler stopped");
        Ok(())
    }
}

// Tests
#[cfg(test)]
mod tests;
