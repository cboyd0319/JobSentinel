use super::super::*;

#[test]
fn test_parse_job_complete() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Senior Rust Developer",
        "company": "RemoteTech",
        "url": "/job/123",
        "location": "Worldwide",
        "description": "Build distributed systems",
        "salary_min": 120000,
        "salary_max": 180000
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Senior Rust Developer");
    assert_eq!(job.company, "RemoteTech");
    assert_eq!(job.url, "https://remoteok.com/job/123");
    assert_eq!(job.location, Some("Worldwide".to_string()));
    assert_eq!(job.remote, Some(true));
    assert_eq!(job.source, "remoteok");
    assert_eq!(job.salary_min, Some(120000));
    assert_eq!(job.salary_max, Some(180000));
    assert_eq!(job.currency, Some("USD".to_string()));
    assert_eq!(
        job.description,
        Some("Build distributed systems".to_string())
    );
}

#[test]
fn test_parse_job_with_absolute_url() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Frontend Developer",
        "company": "WebCorp",
        "url": "https://example.com/apply",
        "location": "Europe"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.url, "https://example.com/apply");
    assert_eq!(job.title, "Frontend Developer");
}

#[test]
fn test_parse_job_minimal_fields() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Backend Engineer",
        "url": "/job/456"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Backend Engineer");
    assert_eq!(job.company, "Unknown");
    assert_eq!(job.url, "https://remoteok.com/job/456");
    assert_eq!(job.location, None);
    assert_eq!(job.description, None);
    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, None);
}

#[test]
fn test_parse_job_missing_position_returns_none() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "company": "Company",
        "url": "/job/123"
    });

    let result = scraper.parse_job(&job_data).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_parse_job_empty_position_returns_none() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "",
        "company": "Company",
        "url": "/job/123"
    });

    let result = scraper.parse_job(&job_data).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_parse_job_missing_url_returns_none() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Software Engineer",
        "company": "TechCorp"
    });

    let result = scraper.parse_job(&job_data).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_parse_job_empty_url_becomes_base_url() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Developer",
        "company": "Company",
        "url": ""
    });

    let result = scraper.parse_job(&job_data).unwrap();
    // Empty string URL becomes "https://remoteok.com" after formatting
    // This is current behavior - empty string is not None from as_str()
    assert!(result.is_some());
    let job = result.unwrap();
    assert_eq!(job.url, "https://remoteok.com");
}

#[test]
fn test_parse_job_with_salary_min_only() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "DevOps Engineer",
        "company": "CloudCorp",
        "url": "/job/789",
        "salary_min": 100000
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.salary_min, Some(100000));
    assert_eq!(job.salary_max, None);
}

#[test]
fn test_parse_job_with_salary_max_only() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "ML Engineer",
        "company": "AIStartup",
        "url": "/job/999",
        "salary_max": 200000
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, Some(200000));
}

#[test]
fn test_parse_job_malformed_null_values() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Engineer",
        "company": null,
        "url": "/job/1",
        "location": null,
        "description": null
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    assert_eq!(job.title, "Engineer");
    assert_eq!(job.company, "Unknown");
    assert_eq!(job.location, None);
    assert_eq!(job.description, None);
}

#[test]
fn test_parse_job_empty_object() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({});

    let result = scraper.parse_job(&job_data).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_parse_job_non_string_values() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": 12345,
        "company": "Company",
        "url": "/job/1"
    });

    let result = scraper.parse_job(&job_data).unwrap();
    // position is not a string, should return None
    assert!(result.is_none());
}

#[test]
fn test_parse_job_url_with_slash_prefix() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "DevOps Engineer",
        "company": "CloudTech",
        "url": "/remote-job/devops-123"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // URL without http prefix should get remoteok.com prepended
    assert_eq!(job.url, "https://remoteok.com/remote-job/devops-123");
}

#[test]
fn test_parse_job_url_with_https_prefix() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Security Engineer",
        "company": "SecureCorp",
        "url": "https://careers.example.com/job/sec-456"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // Absolute HTTPS URL should remain unchanged
    assert_eq!(job.url, "https://careers.example.com/job/sec-456");
}

#[test]
fn test_parse_job_url_with_http_prefix() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Data Engineer",
        "company": "DataCorp",
        "url": "http://jobs.example.com/data-engineer"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // Absolute HTTP URL should remain unchanged
    assert_eq!(job.url, "http://jobs.example.com/data-engineer");
}

#[test]
fn test_parse_job_with_numeric_salary_as_string() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    // Some APIs might return salary as string instead of number
    let job_data = serde_json::json!({
        "position": "Product Manager",
        "company": "ProductCo",
        "url": "/job/pm-123",
        "salary_min": "150000",
        "salary_max": "200000"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // String salaries should be treated as None
    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, None);
}

#[test]
fn test_job_fields_default_values() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Full Stack Developer",
        "company": "WebStartup",
        "url": "/job/fullstack-789"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // Verify default/computed fields
    assert_eq!(job.id, 0);
    assert_eq!(job.source, "remoteok");
    assert_eq!(job.remote, Some(true));
    assert_eq!(job.currency, Some("USD".to_string()));
    assert_eq!(job.times_seen, 1);
    assert_eq!(job.immediate_alert_sent, false);
    assert_eq!(job.hidden, false);
    assert_eq!(job.bookmarked, false);
    assert_eq!(job.notes, None);
    assert_eq!(job.included_in_digest, false);
    assert_eq!(job.score, None);
    assert_eq!(job.score_reasons, None);
    assert!(!job.hash.is_empty());
}

#[test]
fn test_parse_job_preserves_whitespace_in_fields() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "  Senior Software Engineer  ",
        "company": "  TechCorp Inc.  ",
        "url": "/job/123",
        "location": "  Worldwide  ",
        "description": "  Great opportunity  "
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();

    // Current implementation preserves whitespace
    assert_eq!(job.title, "  Senior Software Engineer  ");
    assert_eq!(job.company, "  TechCorp Inc.  ");
    assert_eq!(job.location, Some("  Worldwide  ".to_string()));
    assert_eq!(job.description, Some("  Great opportunity  ".to_string()));
}

#[test]
fn test_parse_job_filters_by_empty_position_field() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "",
        "company": "Company",
        "url": "/job/123"
    });

    let result = scraper.parse_job(&job_data).unwrap();
    assert!(result.is_none(), "Empty position should be filtered");
}

#[test]
fn test_parse_job_with_null_salary_fields() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Engineer",
        "company": "Company",
        "url": "/job/123",
        "salary_min": null,
        "salary_max": null
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();
    assert_eq!(job.salary_min, None);
    assert_eq!(job.salary_max, None);
}

#[test]
fn test_url_formatting_edge_cases() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    // Test http URL
    let job_data1 = serde_json::json!({
        "position": "Engineer",
        "url": "http://example.com/job"
    });
    let job1 = scraper.parse_job(&job_data1).unwrap().unwrap();
    assert_eq!(job1.url, "http://example.com/job");

    // Test https URL
    let job_data2 = serde_json::json!({
        "position": "Engineer",
        "url": "https://example.com/job"
    });
    let job2 = scraper.parse_job(&job_data2).unwrap().unwrap();
    assert_eq!(job2.url, "https://example.com/job");

    // Test relative URL
    let job_data3 = serde_json::json!({
        "position": "Engineer",
        "url": "/remote-jobs/123"
    });
    let job3 = scraper.parse_job(&job_data3).unwrap().unwrap();
    assert_eq!(job3.url, "https://remoteok.com/remote-jobs/123");
}

#[test]
fn test_currency_default_usd() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Engineer",
        "company": "Company",
        "url": "/job/123"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();
    assert_eq!(job.currency, Some("USD".to_string()));
}

#[test]
fn test_remote_always_true() {
    let scraper = RemoteOkScraper::new(vec![], 10);

    let job_data = serde_json::json!({
        "position": "Engineer",
        "company": "Company",
        "url": "/job/123"
    });

    let job = scraper.parse_job(&job_data).unwrap().unwrap();
    // All RemoteOK jobs are remote by definition
    assert_eq!(job.remote, Some(true));
}
