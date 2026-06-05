use super::*;

#[test]
fn test_negative_salary_floor_fails() {
    let mut config = create_valid_config();
    config.salary_floor_usd = -1000;

    let result = validate_config(&config);
    assert!(result.is_err(), "Negative salary should fail validation");
    assert!(result.unwrap_err().to_string().contains("negative"));
}

#[test]
fn test_excessive_salary_floor_fails() {
    let mut config = create_valid_config();
    config.salary_floor_usd = 15_000_000; // Over $10M limit

    let result = validate_config(&config);
    assert!(result.is_err(), "Excessive salary should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("exceeds reasonable limit"));
}

#[test]
fn test_salary_floor_at_boundary_passes() {
    let mut config = create_valid_config();
    config.salary_floor_usd = 10_000_000; // Exactly $10M

    assert!(
        validate_config(&config).is_ok(),
        "Salary at $10M boundary should pass"
    );
}

#[test]
fn test_zero_salary_floor_passes() {
    let mut config = create_valid_config();
    config.salary_floor_usd = 0;

    assert!(
        validate_config(&config).is_ok(),
        "Zero salary floor should pass"
    );
}

#[test]
fn test_alert_threshold_too_low_fails() {
    let mut config = create_valid_config();
    config.immediate_alert_threshold = -0.1;

    let result = validate_config(&config);
    assert!(result.is_err(), "Alert threshold < 0.0 should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("between 0.0 and 1.0"));
}

#[test]
fn test_alert_threshold_too_high_fails() {
    let mut config = create_valid_config();
    config.immediate_alert_threshold = 1.5;

    let result = validate_config(&config);
    assert!(result.is_err(), "Alert threshold > 1.0 should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("between 0.0 and 1.0"));
}

#[test]
fn test_alert_threshold_at_boundaries_passes() {
    let mut config = create_valid_config();

    // Test lower boundary
    config.immediate_alert_threshold = 0.0;
    assert!(
        validate_config(&config).is_ok(),
        "Alert threshold 0.0 should pass"
    );

    // Test upper boundary
    config.immediate_alert_threshold = 1.0;
    assert!(
        validate_config(&config).is_ok(),
        "Alert threshold 1.0 should pass"
    );
}

#[test]
fn test_scraping_interval_too_low_fails() {
    let mut config = create_valid_config();
    config.scraping_interval_hours = 0;

    let result = validate_config(&config);
    assert!(result.is_err(), "Scraping interval < 1 hour should fail");
    assert!(result.unwrap_err().to_string().contains("at least 1 hour"));
}

#[test]
fn test_scraping_interval_too_high_fails() {
    let mut config = create_valid_config();
    config.scraping_interval_hours = 169; // Over 1 week

    let result = validate_config(&config);
    assert!(result.is_err(), "Scraping interval > 168 hours should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("cannot exceed 168 hours"));
}

#[test]
fn test_scraping_interval_at_boundaries_passes() {
    let mut config = create_valid_config();

    // Test lower boundary
    config.scraping_interval_hours = 1;
    assert!(
        validate_config(&config).is_ok(),
        "Scraping interval 1 hour should pass"
    );

    // Test upper boundary
    config.scraping_interval_hours = 168;
    assert!(
        validate_config(&config).is_ok(),
        "Scraping interval 168 hours should pass"
    );
}

#[test]
fn test_empty_title_in_allowlist_fails() {
    let mut config = create_valid_config();
    config.title_allowlist = vec!["Valid Title".to_string(), "".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty title in allowlist should fail");
    assert!(result.unwrap_err().to_string().contains("empty strings"));
}

#[test]
fn test_title_too_long_fails() {
    let mut config = create_valid_config();
    config.title_allowlist = vec!["a".repeat(201)]; // Over 200 char limit

    let result = validate_config(&config);
    assert!(result.is_err(), "Title > 200 chars should fail");
    assert!(result.unwrap_err().to_string().contains("Title too long"));
}

#[test]
fn test_too_many_titles_in_allowlist_fails() {
    let mut config = create_valid_config();
    config.title_allowlist = (0..501).map(|i| format!("Title {}", i)).collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 500 titles should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many title allowlist"));
}

#[test]
fn test_title_blocklist_too_long_fails() {
    let mut config = create_valid_config();
    config.title_blocklist = vec!["b".repeat(201)];

    let result = validate_config(&config);
    assert!(result.is_err(), "Blocklist title > 200 chars should fail");
    assert!(result.unwrap_err().to_string().contains("Title too long"));
}

#[test]
fn test_too_many_titles_in_blocklist_fails() {
    let mut config = create_valid_config();
    config.title_blocklist = (0..501).map(|i| format!("Block {}", i)).collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 500 blocked titles should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many title blocklist"));
}

#[test]
fn test_empty_keyword_in_boost_fails() {
    let mut config = create_valid_config();
    config.keywords_boost = vec!["case management".to_string(), "".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty keyword in boost should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Keywords boost cannot contain empty"));
}

#[test]
fn test_keyword_boost_too_long_fails() {
    let mut config = create_valid_config();
    config.keywords_boost = vec!["k".repeat(101)]; // Over 100 char limit

    let result = validate_config(&config);
    assert!(result.is_err(), "Keyword > 100 chars should fail");
    assert!(result.unwrap_err().to_string().contains("Keyword too long"));
}

#[test]
fn test_too_many_keywords_boost_fails() {
    let mut config = create_valid_config();
    config.keywords_boost = (0..501).map(|i| format!("Keyword{}", i)).collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 500 boost keywords should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many keywords boost"));
}

#[test]
fn test_empty_keyword_in_exclude_fails() {
    let mut config = create_valid_config();
    config.keywords_exclude = vec!["sales".to_string(), "".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty keyword in exclude should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Keywords exclude cannot contain empty"));
}

#[test]
fn test_keyword_exclude_too_long_fails() {
    let mut config = create_valid_config();
    config.keywords_exclude = vec!["x".repeat(101)];

    let result = validate_config(&config);
    assert!(result.is_err(), "Exclude keyword > 100 chars should fail");
    assert!(result.unwrap_err().to_string().contains("Keyword too long"));
}

#[test]
fn test_too_many_keywords_exclude_fails() {
    let mut config = create_valid_config();
    config.keywords_exclude = (0..501).map(|i| format!("Exclude{}", i)).collect();

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "More than 500 exclude keywords should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Too many keywords exclude"));
}

#[test]
fn test_city_name_too_long_fails() {
    let mut config = create_valid_config();
    config.location_preferences.cities = vec!["c".repeat(101)]; // Over 100 char limit

    let result = validate_config(&config);
    assert!(result.is_err(), "City name > 100 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("City name too long"));
}

#[test]
fn test_too_many_cities_fails() {
    let mut config = create_valid_config();
    config.location_preferences.cities = (0..501).map(|i| format!("City{}", i)).collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 500 cities should fail");
    assert!(result.unwrap_err().to_string().contains("Too many cities"));
}

#[test]
fn test_state_name_too_long_fails() {
    let mut config = create_valid_config();
    config.location_preferences.states = vec!["s".repeat(51)]; // Over 50 char limit

    let result = validate_config(&config);
    assert!(result.is_err(), "State name > 50 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("State name too long"));
}

#[test]
fn test_too_many_states_fails() {
    let mut config = create_valid_config();
    config.location_preferences.states = (0..501).map(|i| format!("ST{}", i)).collect();

    let result = validate_config(&config);
    assert!(result.is_err(), "More than 500 states should fail");
    assert!(result.unwrap_err().to_string().contains("Too many states"));
}

#[test]
fn test_country_name_too_long_fails() {
    let mut config = create_valid_config();
    config.location_preferences.country = "c".repeat(51); // Over 50 char limit

    let result = validate_config(&config);
    assert!(result.is_err(), "Country name > 50 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Country name too long"));
}

#[test]
fn test_slack_enabled_with_empty_webhook_passes_validation() {
    // In v2.0+, Slack webhook is stored in OS keyring, not config.
    // Validation passes because the actual credential check happens at runtime.
    let mut config = create_valid_config();
    config.alerts.slack.enabled = true;
    config.alerts.slack.webhook_url = "".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Empty webhook URL should pass validation (credential is in keyring)"
    );
}

#[test]
fn test_slack_disabled_with_empty_webhook_passes() {
    let mut config = create_valid_config();
    config.alerts.slack.enabled = false;
    config.alerts.slack.webhook_url = "".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Empty webhook URL when Slack disabled should pass"
    );
}

#[test]
fn test_slack_webhook_format_not_validated_in_config() {
    // In v2.0+, Slack webhook is stored in OS keyring, not config.
    // Format validation happens at runtime when storing in keyring.
    let mut config = create_valid_config();
    config.alerts.slack.webhook_url = "https://evil.com/webhook".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Webhook format not validated in config (validated in keyring)"
    );
}

#[test]
fn test_slack_webhook_length_not_validated_in_config() {
    // In v2.0+, Slack webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.slack.webhook_url =
        format!("https://hooks.slack.com/services/{}", "X".repeat(500));

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Webhook length not validated in config (validated in keyring)"
    );
}
