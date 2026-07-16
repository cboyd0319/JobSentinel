use super::*;

#[test]
fn test_default_path() {
    let path = Database::default_path();
    assert!(path.to_string_lossy().contains("jobs.db"));
}

#[test]
fn test_default_backup_dir() {
    let path = Database::default_backup_dir();
    assert!(path.to_string_lossy().contains("backups"));
}
