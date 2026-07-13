use super::*;

#[tokio::test]
async fn test_integrity_status_variants() {
    let healthy = IntegrityStatus::Healthy;
    let corrupted = IntegrityStatus::Corrupted("test error".to_string());
    let violations = IntegrityStatus::ForeignKeyViolations(vec![]);

    match healthy {
        IntegrityStatus::Healthy => {}
        _ => panic!("Expected Healthy variant"),
    }

    match corrupted {
        IntegrityStatus::Corrupted(msg) => assert_eq!(msg, "test error"),
        _ => panic!("Expected Corrupted variant"),
    }

    match violations {
        IntegrityStatus::ForeignKeyViolations(v) => assert!(v.is_empty()),
        _ => panic!("Expected ForeignKeyViolations variant"),
    }
}

#[tokio::test]
async fn test_check_result_structure() {
    let ok_result = CheckResult {
        is_ok: true,
        message: "ok".to_string(),
    };

    let fail_result = CheckResult {
        is_ok: false,
        message: "corruption detected".to_string(),
    };

    assert!(ok_result.is_ok);
    assert_eq!(ok_result.message, "ok");
    assert!(!fail_result.is_ok);
    assert_eq!(fail_result.message, "corruption detected");
}

#[tokio::test]
async fn test_backup_entry_structure() {
    let entry = BackupEntry {
        id: 1,
        backup_path: "backup.db".to_string(),
        reason: Some("manual".to_string()),
        size_bytes: Some(1024),
        created_at: "2024-01-01T00:00:00Z".to_string(),
    };

    assert_eq!(entry.id, 1);
    assert_eq!(entry.backup_path, "backup.db");
    assert_eq!(entry.reason, Some("manual".to_string()));
    assert_eq!(entry.size_bytes, Some(1024));
    assert_eq!(entry.created_at, "2024-01-01T00:00:00Z");
}

#[tokio::test]
async fn test_database_health_default() {
    let health = DatabaseHealth::default();

    assert_eq!(health.database_size_bytes, 0);
    assert_eq!(health.freelist_size_bytes, 0);
    assert_eq!(health.wal_size_bytes, 0);
    assert_eq!(health.fragmentation_percent, 0.0);
    assert_eq!(health.schema_version, 0);
    assert_eq!(health.application_id, 0);
    assert!(!health.integrity_check_overdue);
    assert!(!health.backup_overdue);
    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
    assert_eq!(health.total_jobs, 0);
    assert_eq!(health.total_integrity_checks, 0);
    assert_eq!(health.failed_integrity_checks, 0);
    assert_eq!(health.total_backups, 0);
}

#[tokio::test]
async fn test_wal_checkpoint_result_structure() {
    let result = WalCheckpointResult {
        busy: 0,
        log_frames: 100,
        checkpointed_frames: 100,
    };

    assert_eq!(result.busy, 0);
    assert_eq!(result.log_frames, 100);
    assert_eq!(result.checkpointed_frames, 100);
}

#[tokio::test]
async fn test_pragma_diagnostics_default() {
    let diag = PragmaDiagnostics::default();

    assert_eq!(diag.journal_mode, "");
    assert_eq!(diag.synchronous, 0);
    assert_eq!(diag.cache_size, 0);
    assert_eq!(diag.page_size, 0);
    assert_eq!(diag.auto_vacuum, 0);
    assert!(!diag.foreign_keys);
    assert_eq!(diag.temp_store, 0);
    assert_eq!(diag.locking_mode, "");
    assert_eq!(diag.secure_delete, 0);
    assert!(!diag.cell_size_check);
    assert_eq!(diag.sqlite_version, "");
}

#[tokio::test]
async fn test_foreign_key_violation_clone() {
    let violation = ForeignKeyViolation {
        table: "applications".to_string(),
        rowid: 1,
        parent: "jobs".to_string(),
        fkid: 0,
    };

    let cloned = violation.clone();
    assert_eq!(cloned.table, "applications");
    assert_eq!(cloned.rowid, 1);
    assert_eq!(cloned.parent, "jobs");
    assert_eq!(cloned.fkid, 0);
}

#[tokio::test]
async fn test_backup_entry_with_all_optional_fields() {
    let entry = BackupEntry {
        id: 99,
        backup_path: "backup.db".to_string(),
        reason: None,
        size_bytes: None,
        created_at: "2026-01-16T00:00:00Z".to_string(),
    };

    assert_eq!(entry.id, 99);
    assert!(entry.reason.is_none());
    assert!(entry.size_bytes.is_none());
}

#[tokio::test]
async fn test_wal_checkpoint_result_busy_state() {
    let result = WalCheckpointResult {
        busy: 1,
        log_frames: 500,
        checkpointed_frames: 300,
    };

    assert_eq!(result.busy, 1);
    assert!(result.checkpointed_frames < result.log_frames);
}

#[tokio::test]
async fn test_foreign_key_violation_debug_format() {
    let violation = ForeignKeyViolation {
        table: "test_table".to_string(),
        rowid: 42,
        parent: "parent_table".to_string(),
        fkid: 1,
    };

    let debug_str = format!("{:?}", violation);
    assert!(debug_str.contains("test_table"));
    assert!(debug_str.contains("42"));
    assert!(debug_str.contains("parent_table"));
}

#[tokio::test]
async fn test_integrity_status_debug_format() {
    let healthy = IntegrityStatus::Healthy;
    let corrupted = IntegrityStatus::Corrupted("test".to_string());
    let violations = IntegrityStatus::ForeignKeyViolations(vec![]);

    assert!(format!("{:?}", healthy).contains("Healthy"));
    assert!(format!("{:?}", corrupted).contains("Corrupted"));
    assert!(format!("{:?}", violations).contains("ForeignKeyViolations"));
}

#[tokio::test]
async fn test_database_health_clone() {
    let health = DatabaseHealth {
        database_size_bytes: 1000,
        freelist_size_bytes: 100,
        wal_size_bytes: 50,
        fragmentation_percent: 10.0,
        schema_version: 2,
        application_id: 0x4A534442,
        integrity_check_overdue: true,
        backup_overdue: false,
        days_since_last_integrity_check: 8,
        hours_since_last_backup: 12,
        total_jobs: 100,
        total_integrity_checks: 5,
        failed_integrity_checks: 0,
        total_backups: 3,
    };

    let cloned = health.clone();
    assert_eq!(cloned.database_size_bytes, 1000);
    assert_eq!(cloned.fragmentation_percent, 10.0);
    assert_eq!(cloned.total_jobs, 100);
}

#[tokio::test]
async fn test_wal_checkpoint_result_clone() {
    let result = WalCheckpointResult {
        busy: 0,
        log_frames: 200,
        checkpointed_frames: 200,
    };

    let cloned = result.clone();
    assert_eq!(cloned.busy, 0);
    assert_eq!(cloned.log_frames, 200);
    assert_eq!(cloned.checkpointed_frames, 200);
}

#[tokio::test]
async fn test_backup_entry_clone() {
    let entry = BackupEntry {
        id: 5,
        backup_path: "path.db".to_string(),
        reason: Some("test".to_string()),
        size_bytes: Some(5000),
        created_at: "2026-01-16T12:00:00Z".to_string(),
    };

    let cloned = entry.clone();
    assert_eq!(cloned.id, 5);
    assert_eq!(cloned.backup_path, "path.db");
    assert_eq!(cloned.reason, Some("test".to_string()));
}

#[tokio::test]
async fn test_pragma_diagnostics_clone() {
    let diag = PragmaDiagnostics {
        journal_mode: "wal".to_string(),
        synchronous: 2,
        cache_size: -64000,
        page_size: 4096,
        auto_vacuum: 0,
        foreign_keys: true,
        temp_store: 2,
        locking_mode: "normal".to_string(),
        secure_delete: 0,
        cell_size_check: true,
        sqlite_version: "3.40.0".to_string(),
    };

    let cloned = diag.clone();
    assert_eq!(cloned.journal_mode, "wal");
    assert_eq!(cloned.page_size, 4096);
    assert!(cloned.foreign_keys);
}
