use super::*;

#[test]
fn test_empty_greenhouse_url_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = vec!["".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty Greenhouse URL should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Greenhouse URLs cannot be empty"));
}

#[test]
fn test_invalid_greenhouse_url_prefix_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = vec!["https://wrongsite.com/company".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid Greenhouse URL prefix should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Greenhouse URL format"));
}

#[test]
fn test_greenhouse_url_authority_confusion_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io@127.0.0.1/company".to_string()];

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Greenhouse authority confusion should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Greenhouse URL format"));
}

#[test]
fn test_greenhouse_url_nested_path_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/company/jobs/123".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Nested Greenhouse board URL should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Greenhouse URL format"));
}

#[test]
fn test_invalid_greenhouse_url_error_sanitizes_sensitive_parts() {
    let mut config = create_valid_config();
    config.greenhouse_urls =
        vec!["https://user:pass@wrongsite.com/company?query=private#fragment".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid Greenhouse URL prefix should fail");
    let error = result.unwrap_err().to_string();

    assert!(error.contains("Got: https://wrongsite.com/company"));
    assert!(!error.contains("user"));
    assert!(!error.contains("pass"));
    assert!(!error.contains("private"));
    assert!(!error.contains("fragment"));
}

#[test]
fn test_greenhouse_url_too_long_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = vec![format!("https://boards.greenhouse.io/{}", "x".repeat(500))];

    let result = validate_config(&config);
    assert!(result.is_err(), "Greenhouse URL > 500 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Greenhouse URL too long"));
}

#[test]
fn test_too_many_greenhouse_urls_fails() {
    let mut config = create_valid_config();
    config.greenhouse_urls = (0..101)
        .map(|i| format!("https://boards.greenhouse.io/company{}", i))
        .collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 100 Greenhouse URLs should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many Greenhouse URLs"));
}

#[test]
fn test_empty_lever_url_fails() {
    let mut config = create_valid_config();
    config.lever_urls = vec!["".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty Lever URL should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Lever URLs cannot be empty"));
}

#[test]
fn test_invalid_lever_url_prefix_fails() {
    let mut config = create_valid_config();
    config.lever_urls = vec!["https://wrongsite.com/company".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid Lever URL prefix should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Lever URL format"));
}

#[test]
fn test_lever_url_authority_confusion_fails() {
    let mut config = create_valid_config();
    config.lever_urls = vec!["https://jobs.lever.co@127.0.0.1/company".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Lever authority confusion should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Lever URL format"));
}

#[test]
fn test_lever_url_nested_path_fails() {
    let mut config = create_valid_config();
    config.lever_urls = vec!["https://jobs.lever.co/company/job-id".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Nested Lever board URL should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid Lever URL format"));
}

#[test]
fn test_invalid_lever_url_error_sanitizes_sensitive_parts() {
    let mut config = create_valid_config();
    config.lever_urls =
        vec!["https://user:pass@wrongsite.com/company?query=private#fragment".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid Lever URL prefix should fail");
    let error = result.unwrap_err().to_string();

    assert!(error.contains("Got: https://wrongsite.com/company"));
    assert!(!error.contains("user"));
    assert!(!error.contains("pass"));
    assert!(!error.contains("private"));
    assert!(!error.contains("fragment"));
}

#[test]
fn test_lever_url_too_long_fails() {
    let mut config = create_valid_config();
    config.lever_urls = vec![format!("https://jobs.lever.co/{}", "y".repeat(500))];

    let result = validate_config(&config);
    assert!(result.is_err(), "Lever URL > 500 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Lever URL too long"));
}

#[test]
fn test_too_many_lever_urls_fails() {
    let mut config = create_valid_config();
    config.lever_urls = (0..101)
        .map(|i| format!("https://jobs.lever.co/company{}", i))
        .collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 100 Lever URLs should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many Lever URLs"));
}
