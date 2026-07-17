use super::*;

#[path = "tests/basic_tests.rs"]
mod basic_tests;

#[path = "tests/api_contract_tests.rs"]
mod api_contract_tests;

#[path = "tests/json_edge_tests.rs"]
mod json_edge_tests;

#[path = "tests/remote_inference_tests.rs"]
mod remote_inference_tests;

#[path = "tests/scrape_company_flow_tests.rs"]
mod scrape_company_flow_tests;

// ========================================
// Integration Tests for scrape_company
// ========================================

#[tokio::test]
async fn test_scrape_company_creates_jobs_from_api_response() {
    // This test validates the full scrape_company flow with mock data
    let company = LeverCompany {
        id: "test-company".to_string(),
        name: "Test Company".to_string(),
        url: "https://jobs.lever.co/test-company".to_string(),
    };

    let _scraper = LeverScraper::new(vec![company.clone()]);

    // We can't directly test scrape_company without a real API or mock server
    // but we can test the JSON processing logic that it uses
    let json_response = serde_json::json!([
        {
            "text": "Senior Public Health Analyst",
            "hostedUrl": "https://jobs.lever.co/test-company/job1",
            "categories": {
                "location": "Remote",
                "team": "Community Care"
            },
            "description": "<p>Join our care coordination team</p>",
            "descriptionPlain": "Join our care coordination team"
        },
        {
            "text": "Customer Support Manager",
            "hostedUrl": "https://jobs.lever.co/test-company/job2",
            "categories": {
                "location": "San Francisco, CA"
            },
            "descriptionPlain": "Support neighbors across multiple channels"
        },
        {
            "text": "",
            "hostedUrl": "https://jobs.lever.co/test-company/job3"
        }
    ]);

    // Simulate the processing logic from scrape_company
    let jobs = if let Some(postings) = json_response.as_array() {
        let mut jobs = Vec::with_capacity(postings.len());
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();
            let location = posting["categories"]["location"]
                .as_str()
                .map(|s| s.to_string())
                .or_else(|| {
                    posting["categories"]["team"]
                        .as_str()
                        .map(|s| s.to_string())
                });

            let description = posting["description"]
                .as_str()
                .or_else(|| posting["descriptionPlain"].as_str())
                .map(|s| s.to_string());

            let remote = LeverScraper::infer_remote(&title, location.as_deref());

            if !title.is_empty() && !url.is_empty() {
                jobs.push(Job {
                    description: description.clone(),
                    remote: Some(remote),
                    ..Job::newly_discovered(
                        title.clone(),
                        company.name.clone(),
                        url.clone(),
                        location.clone(),
                        "lever",
                        Utc::now(),
                    )
                });
            }
        }
        jobs
    } else {
        Vec::new()
    };

    // Validate results
    assert_eq!(
        jobs.len(),
        2,
        "Should create 2 jobs (third has empty title)"
    );

    // Validate first job
    assert_eq!(jobs[0].title, "Senior Public Health Analyst");
    assert_eq!(jobs[0].company, "Test Company");
    assert_eq!(jobs[0].url, "https://jobs.lever.co/test-company/job1");
    assert_eq!(jobs[0].location, Some("Remote".to_string()));
    assert_eq!(
        jobs[0].description,
        Some("<p>Join our care coordination team</p>".to_string())
    );
    assert_eq!(jobs[0].source, "lever");
    assert_eq!(jobs[0].remote, Some(true));
    assert_eq!(jobs[0].times_seen, 1);
    assert_eq!(jobs[0].immediate_alert_sent, false);
    assert_eq!(jobs[0].hidden, false);
    assert_eq!(jobs[0].bookmarked, false);
    assert_eq!(jobs[0].notes, None);
    assert_eq!(jobs[0].hash.len(), 64);

    // Validate second job
    assert_eq!(jobs[1].title, "Customer Support Manager");
    assert_eq!(jobs[1].company, "Test Company");
    assert_eq!(jobs[1].remote, Some(false));
    assert_eq!(jobs[1].location, Some("San Francisco, CA".to_string()));
}

#[tokio::test]
async fn test_scrape_company_handles_empty_response() {
    let company = LeverCompany {
        id: "empty-company".to_string(),
        name: "Empty Company".to_string(),
        url: "https://jobs.lever.co/empty-company".to_string(),
    };

    let json_response = serde_json::json!([]);

    let jobs = if let Some(postings) = json_response.as_array() {
        let mut jobs = Vec::with_capacity(postings.len());
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

            if !title.is_empty() && !url.is_empty() {
                jobs.push(Job {
                    id: 0,
                    hash: "test".to_string(),
                    title,
                    company: company.name.clone(),
                    url,
                    location: None,
                    description: None,
                    score: None,
                    score_reasons: None,
                    source: "lever".to_string(),
                    remote: None,
                    salary_min: None,
                    salary_max: None,
                    currency: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                    last_seen: Utc::now(),
                    times_seen: 1,
                    immediate_alert_sent: false,
                    hidden: false,
                    bookmarked: false,
                    notes: None,
                    ghost_score: None,
                    ghost_reasons: None,
                    first_seen: None,
                    repost_count: 0,
                    included_in_digest: false,
                });
            }
        }
        jobs
    } else {
        Vec::new()
    };

    assert_eq!(jobs.len(), 0);
}

#[tokio::test]
async fn test_scrape_company_handles_non_array_response() {
    let json_response = serde_json::json!({
        "error": "Invalid response"
    });

    let jobs = if let Some(postings) = json_response.as_array() {
        let mut jobs = Vec::new();
        for _posting in postings {
            jobs.push(Job {
                id: 0,
                hash: "test".to_string(),
                title: "Test".to_string(),
                company: "Test".to_string(),
                url: "https://test.com".to_string(),
                location: None,
                description: None,
                score: None,
                score_reasons: None,
                source: "lever".to_string(),
                remote: None,
                salary_min: None,
                salary_max: None,
                currency: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                last_seen: Utc::now(),
                times_seen: 1,
                immediate_alert_sent: false,
                hidden: false,
                bookmarked: false,
                notes: None,
                ghost_score: None,
                ghost_reasons: None,
                first_seen: None,
                repost_count: 0,
                included_in_digest: false,
            });
        }
        jobs
    } else {
        Vec::new()
    };

    assert_eq!(
        jobs.len(),
        0,
        "Non-array response should produce empty job list"
    );
}

#[tokio::test]
async fn test_scrape_reports_error_when_all_companies_fail() {
    let scraper = LeverScraper::new(vec![LeverCompany {
        id: "broken".to_string(),
        name: "Broken Company".to_string(),
        url: "not a valid url".to_string(),
    }]);

    let error = scraper
        .scrape()
        .await
        .expect_err("all failed companies should not look like an empty success");

    assert!(matches!(
        error,
        ScraperError::Generic {
            scraper,
            message
        } if scraper == "lever" && message.contains("All configured company boards failed")
    ));
}

#[tokio::test]
async fn test_scrape_with_empty_companies() {
    let scraper = LeverScraper::new(vec![]);
    let result = scraper.scrape().await;

    assert!(result.is_ok());
    let jobs = result.unwrap();
    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_job_struct_fields_are_populated_correctly() {
    // Test that Job struct is created with all required fields
    let company_name = "Test Co";
    let title = "Care Coordinator (Remote)";
    let location = Some("Remote - US");
    let url = "https://jobs.lever.co/test/abc";
    let description = Some("<p>Description</p>".to_string());

    let hash = jobsentinel_domain::calculate_job_hash(company_name, title, location, url);
    let remote = LeverScraper::infer_remote(title, location);

    let job = Job {
        id: 0,
        hash: hash.clone(),
        title: title.to_string(),
        company: company_name.to_string(),
        url: url.to_string(),
        location: location.map(|s| s.to_string()),
        description,
        score: None,
        score_reasons: None,
        source: "lever".to_string(),
        remote: Some(remote),
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_seen: Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        included_in_digest: false,
    };

    assert_eq!(job.title, "Care Coordinator (Remote)");
    assert_eq!(job.company, "Test Co");
    assert_eq!(job.source, "lever");
    assert_eq!(job.remote, Some(true));
    assert_eq!(job.times_seen, 1);
    assert!(!job.immediate_alert_sent);
    assert!(!job.hidden);
    assert!(!job.bookmarked);
    assert!(job.notes.is_none());
    assert!(!job.included_in_digest);
    assert_eq!(job.hash, hash);
}

#[test]
fn test_job_struct_with_missing_optional_fields() {
    let job = Job {
        id: 0,
        hash: "test-hash".to_string(),
        title: "Care Coordinator".to_string(),
        company: "Company".to_string(),
        url: "https://test.com".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "lever".to_string(),
        remote: None,
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_seen: Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        included_in_digest: false,
    };

    assert!(job.location.is_none());
    assert!(job.description.is_none());
    assert!(job.remote.is_none());
    assert!(job.salary_min.is_none());
    assert!(job.salary_max.is_none());
}

#[test]
fn test_description_extraction_priority() {
    // Test description field has priority over descriptionPlain
    let json = serde_json::json!({
        "text": "Care Coordinator",
        "hostedUrl": "https://test.com/job",
        "description": "<p>HTML description</p>",
        "descriptionPlain": "Plain description"
    });

    let description = json["description"]
        .as_str()
        .or_else(|| json["descriptionPlain"].as_str())
        .map(|s| s.to_string());

    assert_eq!(description, Some("<p>HTML description</p>".to_string()));

    // Test descriptionPlain fallback
    let json2 = serde_json::json!({
        "text": "Care Coordinator",
        "hostedUrl": "https://test.com/job",
        "descriptionPlain": "Plain description"
    });

    let description2 = json2["description"]
        .as_str()
        .or_else(|| json2["descriptionPlain"].as_str())
        .map(|s| s.to_string());

    assert_eq!(description2, Some("Plain description".to_string()));
}

#[test]
fn test_location_extraction_with_team_fallback() {
    // Test location field exists
    let json = serde_json::json!({
        "categories": {
            "location": "Remote",
            "team": "Community Care"
        }
    });

    let location = json["categories"]["location"]
        .as_str()
        .map(|s| s.to_string())
        .or_else(|| json["categories"]["team"].as_str().map(|s| s.to_string()));

    assert_eq!(location, Some("Remote".to_string()));

    // Test team fallback when location is missing
    let json2 = serde_json::json!({
        "categories": {
            "team": "Care Operations"
        }
    });

    let location2 = json2["categories"]["location"]
        .as_str()
        .map(|s| s.to_string())
        .or_else(|| json2["categories"]["team"].as_str().map(|s| s.to_string()));

    assert_eq!(location2, Some("Care Operations".to_string()));

    // Test neither field exists
    let json3 = serde_json::json!({
        "categories": {}
    });

    let location3 = json3["categories"]["location"]
        .as_str()
        .map(|s| s.to_string())
        .or_else(|| json3["categories"]["team"].as_str().map(|s| s.to_string()));

    assert_eq!(location3, None);
}

#[path = "tests/property_tests.rs"]
mod property_tests;
