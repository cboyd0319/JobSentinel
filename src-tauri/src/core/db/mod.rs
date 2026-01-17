//! Database Layer (SQLite)
//!
//! Handles all database operations using SQLx with async support.
//! All queries use timeouts to prevent application hangs.

pub mod integrity;

// Internal modules
mod analytics;
mod connection;
mod crud;
mod ghost;
mod interactions;
mod queries;
mod types;

// Tests
#[cfg(test)]
mod tests;

// Re-export public types
pub use types::{DuplicateGroup, GhostStatistics, Job, Statistics};

// Re-export Database struct
pub use connection::Database;

// Re-export utilities
use std::time::Duration;

/// Default timeout for database queries (30 seconds)
/// This prevents the application from hanging if a query gets stuck
pub const DEFAULT_QUERY_TIMEOUT: Duration = Duration::from_secs(30);

/// Execute a future with a timeout, converting timeout errors to sqlx errors
pub async fn with_timeout<T>(
    future: impl std::future::Future<Output = Result<T, sqlx::Error>>,
) -> Result<T, sqlx::Error> {
    tokio::time::timeout(DEFAULT_QUERY_TIMEOUT, future)
        .await
        .map_err(|_| {
            tracing::error!("Database query timed out after {:?}", DEFAULT_QUERY_TIMEOUT);
            sqlx::Error::Protocol("Query timed out".into())
        })?
}
