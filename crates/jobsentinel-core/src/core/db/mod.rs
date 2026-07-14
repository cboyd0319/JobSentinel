//! Database Layer (SQLite)
//!
//! Handles local database operations through a bounded SQLx-backed facade.

mod integrity;

// Internal modules
mod analytics;
mod connection;
mod crud;
mod encryption;
mod ghost;
mod interactions;
mod queries;
mod types;

// Tests
#[cfg(test)]
mod tests;

// Re-export public types
pub use types::{DuplicateGroup, GhostStatistics, Statistics};

// Re-export Database struct
pub use connection::Database;
