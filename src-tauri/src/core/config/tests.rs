//! Configuration tests

#[cfg(test)]
mod tests {
    use super::super::defaults::*;
    use super::super::types::*;
    use super::super::validation::validate_config;
    use std::fs;
    use tempfile::TempDir;

    /// Helper function to create a valid test config
    fn create_valid_config() -> Config {
        Config {
            title_allowlist: vec!["Care Coordinator".to_string()],
            title_blocklist: vec!["Manager".to_string()],
            keywords_boost: vec![
                "case management".to_string(),
                "bilingual support".to_string(),
            ],
            keywords_exclude: vec!["sales".to_string()],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec!["San Francisco".to_string()],
                states: vec!["CA".to_string()],
                country: "US".to_string(),
            },
            salary_floor_usd: 150000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: true,
                    webhook_url:
                        "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
                            .to_string(),
                },
                email: EmailConfig::default(),
                discord: DiscordConfig::default(),
                telegram: TelegramConfig::default(),
                teams: TeamsConfig::default(),
                desktop: DesktopConfig::default(),
            },
            greenhouse_urls: vec!["https://boards.greenhouse.io/cloudflare".to_string()],
            lever_urls: vec!["https://jobs.lever.co/netflix".to_string()],
            linkedin: LinkedInConfig::default(),
            auto_refresh: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
            jobswithgpt_approval: Default::default(),
            remoteok: Default::default(),
            weworkremotely: Default::default(),
            builtin: Default::default(),
            hn_hiring: Default::default(),
            dice: Default::default(),
            yc_startup: Default::default(),
            usajobs: Default::default(),
            simplyhired: Default::default(),
            glassdoor: Default::default(),
            ghost_config: None,
            company_whitelist: vec![],
            company_blacklist: vec![],
            use_resume_matching: false,
            salary_target_usd: None,
            penalize_missing_salary: false,
        }
    }

    #[test]
    fn test_valid_config_passes_validation() {
        let config = create_valid_config();
        assert!(
            validate_config(&config).is_ok(),
            "Valid config should pass validation"
        );
    }

    #[test]
    fn test_jobswithgpt_payload_requires_exact_local_approval() {
        let mut config = create_valid_config();
        config.title_allowlist = vec!["  Case Manager  ".to_string(), String::new()];
        config.location_preferences.allow_remote = true;
        config.location_preferences.allow_onsite = false;

        let payload = config
            .jobswithgpt_payload_preview()
            .expect("payload should exist when endpoint and titles are configured");

        assert_eq!(payload.titles, vec!["Case Manager"]);
        assert!(payload.remote_only);
        assert_eq!(payload.limit, JOBSWITHGPT_DEFAULT_LIMIT);
        assert!(!config.jobswithgpt_payload_approved());

        config.jobswithgpt_approval.enabled = true;
        config.jobswithgpt_approval.payload = Some(payload);
        assert!(config.jobswithgpt_payload_approved());

        config.title_allowlist = vec!["Program Coordinator".to_string()];
        assert!(!config.jobswithgpt_payload_approved());
    }

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

    // ========================================
    // Source URL Configuration Tests
    // ========================================

    #[path = "source_url_tests.rs"]
    mod source_url_tests;

    // ========================================
    // Persistence Tests
    // ========================================

    #[path = "persistence_tests.rs"]
    mod persistence_tests;

    #[test]
    fn test_default_values() {
        // Test that default functions return expected values
        assert_eq!(default_immediate_threshold(), 0.9);
        assert_eq!(default_scraping_interval(), 2);
        assert_eq!(default_country(), "US");
        assert_eq!(default_auto_refresh_interval(), 30);
        assert_eq!(default_smtp_port(), 587);
        assert_eq!(default_use_starttls(), true);
        assert_eq!(default_desktop_enabled(), true);
        assert_eq!(default_play_sound(), false);
        assert_eq!(default_linkedin_limit(), 50);
    }

    // ========================================
    // Email Configuration Tests
    // ========================================

    #[path = "email_tests.rs"]
    mod email_tests;

    // ========================================
    // Discord Configuration Tests
    // ========================================

    #[path = "discord_tests.rs"]
    mod discord_tests;

    // ========================================
    // Telegram Configuration Tests
    // ========================================

    #[path = "telegram_tests.rs"]
    mod telegram_tests;

    // ========================================
    // Teams Configuration Tests
    // ========================================

    #[path = "teams_tests.rs"]
    mod teams_tests;

    // ========================================
    // LinkedIn Configuration Tests
    // ========================================

    #[test]
    fn test_linkedin_enabled_fails_by_source_policy() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "LinkedIn automatic monitoring should fail validation"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn automatic monitoring is disabled"));
    }

    #[test]
    fn test_linkedin_disabled_with_invalid_config_passes() {
        let mut config = create_valid_config();
        config.linkedin.enabled = false;
        config.linkedin.session_cookie = "".to_string();
        config.linkedin.query = "".to_string();
        config.linkedin.limit = 0;

        assert!(
            validate_config(&config).is_ok(),
            "Invalid LinkedIn config should pass when disabled"
        );
    }

    // ========================================
    // AutoRefresh Configuration Tests
    // ========================================

    #[test]
    fn test_auto_refresh_default_values() {
        let auto_refresh = AutoRefreshConfig::default();
        assert_eq!(
            auto_refresh.enabled, false,
            "AutoRefresh should default to disabled"
        );
        // Note: Default::default() uses u32::default() (0), not default_auto_refresh_interval()
        // The custom default (30) only applies during JSON deserialization
        assert_eq!(
            auto_refresh.interval_minutes, 0,
            "AutoRefresh interval defaults to 0 via Default trait"
        );
    }

    #[test]
    fn test_auto_refresh_enabled_passes_validation() {
        let mut config = create_valid_config();
        config.auto_refresh.enabled = true;
        config.auto_refresh.interval_minutes = 60;

        assert!(
            validate_config(&config).is_ok(),
            "AutoRefresh config should pass validation"
        );
    }

    #[test]
    fn test_auto_refresh_custom_interval_passes() {
        let mut config = create_valid_config();
        config.auto_refresh.enabled = true;
        config.auto_refresh.interval_minutes = 1;

        assert!(
            validate_config(&config).is_ok(),
            "AutoRefresh with custom interval should pass"
        );
    }

    // ========================================
    // Desktop Configuration Tests
    // ========================================

    #[test]
    fn test_desktop_default_values() {
        let desktop = DesktopConfig::default();
        // Note: Default::default() uses bool::default() (false), not the custom default functions
        // The custom enabled default applies during JSON deserialization.
        // Sound still defaults to false for quiet privacy-preserving alerts.
        assert_eq!(
            desktop.enabled, false,
            "Desktop enabled defaults to false via Default trait"
        );
        assert_eq!(
            desktop.show_when_focused, false,
            "show_when_focused should default to false"
        );
        assert_eq!(
            desktop.play_sound, false,
            "play_sound defaults to false via Default trait"
        );
    }

    #[test]
    fn test_desktop_all_enabled_passes() {
        let mut config = create_valid_config();
        config.alerts.desktop.enabled = true;
        config.alerts.desktop.show_when_focused = true;
        config.alerts.desktop.play_sound = true;

        assert!(
            validate_config(&config).is_ok(),
            "Desktop config with all options enabled should pass"
        );
    }

    #[test]
    fn test_desktop_all_disabled_passes() {
        let mut config = create_valid_config();
        config.alerts.desktop.enabled = false;
        config.alerts.desktop.show_when_focused = false;
        config.alerts.desktop.play_sound = false;

        assert!(
            validate_config(&config).is_ok(),
            "Desktop config with all options disabled should pass"
        );
    }

    // ========================================
    // Serialization/Deserialization Tests
    // ========================================

    #[test]
    fn test_serialize_deserialize_roundtrip() {
        let config = create_valid_config();

        // Serialize to JSON
        let json = serde_json::to_string(&config).expect("Failed to serialize config");

        // Deserialize back
        let deserialized: Config =
            serde_json::from_str(&json).expect("Failed to deserialize config");

        // Verify key fields match
        assert_eq!(deserialized.title_allowlist, config.title_allowlist);
        assert_eq!(deserialized.salary_floor_usd, config.salary_floor_usd);
        assert_eq!(
            deserialized.immediate_alert_threshold,
            config.immediate_alert_threshold
        );
        assert_eq!(
            deserialized.scraping_interval_hours,
            config.scraping_interval_hours
        );
        assert_eq!(deserialized.greenhouse_urls, config.greenhouse_urls);
        assert_eq!(deserialized.lever_urls, config.lever_urls);
    }

    #[test]
    fn test_deserialize_with_missing_optional_fields() {
        let json = r#"{
            "title_allowlist": ["Care Coordinator"],
            "location_preferences": {
                "allow_remote": true
            },
            "salary_floor_usd": 150000,
            "alerts": {}
        }"#;

        let config: Config = serde_json::from_str(json).expect("Failed to deserialize config");

        // Verify defaults are applied (these come from serde default functions during deserialization)
        assert!(
            config.title_blocklist.is_empty(),
            "title_blocklist should default to empty"
        );
        assert!(
            config.keywords_boost.is_empty(),
            "keywords_boost should default to empty"
        );
        assert!(
            config.keywords_exclude.is_empty(),
            "keywords_exclude should default to empty"
        );
        assert_eq!(
            config.immediate_alert_threshold, 0.9,
            "immediate_alert_threshold should default to 0.9"
        );
        assert_eq!(
            config.scraping_interval_hours, 2,
            "scraping_interval_hours should default to 2"
        );
        assert_eq!(
            config.auto_refresh.enabled, false,
            "auto_refresh.enabled should default to false"
        );
        // When auto_refresh field is completely missing, serde uses Default::default() for the entire struct
        // This gives interval=0, not the field-level default of 30
        assert_eq!(
            config.auto_refresh.interval_minutes, 0,
            "auto_refresh.interval_minutes defaults to 0 when field is missing"
        );
    }

    #[test]
    fn test_deserialize_location_preferences_with_defaults() {
        let json = r#"{
            "title_allowlist": ["Care Coordinator"],
            "location_preferences": {
                "allow_remote": true
            },
            "salary_floor_usd": 100000,
            "alerts": {}
        }"#;

        let config: Config = serde_json::from_str(json).expect("Failed to deserialize config");

        // Verify location defaults
        assert_eq!(config.location_preferences.allow_remote, true);
        assert_eq!(config.location_preferences.allow_hybrid, false);
        assert_eq!(config.location_preferences.allow_onsite, false);
        assert!(config.location_preferences.cities.is_empty());
        assert!(config.location_preferences.states.is_empty());
        assert_eq!(config.location_preferences.country, "US");
    }

    #[test]
    fn test_deserialize_alert_config_with_defaults() {
        let json = r#"{
            "title_allowlist": ["Care Coordinator"],
            "location_preferences": {
                "allow_remote": true
            },
            "salary_floor_usd": 100000,
            "alerts": {}
        }"#;

        let config: Config = serde_json::from_str(json).expect("Failed to deserialize config");

        // Verify alert defaults (these come from serde default functions during deserialization)
        assert_eq!(config.alerts.slack.enabled, false);
        assert_eq!(config.alerts.email.enabled, false);
        assert_eq!(config.alerts.discord.enabled, false);
        assert_eq!(config.alerts.telegram.enabled, false);
        assert_eq!(config.alerts.teams.enabled, false);
        // When alerts.desktop field is completely missing (alerts: {} in JSON),
        // serde uses Default::default() for DesktopConfig, which gives false for all bools
        assert_eq!(config.alerts.desktop.enabled, false); // Defaults to false via Default trait
        assert_eq!(config.alerts.desktop.play_sound, false); // Defaults to false via Default trait
    }

    #[test]
    fn test_deserialize_with_field_level_defaults() {
        // This test shows that field-level defaults DO work when the parent struct is present
        let json = r#"{
            "title_allowlist": ["Care Coordinator"],
            "location_preferences": {
                "allow_remote": true
            },
            "salary_floor_usd": 100000,
            "alerts": {
                "desktop": {}
            },
            "auto_refresh": {}
        }"#;

        let config: Config = serde_json::from_str(json).expect("Failed to deserialize config");

        // When the parent struct is present but fields are missing, field-level defaults apply
        assert_eq!(config.auto_refresh.enabled, false);
        assert_eq!(config.auto_refresh.interval_minutes, 30); // Field-level default works!

        assert_eq!(config.alerts.desktop.enabled, true); // Field-level default works!
        assert_eq!(config.alerts.desktop.show_when_focused, false);
        assert_eq!(config.alerts.desktop.play_sound, false); // Field-level default works!
    }

    #[test]
    fn test_deserialize_minimal_valid_config() {
        let json = r#"{
            "title_allowlist": ["Care Coordinator"],
            "location_preferences": {
                "allow_remote": true
            },
            "salary_floor_usd": 0,
            "alerts": {}
        }"#;

        let config: Config =
            serde_json::from_str(json).expect("Failed to deserialize minimal config");
        assert!(
            validate_config(&config).is_ok(),
            "Minimal config should pass validation"
        );
    }

    #[test]
    fn test_save_preserves_formatting() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("formatted.json");

        let config = create_valid_config();
        config.save(&config_path).expect("Failed to save config");

        // Read the file and verify it's pretty-printed
        let content = fs::read_to_string(&config_path).expect("Failed to read config file");
        assert!(
            content.contains('\n'),
            "Config should be pretty-printed with newlines"
        );
        assert!(content.contains("  "), "Config should be indented");
    }

    // ========================================
    // Edge Case Tests
    // ========================================

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

        // Set all numeric fields to their maximum valid values
        config.salary_floor_usd = 10_000_000;
        config.immediate_alert_threshold = 1.0;
        config.scraping_interval_hours = 168;

        // Fill arrays to maximum size (but not over)
        config.title_allowlist = (0..500).map(|i| format!("Title{}", i)).collect();
        config.title_blocklist = (0..500).map(|i| format!("Block{}", i)).collect();
        config.keywords_boost = (0..500).map(|i| format!("Keyword{}", i)).collect();
        config.keywords_exclude = (0..500).map(|i| format!("Exclude{}", i)).collect();
        config.location_preferences.cities = (0..500).map(|i| format!("City{}", i)).collect();
        config.location_preferences.states = (0..500).map(|i| format!("ST{}", i)).collect();
        config.greenhouse_urls = (0..100)
            .map(|i| format!("https://boards.greenhouse.io/co{}", i))
            .collect();
        config.lever_urls = (0..100)
            .map(|i| format!("https://jobs.lever.co/co{}", i))
            .collect();

        assert!(
            validate_config(&config).is_ok(),
            "Config with all fields at boundary limits should pass"
        );
    }

    // ========================================
    // Property-Based Tests
    // ========================================

    use proptest::prelude::*;

    proptest! {
        /// Property: Valid salary range always passes validation
        #[test]
        fn prop_valid_salary_passes(
            salary in 0i64..=10_000_000i64,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Negative salary always fails validation
        #[test]
        fn prop_negative_salary_fails(
            salary in i64::MIN..-1i64,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Salary above $10M fails validation
        #[test]
        fn prop_excessive_salary_fails(
            salary in 10_000_001i64..=i64::MAX,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Alert threshold in range [0.0, 1.0] passes validation
        #[test]
        fn prop_valid_threshold_passes(
            threshold in 0.0f64..=1.0f64,
        ) {
            let mut config = create_valid_config();
            config.immediate_alert_threshold = threshold;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Alert threshold outside [0.0, 1.0] fails validation
        #[test]
        fn prop_invalid_threshold_fails(
            threshold in prop::num::f64::ANY,
        ) {
            prop_assume!(threshold < 0.0 || threshold > 1.0);
            prop_assume!(!threshold.is_nan());

            let mut config = create_valid_config();
            config.immediate_alert_threshold = threshold;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Scraping interval in range [1, 168] hours passes
        #[test]
        fn prop_valid_interval_passes(
            interval in 1u64..=168u64,
        ) {
            let mut config = create_valid_config();
            config.scraping_interval_hours = interval;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Scraping interval of 0 hours fails
        #[test]
        fn prop_zero_interval_fails(_unit in proptest::strategy::Just(())) {
            let mut config = create_valid_config();
            config.scraping_interval_hours = 0;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Scraping interval over 168 hours fails
        #[test]
        fn prop_excessive_interval_fails(
            interval in 169u64..=1000u64,
        ) {
            let mut config = create_valid_config();
            config.scraping_interval_hours = interval;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Title allowlist with valid strings passes
        #[test]
        fn prop_valid_title_allowlist_passes(
            titles in proptest::collection::vec("[a-zA-Z ]{1,200}", 1..100),
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = titles;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Title allowlist with empty strings fails
        #[test]
        fn prop_empty_title_in_allowlist_fails(
            prefix in proptest::collection::vec("[a-zA-Z ]{1,50}", 0..5),
            suffix in proptest::collection::vec("[a-zA-Z ]{1,50}", 0..5),
        ) {
            let mut config = create_valid_config();
            let mut titles = prefix;
            titles.push("".to_string()); // Add empty string
            titles.extend(suffix);
            config.title_allowlist = titles;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Excessive title allowlist size fails
        #[test]
        fn prop_excessive_title_allowlist_fails(
            titles in proptest::collection::vec("[a-zA-Z]{1,50}", 501..600),
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = titles;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Title longer than 200 chars fails
        #[test]
        fn prop_long_title_fails(
            title in "[a-zA-Z ]{201,500}",
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = vec![title];

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Keywords boost with valid strings passes
        #[test]
        fn prop_valid_keywords_boost_passes(
            keywords in proptest::collection::vec("[a-zA-Z]{1,100}", 1..100),
        ) {
            let mut config = create_valid_config();
            config.keywords_boost = keywords;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Empty keyword in boost list fails
        #[test]
        fn prop_empty_keyword_fails(
            prefix in proptest::collection::vec("[a-zA-Z]{1,50}", 0..5),
        ) {
            let mut config = create_valid_config();
            let mut keywords = prefix;
            keywords.push("".to_string());
            config.keywords_boost = keywords;

            prop_assert!(validate_config(&config).is_err());
        }

        /// Property: Slack webhook URL is not validated from config
        #[test]
        fn prop_slack_webhook_not_config_validated(
            url in "[A-Za-z0-9:/._?=&%-]{0,700}",
        ) {
            let mut config = create_valid_config();
            config.alerts.slack.webhook_url = url;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: Country code validation accepts valid strings
        #[test]
        fn prop_country_code_valid(
            country in "[A-Z]{2}",
        ) {
            let mut config = create_valid_config();
            config.location_preferences.country = country.clone();

            prop_assert!(validate_config(&config).is_ok());
            prop_assert_eq!(config.location_preferences.country, country);
        }

        /// Property: City names with valid length pass
        #[test]
        fn prop_city_names_valid(
            cities in proptest::collection::vec("[a-zA-Z ]{1,100}", 0..50),
        ) {
            let mut config = create_valid_config();
            config.location_preferences.cities = cities;

            prop_assert!(validate_config(&config).is_ok());
        }

        /// Property: At least one location mode must be enabled
        #[test]
        fn prop_location_mode_requirement(
            allow_remote in proptest::bool::ANY,
            allow_hybrid in proptest::bool::ANY,
            allow_onsite in proptest::bool::ANY,
        ) {
            let mut config = create_valid_config();
            config.location_preferences.allow_remote = allow_remote;
            config.location_preferences.allow_hybrid = allow_hybrid;
            config.location_preferences.allow_onsite = allow_onsite;

            let result = validate_config(&config);
            if allow_remote || allow_hybrid || allow_onsite {
                prop_assert!(result.is_ok());
            } else {
                prop_assert!(result.is_err());
                prop_assert!(result
                    .unwrap_err()
                    .to_string()
                    .contains("at least one of allow_remote"));
            }
        }
    }
}
