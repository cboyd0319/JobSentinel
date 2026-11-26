//! Tests country-aware job IPC projections without duplicating application filter coverage.

use super::{get_job_by_id_for_state, serialize_job};
use crate::application::Job;
use chrono::Utc;
use serde_json::{json, Value};

fn test_job(description: Option<&str>, remote: Option<bool>) -> Job {
    let mut job = Job::newly_discovered(
        "Test role",
        "Test company",
        "https://example.com/jobs/1",
        None,
        "test",
        Utc::now(),
    );
    job.description = description.map(str::to_string);
    job.remote = remote;
    job
}

fn job_with_geography(worksite_country: &str, remote_applicant_country: Option<&str>) -> Job {
    let mut job = test_job(None, Some(remote_applicant_country.is_some()));
    job.geography = Some(
        serde_json::from_value(json!({
            "worksite_locations": [{
                "raw_location": "Headquarters",
                "country": { "raw_country": worksite_country, "alpha2": worksite_country }
            }],
            "remote_applicant_locations": remote_applicant_country.map(|country| json!({
                "raw_location": "Remote applicant location",
                "country": { "raw_country": country, "alpha2": country }
            })).into_iter().collect::<Vec<_>>(),
        }))
        .expect("test geography is valid"),
    );
    job
}

fn projection_field<'a>(projection: &'a Value, field: &str) -> Option<&'a str> {
    projection.get(field).and_then(Value::as_str)
}

#[test]
fn serialize_job_projects_work_arrangement_for_each_status() {
    for (description, remote, expected) in [
        (Some("Hybrid schedule"), Some(true), "remote"),
        (Some("Hybrid schedule"), None, "hybrid"),
        (Some("On-site role"), None, "onsite"),
        (None, None, "unspecified"),
    ] {
        let job = test_job(description, remote);
        let serialized = serialize_job(job.id, &job, None).expect("job serializes");

        assert_eq!(
            projection_field(&serialized, "work_arrangement"),
            Some(expected)
        );
    }
}

#[test]
fn serialize_job_projects_unfiltered_unknown_and_remote_applicant_scopes() {
    let us_job = job_with_geography("US", None);
    let unfiltered = serialize_job(us_job.id, &us_job, None).expect("job serializes");
    assert_eq!(
        projection_field(&unfiltered, "country_scope"),
        Some("unfiltered")
    );
    assert!(unfiltered["search_country"].is_null());

    let unknown_job = test_job(None, None);
    let unknown = serialize_job(unknown_job.id, &unknown_job, Some("GB")).expect("job serializes");
    assert_eq!(projection_field(&unknown, "country_scope"), Some("unknown"));
    assert_eq!(projection_field(&unknown, "search_country"), Some("GB"));

    let remote_us_hq_gb_applicant = job_with_geography("US", Some("GB"));
    let matched = serialize_job(
        remote_us_hq_gb_applicant.id,
        &remote_us_hq_gb_applicant,
        Some("GB"),
    )
    .expect("job serializes");
    assert_eq!(projection_field(&matched, "country_scope"), Some("match"));
}

#[tokio::test]
async fn direct_lookup_keeps_a_country_mismatch_accessible_and_projects_its_snapshot() {
    let state = crate::ipc::tests::create_test_app_state().await;
    state
        .config
        .write()
        .await
        .location_preferences
        .search_country = Some("GB".to_string());
    let job = job_with_geography("US", None);
    let job_id = state.database.upsert_job(&job).await.expect("job saves");

    let projection = get_job_by_id_for_state(job_id, &state)
        .await
        .expect("direct lookup succeeds")
        .expect("mismatched saved job remains accessible");

    assert_eq!(
        projection_field(&projection, "country_scope"),
        Some("mismatch")
    );
    assert_eq!(projection_field(&projection, "search_country"), Some("GB"));
}
