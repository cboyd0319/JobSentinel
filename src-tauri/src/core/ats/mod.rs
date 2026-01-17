//! Application Tracking System (ATS)
//!
//! Track job applications through their entire lifecycle with Kanban board,
//! automated reminders, and comprehensive timeline tracking.

// Module declarations
mod interview;
mod reminders;
mod tracker;
mod types;

#[cfg(test)]
mod tests;

// Public exports
pub use tracker::ApplicationTracker;
pub use types::*;
