use super::*;

// Hash computation tests
#[test]
fn test_compute_hash_deterministic() {
    let hash1 = JobsWithGptScraper::compute_hash(
        "CommunityCare",
        "Care Coordinator",
        Some("Denver"),
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
        "CommunityCare",
        "Care Coordinator",
        Some("Denver"),
        "https://example.com/1",
    );

    assert_eq!(hash1, hash2, "Same inputs should produce same hash");
    assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
}

#[test]
fn test_compute_hash_different_company() {
    let hash1 = JobsWithGptScraper::compute_hash(
        "CommunityCare",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
        "FreshMart",
        "Program Coordinator",
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
    let hash1 = JobsWithGptScraper::compute_hash(
        "Company",
        "Care Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
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
    let hash1 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Denver"),
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Chicago"),
        "https://example.com/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different location should produce different hash"
    );
}

#[test]
fn test_compute_hash_location_none_vs_some() {
    let hash1 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        Some("Remote"),
        "https://example.com/1",
    );

    assert_ne!(hash1, hash2, "None location should differ from Some");
}

#[test]
fn test_compute_hash_different_url() {
    let hash1 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/1",
    );
    let hash2 = JobsWithGptScraper::compute_hash(
        "Company",
        "Program Coordinator",
        None,
        "https://example.com/2",
    );

    assert_ne!(hash1, hash2, "Different URL should produce different hash");
}

#[test]
fn test_compute_hash_empty_strings() {
    let hash = JobsWithGptScraper::compute_hash("", "", None, "");
    assert_eq!(
        hash.len(),
        64,
        "Hash of empty strings should still be valid"
    );
}

#[test]
fn test_compute_hash_special_characters() {
    let hash = JobsWithGptScraper::compute_hash(
        "Company™",
        "Senior Care Coordinator (Remote) 🎯",
        Some("Denver, CO / Remote"),
        "https://jobs.example.com/job?id=123&utm_source=jobswithgpt",
    );

    assert_eq!(
        hash.len(),
        64,
        "Hash should handle special characters and query params"
    );
}

// MCP job parsing tests
#[test]
fn test_parse_mcp_job_complete() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec!["Care Coordinator".to_string()],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care Network",
        "url": "https://example.com/job/123",
        "location": "Remote",
        "description": "Coordinate services and follow-up for community members",
        "remote": true,
        "salary_min": 55000,
        "salary_max": 72000,
        "currency": "USD"
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Care Coordinator");
    assert_eq!(job.company, "Community Care Network");
    assert_eq!(job.url, "https://example.com/job/123");
    assert_eq!(job.location, Some("Remote".to_string()));
    assert_eq!(
        job.description,
        Some("Coordinate services and follow-up for community members".to_string())
    );
    assert_eq!(job.remote, Some(true));
    assert_eq!(job.salary_min, Some(55000));
    assert_eq!(job.salary_max, Some(72000));
    assert_eq!(job.currency, Some("USD".to_string()));
    assert_eq!(job.source, "jobswithgpt");
}

#[test]
fn test_parse_mcp_job_minimal() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "company": "Community Services",
        "url": "https://example.com/job"
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Program Coordinator");
    assert_eq!(job.company, "Community Services");
    assert_eq!(job.url, "https://example.com/job");
    assert_eq!(job.location, None);
    assert_eq!(job.description, None);
    assert_eq!(job.remote, None);
    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, None);
    assert_eq!(job.currency, None);
}

#[test]
fn test_parse_mcp_job_empty_title_returns_none() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "",
        "company": "Company",
        "url": "https://example.com/job"
    });

    let result = scraper.parse_mcp_job(&job_data).unwrap();
    assert!(result.is_none(), "Empty title should return None");
}

#[test]
fn test_parse_mcp_job_empty_url_returns_none() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "company": "Company",
        "url": ""
    });

    let result = scraper.parse_mcp_job(&job_data).unwrap();
    assert!(result.is_none(), "Empty URL should return None");
}

#[test]
fn test_parse_mcp_job_missing_company_defaults_to_unknown() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "url": "https://example.com/job"
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();
    assert_eq!(job.company, "Unknown");
}

// JobQuery tests
#[test]
fn test_job_query_creation() {
    let query = JobQuery {
        titles: vec![
            "Care Coordinator".to_string(),
            "Inventory Planner".to_string(),
        ],
        location: Some("Denver".to_string()),
        remote_only: true,
        limit: 50,
    };

    assert_eq!(query.titles.len(), 2);
    assert_eq!(query.titles[0], "Care Coordinator");
    assert_eq!(query.location, Some("Denver".to_string()));
    assert!(query.remote_only);
    assert_eq!(query.limit, 50);
}

#[test]
fn test_job_query_remote_only() {
    let query = JobQuery {
        titles: vec!["Care Coordinator".to_string()],
        location: None,
        remote_only: true,
        limit: 100,
    };

    assert!(query.remote_only);
    assert_eq!(query.location, None);
}

// Scraper initialization tests
#[test]
fn test_scraper_name() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    assert_eq!(scraper.name(), "jobswithgpt");
}

#[test]
fn test_new_scraper_with_endpoint() {
    let endpoint = "https://api.jobswithgpt.com/mcp".to_string();
    let query = JobQuery {
        titles: vec!["Care Coordinator".to_string()],
        location: Some("Remote".to_string()),
        remote_only: true,
        limit: 25,
    };

    let scraper = JobsWithGptScraper::new(endpoint.clone(), query.clone());

    assert_eq!(scraper.endpoint, endpoint);
    assert_eq!(scraper.query.titles, query.titles);
    assert_eq!(scraper.query.location, query.location);
    assert_eq!(scraper.query.remote_only, query.remote_only);
    assert_eq!(scraper.query.limit, query.limit);
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
        let hash1 = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);
        let hash2 = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash1.clone(), hash2);
        prop_assert_eq!(hash1.len(), 64);
    }

    /// Property: Hash format is always valid
    #[test]
    fn prop_hash_format_valid(
        company in "\\PC*",
        title in "\\PC*",
        location in proptest::option::of("\\PC*"),
        url in "\\PC*",
    ) {
        let hash = JobsWithGptScraper::compute_hash(&company, &title, location.as_deref(), &url);

        prop_assert_eq!(hash.len(), 64);
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    /// Property: Different inputs produce different hashes
    #[test]
    fn prop_hash_collision_resistance(
        company1 in "\\PC{1,100}",
        company2 in "\\PC{1,100}",
        title in "\\PC{1,200}",
        url in "https?://[a-z0-9./]+",
    ) {
        prop_assume!(company1 != company2);

        let hash1 = JobsWithGptScraper::compute_hash(&company1, &title, None, &url);
        let hash2 = JobsWithGptScraper::compute_hash(&company2, &title, None, &url);

        prop_assert_ne!(hash1, hash2);
    }

    /// Property: Query limit is always respected
    #[test]
    fn prop_query_limit_bounds(
        limit in 1usize..1000usize,
    ) {
        let query = JobQuery {
            titles: vec!["Care Coordinator".to_string()],
            location: None,
            remote_only: false,
            limit,
        };

        prop_assert_eq!(query.limit, limit);
        prop_assert!(query.limit > 0);
        prop_assert!(query.limit < 1000);
    }

    /// Property: JobQuery preserves title list
    #[test]
    fn prop_query_preserves_titles(
        titles in proptest::collection::vec("[a-zA-Z ]{3,30}", 1..10),
        remote_only in proptest::bool::ANY,
        limit in 1usize..500usize,
    ) {
        let query = JobQuery {
            titles: titles.clone(),
            location: None,
            remote_only,
            limit,
        };

        prop_assert_eq!(query.titles, titles);
        prop_assert_eq!(query.remote_only, remote_only);
    }

    /// Property: Hash handles all Unicode safely
    #[test]
    fn prop_hash_unicode_safe(
        company in "[\\PC🦀™®]{1,50}",
        title in "[\\PC🚀💼]{1,100}",
        url in "\\PC{10,200}",
    ) {
        let hash = JobsWithGptScraper::compute_hash(&company, &title, None, &url);

        prop_assert_eq!(hash.len(), 64);
        prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }
}

// Additional tests for uncovered paths

#[tokio::test]
async fn test_scrape_calls_query_mcp() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec!["Care Coordinator".to_string()],
            location: Some("Remote".to_string()),
            remote_only: true,
            limit: 10,
        },
    );

    // scrape() calls query_mcp() which we can't test without mocking the API
    // but we can verify the scraper is properly initialized
    assert_eq!(scraper.endpoint, "http://localhost:3000/mcp");
    assert_eq!(scraper.query.titles.len(), 1);
    assert_eq!(scraper.query.remote_only, true);
    assert_eq!(scraper.name(), "jobswithgpt");
}

#[tokio::test]
async fn test_query_mcp_rejects_endpoint_credentials_before_request() {
    let scraper = JobsWithGptScraper::new(
        "https://user:pass@api.jobswithgpt.com/mcp".to_string(),
        JobQuery {
            titles: vec!["Care Coordinator".to_string()],
            location: None,
            remote_only: true,
            limit: 10,
        },
    );

    let result = scraper.query_mcp().await;

    assert!(matches!(result, Err(ScraperError::InvalidUrl { .. })));
}

#[test]
fn test_mcp_error_message_does_not_echo_private_query_data() {
    let error = serde_json::json!({
        "code": -32602,
        "message": "No jobs found for Secret Care Coordinator",
        "data": {
            "titles": ["Secret Care Coordinator"],
            "location": "Private City, CO",
            "endpoint": "https://api.jobswithgpt.example/mcp?token=private"
        }
    });

    let message = JobsWithGptScraper::mcp_error_message(&error);

    assert_eq!(
        message,
        "MCP error response (code: -32602, has_message: true, data_type: object)"
    );
    assert!(!message.contains("Secret Care Coordinator"));
    assert!(!message.contains("Private City"));
    assert!(!message.contains("token=private"));
}

#[test]
fn test_parse_mcp_job_with_remote_false() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Onsite Program Coordinator",
        "company": "FreshMart",
        "url": "https://example.com/job/123",
        "remote": false
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();
    assert_eq!(job.remote, Some(false));
}

#[test]
fn test_parse_mcp_job_with_all_optional_fields() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Inventory Planner",
        "company": "FreshMart",
        "url": "https://example.com/job/456",
        "location": "Chicago, IL",
        "description": "Plan inventory levels across regional stores",
        "remote": true,
        "salary_min": 58000,
        "salary_max": 72000,
        "currency": "USD"
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Inventory Planner");
    assert_eq!(job.company, "FreshMart");
    assert_eq!(job.url, "https://example.com/job/456");
    assert_eq!(job.location, Some("Chicago, IL".to_string()));
    assert_eq!(
        job.description,
        Some("Plan inventory levels across regional stores".to_string())
    );
    assert_eq!(job.remote, Some(true));
    assert_eq!(job.salary_min, Some(58000));
    assert_eq!(job.salary_max, Some(72000));
    assert_eq!(job.currency, Some("USD".to_string()));
    assert_eq!(job.source, "jobswithgpt");
}

#[test]
fn test_parse_mcp_job_missing_title() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "company": "Company",
        "url": "https://example.com/job"
    });

    let result = scraper.parse_mcp_job(&job_data).unwrap();
    assert!(result.is_none(), "Missing title should return None");
}

#[test]
fn test_parse_mcp_job_missing_url() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "company": "Community Services"
    });

    let result = scraper.parse_mcp_job(&job_data).unwrap();
    assert!(result.is_none(), "Missing URL should return None");
}

#[test]
fn test_parse_mcp_job_null_optional_fields() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "company": "Community Services",
        "url": "https://example.com/job",
        "location": null,
        "description": null,
        "remote": null,
        "salary_min": null,
        "salary_max": null,
        "currency": null
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

    assert_eq!(job.location, None);
    assert_eq!(job.description, None);
    assert_eq!(job.remote, None);
    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, None);
    assert_eq!(job.currency, None);
}

#[test]
fn test_job_query_empty_titles() {
    let query = JobQuery {
        titles: vec![],
        location: Some("Remote".to_string()),
        remote_only: false,
        limit: 100,
    };

    assert_eq!(query.titles.len(), 0);
    assert!(query.titles.is_empty());
}

#[test]
fn test_job_query_clone() {
    let query = JobQuery {
        titles: vec!["Care Coordinator".to_string()],
        location: Some("Remote".to_string()),
        remote_only: true,
        limit: 50,
    };

    let cloned = query.clone();

    assert_eq!(query.titles, cloned.titles);
    assert_eq!(query.location, cloned.location);
    assert_eq!(query.remote_only, cloned.remote_only);
    assert_eq!(query.limit, cloned.limit);
}

#[test]
fn test_job_query_debug_format() {
    let query = JobQuery {
        titles: vec!["Care Coordinator".to_string()],
        location: Some("Denver".to_string()),
        remote_only: true,
        limit: 25,
    };

    let debug_str = format!("{:?}", query);
    assert!(debug_str.contains("title_count: 1"));
    assert!(debug_str.contains("has_location: true"));
    assert!(debug_str.contains("remote_only: true"));
    assert!(debug_str.contains("limit: 25"));
    assert!(!debug_str.contains("Care Coordinator"));
    assert!(!debug_str.contains("Denver"));
}

#[test]
fn test_scraper_debug_format_does_not_echo_endpoint_or_query_values() {
    let scraper = JobsWithGptScraper::new(
        "https://api.jobswithgpt.example/mcp?token=private".to_string(),
        JobQuery {
            titles: vec!["Secret Care Coordinator".to_string()],
            location: Some("Private City".to_string()),
            remote_only: true,
            limit: 25,
        },
    );

    let debug_str = format!("{:?}", scraper);
    assert!(debug_str.contains("endpoint_configured: true"));
    assert!(debug_str.contains("title_count: 1"));
    assert!(!debug_str.contains("token=private"));
    assert!(!debug_str.contains("Secret Care Coordinator"));
    assert!(!debug_str.contains("Private City"));
}

#[test]
fn test_parse_mcp_job_job_struct_defaults() {
    let scraper = JobsWithGptScraper::new(
        "http://localhost:3000/mcp".to_string(),
        JobQuery {
            titles: vec![],
            location: None,
            remote_only: false,
            limit: 10,
        },
    );

    let job_data = serde_json::json!({
        "title": "Program Coordinator",
        "company": "Community Services",
        "url": "https://example.com/job"
    });

    let job = scraper.parse_mcp_job(&job_data).unwrap().unwrap();

    assert_eq!(job.id, 0);
    assert_eq!(job.times_seen, 1);
    assert!(!job.immediate_alert_sent);
    assert!(!job.hidden);
    assert!(!job.bookmarked);
    assert!(job.notes.is_none());
    assert!(!job.included_in_digest);
    assert_eq!(job.score, None);
    assert_eq!(job.score_reasons, None);
}

#[test]
fn test_compute_hash_with_all_fields() {
    let hash1 = JobsWithGptScraper::compute_hash(
        "Community Care Network",
        "Care Coordinator",
        Some("Remote - US"),
        "https://jobs.example.org/care-coordinator-123",
    );

    let hash2 = JobsWithGptScraper::compute_hash(
        "Community Care Network",
        "Care Coordinator",
        Some("Remote - US"),
        "https://jobs.example.org/care-coordinator-123",
    );

    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_multiple_titles_in_query() {
    let query = JobQuery {
        titles: vec![
            "Care Coordinator".to_string(),
            "Inventory Planner".to_string(),
            "Customer Support Manager".to_string(),
        ],
        location: None,
        remote_only: false,
        limit: 50,
    };

    assert_eq!(query.titles.len(), 3);
    assert!(query.titles.contains(&"Care Coordinator".to_string()));
    assert!(query.titles.contains(&"Inventory Planner".to_string()));
    assert!(query
        .titles
        .contains(&"Customer Support Manager".to_string()));
}
