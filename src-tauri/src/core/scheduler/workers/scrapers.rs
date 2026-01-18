//! Scraper execution logic
//!
//! Runs all configured scrapers and collects jobs

use crate::core::{
    config::Config,
    credentials::{CredentialKey, CredentialStore},
    db::Job,
    scrapers::{
        builtin::BuiltInScraper,
        dice::DiceScraper,
        greenhouse::{GreenhouseCompany, GreenhouseScraper},
        hn_hiring::HnHiringScraper,
        indeed::IndeedScraper,
        jobswithgpt::{JobQuery, JobsWithGptScraper},
        lever::{LeverCompany, LeverScraper},
        linkedin::LinkedInScraper,
        remoteok::RemoteOkScraper,
        wellfound::WellfoundScraper,
        weworkremotely::WeWorkRemotelyScraper,
        yc_startup::YcStartupScraper,
        ziprecruiter::ZipRecruiterScraper,
        JobScraper,
    },
};
use std::sync::Arc;

/// Run all configured scrapers and return jobs and errors
pub async fn run_scrapers(config: &Arc<Config>) -> (Vec<Job>, Vec<String>) {
    let mut all_jobs = Vec::new();
    let mut errors = Vec::new();

    // 1. Greenhouse scraper - use URLs from config
    if !config.greenhouse_urls.is_empty() {
        let greenhouse_companies: Vec<GreenhouseCompany> = config
            .greenhouse_urls
            .iter()
            .filter_map(|url| {
                url.strip_prefix("https://boards.greenhouse.io/")
                    .map(|id| GreenhouseCompany {
                        id: id.to_string(),
                        name: id.to_string(),
                        url: url.clone(),
                    })
            })
            .collect();

        if !greenhouse_companies.is_empty() {
            let greenhouse = GreenhouseScraper::new(greenhouse_companies);
            match greenhouse.scrape().await {
                Ok(jobs) => {
                    tracing::info!("Greenhouse: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("Greenhouse scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
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
                url.strip_prefix("https://jobs.lever.co/")
                    .map(|id| LeverCompany {
                        id: id.to_string(),
                        name: id.to_string(),
                        url: url.clone(),
                    })
            })
            .collect();

        if !lever_companies.is_empty() {
            let lever = LeverScraper::new(lever_companies);
            match lever.scrape().await {
                Ok(jobs) => {
                    tracing::info!("Lever: {} jobs found", jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("Lever scraper failed: {}", e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }
    }

    // 3. JobsWithGPT MCP scraper
    if !config.title_allowlist.is_empty() && !config.jobswithgpt_endpoint.is_empty() {
        let jobswithgpt_query = JobQuery {
            titles: config.title_allowlist.clone(),
            location: None,
            remote_only: config.location_preferences.allow_remote
                && !config.location_preferences.allow_onsite,
            limit: 100,
        };

        let jobswithgpt =
            JobsWithGptScraper::new(config.jobswithgpt_endpoint.clone(), jobswithgpt_query);

        match jobswithgpt.scrape().await {
            Ok(jobs) => {
                tracing::info!("JobsWithGPT: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("JobsWithGPT scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 4. LinkedIn scraper - requires session cookie from secure storage
    if config.linkedin.enabled {
        match CredentialStore::retrieve(CredentialKey::LinkedInCookie) {
            Ok(Some(session_cookie)) => {
                tracing::info!("Running LinkedIn scraper");
                let linkedin = LinkedInScraper {
                    session_cookie,
                    query: config.linkedin.query.clone(),
                    location: config.linkedin.location.clone(),
                    remote_only: config.linkedin.remote_only,
                    limit: config.linkedin.limit,
                };

                match linkedin.scrape().await {
                    Ok(jobs) => {
                        tracing::info!("LinkedIn: {} jobs found", jobs.len());
                        all_jobs.extend(jobs);
                    }
                    Err(e) => {
                        let error_msg = format!("LinkedIn scraper failed: {}", e);
                        tracing::error!("{}", error_msg);
                        errors.push(error_msg);
                    }
                }
            }
            Ok(None) => {
                tracing::warn!("LinkedIn enabled but session cookie not configured in keyring");
            }
            Err(e) => {
                let error_msg = format!("Failed to retrieve LinkedIn cookie from keyring: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 5. Indeed scraper - no authentication required
    if config.indeed.enabled && !config.indeed.query.is_empty() {
        tracing::info!("Running Indeed scraper");
        let indeed =
            IndeedScraper::new(config.indeed.query.clone(), config.indeed.location.clone())
                .with_radius(config.indeed.radius)
                .with_limit(config.indeed.limit);

        match indeed.scrape().await {
            Ok(jobs) => {
                tracing::info!("Indeed: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("Indeed scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 6. RemoteOK scraper - public JSON API
    if config.remoteok.enabled {
        tracing::info!("Running RemoteOK scraper");
        let remoteok = RemoteOkScraper::new(config.remoteok.tags.clone(), config.remoteok.limit);

        match remoteok.scrape().await {
            Ok(jobs) => {
                tracing::info!("RemoteOK: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("RemoteOK scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 7. Wellfound (AngelList Talent) scraper
    if config.wellfound.enabled && !config.wellfound.role.is_empty() {
        tracing::info!("Running Wellfound scraper");
        let wellfound = WellfoundScraper::new(
            config.wellfound.role.clone(),
            config.wellfound.location.clone(),
            config.wellfound.remote_only,
            config.wellfound.limit,
        );

        match wellfound.scrape().await {
            Ok(jobs) => {
                tracing::info!("Wellfound: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("Wellfound scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 8. WeWorkRemotely scraper - RSS feed
    if config.weworkremotely.enabled {
        tracing::info!("Running WeWorkRemotely scraper");
        let weworkremotely = WeWorkRemotelyScraper::new(
            config.weworkremotely.category.clone(),
            config.weworkremotely.limit,
        );

        match weworkremotely.scrape().await {
            Ok(jobs) => {
                tracing::info!("WeWorkRemotely: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("WeWorkRemotely scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 9. BuiltIn scraper - city-specific job boards
    if config.builtin.enabled && !config.builtin.cities.is_empty() {
        for city in &config.builtin.cities {
            tracing::info!("Running BuiltIn scraper for {}", city);
            let builtin = BuiltInScraper::new(
                city.clone(),
                config.builtin.category.clone(),
                config.builtin.limit,
            );

            match builtin.scrape().await {
                Ok(jobs) => {
                    tracing::info!("BuiltIn ({}): {} jobs found", city, jobs.len());
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    let error_msg = format!("BuiltIn ({}) scraper failed: {}", city, e);
                    tracing::error!("{}", error_msg);
                    errors.push(error_msg);
                }
            }
        }
    }

    // 10. Hacker News Who's Hiring scraper
    if config.hn_hiring.enabled {
        tracing::info!("Running HN Who's Hiring scraper");
        let hn_hiring = HnHiringScraper::new(config.hn_hiring.limit, config.hn_hiring.remote_only);

        match hn_hiring.scrape().await {
            Ok(jobs) => {
                tracing::info!("HN Who's Hiring: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("HN Who's Hiring scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 11. Dice scraper - tech job board
    if config.dice.enabled && !config.dice.query.is_empty() {
        tracing::info!("Running Dice scraper");
        let dice = DiceScraper::new(
            config.dice.query.clone(),
            config.dice.location.clone(),
            config.dice.limit,
        );

        match dice.scrape().await {
            Ok(jobs) => {
                tracing::info!("Dice: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("Dice scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 12. Y Combinator Work at a Startup scraper
    if config.yc_startup.enabled {
        tracing::info!("Running YC Startup scraper");
        let yc_startup = YcStartupScraper::new(
            config.yc_startup.query.clone(),
            config.yc_startup.remote_only,
            config.yc_startup.limit,
        );

        match yc_startup.scrape().await {
            Ok(jobs) => {
                tracing::info!("YC Startup: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("YC Startup scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    // 13. ZipRecruiter scraper - RSS feed
    if config.ziprecruiter.enabled && !config.ziprecruiter.query.is_empty() {
        tracing::info!("Running ZipRecruiter scraper");
        let ziprecruiter = ZipRecruiterScraper::new(
            config.ziprecruiter.query.clone(),
            config.ziprecruiter.location.clone(),
            config.ziprecruiter.radius,
            config.ziprecruiter.limit,
        );

        match ziprecruiter.scrape().await {
            Ok(jobs) => {
                tracing::info!("ZipRecruiter: {} jobs found", jobs.len());
                all_jobs.extend(jobs);
            }
            Err(e) => {
                let error_msg = format!("ZipRecruiter scraper failed: {}", e);
                tracing::error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    tracing::info!("Total jobs scraped: {}", all_jobs.len());

    (all_jobs, errors)
}
