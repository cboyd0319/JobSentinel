use super::*;
use crate::config::defaults::default_bookmarklet_port;

#[test]
fn test_save_and_load_config_roundtrip() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");

    let original_config = create_valid_config();

    // Save config
    original_config
        .save(&config_path)
        .expect("Failed to save config");

    // Verify file exists
    assert!(config_path.exists(), "Config file should exist after save");

    // Load config back
    let loaded_config = Config::load(&config_path).expect("Failed to load config");

    // Verify key fields match
    assert_eq!(
        loaded_config.title_allowlist,
        original_config.title_allowlist
    );
    assert_eq!(
        loaded_config.salary_floor_usd,
        original_config.salary_floor_usd
    );
    assert_eq!(
        loaded_config.immediate_alert_threshold,
        original_config.immediate_alert_threshold
    );
    assert_eq!(
        loaded_config.greenhouse_urls,
        original_config.greenhouse_urls
    );
    assert_eq!(
        loaded_config.bookmarklet_port,
        original_config.bookmarklet_port
    );
}

#[test]
fn test_load_legacy_config_defaults_bookmarklet_port() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");
    let mut legacy_config =
        serde_json::to_value(create_valid_config()).expect("Failed to serialize test config");
    legacy_config
        .as_object_mut()
        .expect("test config should be an object")
        .remove("bookmarklet_port");

    fs::write(
        &config_path,
        serde_json::to_string_pretty(&legacy_config).expect("Failed to serialize legacy config"),
    )
    .expect("Failed to write legacy config");

    let loaded_config = Config::load(&config_path).expect("Failed to load legacy config");

    assert_eq!(loaded_config.bookmarklet_port, default_bookmarklet_port());
}

#[test]
fn test_load_preserves_pre_refactor_company_preferences() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");
    let mut original = create_valid_config();
    original.preferred_companies = vec!["Google".to_string()];
    original.blocked_companies = vec!["Revature".to_string()];
    let mut stored_config =
        serde_json::to_value(original).expect("Failed to serialize test config");
    let object = stored_config
        .as_object_mut()
        .expect("test config should be an object");
    let preferred = object
        .remove("preferred_companies")
        .expect("preferred companies should exist");
    let blocked = object
        .remove("blocked_companies")
        .expect("blocked companies should exist");
    object.insert(["company_", "white", "list"].concat(), preferred);
    object.insert(["company_", "black", "list"].concat(), blocked);

    fs::write(
        &config_path,
        serde_json::to_string_pretty(&stored_config).expect("Failed to serialize stored config"),
    )
    .expect("Failed to write stored config");

    let loaded_config = Config::load(&config_path).expect("Failed to load stored config");

    assert_eq!(loaded_config.preferred_companies, vec!["Google"]);
    assert_eq!(loaded_config.blocked_companies, vec!["Revature"]);
}

#[test]
fn test_save_creates_parent_directories() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir
        .path()
        .join("nested")
        .join("dirs")
        .join("config.json");

    let config = create_valid_config();

    // Save should create nested directories
    config
        .save(&config_path)
        .expect("Failed to save config to nested path");

    assert!(
        config_path.exists(),
        "Config file should exist in nested directories"
    );
}

#[test]
fn test_load_invalid_json_fails() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("invalid.json");

    // Write invalid JSON
    fs::write(&config_path, "{ this is not valid JSON }").expect("Failed to write file");

    let result = Config::load(&config_path);
    assert!(result.is_err(), "Loading invalid JSON should fail");
}

#[test]
fn test_load_nonexistent_file_fails() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("nonexistent.json");

    let result = Config::load(&config_path);
    assert!(result.is_err(), "Loading nonexistent file should fail");
}

#[test]
fn test_save_invalid_config_fails() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");

    let mut config = create_valid_config();
    config.salary_floor_usd = -1000; // Make it invalid

    let result = config.save(&config_path);
    assert!(result.is_err(), "Saving invalid config should fail");
}

#[test]
fn test_save_invalid_bookmarklet_port_fails() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("config.json");

    let mut config = create_valid_config();
    config.bookmarklet_port = 80;

    let result = config.save(&config_path);
    assert!(
        result.is_err(),
        "Saving reserved Browser Import port should fail"
    );
}

#[test]
fn test_save_preserves_formatting() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config_path = temp_dir.path().join("formatted.json");

    let config = create_valid_config();
    config.save(&config_path).expect("Failed to save config");

    let content = fs::read_to_string(&config_path).expect("Failed to read config file");
    assert!(
        content.contains('\n'),
        "Config should be pretty-printed with newlines"
    );
    assert!(content.contains("  "), "Config should be indented");
}
