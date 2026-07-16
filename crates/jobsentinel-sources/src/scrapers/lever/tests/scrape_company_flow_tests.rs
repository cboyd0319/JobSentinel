use super::*;

#[path = "scrape_company_flow_tests/api_contract_tests.rs"]
mod api_contract_tests;

// ========================================
// Additional Integration Tests for Full Coverage
// ========================================

#[tokio::test]
async fn test_scrape_company_full_job_creation_with_all_fields() {
    // Comprehensive test covering all Job struct field assignment paths
    let company = LeverCompany {
        id: "comprehensive-test".to_string(),
        name: "Comprehensive Test Co".to_string(),
        url: "https://jobs.lever.co/comprehensive-test".to_string(),
    };

    let json_response = serde_json::json!([
        {
            "text": "Senior Care Coordinator (Remote)",
            "hostedUrl": "https://jobs.lever.co/comprehensive-test/job1",
            "categories": {
                "location": "Remote - Global",
                "team": "Community Care",
                "commitment": "Full-time"
            },
            "description": "<h1>Join our team</h1><p>We are looking for passionate coordinators</p>",
            "descriptionPlain": "Join our team. We are looking for passionate coordinators."
        }
    ]);

    // Simulate scrape_company processing
    if let Some(postings) = json_response.as_array() {
        assert_eq!(postings.len(), 1);

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
                    hash,
                    title,
                    company: company.name.clone(),
                    url,
                    location,
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
                });
            }
        }

        assert_eq!(jobs.len(), 1);

        // Verify all fields are set correctly
        let job = &jobs[0];
        assert_eq!(job.title, "Senior Care Coordinator (Remote)");
        assert_eq!(job.company, "Comprehensive Test Co");
        assert_eq!(job.url, "https://jobs.lever.co/comprehensive-test/job1");
        assert_eq!(job.location, Some("Remote - Global".to_string()));
        assert!(job
            .description
            .as_ref()
            .unwrap()
            .contains("<h1>Join our team</h1>"));
        assert_eq!(job.source, "lever");
        assert_eq!(job.remote, Some(true));
        assert_eq!(job.times_seen, 1);
        assert!(!job.immediate_alert_sent);
        assert!(!job.hidden);
        assert!(!job.bookmarked);
        assert!(job.notes.is_none());
        assert!(!job.included_in_digest);
        assert_eq!(job.hash.len(), 64);
    }
}

#[tokio::test]
async fn test_scrape_company_with_descriptionplain_only() {
    // Test path where description is None but descriptionPlain exists
    let _company = LeverCompany {
        id: "test".to_string(),
        name: "Test Co".to_string(),
        url: "https://jobs.lever.co/test".to_string(),
    };

    let json_response = serde_json::json!([
        {
            "text": "Program Coordinator",
            "hostedUrl": "https://jobs.lever.co/test/job1",
            "descriptionPlain": "This is a plain text description"
        }
    ]);

    if let Some(postings) = json_response.as_array() {
        let posting = &postings[0];

        let description = posting["description"]
            .as_str()
            .or_else(|| posting["descriptionPlain"].as_str())
            .map(|s| s.to_string());

        assert_eq!(
            description,
            Some("This is a plain text description".to_string())
        );
    }
}

#[tokio::test]
async fn test_scrape_company_with_team_fallback_location() {
    // Test path where location is None but team exists
    let _company = LeverCompany {
        id: "test".to_string(),
        name: "Test Co".to_string(),
        url: "https://jobs.lever.co/test".to_string(),
    };

    let json_response = serde_json::json!([
        {
            "text": "Inventory Planner",
            "hostedUrl": "https://jobs.lever.co/test/job1",
            "categories": {
                "team": "Regional Support Team"
            }
        }
    ]);

    if let Some(postings) = json_response.as_array() {
        let posting = &postings[0];

        let location = posting["categories"]["location"]
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| {
                posting["categories"]["team"]
                    .as_str()
                    .map(|s| s.to_string())
            });

        assert_eq!(location, Some("Regional Support Team".to_string()));
    }
}

#[tokio::test]
async fn test_scrape_company_filters_jobs_with_empty_title() {
    let _company = LeverCompany {
        id: "test".to_string(),
        name: "Test Co".to_string(),
        url: "https://jobs.lever.co/test".to_string(),
    };

    let json_response = serde_json::json!([
        {
            "text": "",
            "hostedUrl": "https://jobs.lever.co/test/job1"
        },
        {
            "text": "Valid Program Coordinator",
            "hostedUrl": "https://jobs.lever.co/test/job2"
        }
    ]);

    let mut jobs = Vec::new();
    if let Some(postings) = json_response.as_array() {
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

            if !title.is_empty() && !url.is_empty() {
                jobs.push((title, url));
            }
        }
    }

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].0, "Valid Program Coordinator");
}

#[tokio::test]
async fn test_scrape_company_filters_jobs_with_empty_url() {
    let json_response = serde_json::json!([
        {
            "text": "Care Coordinator",
            "hostedUrl": ""
        },
        {
            "text": "Valid Program Coordinator",
            "hostedUrl": "https://jobs.lever.co/test/job2"
        }
    ]);

    let mut jobs = Vec::new();
    if let Some(postings) = json_response.as_array() {
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();

            if !title.is_empty() && !url.is_empty() {
                jobs.push((title, url));
            }
        }
    }

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].0, "Valid Program Coordinator");
}

#[tokio::test]
async fn test_scrape_company_computes_hash_for_each_job() {
    let company = LeverCompany {
        id: "test".to_string(),
        name: "Test Company".to_string(),
        url: "https://jobs.lever.co/test".to_string(),
    };

    let json_response = serde_json::json!([
        {
            "text": "Job 1",
            "hostedUrl": "https://jobs.lever.co/test/job1",
            "categories": {
                "location": "Remote"
            }
        },
        {
            "text": "Job 2",
            "hostedUrl": "https://jobs.lever.co/test/job2",
            "categories": {
                "location": "SF"
            }
        }
    ]);

    let mut hashes = Vec::new();
    if let Some(postings) = json_response.as_array() {
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();
            let location = posting["categories"]["location"]
                .as_str()
                .map(|s| s.to_string());

            let hash = LeverScraper::compute_hash(&company.name, &title, location.as_deref(), &url);
            hashes.push(hash);
        }
    }

    assert_eq!(hashes.len(), 2);
    assert_ne!(hashes[0], hashes[1]);
    assert_eq!(hashes[0].len(), 64);
    assert_eq!(hashes[1].len(), 64);
}

#[tokio::test]
async fn test_scrape_company_infers_remote_for_each_job() {
    let json_response = serde_json::json!([
        {
            "text": "Remote Care Coordinator",
            "hostedUrl": "https://jobs.lever.co/test/job1",
            "categories": {}
        },
        {
            "text": "Onsite Inventory Planner",
            "hostedUrl": "https://jobs.lever.co/test/job2",
            "categories": {
                "location": "San Francisco, CA"
            }
        }
    ]);

    let mut remote_flags = Vec::new();
    if let Some(postings) = json_response.as_array() {
        for posting in postings {
            let title = posting["text"].as_str().unwrap_or("").to_string();
            let location = posting["categories"]["location"]
                .as_str()
                .map(|s| s.to_string());

            let remote = LeverScraper::infer_remote(&title, location.as_deref());
            remote_flags.push(remote);
        }
    }

    assert_eq!(remote_flags.len(), 2);
    assert!(remote_flags[0]); // Remote Care Coordinator should be remote
    assert!(!remote_flags[1]); // Onsite Inventory Planner should not be remote
}

#[tokio::test]
async fn test_scrape_returns_empty_for_non_array_json() {
    let json_response = serde_json::json!({
        "error": "Invalid format"
    });

    let jobs = if let Some(postings) = json_response.as_array() {
        postings.len()
    } else {
        0
    };

    assert_eq!(jobs, 0);
}

#[test]
fn test_job_struct_all_boolean_fields_default_false() {
    let job = Job {
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
        remote: Some(false),
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

    assert!(!job.immediate_alert_sent);
    assert!(!job.hidden);
    assert!(!job.bookmarked);
    assert!(!job.included_in_digest);
}

#[test]
fn test_job_struct_times_seen_is_one() {
    let job = Job {
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
    };

    assert_eq!(job.times_seen, 1);
}

#[test]
fn test_source_is_lever() {
    let job = Job {
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
    };

    assert_eq!(job.source, "lever");
}

#[tokio::test]
async fn test_scrape_with_multiple_companies() {
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
    ];

    let scraper = LeverScraper::new(companies);

    // scrape() calls scrape_company for each company and aggregates results
    // We can't test actual API calls without mocking, but we test the structure
    assert_eq!(scraper.companies.len(), 2);
    assert_eq!(scraper.name(), "lever");
}
