use super::*;

#[test]
fn test_config_with_all_alerts_disabled_passes() {
    let mut config = create_valid_config();
    config.alerts.slack.enabled = false;
    config.alerts.email.enabled = false;
    config.alerts.discord.enabled = false;
    config.alerts.telegram.enabled = false;
    config.alerts.teams.enabled = false;
    config.alerts.desktop.enabled = false;

    assert!(
        validate_config(&config).is_ok(),
        "Config with all alerts disabled should pass"
    );
}

#[test]
fn test_config_with_empty_arrays_passes() {
    let mut config = create_valid_config();
    config.title_blocklist = vec![];
    config.keywords_boost = vec![];
    config.keywords_exclude = vec![];
    config.location_preferences.cities = vec![];
    config.location_preferences.states = vec![];
    config.greenhouse_urls = vec![];
    config.lever_urls = vec![];

    assert!(
        validate_config(&config).is_ok(),
        "Config with empty arrays should pass"
    );
}

#[test]
fn test_config_with_unicode_characters_passes() {
    let mut config = create_valid_config();
    config.title_allowlist = vec![
        "Care Coordinator 护理协调员".to_string(),
        "Coordonnatrice de programme".to_string(),
        "ケアコーディネーター".to_string(),
    ];
    config.keywords_boost = vec![
        "case management 🗂️".to_string(),
        "bilingual support 🗣️".to_string(),
    ];
    config.location_preferences.cities = vec![
        "São Paulo".to_string(),
        "Москва".to_string(),
        "北京".to_string(),
    ];

    assert!(
        validate_config(&config).is_ok(),
        "Config with Unicode characters should pass"
    );
}

#[test]
fn test_config_boundary_values_all_at_limits_passes() {
    let mut config = create_valid_config();

    config.salary_floor_usd = 10_000_000;
    config.immediate_alert_threshold = 1.0;
    config.scraping_interval_hours = 168;

    config.title_allowlist = (0..500).map(|i| format!("Title{i}")).collect();
    config.title_blocklist = (0..500).map(|i| format!("Block{i}")).collect();
    config.keywords_boost = (0..500).map(|i| format!("Keyword{i}")).collect();
    config.keywords_exclude = (0..500).map(|i| format!("Exclude{i}")).collect();
    config.location_preferences.cities = (0..500).map(|i| format!("City{i}")).collect();
    config.location_preferences.states = (0..500).map(|i| format!("ST{i}")).collect();
    config.greenhouse_urls = (0..100)
        .map(|i| format!("https://boards.greenhouse.io/co{i}"))
        .collect();
    config.lever_urls = (0..100)
        .map(|i| format!("https://jobs.lever.co/co{i}"))
        .collect();

    assert!(
        validate_config(&config).is_ok(),
        "Config with all fields at boundary limits should pass"
    );
}
