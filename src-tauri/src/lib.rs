/// JobSentinel Core Library
///
/// This library contains all platform-agnostic business logic that can be shared
/// across desktop (Windows/macOS/Linux) and cloud deployments (GCP/AWS).

// Re-export core modules
pub mod core;
pub mod platforms;
pub mod cloud;
pub mod commands;

// Re-export commonly used types
pub use core::config::Config;
pub use core::db::{Database, Job};
pub use core::scrapers::{JobScraper, ScraperResult};
pub use core::scoring::{JobScore, ScoringEngine};
pub use core::notify::{Notification, NotificationService};
pub use core::scheduler::{Scheduler, ScheduleConfig};
