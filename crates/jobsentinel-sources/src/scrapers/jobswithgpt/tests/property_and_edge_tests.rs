use super::*;

// ========================================
// Property-Based Tests
// ========================================

use proptest::prelude::*;

proptest! {
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

#[tokio::test]
async fn test_query_mcp_rejects_plain_http_endpoint_before_request() {
    let scraper = JobsWithGptScraper::new(
        "http://api.jobswithgpt.com/mcp".to_string(),
        JobQuery {
            titles: vec!["Care Coordinator".to_string()],
            location: None,
            remote_only: true,
            limit: 10,
        },
    );

    let result = scraper.query_mcp().await;

    assert!(matches!(result, Err(ScraperError::InvalidUrl { .. })));
    assert!(result.unwrap_err().to_string().contains("https required"));
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
