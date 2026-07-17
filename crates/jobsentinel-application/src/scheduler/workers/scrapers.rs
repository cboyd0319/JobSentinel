//! Scraper execution logic
//!
//! Runs all configured scrapers and collects jobs

mod browser_sources;
mod federal;
mod jobswithgpt_worker;

use crate::{config::Config, credentials::CredentialService};
use jobsentinel_domain::Job;
use jobsentinel_sources::{
    parse_greenhouse_company_url, parse_lever_company_url, BuiltInScraper, DiceScraper,
    GreenhouseCompany, GreenhouseScraper, HnHiringScraper, JobScraper, LeverCompany, LeverScraper,
    RemoteOkScraper, ScraperError, WeWorkRemotelyScraper, YcStartupScraper,
    LINKEDIN_AUTOMATION_DISABLED_MESSAGE,
};
use jobsentinel_storage::Database;
use std::sync::Arc;

fn scraper_failure_kind(error: &ScraperError) -> &'static str {
    match error {
        ScraperError::Network => "network",
        ScraperError::HttpStatus { .. } => "http_status",
        ScraperError::ParseError { .. } => "parse_error",
        ScraperError::SelectorNotFound { .. } => "selector_not_found",
        ScraperError::MissingField { .. } => "missing_field",
        ScraperError::InvalidUrl { .. } => "invalid_url",
        ScraperError::BotProtection { .. } => "bot_protection",
        ScraperError::Timeout { .. } => "timeout",
        ScraperError::InvalidConfiguration { .. } => "invalid_configuration",
        ScraperError::Generic { .. } => "generic",
    }
}

fn source_failure_message(source_label: &'static str, failure_kind: &'static str) -> String {
    format!("{source_label} source check failed ({failure_kind})")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ScraperRunOutcome {
    Success { jobs_found: usize },
    Timeout,
    Failure,
}

pub(super) async fn run_scraper<S: JobScraper + ?Sized>(
    db: &Arc<Database>,
    scraper: &S,
    source_id: &'static str,
    source_label: &'static str,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) -> ScraperRunOutcome {
    let run_id = crate::health::start_run(db, source_id).await.unwrap_or(0);
    let started_at = std::time::Instant::now();

    match scraper.scrape().await {
        Ok(jobs) => {
            let jobs_found = jobs.len();
            let _ = crate::health::complete_run(
                db,
                run_id,
                started_at.elapsed().as_millis() as i64,
                jobs_found,
                0,
            )
            .await;
            tracing::info!(
                source = source_label,
                jobs_found,
                "Scraper source check completed"
            );
            all_jobs.extend(jobs);
            ScraperRunOutcome::Success { jobs_found }
        }
        Err(error) => {
            let outcome = if matches!(error, ScraperError::Timeout { .. }) {
                ScraperRunOutcome::Timeout
            } else {
                ScraperRunOutcome::Failure
            };
            record_scraper_failure(
                db,
                run_id,
                started_at.elapsed().as_millis() as i64,
                source_label,
                &error,
                errors,
            )
            .await;
            outcome
        }
    }
}

pub(super) async fn record_scraper_failure(
    db: &Arc<Database>,
    run_id: i64,
    duration_ms: i64,
    source_label: &'static str,
    error: &ScraperError,
    errors: &mut Vec<String>,
) {
    let failure_kind = scraper_failure_kind(error);
    let error_message = source_failure_message(source_label, failure_kind);

    if matches!(error, ScraperError::Timeout { .. }) {
        let _ = crate::health::timeout_run(db, run_id, duration_ms).await;
    } else {
        let _ =
            crate::health::fail_run(db, run_id, duration_ms, &error_message, Some(failure_kind))
                .await;
    }

    tracing::error!(
        source = source_label,
        failure_kind,
        "Scraper source check failed"
    );
    errors.push(error_message);
}

fn record_source_credential_failure(errors: &mut Vec<String>, source_label: &'static str) {
    let failure_kind = "credential_unavailable";
    tracing::error!(
        source = source_label,
        failure_kind,
        "Source credential unavailable"
    );
    errors.push(source_failure_message(source_label, failure_kind));
}

fn restricted_source_acknowledged(config: &Config, source_id: &str) -> bool {
    match source_id {
        "builtin" => config.restricted_source_acknowledgements.builtin,
        "dice" => config.restricted_source_acknowledgements.dice,
        "simplyhired" => config.restricted_source_acknowledgements.simplyhired,
        "glassdoor" => config.restricted_source_acknowledgements.glassdoor,
        _ => false,
    }
}

fn restricted_source_acknowledgement_missing_message(source_label: &'static str) -> String {
    format!(
        "{source_label} source check skipped until you review and accept restricted-source risk in Settings"
    )
}

fn record_restricted_source_acknowledgement_missing(
    errors: &mut Vec<String>,
    source_id: &'static str,
    source_label: &'static str,
) {
    tracing::warn!(
        source = source_id,
        "Restricted source check skipped because the user has not accepted the source risk"
    );
    errors.push(restricted_source_acknowledgement_missing_message(
        source_label,
    ));
}

/// Run all configured scrapers and return jobs and errors
#[tracing::instrument(skip_all)]
pub(crate) async fn run_scrapers(
    config: &Arc<Config>,
    db: &Arc<Database>,
    credentials: &CredentialService,
) -> (Vec<Job>, Vec<String>) {
    tracing::info!("Starting scraper execution across all enabled sources");
    let mut all_jobs = Vec::new();
    let mut errors = Vec::new();

    // 1. Greenhouse scraper - use URLs from config
    if !config.greenhouse_urls.is_empty() {
        let greenhouse_companies: Vec<GreenhouseCompany> = config
            .greenhouse_urls
            .iter()
            .filter_map(|url| {
                parse_greenhouse_company_url(url)
                    .ok()
                    .map(|board| GreenhouseCompany {
                        id: board.id.clone(),
                        name: board.id,
                        url: board.url,
                    })
            })
            .collect();

        if !greenhouse_companies.is_empty() {
            let greenhouse = GreenhouseScraper::new(greenhouse_companies);
            run_scraper(
                db,
                &greenhouse,
                "greenhouse",
                "Greenhouse",
                &mut all_jobs,
                &mut errors,
            )
            .await;
        }
    }

    // 2. Lever scraper - use URLs from config
    if !config.lever_urls.is_empty() {
        let lever_companies: Vec<LeverCompany> = config
            .lever_urls
            .iter()
            .filter_map(|url| {
                parse_lever_company_url(url).ok().map(|board| LeverCompany {
                    id: board.id.clone(),
                    name: board.id,
                    url: board.url,
                })
            })
            .collect();

        if !lever_companies.is_empty() {
            let lever = LeverScraper::new(lever_companies);
            run_scraper(db, &lever, "lever", "Lever", &mut all_jobs, &mut errors).await;
        }
    }

    jobswithgpt_worker::run_jobswithgpt_scraper(config.as_ref(), db, &mut all_jobs, &mut errors)
        .await;

    // 4. LinkedIn stays user-directed. Warn without running hidden monitoring.
    if config.linkedin.enabled {
        tracing::warn!("{}", LINKEDIN_AUTOMATION_DISABLED_MESSAGE);
        errors.push(LINKEDIN_AUTOMATION_DISABLED_MESSAGE.to_string());
    }

    // 5. RemoteOK scraper - public JSON API
    if config.remoteok.enabled {
        tracing::info!("Running RemoteOK scraper");
        let remoteok = RemoteOkScraper::new(config.remoteok.tags.clone(), config.remoteok.limit);
        run_scraper(
            db,
            &remoteok,
            "remoteok",
            "RemoteOK",
            &mut all_jobs,
            &mut errors,
        )
        .await;
    }

    // 6. WeWorkRemotely scraper - RSS feed
    if config.weworkremotely.enabled {
        tracing::info!("Running WeWorkRemotely scraper");
        let weworkremotely = WeWorkRemotelyScraper::new(
            config.weworkremotely.category.clone(),
            config.weworkremotely.limit,
        );
        run_scraper(
            db,
            &weworkremotely,
            "weworkremotely",
            "WeWorkRemotely",
            &mut all_jobs,
            &mut errors,
        )
        .await;
    }

    // 7. BuiltIn scraper - tech job board
    if config.builtin.enabled {
        if !restricted_source_acknowledged(config, "builtin") {
            record_restricted_source_acknowledgement_missing(&mut errors, "builtin", "BuiltIn");
        } else {
            let mode = if config.builtin.remote_only {
                "remote"
            } else {
                "all"
            };
            tracing::info!("Running BuiltIn scraper ({})", mode);
            let builtin = BuiltInScraper::new(config.builtin.remote_only, config.builtin.limit);
            run_scraper(
                db,
                &builtin,
                "builtin",
                "BuiltIn",
                &mut all_jobs,
                &mut errors,
            )
            .await;
        }
    }

    // 8. Hacker News Who's Hiring scraper
    if config.hn_hiring.enabled {
        tracing::info!("Running HN Who's Hiring scraper");
        let hn_hiring = HnHiringScraper::new(config.hn_hiring.limit, config.hn_hiring.remote_only);
        run_scraper(
            db,
            &hn_hiring,
            "hn_hiring",
            "HN Who's Hiring",
            &mut all_jobs,
            &mut errors,
        )
        .await;
    }

    // 9. Dice scraper - tech job board
    if config.dice.enabled && !config.dice.query.is_empty() {
        if !restricted_source_acknowledged(config, "dice") {
            record_restricted_source_acknowledgement_missing(&mut errors, "dice", "Dice");
        } else {
            tracing::info!("Running Dice scraper");
            let dice = DiceScraper::new(
                config.dice.query.clone(),
                config.dice.location.clone(),
                config.dice.limit,
            );
            run_scraper(db, &dice, "dice", "Dice", &mut all_jobs, &mut errors).await;
        }
    }

    // 10. Y Combinator Work at a Startup scraper
    if config.yc_startup.enabled {
        tracing::info!("Running YC Startup scraper");
        let yc_startup = YcStartupScraper::new(
            config.yc_startup.query.clone(),
            config.yc_startup.remote_only,
            config.yc_startup.limit,
        );
        run_scraper(
            db,
            &yc_startup,
            "yc_startup",
            "YC Startup",
            &mut all_jobs,
            &mut errors,
        )
        .await;
    }

    federal::run_usajobs(config, db, credentials, &mut all_jobs, &mut errors).await;
    browser_sources::run_restricted_browser_sources(config, db, &mut all_jobs, &mut errors).await;

    tracing::info!(
        "Scraper execution complete: {} total jobs, {} errors",
        all_jobs.len(),
        errors.len()
    );

    if !errors.is_empty() {
        tracing::warn!("Scraping errors encountered: {:?}", errors);
    }

    (all_jobs, errors)
}

#[cfg(test)]
mod tests;
