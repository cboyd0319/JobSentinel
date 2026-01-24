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
            title_allowlist: vec!["Security Engineer".to_string()],
            title_blocklist: vec!["Manager".to_string()],
            keywords_boost: vec!["Rust".to_string(), "Kubernetes".to_string()],
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
            remoteok: Default::default(),
            weworkremotely: Default::default(),
            builtin: Default::default(),
            hn_hiring: Default::default(),
            dice: Default::default(),
            yc_startup: Default::default(),
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
        config.keywords_boost = vec!["Rust".to_string(), "".to_string()];

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
    fn test_default_values() {
        // Test that default functions return expected values
        assert_eq!(default_immediate_threshold(), 0.9);
        assert_eq!(default_scraping_interval(), 2);
        assert_eq!(default_country(), "US");
        assert_eq!(default_auto_refresh_interval(), 30);
        assert_eq!(default_smtp_port(), 587);
        assert_eq!(default_use_starttls(), true);
        assert_eq!(default_desktop_enabled(), true);
        assert_eq!(default_play_sound(), true);
        assert_eq!(default_linkedin_limit(), 50);
    }

    // ========================================
    // Email Configuration Tests
    // ========================================

    #[test]
    fn test_email_enabled_but_empty_smtp_server_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty SMTP server when email enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("SMTP server is required"));
    }

    #[test]
    fn test_email_enabled_but_empty_username_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty SMTP username when email enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("SMTP username is required"));
    }

    #[test]
    fn test_email_enabled_with_empty_password_passes_validation() {
        // In v2.0+, SMTP password is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Empty SMTP password should pass validation (credential is in keyring)"
        );
    }

    #[test]
    fn test_email_enabled_but_empty_from_email_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty from email when email enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("From email address is required"));
    }

    #[test]
    fn test_email_enabled_but_invalid_from_email_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "invalidemail".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(result.is_err(), "Invalid from email format should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid from email format"));
    }

    #[test]
    fn test_email_enabled_but_no_recipients_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec![];

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty recipient list when email enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("At least one recipient email is required"));
    }

    #[test]
    fn test_email_enabled_but_invalid_recipient_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails =
            vec!["valid@example.com".to_string(), "invalid".to_string()];

        let result = validate_config(&config);
        assert!(result.is_err(), "Invalid recipient email should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid recipient email format"));
    }

    #[test]
    fn test_email_enabled_but_empty_recipient_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec!["valid@example.com".to_string(), "".to_string()];

        let result = validate_config(&config);
        assert!(result.is_err(), "Empty recipient email should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Recipient email cannot be empty"));
    }

    #[test]
    fn test_email_enabled_but_recipient_too_long_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec![format!("{}@example.com", "a".repeat(100))];

        let result = validate_config(&config);
        assert!(result.is_err(), "Recipient email > 100 chars should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Recipient email too long"));
    }

    #[test]
    fn test_email_smtp_server_too_long_fails() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "s".repeat(101);
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "password".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec!["to@example.com".to_string()];

        let result = validate_config(&config);
        assert!(result.is_err(), "SMTP server name > 100 chars should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("SMTP server name too long"));
    }

    #[test]
    fn test_email_disabled_with_invalid_config_passes() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = false;
        // Set all fields to invalid values
        config.alerts.email.smtp_server = "".to_string();
        config.alerts.email.smtp_username = "".to_string();
        config.alerts.email.smtp_password = "".to_string();
        config.alerts.email.from_email = "".to_string();
        config.alerts.email.to_emails = vec![];

        assert!(
            validate_config(&config).is_ok(),
            "Invalid email config should pass when disabled"
        );
    }

    #[test]
    fn test_email_valid_configuration_passes() {
        let mut config = create_valid_config();
        config.alerts.email.enabled = true;
        config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
        config.alerts.email.smtp_port = 587;
        config.alerts.email.smtp_username = "user@example.com".to_string();
        config.alerts.email.smtp_password = "app_password_123".to_string();
        config.alerts.email.from_email = "from@example.com".to_string();
        config.alerts.email.to_emails = vec![
            "recipient1@example.com".to_string(),
            "recipient2@example.com".to_string(),
        ];
        config.alerts.email.use_starttls = true;

        assert!(
            validate_config(&config).is_ok(),
            "Valid email configuration should pass"
        );
    }

    // ========================================
    // Discord Configuration Tests
    // ========================================

    #[test]
    fn test_discord_enabled_with_empty_webhook_passes_validation() {
        // In v2.0+, Discord webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url = "".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Empty Discord webhook should pass validation (credential is in keyring)"
        );
    }

    #[test]
    fn test_discord_webhook_format_not_validated_in_config() {
        // In v2.0+, Discord webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url = "https://evil.com/webhook".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Discord webhook format not validated in config (validated in keyring)"
        );
    }

    #[test]
    fn test_discord_webhook_length_not_validated_in_config() {
        // In v2.0+, Discord webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url =
            format!("https://discord.com/api/webhooks/{}", "X".repeat(500));

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Discord webhook length not validated in config (validated in keyring)"
        );
    }

    #[test]
    fn test_discord_valid_webhook_com_passes() {
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url =
            "https://discord.com/api/webhooks/123456789/abcdefg".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Valid discord.com webhook should pass"
        );
    }

    #[test]
    fn test_discord_valid_webhook_discordapp_passes() {
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url =
            "https://discordapp.com/api/webhooks/123456789/abcdefg".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Valid discordapp.com webhook should pass"
        );
    }

    #[test]
    fn test_discord_disabled_with_invalid_webhook_passes() {
        let mut config = create_valid_config();
        config.alerts.discord.enabled = false;
        config.alerts.discord.webhook_url = "invalid".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Invalid Discord webhook should pass when disabled"
        );
    }

    #[test]
    fn test_discord_with_user_mention_passes() {
        let mut config = create_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.webhook_url = "https://discord.com/api/webhooks/123/abc".to_string();
        config.alerts.discord.user_id_to_mention = Some("123456789012345678".to_string());

        assert!(
            validate_config(&config).is_ok(),
            "Discord config with user mention should pass"
        );
    }

    // ========================================
    // Telegram Configuration Tests
    // ========================================

    #[test]
    fn test_telegram_enabled_with_empty_bot_token_passes_validation() {
        // In v2.0+, Telegram bot token is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = true;
        config.alerts.telegram.bot_token = "".to_string();
        config.alerts.telegram.chat_id = "123456789".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Empty Telegram bot token should pass validation (credential is in keyring)"
        );
    }

    #[test]
    fn test_telegram_enabled_but_empty_chat_id_fails() {
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = true;
        config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
        config.alerts.telegram.chat_id = "".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty Telegram chat ID when enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Telegram chat ID is required"));
    }

    #[test]
    fn test_telegram_bot_token_length_not_validated_in_config() {
        // In v2.0+, Telegram bot token is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = true;
        config.alerts.telegram.bot_token = "t".repeat(101);
        config.alerts.telegram.chat_id = "123456789".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Telegram bot token length not validated in config (validated in keyring)"
        );
    }

    #[test]
    fn test_telegram_chat_id_too_long_fails() {
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = true;
        config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
        config.alerts.telegram.chat_id = "c".repeat(51);

        let result = validate_config(&config);
        assert!(result.is_err(), "Telegram chat ID > 50 chars should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Telegram chat ID too long"));
    }

    #[test]
    fn test_telegram_disabled_with_invalid_config_passes() {
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = false;
        config.alerts.telegram.bot_token = "".to_string();
        config.alerts.telegram.chat_id = "".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Invalid Telegram config should pass when disabled"
        );
    }

    #[test]
    fn test_telegram_valid_configuration_passes() {
        let mut config = create_valid_config();
        config.alerts.telegram.enabled = true;
        config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
        config.alerts.telegram.chat_id = "123456789".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Valid Telegram configuration should pass"
        );
    }

    // ========================================
    // Teams Configuration Tests
    // ========================================

    #[test]
    fn test_teams_enabled_with_empty_webhook_passes_validation() {
        // In v2.0+, Teams webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.teams.enabled = true;
        config.alerts.teams.webhook_url = "".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Empty Teams webhook should pass validation (credential is in keyring)"
        );
    }

    #[test]
    fn test_teams_webhook_format_not_validated_in_config() {
        // In v2.0+, Teams webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.teams.enabled = true;
        config.alerts.teams.webhook_url = "https://evil.com/webhook".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Teams webhook format not validated in config (validated in keyring)"
        );
    }

    #[test]
    fn test_teams_webhook_length_not_validated_in_config() {
        // In v2.0+, Teams webhook is stored in OS keyring, not config.
        let mut config = create_valid_config();
        config.alerts.teams.enabled = true;
        config.alerts.teams.webhook_url =
            format!("https://outlook.office.com/webhook/{}", "X".repeat(500));

        let result = validate_config(&config);
        assert!(
            result.is_ok(),
            "Teams webhook length not validated in config (validated in keyring)"
        );
    }

    #[test]
    fn test_teams_valid_webhook_office_com_passes() {
        let mut config = create_valid_config();
        config.alerts.teams.enabled = true;
        config.alerts.teams.webhook_url = "https://outlook.office.com/webhook/abc123".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Valid outlook.office.com webhook should pass"
        );
    }

    #[test]
    fn test_teams_valid_webhook_office365_passes() {
        let mut config = create_valid_config();
        config.alerts.teams.enabled = true;
        config.alerts.teams.webhook_url =
            "https://outlook.office365.com/webhook/abc123".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Valid outlook.office365.com webhook should pass"
        );
    }

    #[test]
    fn test_teams_disabled_with_invalid_webhook_passes() {
        let mut config = create_valid_config();
        config.alerts.teams.enabled = false;
        config.alerts.teams.webhook_url = "invalid".to_string();

        assert!(
            validate_config(&config).is_ok(),
            "Invalid Teams webhook should pass when disabled"
        );
    }

    // ========================================
    // LinkedIn Configuration Tests
    // ========================================

    #[test]
    fn test_linkedin_enabled_but_empty_session_cookie_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "".to_string();
        config.linkedin.query = "software engineer".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty LinkedIn session cookie when enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn session cookie is required"));
    }

    #[test]
    fn test_linkedin_enabled_but_empty_query_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "abc123".to_string();
        config.linkedin.query = "".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "Empty LinkedIn query when enabled should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn search query is required"));
    }

    #[test]
    fn test_linkedin_session_cookie_too_long_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "c".repeat(501);
        config.linkedin.query = "software engineer".to_string();

        let result = validate_config(&config);
        assert!(
            result.is_err(),
            "LinkedIn session cookie > 500 chars should fail"
        );
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn session cookie too long"));
    }

    #[test]
    fn test_linkedin_query_too_long_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "abc123".to_string();
        config.linkedin.query = "q".repeat(201);

        let result = validate_config(&config);
        assert!(result.is_err(), "LinkedIn query > 200 chars should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn search query too long"));
    }

    #[test]
    fn test_linkedin_location_too_long_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "abc123".to_string();
        config.linkedin.query = "software engineer".to_string();
        config.linkedin.location = "l".repeat(101);

        let result = validate_config(&config);
        assert!(result.is_err(), "LinkedIn location > 100 chars should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn location too long"));
    }

    #[test]
    fn test_linkedin_limit_exceeds_max_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "abc123".to_string();
        config.linkedin.query = "software engineer".to_string();
        config.linkedin.limit = 101;

        let result = validate_config(&config);
        assert!(result.is_err(), "LinkedIn limit > 100 should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn result limit cannot exceed 100"));
    }

    #[test]
    fn test_linkedin_limit_zero_fails() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "abc123".to_string();
        config.linkedin.query = "software engineer".to_string();
        config.linkedin.limit = 0;

        let result = validate_config(&config);
        assert!(result.is_err(), "LinkedIn limit of 0 should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("LinkedIn result limit must be at least 1"));
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

    #[test]
    fn test_linkedin_valid_configuration_passes() {
        let mut config = create_valid_config();
        config.linkedin.enabled = true;
        config.linkedin.session_cookie = "AQEDATXNMjA...".to_string();
        config.linkedin.query = "rust developer".to_string();
        config.linkedin.location = "San Francisco, CA".to_string();
        config.linkedin.remote_only = true;
        config.linkedin.limit = 75;

        assert!(
            validate_config(&config).is_ok(),
            "Valid LinkedIn configuration should pass"
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
        // The custom defaults (enabled=true, play_sound=true) only apply during JSON deserialization
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
            "title_allowlist": ["Security Engineer"],
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
            "title_allowlist": ["Engineer"],
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
            "title_allowlist": ["Engineer"],
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
            "title_allowlist": ["Engineer"],
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
        assert_eq!(config.alerts.desktop.play_sound, true); // Field-level default works!
    }

    #[test]
    fn test_deserialize_minimal_valid_config() {
        let json = r#"{
            "title_allowlist": ["Engineer"],
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
            "Software Engineer 软件工程师".to_string(),
            "Développeur Backend".to_string(),
            "エンジニア".to_string(),
        ];
        config.keywords_boost = vec!["Rust 🦀".to_string(), "Python 🐍".to_string()];
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
    // NOTE: Temporarily disabled due to proptest macro compatibility issues
    // TODO: Fix proptest integration after upgrading to compatible version

    /*
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
        fn prop_zero_interval_fails() {
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

        /// Property: Webhook URL validation is length-bounded
        #[test]
        fn prop_webhook_url_length_bounded(
            url in "https://hooks\\.slack\\.com/services/[A-Z0-9]{1,480}",
        ) {
            let config = create_valid_config();

            // URL length should be validated (max 500 chars)
            prop_assert!(url.len() <= 500);
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

        /// Property: Boolean location preferences are always valid
        #[test]
        fn prop_location_booleans_always_valid(
            allow_remote in proptest::bool::ANY,
            allow_hybrid in proptest::bool::ANY,
            allow_onsite in proptest::bool::ANY,
        ) {
            let mut config = create_valid_config();
            config.location_preferences.allow_remote = allow_remote;
            config.location_preferences.allow_hybrid = allow_hybrid;
            config.location_preferences.allow_onsite = allow_onsite;

            prop_assert!(validate_config(&config).is_ok());
        }
    }
    */
}
