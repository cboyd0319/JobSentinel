use super::*;

// Hash computation tests
#[test]
fn test_compute_hash_deterministic() {
    let hash1 = LeverScraper::compute_hash(
        "FreshMart",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );
    let hash2 = LeverScraper::compute_hash(
        "FreshMart",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );

    assert_eq!(hash1, hash2, "Same inputs should produce same hash");
    assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
}

#[test]
fn test_compute_hash_different_company() {
    let hash1 = LeverScraper::compute_hash(
        "FreshMart",
        "Care Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = LeverScraper::compute_hash(
        "Community Care Network",
        "Care Coordinator",
        None,
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different company should produce different hash"
    );
}

#[test]
fn test_compute_hash_different_title() {
    let hash1 = LeverScraper::compute_hash(
        "Company",
        "Customer Support Manager",
        None,
        "https://example.com/1",
    );
    let hash2 = LeverScraper::compute_hash(
        "Company",
        "Inventory Planner",
        None,
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different title should produce different hash"
    );
}

#[test]
fn test_compute_hash_different_location() {
    let hash1 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );
    let hash2 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("SF"),
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different location should produce different hash"
    );
}

#[test]
fn test_compute_hash_location_none_vs_some() {
    let hash1 =
        LeverScraper::compute_hash("Company", "Care Coordinator", None, "https://example.com/1");
    let hash2 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );

    assert_ne!(hash1, hash2, "None location should differ from Some");
}

#[test]
fn test_compute_hash_different_url() {
    let hash1 =
        LeverScraper::compute_hash("Company", "Care Coordinator", None, "https://example.com/1");
    let hash2 =
        LeverScraper::compute_hash("Company", "Care Coordinator", None, "https://example.com/2");

    assert_ne!(hash1, hash2, "Different URL should produce different hash");
}

#[test]
fn test_compute_hash_empty_strings() {
    let hash = LeverScraper::compute_hash("", "", None, "");
    assert_eq!(
        hash.len(),
        64,
        "Hash of empty strings should still be valid"
    );
}

#[test]
fn test_compute_hash_special_characters() {
    let hash = LeverScraper::compute_hash(
        "Company™",
        "Senior Care Coordinator (Remote) 🚀",
        Some("San Francisco, CA"),
        "https://jobs.lever.co/company/job-id?ref=test&utm_source=linkedin",
    );

    assert_eq!(hash.len(), 64, "Hash should handle special characters");
}

// Scraper initialization tests
#[test]
fn test_scraper_name() {
    let scraper = LeverScraper::new(vec![]);
    assert_eq!(scraper.name(), "lever");
}

#[test]
fn test_company_scrape_failure_copy_omits_company_and_error_detail() {
    assert!(!COMPANY_SCRAPE_FAILED.contains("{}"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("https://"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("secret"));
    assert!(!COMPANY_SCRAPE_FAILED.contains("Community Care Network"));
}

#[test]
fn test_new_scraper_with_companies() {
    let companies = vec![
        LeverCompany {
            id: "freshmart".to_string(),
            name: "FreshMart".to_string(),
            url: "https://jobs.lever.co/freshmart".to_string(),
        },
        LeverCompany {
            id: "community-care-network".to_string(),
            name: "Community Care Network".to_string(),
            url: "https://jobs.lever.co/community-care-network".to_string(),
        },
    ];

    let scraper = LeverScraper::new(companies.clone());

    assert_eq!(scraper.companies.len(), 2);
    assert_eq!(scraper.companies[0].name, "FreshMart");
    assert_eq!(scraper.companies[1].name, "Community Care Network");
    assert_eq!(scraper.companies[0].id, "freshmart");
}

#[test]
fn test_new_scraper_empty() {
    let scraper = LeverScraper::new(vec![]);
    assert_eq!(scraper.companies.len(), 0);
}

#[test]
fn test_parse_response_single_job() {
    let json_data = r#"
    [
        {
            "text": "Senior Public Health Analyst",
            "hostedUrl": "https://jobs.lever.co/city-health-department/abc123",
            "categories": {
                "location": "Remote",
                "team": "Community Care"
            },
            "description": "<p>Join our care coordination team</p>",
            "descriptionPlain": "Join our care coordination team"
        }
    ]
    "#;

    let _scraper = LeverScraper::new(vec![LeverCompany {
        id: "city-health-department".to_string(),
        name: "City Health Department".to_string(),
        url: "https://jobs.lever.co/city-health-department".to_string(),
    }]);

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(postings) = parsed.as_array() {
        assert_eq!(postings.len(), 1);

        let posting = &postings[0];
        let title = posting["text"].as_str().unwrap();
        let url = posting["hostedUrl"].as_str().unwrap();
        let location = posting["categories"]["location"].as_str();

        assert_eq!(title, "Senior Public Health Analyst");
        assert_eq!(url, "https://jobs.lever.co/city-health-department/abc123");
        assert_eq!(location, Some("Remote"));
    }
}

#[test]
fn test_parse_response_multiple_jobs() {
    let json_data = r#"
    [
        {
            "text": "Customer Support Manager",
            "hostedUrl": "https://jobs.lever.co/community-care-network/job1",
            "categories": {
                "location": "Chicago, IL"
            }
        },
        {
            "text": "Inventory Planner",
            "hostedUrl": "https://jobs.lever.co/community-care-network/job2",
            "categories": {
                "team": "Regional Support"
            }
        },
        {
            "text": "Program Coordinator",
            "hostedUrl": "https://jobs.lever.co/community-care-network/job3",
            "categories": {
                "location": "Remote - US"
            }
        }
    ]
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(postings) = parsed.as_array() {
        assert_eq!(postings.len(), 3);

        assert_eq!(
            postings[0]["text"].as_str(),
            Some("Customer Support Manager")
        );
        assert_eq!(postings[1]["text"].as_str(), Some("Inventory Planner"));
        assert_eq!(postings[2]["text"].as_str(), Some("Program Coordinator"));

        // First has location in categories.location
        assert_eq!(
            postings[0]["categories"]["location"].as_str(),
            Some("Chicago, IL")
        );

        // Second has team instead of location
        assert_eq!(postings[1]["categories"]["location"].as_str(), None);
        assert_eq!(
            postings[1]["categories"]["team"].as_str(),
            Some("Regional Support")
        );

        // Third has remote location
        assert_eq!(
            postings[2]["categories"]["location"].as_str(),
            Some("Remote - US")
        );
    }
}

#[test]
fn test_parse_response_empty_array() {
    let json_data = "[]";
    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(postings) = parsed.as_array() {
        assert_eq!(postings.len(), 0);
    }
}

#[test]
fn test_parse_response_missing_fields() {
    let json_data = r#"
    [
        {
            "text": "Care Coordinator",
            "hostedUrl": "https://jobs.lever.co/company/job1"
        },
        {
            "hostedUrl": "https://jobs.lever.co/company/job2"
        },
        {
            "text": "Program Coordinator"
        },
        {
            "text": "",
            "hostedUrl": ""
        }
    ]
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(postings) = parsed.as_array() {
        assert_eq!(postings.len(), 4);

        // First has both fields
        assert!(postings[0]["text"].as_str().is_some());
        assert!(postings[0]["hostedUrl"].as_str().is_some());

        // Second missing text
        assert!(postings[1]["text"].as_str().is_none());

        // Third missing hostedUrl
        assert!(postings[2]["hostedUrl"].as_str().is_none());

        // Fourth has empty strings (should be filtered by scraper logic)
        assert_eq!(postings[3]["text"].as_str(), Some(""));
        assert_eq!(postings[3]["hostedUrl"].as_str(), Some(""));
    }
}

#[test]
fn test_parse_response_with_description_variants() {
    let json_data = r#"
    [
        {
            "text": "Job 1",
            "hostedUrl": "https://jobs.lever.co/company/1",
            "description": "<p>HTML description</p>"
        },
        {
            "text": "Job 2",
            "hostedUrl": "https://jobs.lever.co/company/2",
            "descriptionPlain": "Plain text description"
        },
        {
            "text": "Job 3",
            "hostedUrl": "https://jobs.lever.co/company/3",
            "description": "<p>HTML version</p>",
            "descriptionPlain": "Plain version"
        },
        {
            "text": "Job 4",
            "hostedUrl": "https://jobs.lever.co/company/4"
        }
    ]
    "#;

    let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

    if let Some(postings) = parsed.as_array() {
        // Job 1: has description (HTML)
        assert_eq!(
            postings[0]["description"].as_str(),
            Some("<p>HTML description</p>")
        );

        // Job 2: has descriptionPlain only
        assert_eq!(
            postings[1]["descriptionPlain"].as_str(),
            Some("Plain text description")
        );

        // Job 3: has both (should prefer description first)
        assert!(postings[2]["description"].as_str().is_some());
        assert!(postings[2]["descriptionPlain"].as_str().is_some());

        // Job 4: has neither
        assert!(postings[3]["description"].as_str().is_none());
        assert!(postings[3]["descriptionPlain"].as_str().is_none());
    }
}

#[test]
fn test_api_url_construction() {
    let companies = vec![
        LeverCompany {
            id: "freshmart".to_string(),
            name: "FreshMart".to_string(),
            url: "https://jobs.lever.co/freshmart".to_string(),
        },
        LeverCompany {
            id: "community-care-network".to_string(),
            name: "Community Care Network".to_string(),
            url: "https://jobs.lever.co/community-care-network".to_string(),
        },
    ];

    for company in &companies {
        let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);
        assert!(api_url.starts_with("https://api.lever.co/v0/postings/"));
        assert!(api_url.ends_with(&company.id));
    }
}

#[test]
fn test_hash_with_json_data() {
    let company = "FreshMart";
    let title = "Senior Public Health Analyst";
    let location = Some("Remote");
    let url = "https://jobs.lever.co/freshmart/abc123";

    let hash = LeverScraper::compute_hash(company, title, location, url);

    assert_eq!(hash.len(), 64);
    assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_hash_remote_locations_normalized() {
    // With location normalization, "Remote" variants all normalize to "remote"
    // so they should produce the SAME hash (improved deduplication)
    let hash1 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );
    let hash2 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("Remote - US"),
        "https://example.com/1",
    );
    let hash3 = LeverScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("Remote - Global"),
        "https://example.com/1",
    );

    // All remote variants should produce the SAME hash
    assert_eq!(hash1, hash2);
    assert_eq!(hash2, hash3);
    assert_eq!(hash1, hash3);
}

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
            let hash = LeverScraper::compute_hash(&company.name, &title, location.as_deref(), &url);

            if !title.is_empty() && !url.is_empty() {
                jobs.push(Job {
                    id: 0,
                    hash: hash.clone(),
                    title: title.clone(),
                    company: company.name.clone(),
                    url: url.clone(),
                    location: location.clone(),
                    description: description.clone(),
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

    let hash = LeverScraper::compute_hash(company_name, title, location, url);
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

#[test]
fn test_api_url_format() {
    let company = LeverCompany {
        id: "freshmart".to_string(),
        name: "FreshMart".to_string(),
        url: "https://jobs.lever.co/freshmart".to_string(),
    };

    let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

    assert_eq!(api_url, "https://api.lever.co/v0/postings/freshmart");
    assert!(api_url.starts_with("https://api.lever.co/v0/postings/"));
}

#[test]
fn test_empty_title_and_url_filtering() {
    // Simulate the validation logic from scrape_company
    let test_cases = vec![
        ("Valid Job", "https://test.com/1", true),
        ("", "https://test.com/2", false),
        ("Valid Job", "", false),
        ("", "", false),
    ];

    for (title, url, should_be_valid) in test_cases {
        let is_valid = !title.is_empty() && !url.is_empty();
        assert_eq!(
            is_valid, should_be_valid,
            "Failed for title='{}', url='{}'",
            title, url
        );
    }
}

#[test]
fn test_vec_with_capacity_hint() {
    let postings = vec![
        serde_json::json!({"text": "Job 1", "hostedUrl": "https://test.com/1"}),
        serde_json::json!({"text": "Job 2", "hostedUrl": "https://test.com/2"}),
        serde_json::json!({"text": "Job 3", "hostedUrl": "https://test.com/3"}),
    ];

    let mut jobs: Vec<String> = Vec::with_capacity(postings.len());

    for posting in &postings {
        if let Some(title) = posting["text"].as_str() {
            jobs.push(title.to_string());
        }
    }

    assert_eq!(jobs.len(), 3);
    assert_eq!(jobs.capacity(), 3);
}

#[test]
fn test_multiple_companies_processing() {
    let companies = vec![
        LeverCompany {
            id: "company1".to_string(),
            name: "Company 1".to_string(),
            url: "https://jobs.lever.co/company1".to_string(),
        },
        LeverCompany {
            id: "company2".to_string(),
            name: "Company 2".to_string(),
            url: "https://jobs.lever.co/company2".to_string(),
        },
        LeverCompany {
            id: "company3".to_string(),
            name: "Company 3".to_string(),
            url: "https://jobs.lever.co/company3".to_string(),
        },
    ];

    let scraper = LeverScraper::new(companies.clone());

    assert_eq!(scraper.companies.len(), 3);
    assert_eq!(scraper.name(), "lever");

    for (i, company) in scraper.companies.iter().enumerate() {
        assert_eq!(company.name, companies[i].name);
        assert_eq!(company.id, companies[i].id);
    }
}

// ========================================
// Property-Based Tests
// ========================================

use proptest::prelude::*;

proptest! {
    /// Property: Hash function is deterministic
    #[test]
    fn prop_hash_deterministic(
        company in "\\PC{1,100}",
        title in "\\PC{1,200}",
        location in proptest::option::of("\\PC{1,100}"),
        url in "https?://[a-z0-9./]+",
    ) {
        let hash1 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);
        let hash2 = LeverScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash1.clone(), hash2);
        prop_assert_eq!(hash1.len(), 64);
    }

    /// Property: Hash collision resistance
    #[test]
    fn prop_hash_collision_resistance(
        company1 in "\\PC{1,100}",
        company2 in "\\PC{1,100}",
        title in "\\PC{1,200}",
        url in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(company1 != company2);

        let hash1 = LeverScraper::compute_hash(&company1, &title, None, &url);
        let hash2 = LeverScraper::compute_hash(&company2, &title, None, &url);

        prop_assert_ne!(hash1, hash2);
    }

    /// Property: Remote inference from title is case-insensitive
    #[test]
    fn prop_remote_inference_case_insensitive(
        prefix in "(remote|REMOTE|Remote|ReMoTe)",
        title in "[a-zA-Z ]{5,50}",
    ) {
        let full_title = format!("{} {}", prefix, title);
        prop_assert!(LeverScraper::infer_remote(&full_title, None));
    }

    /// Property: Remote inference from location handles various "remote" spellings
    #[test]
    fn prop_remote_inference_from_location(
        location in "(Remote|remote|REMOTE|Anywhere|anywhere|Worldwide|worldwide)",
    ) {
        prop_assert!(LeverScraper::infer_remote("Care Coordinator", Some(&location)));
    }

    /// Property: Non-remote titles don't trigger false positives
    #[test]
    fn prop_remote_inference_no_false_positives(
        title in "[a-zA-Z ]{5,50}",
        location in "(New York|San Francisco|London|Tokyo|Austin)",
    ) {
        prop_assume!(!title.to_lowercase().contains("remote"));
        prop_assume!(!title.to_lowercase().contains("work from home"));
        prop_assume!(!title.to_lowercase().contains("wfh"));

        prop_assert!(!LeverScraper::infer_remote(&title, Some(&location)));
    }

    /// Property: Hash handles Unicode characters
    #[test]
    fn prop_hash_unicode_support(
        company in "[\\PC🦀]{1,50}",
        title in "[\\PC💼]{1,100}",
        url in "\\PC{10,200}",
    ) {
        let hash = LeverScraper::compute_hash(&company, &title, None, &url);

        prop_assert_eq!(hash.len(), 64);
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
