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
mod tests {
    use super::*;

    #[test]
    fn test_not_found_error() {
        let err = DatabaseError::not_found("job", "hash", "abc123");
        assert!(matches!(err, DatabaseError::NotFound { .. }));
        assert!(err.to_string().contains("job"));
        assert!(err.to_string().contains("hash"));
    }

    #[test]
    fn test_duplicate_error() {
        let err = DatabaseError::duplicate("application", "email", "test@example.com");
        assert!(matches!(err, DatabaseError::Duplicate { .. }));
        assert!(err.to_string().contains("application"));
    }

    #[test]
    fn test_is_retryable() {
        let timeout = DatabaseError::Timeout {
            timeout_secs: 30,
            query: "SELECT * FROM jobs".to_string(),
        };
        assert!(timeout.is_retryable());

        let not_found = DatabaseError::not_found("job", "id", "123");
        assert!(!not_found.is_retryable());
    }

    #[test]
    fn test_requires_user_action() {
        let validation = DatabaseError::validation("email", "invalid format");
        assert!(validation.requires_user_action());

        let timeout = DatabaseError::Timeout {
            timeout_secs: 30,
            query: "query".to_string(),
        };
        assert!(!timeout.requires_user_action());
    }

    #[test]
    fn test_user_message() {
        let err = DatabaseError::not_found("job", "hash", "abc123");
        let msg = err.user_message();
        assert!(msg.contains("Job not found"));

        let err = DatabaseError::field_too_long("description", 1000, 1500);
        let msg = err.user_message();
        assert!(msg.contains("too long"));
        assert!(msg.contains("1500"));
        assert!(msg.contains("1000"));
    }

    #[test]
    fn test_user_message_uses_plain_local_data_copy() {
        let connection_message = DatabaseError::Connection {
            path: "private/jobs.db".to_string(),
            source: sqlx::Error::PoolTimedOut,
        }
        .user_message();

        assert!(connection_message.contains("safe support report"));
        assert!(connection_message.contains("closing and reopening JobSentinel"));
        assert!(!connection_message.contains(&["Restart", "JobSentinel"].join(" ")));

        let messages = [
            DatabaseError::Query {
                context: "private search".to_string(),
                source: sqlx::Error::Protocol(
                    "SELECT * FROM jobs WHERE token = 'secret'".to_string(),
                ),
            }
            .user_message(),
            DatabaseError::Connection {
                path: "private/jobs.db".to_string(),
                source: sqlx::Error::PoolTimedOut,
            }
            .user_message(),
            DatabaseError::Migration {
                source: sqlx::migrate::MigrateError::VersionMissing(42),
            }
            .user_message(),
            DatabaseError::Timeout {
                timeout_secs: 30,
                query: "SELECT * FROM jobs WHERE title='secret role'".to_string(),
            }
            .user_message(),
            DatabaseError::Io {
                source: std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied"),
            }
            .user_message(),
        ];

        for message in messages {
            assert!(!message.contains("Database"));
            assert!(!message.contains("database"));
            assert!(!message.contains("query"));
            assert!(!message.contains("schema"));
            assert!(!message.contains("I/O"));
            assert!(!message.contains("SELECT"));
            assert!(!message.contains("secret"));
            assert!(!message.contains("private"));
        }
    }

    #[test]
    fn test_sanitize_query() {
        let query = "SELECT * FROM users WHERE password='secret123'";
        let sanitized = DatabaseError::sanitize_query(query);
        assert_eq!(sanitized, "<query:46 chars>");
        assert!(!sanitized.contains("secret123"));
        assert!(!sanitized.contains("SELECT"));
    }

    #[test]
    fn test_field_too_long_error() {
        let err = DatabaseError::field_too_long("title", 500, 750);
        assert!(matches!(err, DatabaseError::FieldTooLong { .. }));
        assert!(err.to_string().contains("500"));
        assert!(err.to_string().contains("750"));
    }

    #[test]
    fn test_display_messages_do_not_expose_raw_paths_or_queries() {
        let timeout = DatabaseError::Timeout {
            timeout_secs: 30,
            query: "SELECT * FROM jobs WHERE title='secret role' AND token='abc123'".to_string(),
        };
        let timeout_text = timeout.to_string();
        assert!(timeout_text.contains("30s"));
        assert!(!timeout_text.contains("secret role"));
        assert!(!timeout_text.contains("abc123"));
        assert!(!timeout_text.contains("SELECT * FROM jobs"));

        let backup = DatabaseError::Backup {
            path: "private/JobSentinel/private-backup.db".to_string(),
            source: std::io::Error::new(std::io::ErrorKind::PermissionDenied, "denied"),
        };
        let backup_text = backup.to_string();
        assert!(backup_text.contains("<path:.db>"));
        assert!(!backup_text.contains("JobSentinel"));
        assert!(!backup_text.contains("private-backup"));

        let restore = DatabaseError::Restore {
            path: "private/JobSentinel/private-backup.db".to_string(),
            reason: "invalid backup".to_string(),
        };
        let restore_text = restore.to_string();
        assert!(restore_text.contains("<path:.db>"));
        assert!(!restore_text.contains("JobSentinel"));
        assert!(!restore_text.contains("private-backup"));
    }
}
