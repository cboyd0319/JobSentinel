//! Configuration tests

#[cfg(test)]
mod tests {
    use super::super::defaults::*;
    use super::super::types::*;
    use super::super::validation::validate_config;
    use std::fs;
    use std::path::Path;
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
            bookmarklet_port: 4321,
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
    fn config_example_matches_current_schema_and_source_policy() {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let sample_path = manifest_dir.join("../config/config.example.json");
        let sample_text = fs::read_to_string(&sample_path).unwrap_or_else(|error| {
            panic!(
                "failed to read sample config at {}: {error}",
                sample_path.display()
            )
        });
        let sample_value: serde_json::Value =
            serde_json::from_str(&sample_text).expect("sample config should be valid JSON");

        assert!(
            sample_value.get("indeed").is_none(),
            "sample config must not advertise unsupported Indeed settings"
        );
        assert_eq!(
            sample_value
                .pointer("/linkedin/enabled")
                .and_then(serde_json::Value::as_bool),
            Some(false),
            "sample config must keep LinkedIn automatic monitoring disabled"
        );

        let config: Config =
            serde_json::from_value(sample_value).expect("sample config should deserialize");
        validate_config(&config).expect("sample config should pass validation");
        assert!(!config.linkedin.enabled);
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

    #[path = "preference_validation_tests.rs"]
    mod preference_validation_tests;

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

    mod property_tests;
}
