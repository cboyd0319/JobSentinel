use super::*;

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
