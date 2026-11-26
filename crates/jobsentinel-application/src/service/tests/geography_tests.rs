//! Verifies reviewed job imports preserve separated source-observed geography.

use super::*;
use jobsentinel_domain::{CountryObservation, JobGeography, LocationObservation};

#[tokio::test]
async fn reviewed_import_preserves_worksite_and_remote_applicant_geography() {
    let database = database().await;
    let pending = PendingUrlImports::default();
    let posting = serde_json::json!({
        "@type": "JobPosting", "title": "Regional Operations Coordinator",
        "hiringOrganization": {"name": "Example"}, "description": "Coordinate operations.",
        "jobLocationType": "TELECOMMUTE",
        "jobLocation": {"address": {"addressLocality": "New York", "addressRegion": "NY",
            "addressCountry": {"@type": "Country", "name": "United States"}}},
        "applicantLocationRequirements": {"@type": "Country", "name": "United Kingdom"},
    });
    let html = format!(r#"<script type="application/ld+json">{posting}</script>"#);
    let preview = preview_job_from_html(
        &database,
        &pending,
        "https://example.com/jobs/regional-operations".to_string(),
        &html,
        employer_discovery_review_grant(),
    )
    .await
    .unwrap();
    let saved = confirm_job_import(&database, &pending, preview.import_id.as_deref().unwrap())
        .await
        .unwrap();
    let job = database.get_job_by_id(saved.job_id).await.unwrap().unwrap();

    assert_eq!(job.location.as_deref(), Some("New York, NY"));
    assert_eq!(job.remote, Some(true));
    assert_eq!(
        job.geography,
        Some(JobGeography {
            worksite_locations: vec![LocationObservation {
                raw_location: "New York, NY".to_string(),
                country: Some(CountryObservation {
                    raw_country: "United States".to_string(),
                    alpha2: Some("US".to_string()),
                }),
            }],
            remote_applicant_locations: vec![LocationObservation {
                raw_location: "United Kingdom".to_string(),
                country: Some(CountryObservation {
                    raw_country: "United Kingdom".to_string(),
                    alpha2: Some("GB".to_string()),
                }),
            }],
        })
    );
}
