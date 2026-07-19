//! Live source connectivity checks for scraper health diagnostics

use crate::{credentials::CredentialService, Config};
use anyhow::Result;
use chrono::Utc;
use jobsentinel_domain::{
    v3_source_authorization::SourceActionDecision, v3_source_manifest::SourceOperation,
};
use jobsentinel_sources::{limits, RateLimiter};
use jobsentinel_storage::Database;
use std::time::Instant;

use self::sources::{
    test_builtin, test_dice, test_glassdoor, test_greenhouse, test_hn_hiring, test_indeed,
    test_jobswithgpt, test_lever, test_remoteok, test_simplyhired, test_usajobs, test_wellfound,
    test_weworkremotely, test_yc_startup, test_ziprecruiter,
};
use jobsentinel_storage::health::{record_smoke_test, SmokeTestResult, SmokeTestType};

const SMOKE_TEST_SCRAPERS: &[&str] = &[
    "greenhouse",
    "lever",
    "indeed",
    "remoteok",
    "wellfound",
    "weworkremotely",
    "builtin",
    "hn_hiring",
    "jobswithgpt",
    "dice",
    "yc_startup",
    "ziprecruiter",
    "usajobs",
    "simplyhired",
    "glassdoor",
];
const SOURCE_CHECK_RATE_LIMITED: &str =
    "This source is asking JobSentinel to wait before checking again.";
const SOURCE_CHECK_REJECTED: &str =
    "This source rejected the check. Review saved connection settings or try later.";
const SOURCE_CHECK_BAD_RESPONSE: &str =
    "This source returned an unexpected response. Try again later.";
const SOURCE_CHECK_NETWORK_ERROR: &str =
    "JobSentinel could not reach this source. Check your internet connection or try again later.";
const SOURCE_CHECK_READ_ERROR: &str =
    "JobSentinel could not read this source response. Try again later.";
const SOURCE_CHECK_DEFAULT_ERROR: &str =
    "This source check could not finish. Try again later or save a safe support report.";
const RESTRICTED_SOURCE_CHECK_UNAVAILABLE: &str =
    "This restricted connectivity check is unavailable. Use the reviewed scheduled source, a search link, Browser Import, or manual entry.";
const USAJOBS_SOURCE_CHECK_UNAVAILABLE: &str =
    "This USAJobs connectivity check is unavailable until its reviewed source governance is current.";
const USAJOBS_DISABLED: &str = "USAJobs scraping not enabled";
const USAJOBS_EMAIL_MISSING: &str = "USAJobs email not configured";
const REMOTEOK_DISABLED: &str = "RemoteOK scraping not enabled";
const REMOTEOK_SOURCE_CHECK_UNAVAILABLE: &str =
    "This RemoteOK connectivity check is unavailable until its reviewed source governance is current.";
// Mirrors restricted public unauthenticated source-check helpers from the
// shared source taxonomy. Source-specific reasons live in
// src/shared/restrictedSourceTaxonomy.ts and docs/features/scrapers.md.
const RESTRICTED_SOURCE_CHECK_SCRAPERS: &[&str] = &[
    "indeed",
    "wellfound",
    "builtin",
    "dice",
    "ziprecruiter",
    "simplyhired",
    "glassdoor",
];

#[must_use]
pub fn smoke_test_scrapers() -> &'static [&'static str] {
    SMOKE_TEST_SCRAPERS
}

#[must_use]
pub fn is_known_scraper_name(scraper_name: &str) -> bool {
    SMOKE_TEST_SCRAPERS.contains(&scraper_name)
}

fn source_check_error_message(error: &anyhow::Error) -> String {
    let text = error.to_string().to_ascii_lowercase();

    if text.contains("http 429") || text.contains("rate limit") {
        return SOURCE_CHECK_RATE_LIMITED.to_string();
    }

    if text.contains("http 401") || text.contains("http 403") || text.contains("auth") {
        return SOURCE_CHECK_REJECTED.to_string();
    }

    if text.contains("http ") {
        return SOURCE_CHECK_BAD_RESPONSE.to_string();
    }

    if text.contains("timeout")
        || text.contains("timed out")
        || text.contains("connect")
        || text.contains("network")
        || text.contains("dns")
        || text.contains("request")
    {
        return SOURCE_CHECK_NETWORK_ERROR.to_string();
    }

    if text.contains("parse")
        || text.contains("json")
        || text.contains("body")
        || text.contains("response")
    {
        return SOURCE_CHECK_READ_ERROR.to_string();
    }

    SOURCE_CHECK_DEFAULT_ERROR.to_string()
}

fn validate_smoke_details(scraper_name: &str, details: &serde_json::Value) -> Result<()> {
    if details
        .get("status")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|status| status == "skipped")
    {
        return Ok(());
    }

    if details
        .get("selectors_found")
        .and_then(serde_json::Value::as_bool)
        .is_some_and(|selectors_found| !selectors_found)
    {
        return Err(anyhow::anyhow!(
            "{} source check did not find expected job selectors",
            scraper_name
        ));
    }

    if details
        .get("jobs_found")
        .and_then(serde_json::Value::as_i64)
        .is_some_and(|jobs_found| jobs_found <= 0)
    {
        return Err(anyhow::anyhow!(
            "{} source check did not find any jobs",
            scraper_name
        ));
    }

    Ok(())
}

fn smoke_rate_limit(scraper_name: &str) -> u32 {
    match scraper_name {
        "greenhouse" => limits::GREENHOUSE,
        "lever" => limits::LEVER,
        "indeed" => limits::INDEED,
        "wellfound" => 200,
        "weworkremotely" => limits::WEWORKREMOTELY,
        "builtin" => limits::BUILTIN,
        "hn_hiring" => limits::HN_HIRING,
        "jobswithgpt" => limits::JOBSWITHGPT,
        "dice" => limits::DICE,
        "yc_startup" => limits::YC_STARTUP,
        "ziprecruiter" => 300,
        "simplyhired" => limits::SIMPLYHIRED,
        "glassdoor" => limits::GLASSDOOR,
        _ => 60,
    }
}

fn is_restricted_source_check(scraper_name: &str) -> bool {
    RESTRICTED_SOURCE_CHECK_SCRAPERS.contains(&scraper_name)
}

async fn record_skipped_smoke_test(
    db: &Database,
    scraper_name: &str,
    start: Instant,
    reason: &str,
) -> Result<SmokeTestResult> {
    let result = SmokeTestResult {
        scraper_name: scraper_name.to_string(),
        test_type: SmokeTestType::Connectivity,
        passed: true,
        duration_ms: start.elapsed().as_millis() as i64,
        details: Some(serde_json::json!({
            "status": "skipped",
            "reason": reason,
        })),
        error: None,
    };
    record_smoke_test(db, &result).await?;
    Ok(result)
}

/// Run a connectivity smoke test for a specific scraper
pub async fn run_smoke_test(
    db: &Database,
    config: &Config,
    scraper_name: &str,
) -> Result<SmokeTestResult> {
    let credentials = CredentialService::compatibility_keyring();
    run_smoke_test_with_credentials(db, config, scraper_name, &credentials).await
}

/// Run a connectivity smoke test with an explicit credential provider.
pub async fn run_smoke_test_with_credentials(
    db: &Database,
    config: &Config,
    scraper_name: &str,
    credentials: &CredentialService,
) -> Result<SmokeTestResult> {
    let start = Instant::now();
    if is_restricted_source_check(scraper_name) {
        return record_skipped_smoke_test(
            db,
            scraper_name,
            start,
            RESTRICTED_SOURCE_CHECK_UNAVAILABLE,
        )
        .await;
    }

    if scraper_name == "usajobs" {
        let reason = if !config.usajobs.enabled {
            Some(USAJOBS_DISABLED)
        } else if config.usajobs.email.is_empty() {
            Some(USAJOBS_EMAIL_MISSING)
        } else {
            None
        };
        if let Some(reason) = reason {
            return record_skipped_smoke_test(db, scraper_name, start, reason).await;
        }
    }
    if scraper_name == "remoteok" && !config.remoteok.enabled {
        return record_skipped_smoke_test(db, scraper_name, start, REMOTEOK_DISABLED).await;
    }

    let governed_decision = match scraper_name {
        "usajobs" => Some(
            crate::v3_source_governance::authorize_usajobs(
                db,
                SourceOperation::ConnectivityCheck,
                Utc::now().date_naive(),
            )
            .await,
        ),
        "remoteok" => Some(
            crate::v3_source_governance::authorize_remoteok(
                db,
                SourceOperation::ConnectivityCheck,
                Utc::now().date_naive(),
            )
            .await,
        ),
        _ => None,
    };
    let governed_limit = match governed_decision {
        Some(Ok(SourceActionDecision::Allowed {
            request_limit_per_hour,
            connectivity_required: true,
        })) => Some(u32::from(request_limit_per_hour)),
        Some(_) => {
            let reason = if scraper_name == "usajobs" {
                USAJOBS_SOURCE_CHECK_UNAVAILABLE
            } else {
                REMOTEOK_SOURCE_CHECK_UNAVAILABLE
            };
            return record_skipped_smoke_test(db, scraper_name, start, reason).await;
        }
        None => None,
    };

    if let Some(limit) = governed_limit {
        RateLimiter::shared().wait_paced(scraper_name, limit).await;
    } else {
        RateLimiter::shared()
            .wait(scraper_name, smoke_rate_limit(scraper_name))
            .await;
    }

    let result = match scraper_name {
        "greenhouse" => test_greenhouse().await,
        "lever" => test_lever().await,
        "indeed" => test_indeed().await,
        "remoteok" => test_remoteok().await,
        "wellfound" => test_wellfound().await,
        "weworkremotely" => test_weworkremotely().await,
        "builtin" => test_builtin().await,
        "hn_hiring" => test_hn_hiring().await,
        "jobswithgpt" => test_jobswithgpt(config).await,
        "dice" => test_dice().await,
        "yc_startup" => test_yc_startup().await,
        "ziprecruiter" => test_ziprecruiter().await,
        "usajobs" => test_usajobs(config, credentials).await,
        "simplyhired" => test_simplyhired().await,
        "glassdoor" => test_glassdoor().await,
        _ => Err(anyhow::anyhow!("Unknown scraper")),
    };

    let duration_ms = start.elapsed().as_millis() as i64;

    let smoke_result = match result.and_then(|details| {
        validate_smoke_details(scraper_name, &details)?;
        Ok(details)
    }) {
        Ok(details) => SmokeTestResult {
            scraper_name: scraper_name.to_string(),
            test_type: SmokeTestType::Connectivity,
            passed: true,
            duration_ms,
            details: Some(details),
            error: None,
        },
        Err(e) => SmokeTestResult {
            scraper_name: scraper_name.to_string(),
            test_type: SmokeTestType::Connectivity,
            passed: false,
            duration_ms,
            details: None,
            error: Some(source_check_error_message(&e)),
        },
    };

    // Record the test result
    record_smoke_test(db, &smoke_result).await?;

    Ok(smoke_result)
}

/// Run smoke tests for all enabled scrapers
pub async fn run_all_smoke_tests(db: &Database, config: &Config) -> Result<Vec<SmokeTestResult>> {
    let credentials = CredentialService::compatibility_keyring();
    run_all_smoke_tests_with_credentials(db, config, &credentials).await
}

/// Run smoke tests for all enabled scrapers with an explicit credential provider.
pub async fn run_all_smoke_tests_with_credentials(
    db: &Database,
    config: &Config,
    credentials: &CredentialService,
) -> Result<Vec<SmokeTestResult>> {
    let mut results = Vec::new();

    for scraper in SMOKE_TEST_SCRAPERS {
        let result = run_smoke_test_with_credentials(db, config, scraper, credentials).await?;
        results.push(result);
    }

    Ok(results)
}

mod sources;

#[cfg(test)]
mod tests;
