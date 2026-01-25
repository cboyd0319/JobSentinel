//! Database Error Types
//!
//! Domain-specific error types for database operations with detailed context
//! for better debugging and user-friendly error messages.

use thiserror::Error;

/// Comprehensive error type for database operations
#[derive(Error, Debug)]
pub enum DatabaseError {
    /// SQLx database error
    #[error("Database query error: {context}")]
    Query {
        context: String,
        #[source]
        source: sqlx::Error,
    },

    /// Database connection error
    #[error("Failed to connect to database at {path}: {source}")]
    Connection {
        path: String,
        #[source]
        source: sqlx::Error,
    },

    /// Migration error
    #[error("Database migration failed: {source}")]
    Migration {
        #[source]
        source: sqlx::migrate::MigrateError,
    },

    /// Query timeout
    #[error("Database query timed out after {timeout_secs}s: {query}")]
    Timeout { timeout_secs: u64, query: String },

    /// Record not found
    #[error("Record not found: {entity} with {field}={value}")]
    NotFound {
        entity: String, // "job", "application", "resume"
        field: String,  // "id", "hash", "email"
        value: String,
    },

    /// Duplicate record (unique constraint violation)
    #[error("Duplicate {entity}: {field}={value} already exists")]
    Duplicate {
        entity: String,
        field: String,
        value: String,
    },

    /// Foreign key constraint violation
    #[error("Foreign key violation: {parent_entity} not found for {child_entity}")]
    ForeignKeyViolation {
        parent_entity: String, // "job"
        child_entity: String,  // "application"
    },

    /// Data validation error
    #[error("Validation error for {field}: {reason}")]
    Validation { field: String, reason: String },

    /// Field too long
    #[error("Field '{field}' exceeds maximum length of {max_length} (actual: {actual_length})")]
    FieldTooLong {
        field: String,
        max_length: usize,
        actual_length: usize,
    },

    /// Invalid field value
    #[error("Invalid {field}: {reason}")]
    InvalidField { field: String, reason: String },

    /// Database integrity error
    #[error("Database integrity check failed: {message}")]
    Integrity { message: String },

    /// Database corruption detected
    #[error("Database corruption detected: {details}")]
    Corruption { details: String },

    /// Backup operation failed
    #[error("Backup failed at {path}: {source}")]
    Backup {
        path: String,
        #[source]
        source: std::io::Error,
    },

    /// Restore operation failed
    #[error("Restore failed from {path}: {reason}")]
    Restore { path: String, reason: String },

    /// Transaction error
    #[error("Transaction failed: {operation}")]
    Transaction {
        operation: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// Database locked (concurrent access)
    #[error("Database is locked - retry in {retry_after_ms}ms")]
    Locked { retry_after_ms: u64 },

    /// Disk full or I/O error
    #[error("Disk I/O error: {source}")]
    Io {
        #[source]
        source: std::io::Error,
    },

    /// Generic database error with context
    #[error("Database error: {message}")]
    Generic { message: String },
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
    pub fn field_too_long(field: impl Into<String>, max_length: usize, actual_length: usize) -> Self {
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
                format!("Database operation failed: {}", context)
            }
            Self::Connection { .. } => {
                "Failed to connect to database. Please check if the database file exists and is accessible.".to_string()
            }
            Self::Migration { .. } => {
                "Database schema migration failed. Please check for updates or restore from backup.".to_string()
            }
            Self::Timeout { query, .. } => {
                format!("Database query timed out: {}. The database may be under heavy load.", Self::sanitize_query(query))
            }
            Self::NotFound { entity, .. } => {
                format!("{} not found.", Self::capitalize(entity))
            }
            Self::Duplicate { entity, field, .. } => {
                format!("A {} with this {} already exists.", entity, field)
            }
            Self::Validation { field, reason } => {
                format!("Invalid {}: {}", field, reason)
            }
            Self::FieldTooLong { field, max_length, actual_length } => {
                format!("{} is too long ({} characters, maximum {})", Self::capitalize(field), actual_length, max_length)
            }
            Self::InvalidField { field, reason } => {
                format!("Invalid {}: {}", field, reason)
            }
            Self::Corruption { .. } => {
                "Database corruption detected. Please restore from a backup.".to_string()
            }
            Self::Locked { retry_after_ms } => {
                format!("Database is busy. Please try again in {}ms.", retry_after_ms)
            }
            Self::Io { .. } => {
                "Disk I/O error. Please check disk space and permissions.".to_string()
            }
            _ => "A database error occurred.".to_string(),
        }
    }

    /// Sanitize SQL query for display (remove sensitive data)
    fn sanitize_query(query: &str) -> String {
        // Truncate long queries and remove potential sensitive data
        let truncated = if query.len() > 100 {
            format!("{}...", &query[..100])
        } else {
            query.to_string()
        };

        // Remove potential sensitive patterns (simplified)
        truncated
            .replace("password", "***")
            .replace("token", "***")
            .replace("secret", "***")
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
    fn test_sanitize_query() {
        let query = "SELECT * FROM users WHERE password='secret123'";
        let sanitized = DatabaseError::sanitize_query(query);
        assert!(sanitized.contains("***"));
        assert!(!sanitized.contains("secret123"));
    }

    #[test]
    fn test_field_too_long_error() {
        let err = DatabaseError::field_too_long("title", 500, 750);
        assert!(matches!(err, DatabaseError::FieldTooLong { .. }));
        assert!(err.to_string().contains("500"));
        assert!(err.to_string().contains("750"));
    }
}
