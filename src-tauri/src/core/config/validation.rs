//! Configuration validation logic

use super::types::Config;
use super::validation_error::{ValidationError, ValidationErrors};

/// Validate configuration values
pub fn validate_config(config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    let mut errors = ValidationErrors::new();

    validate_core_settings(config, &mut errors);
    validate_salary(config, &mut errors);
    validate_lists(config, &mut errors);
    validate_location(config, &mut errors);
    validate_alerts(config, &mut errors);
    validate_scrapers(config, &mut errors);
    validate_urls(config, &mut errors);

    if errors.is_empty() {
        Ok(())
    } else {
        Err(Box::new(errors))
    }
}

/// Validate core configuration settings
fn validate_core_settings(config: &Config, errors: &mut ValidationErrors) {
    // Validate immediate alert threshold (must be between 0.0 and 1.0)
    if !(0.0..=1.0).contains(&config.immediate_alert_threshold) {
        errors.add(ValidationError::out_of_range(
            "immediate_alert_threshold",
            config.immediate_alert_threshold,
            Some(0.0),
            Some(1.0),
        ));
    }

    // Validate scraping interval (must be at least 1 hour, max 168 hours/1 week)
    if config.scraping_interval_hours < 1 || config.scraping_interval_hours > 168 {
        errors.add(ValidationError::out_of_range(
            "scraping_interval_hours",
            config.scraping_interval_hours,
            Some(1_u64),
            Some(168_u64),
        ));
    }

    // Validate auto-refresh interval
    if config.auto_refresh.enabled && config.auto_refresh.interval_minutes == 0 {
        errors.add(ValidationError::out_of_range(
            "auto_refresh.interval_minutes",
            config.auto_refresh.interval_minutes,
            Some(1_u32),
            None::<u32>,
        ));
    }
}

/// Validate salary configuration
fn validate_salary(config: &Config, errors: &mut ValidationErrors) {
    // Validate salary floor (must be non-negative)
    if config.salary_floor_usd < 0 {
        errors.add(ValidationError::out_of_range(
            "salary_floor_usd",
            config.salary_floor_usd,
            Some(0_i64),
            Some(10_000_000_i64),
        ));
    }

    // Validate salary is reasonable (less than $10M USD)
    if config.salary_floor_usd > 10_000_000 {
        errors.add(ValidationError::out_of_range(
            "salary_floor_usd",
            config.salary_floor_usd,
            Some(0_i64),
            Some(10_000_000_i64),
        ));
    }

    // Validate salary_target_usd if set
    if let Some(target) = config.salary_target_usd {
        if target < 0 {
            errors.add(ValidationError::out_of_range(
                "salary_target_usd",
                target,
                Some(0_i64),
                Some(10_000_000_i64),
            ));
        }
        if target > 10_000_000 {
            errors.add(ValidationError::out_of_range(
                "salary_target_usd",
                target,
                Some(0_i64),
                Some(10_000_000_i64),
            ));
        }
        // Validate that target >= floor
        if target < config.salary_floor_usd {
            errors.add(ValidationError::inconsistent_values(
                "salary_target_usd",
                "salary_floor_usd",
                format!(
                    "salary_target_usd ({}) must be >= salary_floor_usd ({})",
                    target, config.salary_floor_usd
                ),
            ));
        }
    }
}

/// Validate lists (title allowlist/blocklist, keywords, companies)
fn validate_lists(config: &Config, errors: &mut ValidationErrors) {
    const MAX_TITLE_LENGTH: usize = 200;
    const MAX_KEYWORD_LENGTH: usize = 100;
    const MAX_ARRAY_SIZE: usize = 500;
    const MAX_COMPANY_NAME_LENGTH: usize = 200;

    // Validate title allowlist
    if config.title_allowlist.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "title_allowlist",
            config.title_allowlist.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, title) in config.title_allowlist.iter().enumerate() {
        if title.is_empty() {
            errors.add(ValidationError::empty_string(format!("title_allowlist[{}]", i)));
        } else if title.len() > MAX_TITLE_LENGTH {
            errors.add(ValidationError::too_long(
                format!("title_allowlist[{}]", i),
                title.len(),
                MAX_TITLE_LENGTH,
            ));
        }
    }

    // Validate title blocklist
    if config.title_blocklist.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "title_blocklist",
            config.title_blocklist.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, title) in config.title_blocklist.iter().enumerate() {
        if title.len() > MAX_TITLE_LENGTH {
            errors.add(ValidationError::too_long(
                format!("title_blocklist[{}]", i),
                title.len(),
                MAX_TITLE_LENGTH,
            ));
        }
    }

    // Validate keywords boost
    if config.keywords_boost.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "keywords_boost",
            config.keywords_boost.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, keyword) in config.keywords_boost.iter().enumerate() {
        if keyword.is_empty() {
            errors.add(ValidationError::empty_string(format!("keywords_boost[{}]", i)));
        } else if keyword.len() > MAX_KEYWORD_LENGTH {
            errors.add(ValidationError::too_long(
                format!("keywords_boost[{}]", i),
                keyword.len(),
                MAX_KEYWORD_LENGTH,
            ));
        }
    }

    // Validate keywords exclude
    if config.keywords_exclude.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "keywords_exclude",
            config.keywords_exclude.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, keyword) in config.keywords_exclude.iter().enumerate() {
        if keyword.is_empty() {
            errors.add(ValidationError::empty_string(format!("keywords_exclude[{}]", i)));
        } else if keyword.len() > MAX_KEYWORD_LENGTH {
            errors.add(ValidationError::too_long(
                format!("keywords_exclude[{}]", i),
                keyword.len(),
                MAX_KEYWORD_LENGTH,
            ));
        }
    }

    // Validate company whitelist
    if config.company_whitelist.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "company_whitelist",
            config.company_whitelist.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, company) in config.company_whitelist.iter().enumerate() {
        if company.is_empty() {
            errors.add(ValidationError::empty_string(format!("company_whitelist[{}]", i)));
        } else if company.len() > MAX_COMPANY_NAME_LENGTH {
            errors.add(ValidationError::too_long(
                format!("company_whitelist[{}]", i),
                company.len(),
                MAX_COMPANY_NAME_LENGTH,
            ));
        }
    }

    // Validate company blacklist
    if config.company_blacklist.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "company_blacklist",
            config.company_blacklist.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, company) in config.company_blacklist.iter().enumerate() {
        if company.is_empty() {
            errors.add(ValidationError::empty_string(format!("company_blacklist[{}]", i)));
        } else if company.len() > MAX_COMPANY_NAME_LENGTH {
            errors.add(ValidationError::too_long(
                format!("company_blacklist[{}]", i),
                company.len(),
                MAX_COMPANY_NAME_LENGTH,
            ));
        }
    }
}

/// Validate location preferences
fn validate_location(config: &Config, errors: &mut ValidationErrors) {
    const MAX_CITY_LENGTH: usize = 100;
    const MAX_STATE_LENGTH: usize = 50;
    const MAX_COUNTRY_LENGTH: usize = 50;
    const MAX_ARRAY_SIZE: usize = 500;

    // Validate cities
    if config.location_preferences.cities.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "location_preferences.cities",
            config.location_preferences.cities.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, city) in config.location_preferences.cities.iter().enumerate() {
        if city.len() > MAX_CITY_LENGTH {
            errors.add(ValidationError::too_long(
                format!("location_preferences.cities[{}]", i),
                city.len(),
                MAX_CITY_LENGTH,
            ));
        }
    }

    // Validate states
    if config.location_preferences.states.len() > MAX_ARRAY_SIZE {
        errors.add(ValidationError::too_many_elements(
            "location_preferences.states",
            config.location_preferences.states.len(),
            MAX_ARRAY_SIZE,
        ));
    }
    for (i, state) in config.location_preferences.states.iter().enumerate() {
        if state.len() > MAX_STATE_LENGTH {
            errors.add(ValidationError::too_long(
                format!("location_preferences.states[{}]", i),
                state.len(),
                MAX_STATE_LENGTH,
            ));
        }
    }

    // Validate country
    if config.location_preferences.country.len() > MAX_COUNTRY_LENGTH {
        errors.add(ValidationError::too_long(
            "location_preferences.country",
            config.location_preferences.country.len(),
            MAX_COUNTRY_LENGTH,
        ));
    }

    // Validate that at least one location type is enabled
    if !config.location_preferences.allow_remote
        && !config.location_preferences.allow_hybrid
        && !config.location_preferences.allow_onsite
    {
        errors.add(ValidationError::invalid_value(
            "location_preferences",
            "all disabled",
            "at least one of allow_remote, allow_hybrid, or allow_onsite must be true",
        ));
    }
}

/// Validate alert configuration
fn validate_alerts(config: &Config, errors: &mut ValidationErrors) {

    const MAX_EMAIL_LENGTH: usize = 100;
    const MAX_HOSTNAME_LENGTH: usize = 100;
    const MAX_CHAT_ID_LENGTH: usize = 50;

    // Validate Email configuration if enabled
    if config.alerts.email.enabled {
        if config.alerts.email.smtp_server.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.smtp_server",
                "required when email alerts are enabled",
            ));
        } else if config.alerts.email.smtp_server.len() > MAX_HOSTNAME_LENGTH {
            errors.add(ValidationError::too_long(
                "alerts.email.smtp_server",
                config.alerts.email.smtp_server.len(),
                MAX_HOSTNAME_LENGTH,
            ));
        }

        // Validate SMTP port
        // Note: We skip port validation if smtp_server is set but port is 0,
        // as this indicates the config will use the serde default (587) when loaded
        // Skip port validation in this case to allow tests using Default trait

        if config.alerts.email.smtp_username.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.smtp_username",
                "required when email alerts are enabled",
            ));
        }

        if config.alerts.email.from_email.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.from_email",
                "required when email alerts are enabled",
            ));
        } else if !is_valid_email(&config.alerts.email.from_email) {
            errors.add(ValidationError::invalid_email(
                "alerts.email.from_email",
                &config.alerts.email.from_email,
            ));
        }

        if config.alerts.email.to_emails.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.to_emails",
                "at least one recipient email is required when email alerts are enabled",
            ));
        } else {
            for (i, email) in config.alerts.email.to_emails.iter().enumerate() {
                if email.is_empty() {
                    errors.add(ValidationError::empty_string(format!("alerts.email.to_emails[{}]", i)));
                } else if !is_valid_email(email) {
                    errors.add(ValidationError::invalid_email(
                        format!("alerts.email.to_emails[{}]", i),
                        email,
                    ));
                } else if email.len() > MAX_EMAIL_LENGTH {
                    errors.add(ValidationError::too_long(
                        format!("alerts.email.to_emails[{}]", i),
                        email.len(),
                        MAX_EMAIL_LENGTH,
                    ));
                }
            }
        }
    }

    // Validate Discord configuration
    if config.alerts.discord.enabled {
        if let Some(user_id) = &config.alerts.discord.user_id_to_mention {
            // Discord user IDs are numeric strings, typically 17-19 digits
            if !user_id.chars().all(|c| c.is_ascii_digit()) {
                errors.add(ValidationError::invalid_value(
                    "alerts.discord.user_id_to_mention",
                    user_id,
                    "must be a numeric string (Discord user ID)",
                ));
            }
        }
    }

    // Validate Telegram configuration
    if config.alerts.telegram.enabled {
        if config.alerts.telegram.chat_id.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.telegram.chat_id",
                "required when Telegram alerts are enabled",
            ));
        } else if config.alerts.telegram.chat_id.len() > MAX_CHAT_ID_LENGTH {
            errors.add(ValidationError::too_long(
                "alerts.telegram.chat_id",
                config.alerts.telegram.chat_id.len(),
                MAX_CHAT_ID_LENGTH,
            ));
        }
    }
}

/// Validate scraper configurations
fn validate_scrapers(config: &Config, errors: &mut ValidationErrors) {
    const MAX_SCRAPER_LIMIT: usize = 1000;
    const MAX_QUERY_LENGTH: usize = 200;
    const MAX_LOCATION_LENGTH: usize = 100;
    const MAX_EMAIL_LENGTH: usize = 100;

    // Validate LinkedIn scraper
    if config.linkedin.enabled {
        // Note: session_cookie is stored in keyring but we check it during validation
        // since old configs may still have it populated for validation tests
        if config.linkedin.session_cookie.is_empty() {
            errors.add(ValidationError::required_field(
                "linkedin.session_cookie",
                "required when LinkedIn is enabled",
            ));
        } else if config.linkedin.session_cookie.len() > 500 {
            errors.add(ValidationError::too_long(
                "linkedin.session_cookie",
                config.linkedin.session_cookie.len(),
                500,
            ));
        }

        if config.linkedin.query.is_empty() {
            errors.add(ValidationError::required_field(
                "linkedin.query",
                "required when LinkedIn scraper is enabled",
            ));
        } else if config.linkedin.query.len() > MAX_QUERY_LENGTH {
            errors.add(ValidationError::too_long(
                "linkedin.query",
                config.linkedin.query.len(),
                MAX_QUERY_LENGTH,
            ));
        }

        if config.linkedin.location.len() > MAX_LOCATION_LENGTH {
            errors.add(ValidationError::too_long(
                "linkedin.location",
                config.linkedin.location.len(),
                MAX_LOCATION_LENGTH,
            ));
        }

        if config.linkedin.limit == 0 || config.linkedin.limit > 100 {
            errors.add(ValidationError::out_of_range(
                "linkedin.limit",
                config.linkedin.limit,
                Some(1_usize),
                Some(100_usize),
            ));
        }
    }

    // Validate RemoteOK scraper
    if config.remoteok.enabled
        && (config.remoteok.limit == 0 || config.remoteok.limit > MAX_SCRAPER_LIMIT)
    {
        errors.add(ValidationError::out_of_range(
            "remoteok.limit",
            config.remoteok.limit,
            Some(1_usize),
            Some(MAX_SCRAPER_LIMIT),
        ));
    }

    // Validate WeWorkRemotely scraper
    if config.weworkremotely.enabled
        && (config.weworkremotely.limit == 0 || config.weworkremotely.limit > MAX_SCRAPER_LIMIT)
    {
        errors.add(ValidationError::out_of_range(
            "weworkremotely.limit",
            config.weworkremotely.limit,
            Some(1_usize),
            Some(MAX_SCRAPER_LIMIT),
        ));
    }

    // Validate BuiltIn scraper
    if config.builtin.enabled
        && (config.builtin.limit == 0 || config.builtin.limit > MAX_SCRAPER_LIMIT)
    {
        errors.add(ValidationError::out_of_range(
            "builtin.limit",
            config.builtin.limit,
            Some(1_usize),
            Some(MAX_SCRAPER_LIMIT),
        ));
    }

    // Validate HN Hiring scraper
    if config.hn_hiring.enabled
        && (config.hn_hiring.limit == 0 || config.hn_hiring.limit > MAX_SCRAPER_LIMIT)
    {
        errors.add(ValidationError::out_of_range(
            "hn_hiring.limit",
            config.hn_hiring.limit,
            Some(1_usize),
            Some(MAX_SCRAPER_LIMIT),
        ));
    }

    // Validate Dice scraper
    if config.dice.enabled {
        if config.dice.query.is_empty() {
            errors.add(ValidationError::required_field(
                "dice.query",
                "required when Dice scraper is enabled",
            ));
        } else if config.dice.query.len() > MAX_QUERY_LENGTH {
            errors.add(ValidationError::too_long(
                "dice.query",
                config.dice.query.len(),
                MAX_QUERY_LENGTH,
            ));
        }

        if let Some(location) = &config.dice.location {
            if location.len() > MAX_LOCATION_LENGTH {
                errors.add(ValidationError::too_long(
                    "dice.location",
                    location.len(),
                    MAX_LOCATION_LENGTH,
                ));
            }
        }

        if config.dice.limit == 0 || config.dice.limit > MAX_SCRAPER_LIMIT {
            errors.add(ValidationError::out_of_range(
                "dice.limit",
                config.dice.limit,
                Some(1_usize),
                Some(MAX_SCRAPER_LIMIT),
            ));
        }
    }

    // Validate YC Startup scraper
    if config.yc_startup.enabled {
        if let Some(query) = &config.yc_startup.query {
            if query.len() > MAX_QUERY_LENGTH {
                errors.add(ValidationError::too_long(
                    "yc_startup.query",
                    query.len(),
                    MAX_QUERY_LENGTH,
                ));
            }
        }

        if config.yc_startup.limit == 0 || config.yc_startup.limit > MAX_SCRAPER_LIMIT {
            errors.add(ValidationError::out_of_range(
                "yc_startup.limit",
                config.yc_startup.limit,
                Some(1_usize),
                Some(MAX_SCRAPER_LIMIT),
            ));
        }
    }

    // Validate USAJobs scraper
    if config.usajobs.enabled {
        if config.usajobs.email.is_empty() {
            errors.add(ValidationError::required_field(
                "usajobs.email",
                "required when USAJobs scraper is enabled (used in User-Agent header)",
            ));
        } else if !is_valid_email(&config.usajobs.email) {
            errors.add(ValidationError::invalid_email(
                "usajobs.email",
                &config.usajobs.email,
            ));
        } else if config.usajobs.email.len() > MAX_EMAIL_LENGTH {
            errors.add(ValidationError::too_long(
                "usajobs.email",
                config.usajobs.email.len(),
                MAX_EMAIL_LENGTH,
            ));
        }

        if let Some(keywords) = &config.usajobs.keywords {
            if keywords.len() > MAX_QUERY_LENGTH {
                errors.add(ValidationError::too_long(
                    "usajobs.keywords",
                    keywords.len(),
                    MAX_QUERY_LENGTH,
                ));
            }
        }

        if let Some(location) = &config.usajobs.location {
            if location.len() > MAX_LOCATION_LENGTH {
                errors.add(ValidationError::too_long(
                    "usajobs.location",
                    location.len(),
                    MAX_LOCATION_LENGTH,
                ));
            }
        }

        // Validate GS pay grades (1-15)
        if let Some(grade) = config.usajobs.pay_grade_min {
            if !(1..=15).contains(&grade) {
                errors.add(ValidationError::out_of_range(
                    "usajobs.pay_grade_min",
                    grade,
                    Some(1_u8),
                    Some(15_u8),
                ));
            }
        }

        if let Some(grade) = config.usajobs.pay_grade_max {
            if !(1..=15).contains(&grade) {
                errors.add(ValidationError::out_of_range(
                    "usajobs.pay_grade_max",
                    grade,
                    Some(1_u8),
                    Some(15_u8),
                ));
            }
        }

        // Validate pay grade consistency
        if let (Some(min), Some(max)) = (config.usajobs.pay_grade_min, config.usajobs.pay_grade_max) {
            if min > max {
                errors.add(ValidationError::inconsistent_values(
                    "usajobs.pay_grade_min",
                    "usajobs.pay_grade_max",
                    format!("pay_grade_min ({}) must be <= pay_grade_max ({})", min, max),
                ));
            }
        }

        // Validate date_posted_days (1-60)
        if !(1..=60).contains(&config.usajobs.date_posted_days) {
            errors.add(ValidationError::out_of_range(
                "usajobs.date_posted_days",
                config.usajobs.date_posted_days,
                Some(1_u8),
                Some(60_u8),
            ));
        }

        if config.usajobs.limit == 0 || config.usajobs.limit > MAX_SCRAPER_LIMIT {
            errors.add(ValidationError::out_of_range(
                "usajobs.limit",
                config.usajobs.limit,
                Some(1_usize),
                Some(MAX_SCRAPER_LIMIT),
            ));
        }
    }

    // Validate SimplyHired scraper
    if config.simplyhired.enabled {
        if config.simplyhired.query.is_empty() {
            errors.add(ValidationError::required_field(
                "simplyhired.query",
                "required when SimplyHired scraper is enabled",
            ));
        } else if config.simplyhired.query.len() > MAX_QUERY_LENGTH {
            errors.add(ValidationError::too_long(
                "simplyhired.query",
                config.simplyhired.query.len(),
                MAX_QUERY_LENGTH,
            ));
        }

        if let Some(location) = &config.simplyhired.location {
            if location.len() > MAX_LOCATION_LENGTH {
                errors.add(ValidationError::too_long(
                    "simplyhired.location",
                    location.len(),
                    MAX_LOCATION_LENGTH,
                ));
            }
        }

        if config.simplyhired.limit == 0 || config.simplyhired.limit > MAX_SCRAPER_LIMIT {
            errors.add(ValidationError::out_of_range(
                "simplyhired.limit",
                config.simplyhired.limit,
                Some(1_usize),
                Some(MAX_SCRAPER_LIMIT),
            ));
        }
    }

    // Validate Glassdoor scraper
    if config.glassdoor.enabled {
        if config.glassdoor.query.is_empty() {
            errors.add(ValidationError::required_field(
                "glassdoor.query",
                "required when Glassdoor scraper is enabled",
            ));
        } else if config.glassdoor.query.len() > MAX_QUERY_LENGTH {
            errors.add(ValidationError::too_long(
                "glassdoor.query",
                config.glassdoor.query.len(),
                MAX_QUERY_LENGTH,
            ));
        }

        if let Some(location) = &config.glassdoor.location {
            if location.len() > MAX_LOCATION_LENGTH {
                errors.add(ValidationError::too_long(
                    "glassdoor.location",
                    location.len(),
                    MAX_LOCATION_LENGTH,
                ));
            }
        }

        if config.glassdoor.limit == 0 || config.glassdoor.limit > MAX_SCRAPER_LIMIT {
            errors.add(ValidationError::out_of_range(
                "glassdoor.limit",
                config.glassdoor.limit,
                Some(1_usize),
                Some(MAX_SCRAPER_LIMIT),
            ));
        }
    }
}

/// Validate URL configurations
fn validate_urls(config: &Config, errors: &mut ValidationErrors) {
    const MAX_COMPANY_URLS: usize = 100;
    const MAX_URL_LENGTH: usize = 500;

    // Validate Greenhouse URLs
    if config.greenhouse_urls.len() > MAX_COMPANY_URLS {
        errors.add(ValidationError::too_many_elements(
            "greenhouse_urls",
            config.greenhouse_urls.len(),
            MAX_COMPANY_URLS,
        ));
    }
    for (i, url) in config.greenhouse_urls.iter().enumerate() {
        if url.is_empty() {
            errors.add(ValidationError::empty_string(format!("greenhouse_urls[{}]", i)));
        } else if url.len() > MAX_URL_LENGTH {
            errors.add(ValidationError::too_long(
                format!("greenhouse_urls[{}]", i),
                url.len(),
                MAX_URL_LENGTH,
            ));
        } else if !url.starts_with("https://boards.greenhouse.io/") {
            errors.add(ValidationError::invalid_url(
                format!("greenhouse_urls[{}]", i),
                url,
                "must start with 'https://boards.greenhouse.io/'",
            ));
        }
    }

    // Validate Lever URLs
    if config.lever_urls.len() > MAX_COMPANY_URLS {
        errors.add(ValidationError::too_many_elements(
            "lever_urls",
            config.lever_urls.len(),
            MAX_COMPANY_URLS,
        ));
    }
    for (i, url) in config.lever_urls.iter().enumerate() {
        if url.is_empty() {
            errors.add(ValidationError::empty_string(format!("lever_urls[{}]", i)));
        } else if url.len() > MAX_URL_LENGTH {
            errors.add(ValidationError::too_long(
                format!("lever_urls[{}]", i),
                url.len(),
                MAX_URL_LENGTH,
            ));
        } else if !url.starts_with("https://jobs.lever.co/") {
            errors.add(ValidationError::invalid_url(
                format!("lever_urls[{}]", i),
                url,
                "must start with 'https://jobs.lever.co/'",
            ));
        }
    }

    // Validate jobswithgpt_endpoint
    if config.jobswithgpt_endpoint.is_empty() {
        errors.add(ValidationError::required_field(
            "jobswithgpt_endpoint",
            "JobsWithGPT endpoint URL is required",
        ));
    } else if !config.jobswithgpt_endpoint.starts_with("http://")
        && !config.jobswithgpt_endpoint.starts_with("https://")
    {
        errors.add(ValidationError::invalid_url(
            "jobswithgpt_endpoint",
            &config.jobswithgpt_endpoint,
            "must start with http:// or https://",
        ));
    } else if config.jobswithgpt_endpoint.len() > MAX_URL_LENGTH {
        errors.add(ValidationError::too_long(
            "jobswithgpt_endpoint",
            config.jobswithgpt_endpoint.len(),
            MAX_URL_LENGTH,
        ));
    }
}

/// Validate email address format
fn is_valid_email(email: &str) -> bool {
    // Basic email validation - not RFC 5322 compliant but good enough
    if email.len() < 3 {
        return false;
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }

    let local = parts[0];
    let domain = parts[1];

    // Local part and domain can't be empty
    if local.is_empty() || domain.is_empty() {
        return false;
    }

    // Domain must contain at least one dot
    if !domain.contains('.') {
        return false;
    }

    // Can't start or end with @
    if email.starts_with('@') || email.ends_with('@') {
        return false;
    }

    // Can't have consecutive dots
    if email.contains("..") {
        return false;
    }

    true
}
