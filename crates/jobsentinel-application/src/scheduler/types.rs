//! Type definitions for the scheduler module

use crate::config::Config;
use crate::credentials::CredentialService;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tokio::sync::{broadcast, Mutex, RwLock};

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
            enabled: config.auto_refresh.enabled,
        }
    }
}

/// Scheduler handle
#[derive(Debug)]
pub struct Scheduler {
    pub(crate) config: Arc<RwLock<Config>>,
    pub(crate) database: Arc<jobsentinel_storage::Database>,
    pub(crate) credentials: Arc<CredentialService>,
    pub(crate) shutdown_tx: broadcast::Sender<()>,
    pub(crate) shutdown_requested: std::sync::Mutex<bool>,
    pub(crate) cycle_cancelled: AtomicBool,
    pub(crate) cycle_cancel_tx: broadcast::Sender<()>,
    pub(crate) scrape_lock: Arc<Mutex<()>>,
}

impl Scheduler {
    pub fn is_shutdown_requested(&self) -> bool {
        self.shutdown_requested.lock().map_or(true, |state| *state)
    }

    /// Whether privacy pause or shutdown blocks source cycles.
    pub fn cycles_paused(&self) -> bool {
        self.cycle_cancelled.load(Ordering::Acquire)
    }

    /// Subscribe before checking pause state so a resume wake cannot be lost.
    pub fn subscribe_cycle_changes(&self) -> broadcast::Receiver<()> {
        self.cycle_cancel_tx.subscribe()
    }
}

/// Scraping result statistics
#[derive(Debug, Clone, Default)]
pub struct ScrapingResult {
    pub jobs_found: usize,
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}
