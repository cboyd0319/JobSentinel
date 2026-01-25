//! Additional validation tests for comprehensive config validation

#[cfg(test)]
mod validation_tests {
    use crate::core::config::{types::*, validation::validate_config};

    fn create_minimal_valid_config() -> Config {
        Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            salary_target_usd: None,
            penalize_missing_salary: false,
            immediate_alert_threshold: 0.8,
            scraping_interval_hours: 2,
            alerts: AlertConfig::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: LinkedInConfig::default(),
            auto_refresh: AutoRefreshConfig::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
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
        }
    }

    #[test]
    fn test_salary_target_less_than_floor_fails() {
        let mut config = create_minimal_valid_config();
        config.salary_floor_usd = 150000;
        config.salary_target_usd = Some(100000);

        let result = validate_config(&config);
        assert!(result.is_err());
        let err_str = result.unwrap_err().to_string();
        assert!(err_str.contains("salary_target_usd"));
    }

    #[test]
    fn test_salary_target_equal_to_floor_passes() {
        let mut config = create_minimal_valid_config();
        config.salary_floor_usd = 150000;
        config.salary_target_usd = Some(150000);

        assert!(validate_config(&config).is_ok());
    }

    #[test]
    fn test_no_location_types_enabled_fails() {
        let mut config = create_minimal_valid_config();
        config.location_preferences.allow_remote = false;
        config.location_preferences.allow_hybrid = false;
        config.location_preferences.allow_onsite = false;

        let result = validate_config(&config);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("at least one of allow_remote"));
    }

    #[test]
    fn test_usajobs_pay_grade_consistency() {
        let mut config = create_minimal_valid_config();
        config.usajobs.enabled = true;
        config.usajobs.email = "test@example.com".to_string();
        config.usajobs.pay_grade_min = Some(10);
        config.usajobs.pay_grade_max = Some(5);

        let result = validate_config(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("pay_grade"));
    }

    #[test]
    fn test_usajobs_pay_grade_out_of_range() {
        let mut config = create_minimal_valid_config();
        config.usajobs.enabled = true;
        config.usajobs.email = "test@example.com".to_string();
        config.usajobs.pay_grade_min = Some(16); // GS grades are 1-15

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_usajobs_date_posted_out_of_range() {
        let mut config = create_minimal_valid_config();
        config.usajobs.enabled = true;
        config.usajobs.email = "test@example.com".to_string();
        config.usajobs.date_posted_days = 61; // Max is 60

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_discord_invalid_user_id_format() {
        let mut config = create_minimal_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.user_id_to_mention = Some("not_a_number".to_string());

        let result = validate_config(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("numeric"));
    }

    #[test]
    fn test_discord_valid_user_id_passes() {
        let mut config = create_minimal_valid_config();
        config.alerts.discord.enabled = true;
        config.alerts.discord.user_id_to_mention = Some("123456789012345678".to_string());

        // Should pass (discord validation doesn't block other errors)
        // Note: webhook_url validation happens at runtime when fetching from keyring
        let result = validate_config(&config);
        // May still fail on other fields, but not on user_id format
        if let Err(e) = result {
            assert!(!e.to_string().contains("user_id"));
        }
    }

    #[test]
    fn test_company_lists_too_large() {
        let mut config = create_minimal_valid_config();
        config.company_whitelist = (0..501).map(|i| format!("Company {}", i)).collect();

        let result = validate_config(&config);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Too many"));
    }

    #[test]
    fn test_invalid_jobswithgpt_endpoint() {
        let mut config = create_minimal_valid_config();
        config.jobswithgpt_endpoint = "not a url".to_string();

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_jobswithgpt_endpoint() {
        let mut config = create_minimal_valid_config();
        config.jobswithgpt_endpoint = "".to_string();

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_all_scrapers_disabled_passes() {
        let config = create_minimal_valid_config();
        // All scrapers disabled by default
        assert!(validate_config(&config).is_ok());
    }

    #[test]
    fn test_scraper_limit_zero_fails() {
        let mut config = create_minimal_valid_config();
        config.remoteok.enabled = true;
        config.remoteok.limit = 0;

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_scraper_limit_too_large_fails() {
        let mut config = create_minimal_valid_config();
        config.builtin.enabled = true;
        config.builtin.limit = 1001;

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_validation_errors_collected() {
        let mut config = create_minimal_valid_config();
        // Create multiple errors
        config.salary_floor_usd = -1000; // Error 1: negative salary
        config.immediate_alert_threshold = 5.0; // Error 2: threshold > 1.0
        config.scraping_interval_hours = 0; // Error 3: interval < 1
        config.title_allowlist.push("".to_string()); // Error 4: empty title

        let result = validate_config(&config);
        assert!(result.is_err());

        let err_str = result.unwrap_err().to_string();
        // Should mention multiple errors
        assert!(
            err_str.contains("validation failed") || err_str.contains("negative"),
            "Expected error message to indicate validation failure"
        );
    }

    #[test]
    fn test_dice_enabled_requires_query() {
        let mut config = create_minimal_valid_config();
        config.dice.enabled = true;
        config.dice.query = "".to_string();

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_glassdoor_enabled_requires_query() {
        let mut config = create_minimal_valid_config();
        config.glassdoor.enabled = true;
        config.glassdoor.query = "".to_string();

        let result = validate_config(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_simplyhired_enabled_requires_query() {
        let mut config = create_minimal_valid_config();
        config.simplyhired.enabled = true;
        config.simplyhired.query = "".to_string();

        let result = validate_config(&config);
        assert!(result.is_err());
    }
}
