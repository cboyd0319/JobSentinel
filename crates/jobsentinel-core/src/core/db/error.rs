//! Database Error Types
//!
//! Domain-specific error types for database operations with detailed context
//! for better debugging and user-friendly error messages.

use crate::core::logging::path_label_for_logging;
use std::{error::Error, fmt, path::Path};

/// Comprehensive error type for database operations
#[derive(Debug)]
pub enum DatabaseError {
    /// SQLx database error
    Query {
        context: String,
        source: sqlx::Error,
    },

    /// Database connection error
    Connection { path: String, source: sqlx::Error },

    /// Migration error
    Migration { source: sqlx::migrate::MigrateError },

    /// Query timeout
    Timeout { timeout_secs: u64, query: String },

    /// Record not found
    NotFound {
        entity: String, // "job", "application", "resume"
        field: String,  // "id", "hash", "email"
        value: String,
    },

    /// Duplicate record (unique constraint violation)
    Duplicate {
        entity: String,
        field: String,
        value: String,
    },

    /// Foreign key constraint violation
    ForeignKeyViolation {
        parent_entity: String, // "job"
        child_entity: String,  // "application"
    },

    /// Data validation error
    Validation { field: String, reason: String },

    /// Field too long
    FieldTooLong {
        field: String,
        max_length: usize,
        actual_length: usize,
    },

    /// Invalid field value
    InvalidField { field: String, reason: String },

    /// Database integrity error
    Integrity { message: String },

    /// Local data integrity problem detected
    Corruption { details: String },

    /// Backup operation failed
    Backup {
        path: String,
        source: std::io::Error,
    },

    /// Restore operation failed
    Restore { path: String, reason: String },

    /// Transaction error
    Transaction {
        operation: String,
        source: Box<dyn Error + Send + Sync>,
    },

    /// Database locked (concurrent access)
    Locked { retry_after_ms: u64 },

    /// Disk full or I/O error
    Io { source: std::io::Error },

    /// Generic database error with context
    Generic { message: String },
}

impl fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Query { context, .. } => write!(f, "Could not update local job data: {context}"),
            Self::Connection { path, source } => {
                let _ = source;
                write!(
                    f,
                    "Could not open local job data at {}",
                    Self::sanitize_path(path)
                )
            }
            Self::Migration { source } => {
                let _ = source;
                write!(f, "Could not update local job data format")
            }
            Self::Timeout {
                timeout_secs,
                query,
            } => {
                write!(
                    f,
                    "Local job data took longer than {}s to respond: {}",
                    timeout_secs,
                    Self::sanitize_query(query)
                )
            }
            Self::NotFound { entity, field, .. } => {
                write!(f, "Record not found: {entity} with {field}")
            }
            Self::Duplicate { entity, field, .. } => {
                write!(f, "Duplicate {entity}: {field} already exists")
            }
            Self::ForeignKeyViolation {
                parent_entity,
                child_entity,
            } => {
                write!(
                    f,
                    "Related local job data missing: {parent_entity} not found for {child_entity}"
                )
            }
            Self::Validation { field, reason } => {
                let _ = reason;
                write!(f, "Check {field}")
            }
            Self::FieldTooLong {
                field,
                max_length,
                actual_length,
            } => {
                write!(
                    f,
                    "Field '{field}' exceeds maximum length of {max_length} (actual: {actual_length})"
                )
            }
            Self::InvalidField { field, reason } => {
                let _ = reason;
                write!(f, "Invalid {field}")
            }
            Self::Integrity { message } => {
                let _ = message;
                write!(f, "Local job data check could not finish")
            }
            Self::Corruption { details } => {
                let _ = details;
                write!(f, "Local job data could not be read")
            }
            Self::Backup { path, source } => {
                let _ = source;
                write!(f, "Backup failed at {}", Self::sanitize_path(path))
            }
            Self::Restore { path, reason } => {
                let _ = reason;
                write!(f, "Restore failed from {}", Self::sanitize_path(path))
            }
            Self::Transaction { operation, .. } => {
                write!(f, "Local job data update failed: {operation}")
            }
            Self::Locked { retry_after_ms } => {
                write!(f, "Local job data is busy. Try again in {retry_after_ms}ms")
            }
            Self::Io { source } => {
                let _ = source;
                write!(f, "Could not read or write local job data")
            }
            Self::Generic { message } => {
                let _ = message;
                write!(f, "Local job data problem")
            }
        }
    }
}

impl Error for DatabaseError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Query { source, .. } | Self::Connection { source, .. } => Some(source),
            Self::Migration { source } => Some(source),
            Self::Backup { source, .. } | Self::Io { source } => Some(source),
            Self::Transaction { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

impl DatabaseError {
    /// Create a query error with context
    pub fn query(context: impl Into<String>, source: sqlx::Error) -> Self {
        Self::Query {
            context: context.into(),
            source,
        }
    }

    /// Create a connection error
    pub fn connection(path: impl Into<String>, source: sqlx::Error) -> Self {
        Self::Connection {
            path: path.into(),
            source,
        }
    }

    /// Create a not found error
    pub fn not_found(
        entity: impl Into<String>,
        field: impl Into<String>,
        value: impl Into<String>,
    ) -> Self {
        Self::NotFound {
            entity: entity.into(),
            field: field.into(),
            value: value.into(),
        }
    }

    /// Create a duplicate error
    pub fn duplicate(
        entity: impl Into<String>,
        field: impl Into<String>,
        value: impl Into<String>,
    ) -> Self {
        Self::Duplicate {
            entity: entity.into(),
            field: field.into(),
            value: value.into(),
        }
    }

    /// Create a validation error
    pub fn validation(field: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::Validation {
            field: field.into(),
            reason: reason.into(),
        }
    }

    /// Create a field too long error
    pub fn field_too_long(
        field: impl Into<String>,
        max_length: usize,
        actual_length: usize,
    ) -> Self {
        Self::FieldTooLong {
            field: field.into(),
            max_length,
            actual_length,
        }
    }

    /// Create an invalid field error
    pub fn invalid_field(field: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::InvalidField {
            field: field.into(),
            reason: reason.into(),
        }
    }

    /// Check if this is a transient error that can be retried
    #[must_use]
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::Timeout { .. } | Self::Locked { .. } => true,
            Self::Query { source, .. } => {
                matches!(source, sqlx::Error::PoolTimedOut | sqlx::Error::Io(_))
            }
            _ => false,
        }
    }

    /// Check if this error requires user intervention
    #[must_use]
    pub fn requires_user_action(&self) -> bool {
        matches!(
            self,
            Self::Corruption { .. }
                | Self::Validation { .. }
                | Self::FieldTooLong { .. }
                | Self::InvalidField { .. }
        )
    }

    /// Get a user-friendly error message (safe to show in UI)
    #[must_use]
    pub fn user_message(&self) -> String {
        match self {
            Self::Query { context, .. } => {
                let _ = context;
                "Could not update local job data. Try again.".to_string()
            }
            Self::Connection { .. } => {
                "Could not open local job data. Copy a safe support report before closing and reopening JobSentinel.".to_string()
            }
            Self::Migration { .. } => {
                "JobSentinel could not finish updating local job data. Check for updates, or restore a backup if you have one.".to_string()
            }
            Self::Timeout { query, .. } => {
                let _ = query;
                "Local job data is taking too long to respond. Wait a moment and try again.".to_string()
            }
            Self::NotFound { entity, .. } => {
                format!("{} not found.", Self::capitalize(entity))
            }
            Self::Duplicate { entity, field, .. } => {
                format!("A {} with this {} already exists.", entity, field)
            }
            Self::Validation { field, reason } => {
                let _ = reason;
                format!("Check {} and try again.", field)
            }
            Self::FieldTooLong { field, max_length, actual_length } => {
                format!("{} is too long ({} characters, maximum {})", Self::capitalize(field), actual_length, max_length)
            }
            Self::InvalidField { field, reason } => {
                let _ = reason;
                format!("Check {} and try again.", field)
            }
            Self::Corruption { .. } => {
                "JobSentinel could not read local job data. Restore a backup if you have one.".to_string()
            }
            Self::Locked { retry_after_ms } => {
                format!("JobSentinel is still writing local data. Try again in {}ms.", retry_after_ms)
            }
            Self::Io { .. } => {
                "JobSentinel could not read or save local files. Check disk space and file access.".to_string()
            }
            _ => "Could not update local job data. Try again.".to_string(),
        }
    }

    /// Sanitize SQL query for display (remove sensitive data)
    fn sanitize_query(query: &str) -> String {
        format!("<query:{} chars>", query.chars().count())
    }

    /// Sanitize a local path for display.
    fn sanitize_path(path: &str) -> String {
        path_label_for_logging(Path::new(path))
    }

    /// Capitalize first letter of string
    fn capitalize(s: &str) -> String {
        let mut chars = s.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        }
    }
}

/// Convert SQLx errors to DatabaseError with context
impl From<sqlx::Error> for DatabaseError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => Self::NotFound {
                entity: "record".to_string(),
                field: "id".to_string(),
                value: "unknown".to_string(),
            },
            sqlx::Error::PoolTimedOut => Self::Timeout {
                timeout_secs: 30,
                query: "pool connection".to_string(),
            },
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => Self::Duplicate {
                entity: "record".to_string(),
                field: "unique constraint".to_string(),
                value: "unknown".to_string(),
            },
            sqlx::Error::Database(db_err) if db_err.is_foreign_key_violation() => {
                Self::ForeignKeyViolation {
                    parent_entity: "parent".to_string(),
                    child_entity: "child".to_string(),
                }
            }
            _ => Self::Query {
                context: "database operation".to_string(),
                source: err,
            },
        }
    }
}

/// Convert migration errors
impl From<sqlx::migrate::MigrateError> for DatabaseError {
    fn from(err: sqlx::migrate::MigrateError) -> Self {
        Self::Migration { source: err }
    }
}

/// Convert I/O errors
impl From<std::io::Error> for DatabaseError {
    fn from(err: std::io::Error) -> Self {
        Self::Io { source: err }
    }
}

/// Result type alias for database operations
pub type DatabaseResult<T> = Result<T, DatabaseError>;

#[cfg(test)]
mod tests;
