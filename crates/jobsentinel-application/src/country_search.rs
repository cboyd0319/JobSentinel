//! Classifies observed job geography and filters retrieved jobs by a selected country.

use anyhow::Result;
use jobsentinel_domain::{normalize_country_code, Job, LocationObservation};
use jobsentinel_storage::Database;
use serde::{Deserialize, Serialize};

use crate::scoring::{detect_remote_status, RemoteStatus};

/// The country-filter outcome for a job's directly observed geography.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CountryScope {
    Unfiltered,
    Match,
    Mismatch,
    Unknown,
}

/// Classifies a job without inferring a country from locations, URLs, or descriptions.
#[must_use]
pub fn classify_country_scope(job: &Job, country: Option<&str>) -> CountryScope {
    let Some(country) = country else {
        return CountryScope::Unfiltered;
    };
    if !is_canonical_alpha2(country) {
        return CountryScope::Unknown;
    }
    let Some(geography) = &job.geography else {
        return CountryScope::Unknown;
    };
    if geography.validate().is_err() {
        return CountryScope::Unknown;
    }

    let observations = if detect_remote_status(job) == RemoteStatus::Remote {
        &geography.remote_applicant_locations
    } else {
        &geography.worksite_locations
    };
    classify_observations(observations, country)
}

/// Retrieves recent jobs while retaining unknown geography and excluding known mismatches.
pub async fn get_recent_jobs(
    database: &Database,
    limit: i64,
    country: Option<&str>,
) -> Result<Vec<Job>> {
    database
        .get_recent_jobs_matching(limit, |job| {
            classify_country_scope(job, country) != CountryScope::Mismatch
        })
        .await
        .map_err(Into::into)
}

/// Retrieves bookmarked jobs while retaining unknown geography and excluding known mismatches.
pub async fn get_bookmarked_jobs(
    database: &Database,
    limit: i64,
    country: Option<&str>,
) -> Result<Vec<Job>> {
    database
        .get_bookmarked_jobs_matching(limit, |job| {
            classify_country_scope(job, country) != CountryScope::Mismatch
        })
        .await
        .map_err(Into::into)
}

/// Searches jobs while retaining unknown geography and excluding known mismatches.
pub async fn search_jobs(
    database: &Database,
    query: &str,
    limit: i64,
    country: Option<&str>,
) -> Result<Vec<Job>> {
    database
        .search_jobs_matching(query, limit, |job| {
            classify_country_scope(job, country) != CountryScope::Mismatch
        })
        .await
        .map_err(Into::into)
}

/// Returns pinned country choices for native presentation.
#[must_use]
pub fn country_options() -> Vec<(&'static str, &'static str)> {
    jobsentinel_domain::country_options()
}

fn is_canonical_alpha2(value: &str) -> bool {
    value.len() == 2 && normalize_country_code(value) == Some(value)
}

fn classify_observations(observations: &[LocationObservation], country: &str) -> CountryScope {
    if observations.is_empty() {
        return CountryScope::Unknown;
    }

    let mut unresolved = false;
    for observation in observations {
        let Some(alpha2) = observation
            .country
            .as_ref()
            .and_then(|country| country.alpha2.as_deref())
        else {
            unresolved = true;
            continue;
        };
        if !is_canonical_alpha2(alpha2) {
            return CountryScope::Unknown;
        }
        if alpha2 == country {
            return CountryScope::Match;
        }
    }

    if unresolved {
        CountryScope::Unknown
    } else {
        CountryScope::Mismatch
    }
}

#[cfg(test)]
mod tests {
    use super::{
        classify_country_scope, country_options, get_bookmarked_jobs, get_recent_jobs, search_jobs,
        CountryScope,
    };
    use jobsentinel_domain::{CountryObservation, Job, JobGeography, LocationObservation};
    use jobsentinel_storage::Database;

    fn geography(worksites: &[Option<&str>], remote_applicants: &[Option<&str>]) -> JobGeography {
        let location = |country: Option<&str>| LocationObservation {
            raw_location: country.unwrap_or("Not stated").to_string(),
            country: country.map(|raw_country| CountryObservation {
                raw_country: raw_country.to_string(),
                alpha2: Some(
                    jobsentinel_domain::normalize_country_code(raw_country)
                        .unwrap()
                        .to_string(),
                ),
            }),
        };
        JobGeography {
            worksite_locations: worksites.iter().copied().map(location).collect(),
            remote_applicant_locations: remote_applicants.iter().copied().map(location).collect(),
        }
    }

    fn job(hash: &str, title: &str, score: f64, remote: bool, geography: JobGeography) -> Job {
        let mut job = Job::newly_discovered(
            title,
            "Example",
            format!("https://example.test/{hash}"),
            None,
            "test",
            chrono::Utc::now(),
        );
        job.hash = hash.to_string();
        job.score = Some(score);
        job.remote = remote.then_some(true);
        job.geography = Some(geography);
        job
    }

    #[test]
    fn country_scope_uses_remote_applicant_requirements_and_keeps_unknowns() {
        let remote_gb = job(
            "remote-gb",
            "Remote role",
            0.9,
            true,
            geography(&[Some("United States")], &[Some("United Kingdom")]),
        );
        assert_eq!(
            classify_country_scope(&remote_gb, Some("GB")),
            CountryScope::Match
        );
        assert_eq!(
            classify_country_scope(&remote_gb, Some("US")),
            CountryScope::Mismatch
        );
        assert_eq!(
            classify_country_scope(&remote_gb, None),
            CountryScope::Unfiltered
        );

        let remote_unknown = job(
            "remote-unknown",
            "Remote unknown role",
            0.8,
            true,
            geography(&[Some("United States")], &[]),
        );
        assert_eq!(
            classify_country_scope(&remote_unknown, Some("GB")),
            CountryScope::Unknown
        );
        assert_eq!(
            classify_country_scope(&remote_gb, Some("gb")),
            CountryScope::Unknown
        );

        let mixed = job(
            "mixed",
            "Mixed scope",
            0.7,
            false,
            geography(&[Some("Canada"), None], &[]),
        );
        assert_eq!(
            classify_country_scope(&mixed, Some("US")),
            CountryScope::Unknown
        );
    }

    #[tokio::test]
    async fn country_routes_fill_limits_after_mismatches_and_keep_unknowns() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let mismatch_one = job(
            "mismatch-one",
            "Country search mismatch one",
            0.99,
            false,
            geography(&[Some("United States")], &[]),
        );
        let mismatch_two = job(
            "mismatch-two",
            "Country search mismatch two",
            0.98,
            false,
            geography(&[Some("United States")], &[]),
        );
        let matching = job(
            "matching",
            "Country search match",
            0.80,
            false,
            geography(&[Some("United Kingdom")], &[]),
        );
        let unknown = job(
            "unknown",
            "Country search unknown",
            0.70,
            false,
            geography(&[None], &[]),
        );
        for job in [&mismatch_one, &mismatch_two, &matching, &unknown] {
            database.upsert_job(job).await.unwrap();
        }
        for hash in ["mismatch-one", "mismatch-two", "matching", "unknown"] {
            let id = database.get_job_by_hash(hash).await.unwrap().unwrap().id;
            database.set_bookmark(id, true).await.unwrap();
        }

        for results in [
            get_recent_jobs(&database, 2, Some("GB")).await.unwrap(),
            get_bookmarked_jobs(&database, 2, Some("GB")).await.unwrap(),
            search_jobs(&database, "Country", 2, Some("GB"))
                .await
                .unwrap(),
        ] {
            assert_eq!(results.len(), 2);
            assert_eq!(results[0].hash, "matching");
            assert_eq!(results[1].hash, "unknown");
        }
    }

    #[test]
    fn country_options_are_direct_domain_lookup_values() {
        let options = country_options();
        assert!(options.contains(&("GB", "United Kingdom of Great Britain and Northern Ireland")));
        assert!(options.contains(&("US", "United States of America")));
    }
}
