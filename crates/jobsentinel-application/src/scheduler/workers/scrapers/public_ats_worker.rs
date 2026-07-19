use std::{
    num::NonZeroU16,
    sync::{atomic::AtomicBool, Arc},
};

use chrono::Utc;
use jobsentinel_domain::{
    v3_source_authorization::SourceActionDecision, v3_source_manifest::SourceOperation, Job,
};
use jobsentinel_sources::{
    parse_greenhouse_company_url, parse_lever_company_url, GreenhouseCompany, GreenhouseScraper,
    LeverCompany, LeverScraper,
};
use jobsentinel_storage::Database;

use crate::config::Config;

use super::run_scraper;

pub(super) async fn run_greenhouse(
    config: &Config,
    database: &Arc<Database>,
    shutdown_requested: &AtomicBool,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    if config.greenhouse_urls.is_empty() {
        return;
    }
    let request_limit_per_hour = match crate::v3_source_governance::authorize_greenhouse(
        database,
        SourceOperation::ScheduledCheck,
        Utc::now().date_naive(),
    )
    .await
    {
        Ok(SourceActionDecision::Allowed {
            request_limit_per_hour,
            connectivity_required: true,
        }) => NonZeroU16::new(request_limit_per_hour),
        Ok(_) | Err(_) => {
            errors.push(
                "Greenhouse source check skipped because its reviewed source policy is unavailable or stale"
                    .to_string(),
            );
            return;
        }
    };
    let Some(request_limit_per_hour) = request_limit_per_hour else {
        errors.push(
            "Greenhouse source check skipped because its reviewed source policy is invalid"
                .to_string(),
        );
        return;
    };
    let companies = config
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
        .collect::<Vec<_>>();
    if companies.is_empty() {
        return;
    }
    let scraper =
        GreenhouseScraper::new(companies).with_request_limit_per_hour(request_limit_per_hour);
    run_scraper(
        database,
        &scraper,
        "greenhouse",
        "Greenhouse",
        shutdown_requested,
        all_jobs,
        errors,
    )
    .await;
}

pub(super) async fn run_lever(
    config: &Config,
    database: &Arc<Database>,
    shutdown_requested: &AtomicBool,
    all_jobs: &mut Vec<Job>,
    errors: &mut Vec<String>,
) {
    if config.lever_urls.is_empty() {
        return;
    }
    let request_limit_per_hour = match crate::v3_source_governance::authorize_lever(
        database,
        SourceOperation::ScheduledCheck,
        Utc::now().date_naive(),
    )
    .await
    {
        Ok(SourceActionDecision::Allowed {
            request_limit_per_hour,
            connectivity_required: true,
        }) => NonZeroU16::new(request_limit_per_hour),
        Ok(_) | Err(_) => {
            errors.push(
                "Lever source check skipped because its reviewed source policy is unavailable or stale"
                    .to_string(),
            );
            return;
        }
    };
    let Some(request_limit_per_hour) = request_limit_per_hour else {
        errors.push(
            "Lever source check skipped because its reviewed source policy is invalid".to_string(),
        );
        return;
    };
    let companies = config
        .lever_urls
        .iter()
        .filter_map(|url| {
            parse_lever_company_url(url).ok().map(|board| LeverCompany {
                id: board.id.clone(),
                name: board.id,
                url: board.url,
            })
        })
        .collect::<Vec<_>>();
    if companies.is_empty() {
        return;
    }
    let scraper = LeverScraper::new(companies).with_request_limit_per_hour(request_limit_per_hour);
    run_scraper(
        database,
        &scraper,
        "lever",
        "Lever",
        shutdown_requested,
        all_jobs,
        errors,
    )
    .await;
}

#[cfg(test)]
mod tests {
    use std::sync::{atomic::AtomicBool, Arc};

    use jobsentinel_domain::v3_source_manifest::{
        parse_source_manifest, GREENHOUSE_API_ENDPOINT_PREFIX, GREENHOUSE_SOURCE_MANIFEST_V1,
        LEVER_API_ENDPOINT_PREFIX, LEVER_SOURCE_MANIFEST_V1,
    };
    use jobsentinel_storage::Database;
    use sha2::{Digest, Sha256};

    use crate::test_support::minimal_test_config;

    #[tokio::test]
    async fn missing_governance_stops_public_ats_checks_before_source_access() {
        let database = Arc::new(Database::connect_memory().await.unwrap());
        database.migrate().await.unwrap();
        let mut config = minimal_test_config();
        config.greenhouse_urls = vec!["https://job-boards.greenhouse.io/example".to_string()];
        config.lever_urls = vec!["https://jobs.lever.co/example".to_string()];
        let mut jobs = Vec::new();
        let mut errors = Vec::new();

        super::run_greenhouse(
            &config,
            &database,
            &AtomicBool::new(false),
            &mut jobs,
            &mut errors,
        )
        .await;
        super::run_lever(
            &config,
            &database,
            &AtomicBool::new(false),
            &mut jobs,
            &mut errors,
        )
        .await;

        assert!(jobs.is_empty());
        assert_eq!(
            errors,
            [
                "Greenhouse source check skipped because its reviewed source policy is unavailable or stale",
                "Lever source check skipped because its reviewed source policy is unavailable or stale",
            ]
        );
    }

    #[test]
    fn reviewed_manifests_bind_runtime_endpoints_and_parser_fixtures() {
        for (manifest, endpoint, fixtures) in [
            (
                parse_source_manifest(
                    GREENHOUSE_SOURCE_MANIFEST_V1,
                    &crate::v3_source_governance::greenhouse_policy().unwrap(),
                )
                .unwrap(),
                GREENHOUSE_API_ENDPOINT_PREFIX,
                [
                    (
                        "crates/jobsentinel-sources/src/fixtures/greenhouse_list_v1.json",
                        include_bytes!(
                            "../../../../../jobsentinel-sources/src/fixtures/greenhouse_list_v1.json"
                        )
                        .as_slice(),
                    ),
                    (
                        "crates/jobsentinel-domain/src/fixtures/source_reviews/greenhouse_v1.json",
                        include_bytes!(
                            "../../../../../jobsentinel-domain/src/fixtures/source_reviews/greenhouse_v1.json"
                        )
                        .as_slice(),
                    ),
                ],
            ),
            (
                parse_source_manifest(
                    LEVER_SOURCE_MANIFEST_V1,
                    &crate::v3_source_governance::lever_policy().unwrap(),
                )
                .unwrap(),
                LEVER_API_ENDPOINT_PREFIX,
                [
                    (
                        "crates/jobsentinel-sources/src/fixtures/lever_list_v1.json",
                        include_bytes!(
                            "../../../../../jobsentinel-sources/src/fixtures/lever_list_v1.json"
                        )
                        .as_slice(),
                    ),
                    (
                        "crates/jobsentinel-domain/src/fixtures/source_reviews/lever_v1.json",
                        include_bytes!(
                            "../../../../../jobsentinel-domain/src/fixtures/source_reviews/lever_v1.json"
                        )
                        .as_slice(),
                    ),
                ],
            ),
        ] {
            assert_eq!(manifest.endpoint_patterns, [endpoint.to_string()]);
            for (fixture_path, fixture) in fixtures {
                let reviewed_fixture = manifest
                    .fixtures
                    .iter()
                    .find(|fixture| fixture.path == fixture_path)
                    .unwrap();
                assert_eq!(
                    reviewed_fixture.payload_sha256,
                    hex::encode(Sha256::digest(fixture))
                );
            }
        }
    }
}
