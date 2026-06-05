use super::*;
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
