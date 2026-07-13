use super::super::*;

#[test]
fn test_job_matches_tags_in_title() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 10);

    let matching_job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Rust Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string()];
    assert!(scraper.job_matches_tags(&matching_job, &tags));
}

#[test]
fn test_job_matches_tags_in_description() {
    let scraper = RemoteOkScraper::new(vec!["python".to_string()], 10);

    let matching_job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Backend Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("Build APIs with Python and Django".to_string()),
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["python".to_string()];
    assert!(scraper.job_matches_tags(&matching_job, &tags));
}

#[test]
fn test_job_matches_tags_case_insensitive() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 10);

    let matching_job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "RUST Engineer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string()];
    assert!(scraper.job_matches_tags(&matching_job, &tags));
}

#[test]
fn test_job_matches_tags_no_match() {
    let scraper = RemoteOkScraper::new(vec!["java".to_string()], 10);

    let non_matching_job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Rust Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("Work with Rust and WebAssembly".to_string()),
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["java".to_string()];
    assert!(!scraper.job_matches_tags(&non_matching_job, &tags));
}

#[test]
fn test_job_matches_multiple_tags() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string(), "golang".to_string()], 10);

    let matching_job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Backend Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("Experience with Rust or Golang required".to_string()),
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string(), "golang".to_string()];
    assert!(scraper.job_matches_tags(&matching_job, &tags));
}

#[test]
fn test_job_matches_tags_with_none_description() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string()], 10);

    let job_with_no_description = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Java Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: None, // No description
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string()];
    // Should not match because "rust" is not in title and description is None
    assert!(!scraper.job_matches_tags(&job_with_no_description, &tags));
}

#[test]
fn test_job_matches_tags_empty_description() {
    let scraper = RemoteOkScraper::new(vec!["backend".to_string()], 10);

    let job_with_empty_description = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Frontend Developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("".to_string()), // Empty description
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["backend".to_string()];
    // Should not match because "backend" is not in title or empty description
    assert!(!scraper.job_matches_tags(&job_with_empty_description, &tags));
}

#[test]
fn test_job_matches_tags_multiple_tags_match_one() {
    let scraper = RemoteOkScraper::new(vec!["rust".to_string(), "java".to_string()], 10);

    let job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Rust Systems Engineer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("Build low-level systems".to_string()),
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string(), "java".to_string()];
    // Should match because "rust" is in title (OR logic)
    assert!(scraper.job_matches_tags(&job, &tags));
}

#[test]
fn test_job_matches_tags_with_multiple_tags_any_match() {
    let scraper = RemoteOkScraper::new(
        vec!["rust".to_string(), "python".to_string(), "go".to_string()],
        10,
    );

    let job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "Backend Engineer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: Some("We use Go for our microservices".to_string()),
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    let tags = vec!["rust".to_string(), "python".to_string(), "go".to_string()];
    // Should match because "go" is in description (any match)
    assert!(scraper.job_matches_tags(&job, &tags));
}

#[test]
fn test_tags_lowercase_conversion() {
    let scraper = RemoteOkScraper::new(vec!["Rust".to_string(), "PYTHON".to_string()], 10);

    let job = Job {
        id: 0,
        hash: "test".to_string(),
        title: "RUST developer".to_string(),
        company: "Test".to_string(),
        url: "https://example.com".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "remoteok".to_string(),
        remote: Some(true),
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
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
    };

    // Tags are converted to lowercase in fetch_jobs
    let tags_lower: Vec<String> = scraper.tags.iter().map(|t| t.to_lowercase()).collect();
    assert!(scraper.job_matches_tags(&job, &tags_lower));
}
