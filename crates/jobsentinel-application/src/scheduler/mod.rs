//! Runs scheduled source checks with reversible privacy pause, shutdown and recovery.

use anyhow::Result;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;
use tokio::{sync::RwLock, time};

// Module declarations
mod pipeline;
mod types;
mod workers;

// Re-exports
pub use types::{ScheduleConfig, Scheduler, ScrapingResult};

impl Scheduler {
    pub fn new(
        config: Arc<crate::config::Config>,
        database: Arc<jobsentinel_storage::Database>,
    ) -> Self {
        Self::new_shared(Arc::new(RwLock::new((*config).clone())), database)
    }

    pub fn new_shared(
        config: Arc<RwLock<crate::config::Config>>,
        database: Arc<jobsentinel_storage::Database>,
    ) -> Self {
        let credentials = Arc::new(crate::credentials::CredentialService::new(
            database.credentials(),
        ));
        Self::new_shared_with_credentials(config, database, credentials)
    }

    pub fn new_shared_with_credentials(
        config: Arc<RwLock<crate::config::Config>>,
        database: Arc<jobsentinel_storage::Database>,
        credentials: Arc<crate::credentials::CredentialService>,
    ) -> Self {
        let (shutdown_tx, _) = tokio::sync::broadcast::channel(1);
        let (cycle_cancel_tx, _) = tokio::sync::broadcast::channel(1);
        Self {
            config,
            database,
            credentials,
            shutdown_tx,
            shutdown_requested: std::sync::Mutex::new(false),
            cycle_cancelled: AtomicBool::new(false),
            cycle_cancel_tx,
            scrape_lock: Arc::new(tokio::sync::Mutex::new(())),
        }
    }

    /// Get a shutdown signal receiver
    ///
    /// This can be used to gracefully stop the scheduler
    pub fn subscribe_shutdown(&self) -> tokio::sync::broadcast::Receiver<()> {
        let receiver = self.shutdown_tx.subscribe();
        if self.is_shutdown_requested() {
            self.shutdown_tx.send(()).ok();
        }
        receiver
    }

    /// Shutdown the scheduler gracefully
    pub fn shutdown(&self) -> Result<()> {
        tracing::info!("Shutting down scheduler");
        let mut shutdown = self
            .shutdown_requested
            .lock()
            .unwrap_or_else(|p| p.into_inner());
        *shutdown = true;
        self.cycle_cancelled.store(true, Ordering::Release);
        self.cycle_cancel_tx.send(()).ok();
        self.shutdown_tx.send(()).ok();
        Ok(())
    }

    /// Cancel source checks and drain active work without stopping the scheduler loop.
    pub async fn pause_for_privacy(&self) -> Result<()> {
        {
            let _shutdown = self
                .shutdown_requested
                .lock()
                .unwrap_or_else(|p| p.into_inner());
            self.cycle_cancelled.store(true, Ordering::Release);
            self.cycle_cancel_tx.send(()).ok();
        }
        let _guard = self.scrape_lock.lock().await;
        Ok(())
    }

    /// Resume only after the privacy drain completes; shutdown remains irreversible.
    pub fn resume_after_privacy(&self) {
        let Ok(shutdown) = self.shutdown_requested.lock() else {
            return;
        };
        if !*shutdown {
            self.cycle_cancelled.store(false, Ordering::Release);
            self.cycle_cancel_tx.send(()).ok();
        }
    }

    /// Stop accepting cycles and await scheduler-owned writes already in progress.
    /// Other application writers must be quiesced separately before update handoff.
    pub async fn shutdown_and_wait(&self) -> Result<()> {
        self.shutdown()?;
        let _guard = self.scrape_lock.lock().await;
        Ok(())
    }

    /// Reconcile source checks interrupted before their terminal audit write.
    pub async fn recover_interrupted_runs(&self) -> Result<u64> {
        if self.cycle_cancelled.load(Ordering::Acquire) {
            return Ok(0);
        }
        let _guard = self.scrape_lock.lock().await;
        if self.cycle_cancelled.load(Ordering::Acquire) {
            return Ok(0);
        }
        let scraper_runs = crate::health::interrupt_running_runs(&self.database)
            .await
            .map_err(|_| anyhow::anyhow!("Could not recover interrupted source checks"))?;
        let request_attempts = crate::health::interrupt_started_source_requests(&self.database)
            .await
            .map_err(|_| anyhow::anyhow!("Could not recover interrupted source requests"))?;
        Ok(scraper_runs.saturating_add(request_attempts))
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
        let mut shutdown_rx = self.subscribe_shutdown();
        let mut recovered = false;
        loop {
            let mut cycle_changed = self.cycle_cancel_tx.subscribe();
            if self.is_shutdown_requested() {
                break;
            }
            if self.cycle_cancelled.load(Ordering::Acquire) {
                tokio::select! {
                    _ = cycle_changed.recv() => continue,
                    _ = shutdown_rx.recv() => break,
                }
            }
            if !recovered {
                let interrupted_runs = self.recover_interrupted_runs().await?;
                if interrupted_runs > 0 {
                    tracing::warn!(
                        interrupted_runs,
                        "Recovered interrupted source checks before scheduler start"
                    );
                }
                recovered = !self.cycle_cancelled.load(Ordering::Acquire);
            }

            let schedule = {
                let config = self.config.read().await;
                ScheduleConfig::from(&*config)
            };

            if !schedule.enabled {
                tracing::info!("Scheduler: auto-refresh disabled; waiting before rechecking");

                tokio::select! {
                    _ = time::sleep(Duration::from_mins(1)) => {
                        continue;
                    }
                    _ = cycle_changed.recv() => continue,
                    _ = shutdown_rx.recv() => {
                        tracing::info!("Scheduler received shutdown signal, stopping gracefully");
                        break;
                    }
                }
            }

            let interval = Duration::from_secs(schedule.interval_hours.saturating_mul(3600));

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
                        tracing::warn!(
                            error_count = result.errors.len(),
                            "Errors occurred during scraping"
                        );
                    }
                }
                Err(_e) => {
                    tracing::error!("Scraping cycle failed");
                }
            }

            if self.is_shutdown_requested() {
                tracing::info!("Scheduler reached a safe shutdown checkpoint after active cycle");
                break;
            }

            // Wait for next run or shutdown signal
            tracing::info!("Next scraping cycle in {} hours", schedule.interval_hours);

            tokio::select! {
                _ = time::sleep(interval) => {
                    // Continue to next iteration
                }
                _ = cycle_changed.recv() => {},
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
