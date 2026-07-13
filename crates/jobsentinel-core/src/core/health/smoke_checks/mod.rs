//! Live source connectivity checks for scraper health diagnostics

use crate::core::{
    credentials::CredentialService,
    scrapers::{limits, scraper_client_builder, RateLimiter},
    url_security::ResolvedExternalUrl,
    Config, Database,
};
use anyhow::Result;
use std::time::{Duration, Instant};

use self::sources::{
    test_builtin, test_dice, test_glassdoor, test_greenhouse, test_hn_hiring, test_indeed,
    test_jobswithgpt, test_lever, test_remoteok, test_simplyhired, test_usajobs, test_wellfound,
    test_weworkremotely, test_yc_startup, test_ziprecruiter,
};
use super::types::{SmokeTestResult, SmokeTestType};

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
const RESTRICTED_SOURCE_CHECK_ACK_REQUIRED: &str =
    "Review and accept the restricted-source warning before checking this source.";
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

fn sanitized_request_error(context: &'static str, error: reqwest::Error) -> anyhow::Error {
    anyhow::anyhow!("{}: {}", context, error.without_url())
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
        "remoteok" => limits::REMOTEOK,
        "wellfound" => 200,
        "weworkremotely" => limits::WEWORKREMOTELY,
        "builtin" => limits::BUILTIN,
        "hn_hiring" => limits::HN_HIRING,
        "jobswithgpt" => limits::JOBSWITHGPT,
        "dice" => limits::DICE,
        "yc_startup" => limits::YC_STARTUP,
        "ziprecruiter" => 300,
        "usajobs" => limits::USAJOBS,
        "simplyhired" => limits::SIMPLYHIRED,
        "glassdoor" => limits::GLASSDOOR,
        _ => 60,
    }
}

fn restricted_source_check_requires_acknowledgement(scraper_name: &str) -> bool {
    RESTRICTED_SOURCE_CHECK_SCRAPERS.contains(&scraper_name)
}

fn saved_restricted_source_acknowledgement(config: &Config, scraper_name: &str) -> bool {
    match scraper_name {
        "builtin" => config.restricted_source_acknowledgements.builtin,
        "dice" => config.restricted_source_acknowledgements.dice,
        "simplyhired" => config.restricted_source_acknowledgements.simplyhired,
        "glassdoor" => config.restricted_source_acknowledgements.glassdoor,
        _ => false,
    }
}

fn restricted_source_check_acknowledged(
    config: &Config,
    scraper_name: &str,
    one_time_acknowledged: bool,
) -> bool {
    !restricted_source_check_requires_acknowledgement(scraper_name)
        || one_time_acknowledged
        || saved_restricted_source_acknowledgement(config, scraper_name)
}

fn smoke_client(user_agent: Option<&str>) -> Result<reqwest::Client> {
    smoke_client_for_target(user_agent, None)
}

fn smoke_client_for_resolved_target(
    user_agent: Option<&str>,
    target: &ResolvedExternalUrl,
) -> Result<reqwest::Client> {
    smoke_client_for_target(user_agent, Some(target))
}

fn smoke_client_for_target(
    user_agent: Option<&str>,
    target: Option<&ResolvedExternalUrl>,
) -> Result<reqwest::Client> {
    let mut builder = scraper_client_builder().timeout(Duration::from_secs(10));
    if let Some(user_agent) = user_agent {
        builder = builder.user_agent(user_agent);
    }
    if let Some((host, addrs)) = target.and_then(ResolvedExternalUrl::dns_override) {
        builder = builder.resolve_to_addrs(host, addrs);
    }
    Ok(builder.build()?)
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
    run_smoke_test_with_credentials_and_acknowledgement(
        db,
        config,
        scraper_name,
        credentials,
        false,
    )
    .await
}

/// Run a connectivity smoke test with an explicit credential provider and
/// one-time restricted-source acknowledgement from the user action that started it.
pub async fn run_smoke_test_with_credentials_and_acknowledgement(
    db: &Database,
    config: &Config,
    scraper_name: &str,
    credentials: &CredentialService,
    restricted_source_acknowledged: bool,
) -> Result<SmokeTestResult> {
    let start = Instant::now();
    if !restricted_source_check_acknowledged(config, scraper_name, restricted_source_acknowledged) {
        let smoke_result = SmokeTestResult {
            scraper_name: scraper_name.to_string(),
            test_type: SmokeTestType::Connectivity,
            passed: true,
            duration_ms: start.elapsed().as_millis() as i64,
            details: Some(serde_json::json!({
                "status": "skipped",
                "reason": RESTRICTED_SOURCE_CHECK_ACK_REQUIRED,
            })),
            error: None,
        };
        record_smoke_test(db, &smoke_result).await?;
        return Ok(smoke_result);
    }

    RateLimiter::shared()
        .wait(scraper_name, smoke_rate_limit(scraper_name))
        .await;

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
    run_all_smoke_tests_with_credentials_and_acknowledgement(db, config, credentials, false).await
}

/// Run all smoke tests, using a one-time restricted-source acknowledgement for
/// this user-triggered source check batch.
pub async fn run_all_smoke_tests_with_credentials_and_acknowledgement(
    db: &Database,
    config: &Config,
    credentials: &CredentialService,
    restricted_source_acknowledged: bool,
) -> Result<Vec<SmokeTestResult>> {
    let mut results = Vec::new();

    for scraper in SMOKE_TEST_SCRAPERS {
        let result = run_smoke_test_with_credentials_and_acknowledgement(
            db,
            config,
            scraper,
            credentials,
            restricted_source_acknowledged,
        )
        .await?;
        results.push(result);
    }

    Ok(results)
}

/// Record a smoke test result in the database
async fn record_smoke_test(db: &Database, result: &SmokeTestResult) -> Result<()> {
    let test_type = result.test_type.as_str();
    let status = if result.passed { "pass" } else { "fail" };
    let details = result
        .details
        .as_ref()
        .map(|d| serde_json::to_string(d).unwrap_or_default());

    sqlx::query!(
        r#"
        INSERT INTO scraper_smoke_tests (scraper_name, test_type, duration_ms, status, details, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        result.scraper_name,
        test_type,
        result.duration_ms,
        status,
        details,
        result.error,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

mod sources;

#[cfg(test)]
mod tests;
