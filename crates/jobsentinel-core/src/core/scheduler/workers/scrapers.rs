//! Scraper execution logic
//!
//! Runs all configured scrapers and collects jobs

mod browser_sources;
mod federal;
mod jobswithgpt_worker;

use crate::core::db::Database;
use crate::core::{
    config::Config,
    credentials::CredentialService,
    scrapers::{
        BuiltInScraper, DiceScraper, GreenhouseCompany, GreenhouseScraper, HnHiringScraper,
        JobScraper, LeverCompany, LeverScraper, RemoteOkScraper, ScraperError,
        WeWorkRemotelyScraper, YcStartupScraper, LINKEDIN_AUTOMATION_DISABLED_MESSAGE,
    },
    source_urls::{parse_greenhouse_company_url, parse_lever_company_url},
    Job,
};
use std::sync::Arc;

fn scraper_failure_kind(error: &ScraperError) -> &'static str {
    match error {
        ScraperError::HttpRequest { .. } | ScraperError::Network { .. } => "network",
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
        let _ = crate::core::health::timeout_run(db, run_id, duration_ms).await;
    } else {
        let _ = crate::core::health::fail_run(
            db,
            run_id,
            duration_ms,
            &error_message,
            Some(failure_kind),
        )
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
pub async fn run_scrapers(
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
            {
                let _tid = crate::core::health::start_run(db, "greenhouse")
                    .await
                    .unwrap_or(0);
                let _ts = std::time::Instant::now();
                match greenhouse.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::core::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        tracing::info!("Greenhouse: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "Greenhouse", &e, &mut errors).await;
                    }
                }
            }
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
            {
                let _tid = crate::core::health::start_run(db, "lever")
                    .await
                    .unwrap_or(0);
                let _ts = std::time::Instant::now();
                match lever.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::core::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        tracing::info!("Lever: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "Lever", &e, &mut errors).await;
                    }
                }
            }
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

        {
            let _tid = crate::core::health::start_run(db, "remoteok")
                .await
                .unwrap_or(0);
            let _ts = std::time::Instant::now();
            match remoteok.scrape().await {
                Ok(jobs) => {
                    let _ = crate::core::health::complete_run(
                        db,
                        _tid,
                        _ts.elapsed().as_millis() as i64,
                        jobs.len(),
                        0,
                    )
                    .await;
                    tracing::info!("RemoteOK: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let _dur = _ts.elapsed().as_millis() as i64;
                    record_scraper_failure(db, _tid, _dur, "RemoteOK", &e, &mut errors).await;
                }
            }
        }
    }

    // 6. WeWorkRemotely scraper - RSS feed
    if config.weworkremotely.enabled {
        tracing::info!("Running WeWorkRemotely scraper");
        let weworkremotely = WeWorkRemotelyScraper::new(
            config.weworkremotely.category.clone(),
            config.weworkremotely.limit,
        );

        {
            let _tid = crate::core::health::start_run(db, "weworkremotely")
                .await
                .unwrap_or(0);
            let _ts = std::time::Instant::now();
            match weworkremotely.scrape().await {
                Ok(jobs) => {
                    let _ = crate::core::health::complete_run(
                        db,
                        _tid,
                        _ts.elapsed().as_millis() as i64,
                        jobs.len(),
                        0,
                    )
                    .await;
                    tracing::info!("WeWorkRemotely: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let _dur = _ts.elapsed().as_millis() as i64;
                    record_scraper_failure(db, _tid, _dur, "WeWorkRemotely", &e, &mut errors).await;
                }
            }
        }
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

            {
                let _tid = crate::core::health::start_run(db, "builtin")
                    .await
                    .unwrap_or(0);
                let _ts = std::time::Instant::now();
                match builtin.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::core::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        tracing::info!("BuiltIn: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "BuiltIn", &e, &mut errors).await;
                    }
                }
            }
        }
    }

    // 8. Hacker News Who's Hiring scraper
    if config.hn_hiring.enabled {
        tracing::info!("Running HN Who's Hiring scraper");
        let hn_hiring = HnHiringScraper::new(config.hn_hiring.limit, config.hn_hiring.remote_only);

        {
            let _tid = crate::core::health::start_run(db, "hn_hiring")
                .await
                .unwrap_or(0);
            let _ts = std::time::Instant::now();
            match hn_hiring.scrape().await {
                Ok(jobs) => {
                    let _ = crate::core::health::complete_run(
                        db,
                        _tid,
                        _ts.elapsed().as_millis() as i64,
                        jobs.len(),
                        0,
                    )
                    .await;
                    tracing::info!("HN Who's Hiring: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let _dur = _ts.elapsed().as_millis() as i64;
                    record_scraper_failure(db, _tid, _dur, "HN Who's Hiring", &e, &mut errors)
                        .await;
                }
            }
        }
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

            {
                let _tid = crate::core::health::start_run(db, "dice")
                    .await
                    .unwrap_or(0);
                let _ts = std::time::Instant::now();
                match dice.scrape().await {
                    Ok(jobs) => {
                        let _ = crate::core::health::complete_run(
                            db,
                            _tid,
                            _ts.elapsed().as_millis() as i64,
                            jobs.len(),
                            0,
                        )
                        .await;
                        tracing::info!("Dice: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let _dur = _ts.elapsed().as_millis() as i64;
                        record_scraper_failure(db, _tid, _dur, "Dice", &e, &mut errors).await;
                    }
                }
            }
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

        {
            let _tid = crate::core::health::start_run(db, "yc_startup")
                .await
                .unwrap_or(0);
            let _ts = std::time::Instant::now();
            match yc_startup.scrape().await {
                Ok(jobs) => {
                    let _ = crate::core::health::complete_run(
                        db,
                        _tid,
                        _ts.elapsed().as_millis() as i64,
                        jobs.len(),
                        0,
                    )
                    .await;
                    tracing::info!("YC Startup: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let _dur = _ts.elapsed().as_millis() as i64;
                    record_scraper_failure(db, _tid, _dur, "YC Startup", &e, &mut errors).await;
                }
            }
        }
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
