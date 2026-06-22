//! Configuration validation logic

mod alerts;
mod external_ai;
mod scrapers;

use super::types::Config;
use super::validation_error::{ValidationError, ValidationErrors};
use crate::core::source_urls::{parse_greenhouse_company_url, parse_lever_company_url};
use crate::core::url_security::validate_external_https_url;

const MIN_BOOKMARKLET_PORT: u16 = 1024;
const MAX_BOOKMARKLET_PORT: u16 = u16::MAX;

pub fn validate_config(config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    let mut errors = ValidationErrors::new();

    validate_core_settings(config, &mut errors);
    validate_salary(config, &mut errors);
    validate_lists(config, &mut errors);
    validate_location(config, &mut errors);
    alerts::validate_alerts(config, &mut errors);
    scrapers::validate_scrapers(config, &mut errors);
    external_ai::validate_external_ai(config, &mut errors);
    validate_urls(config, &mut errors);

    if errors.is_empty() {
        Ok(())
    } else {
        Err(Box::new(errors))
    }
}

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

    if config.auto_refresh.enabled && config.auto_refresh.interval_minutes == 0 {
        errors.add(ValidationError::out_of_range(
            "auto_refresh.interval_minutes",
            config.auto_refresh.interval_minutes,
            Some(1_u32),
            None::<u32>,
        ));
    }

    if config.bookmarklet_port < MIN_BOOKMARKLET_PORT {
        errors.add(ValidationError::out_of_range(
            "bookmarklet_port",
            config.bookmarklet_port,
            Some(MIN_BOOKMARKLET_PORT),
            Some(MAX_BOOKMARKLET_PORT),
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
            errors.add(ValidationError::empty_string(format!(
                "title_allowlist[{}]",
                i
            )));
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
            errors.add(ValidationError::empty_string(format!(
                "keywords_boost[{}]",
                i
            )));
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
            errors.add(ValidationError::empty_string(format!(
                "keywords_exclude[{}]",
                i
            )));
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
            errors.add(ValidationError::empty_string(format!(
                "company_whitelist[{}]",
                i
            )));
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
            errors.add(ValidationError::empty_string(format!(
                "company_blacklist[{}]",
                i
            )));
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
            errors.add(ValidationError::empty_string(format!(
                "greenhouse_urls[{}]",
                i
            )));
        } else if url.len() > MAX_URL_LENGTH {
            errors.add(ValidationError::too_long(
                format!("greenhouse_urls[{}]", i),
                url.len(),
                MAX_URL_LENGTH,
            ));
        } else if let Err(reason) = parse_greenhouse_company_url(url) {
            errors.add(ValidationError::invalid_url(
                format!("greenhouse_urls[{}]", i),
                url,
                reason,
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
        } else if let Err(reason) = parse_lever_company_url(url) {
            errors.add(ValidationError::invalid_url(
                format!("lever_urls[{}]", i),
                url,
                reason,
            ));
        }
    }

    // Validate jobswithgpt_endpoint (optional — empty disables JobsWithGPT)
    if !config.jobswithgpt_endpoint.is_empty() {
        if config.jobswithgpt_endpoint.len() > MAX_URL_LENGTH {
            errors.add(ValidationError::too_long(
                "jobswithgpt_endpoint",
                config.jobswithgpt_endpoint.len(),
                MAX_URL_LENGTH,
            ));
        } else if let Err(reason) = validate_external_https_url(&config.jobswithgpt_endpoint) {
            errors.add(ValidationError::invalid_url(
                "jobswithgpt_endpoint",
                &config.jobswithgpt_endpoint,
                reason,
            ));
        }
    }
}

/// Validate email address format
pub(super) fn is_valid_email(email: &str) -> bool {
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
