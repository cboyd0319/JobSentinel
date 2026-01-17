//! Type definitions for the scheduler module

use crate::core::config::Config;
use std::sync::Arc;
use tokio::sync::broadcast;

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
pub struct Scheduler {
    pub(crate) config: Arc<Config>,
    pub(crate) database: Arc<crate::core::db::Database>,
    pub(crate) shutdown_tx: broadcast::Sender<()>,
}

/// Scraping result statistics
#[derive(Debug, Clone)]
pub struct ScrapingResult {
    pub jobs_found: usize,
    pub jobs_new: usize,
    pub jobs_updated: usize,
    pub high_matches: usize,
    pub alerts_sent: usize,
    pub errors: Vec<String>,
}
