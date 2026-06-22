use super::*;

#[test]
fn source_failure_message_omits_raw_scraper_error_details() {
    let error = ScraperError::Generic {
        scraper: "Dice".to_string(),
        message: "query='private search' token=secret location=home".to_string(),
    };

    let message = source_failure_message("Dice", scraper_failure_kind(&error));

    assert_eq!(message, "Dice source check failed (generic)");
    assert!(!message.contains("private search"));
    assert!(!message.contains("token"));
    assert!(!message.contains("home"));
}

#[test]
fn scraper_failure_kind_keeps_coarse_timeout_category() {
    let error = ScraperError::Timeout {
        url: "https://example.com/jobs?token=secret".to_string(),
        timeout_secs: 10,
    };

    assert_eq!(scraper_failure_kind(&error), "timeout");
}

#[test]
fn restricted_source_acknowledged_reads_local_user_acceptance() {
    let mut config = Config {
        title_allowlist: vec![],
        title_blocklist: vec![],
        keywords_boost: vec![],
        keywords_exclude: vec![],
        location_preferences: crate::core::config::LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 0,
        salary_target_usd: None,
        penalize_missing_salary: false,
        auto_refresh: Default::default(),
        bookmarklet_port: 4321,
        immediate_alert_threshold: 0.9,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        restricted_source_acknowledgements: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        jobswithgpt_endpoint: String::new(),
        jobswithgpt_approval: Default::default(),
        external_ai: Default::default(),
        ghost_config: None,
        use_resume_matching: false,
        company_whitelist: vec![],
        company_blacklist: vec![],
    };

    assert!(!restricted_source_acknowledged(&config, "dice"));
    config.restricted_source_acknowledgements.dice = true;
    assert!(restricted_source_acknowledged(&config, "dice"));
    assert!(!restricted_source_acknowledged(&config, "unknown"));
}

#[test]
fn restricted_source_acknowledgement_message_is_user_recoverable() {
    assert_eq!(
        restricted_source_acknowledgement_missing_message("Dice"),
        "Dice source check skipped until you review and accept restricted-source risk in Settings"
    );
}
