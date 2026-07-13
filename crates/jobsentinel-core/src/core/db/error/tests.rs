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
            source: sqlx::Error::Protocol("SELECT * FROM jobs WHERE token = 'secret'".to_string()),
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
