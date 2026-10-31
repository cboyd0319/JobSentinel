//! Proves job geography storage preserves observations and rejects malformed rows.

use super::*;
use jobsentinel_domain::{CountryObservation, JobGeography, LocationObservation};

fn observed_geography() -> JobGeography {
    JobGeography {
        worksite_locations: vec![LocationObservation {
            raw_location: "Bengaluru".to_string(),
            country: Some(CountryObservation {
                raw_country: "India".to_string(),
                alpha2: Some("IN".to_string()),
            }),
        }],
        remote_applicant_locations: vec![LocationObservation {
            raw_location: "Remote in India".to_string(),
            country: None,
        }],
    }
}

#[tokio::test]
async fn job_geography_round_trips_and_legacy_upsert_preserves_it() {
    let database = crate::test_support::migrated_database().await;
    let mut job = create_test_job("job-geography", "Regional role", 0.9);
    job.geography = Some(observed_geography());

    let id = database.upsert_job(&job).await.unwrap();
    assert_eq!(
        database.get_job_by_id(id).await.unwrap().unwrap().geography,
        job.geography
    );

    job.geography = None;
    database.upsert_job(&job).await.unwrap();
    assert_eq!(
        database.get_job_by_id(id).await.unwrap().unwrap().geography,
        Some(observed_geography())
    );
}

#[tokio::test]
async fn malformed_geography_fails_closed_in_direct_and_duplicate_queries() {
    let database = crate::test_support::migrated_database().await;
    let mut first = create_test_job("geography-duplicate-1", "Regional role", 0.9);
    first.company = "Example".to_string();
    first.geography = Some(observed_geography());
    database.upsert_job(&first).await.unwrap();

    let mut second = create_test_job("geography-duplicate-2", "Regional role", 0.8);
    second.company = "Example".to_string();
    second.geography = Some(observed_geography());
    let second_id = database.upsert_job(&second).await.unwrap();
    assert_eq!(
        database.find_duplicate_groups().await.unwrap()[0].jobs[1].geography,
        Some(observed_geography())
    );

    sqlx::query("UPDATE jobs SET geography = '{}' WHERE id = ?")
        .bind(second_id)
        .execute(database.pool())
        .await
        .unwrap();
    assert!(database
        .get_job_by_id(second_id)
        .await
        .unwrap_err()
        .to_string()
        .contains("Stored job geography JSON is invalid"));
    assert!(database
        .find_duplicate_groups()
        .await
        .unwrap_err()
        .to_string()
        .contains("Stored job geography JSON is invalid"));
}
