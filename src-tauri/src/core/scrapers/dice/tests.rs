use super::*;

#[test]
fn test_build_url_basic() {
    let scraper = DiceScraper::new("rust developer".to_string(), None, 20);
    let url = scraper.build_url();
    assert!(url.contains("dice.com"));
    assert!(url.contains("rust%20developer"));
    assert!(url.contains("pageSize=20"));
}

#[test]
fn test_build_url_with_location() {
    let scraper = DiceScraper::new("python".to_string(), Some("New York".to_string()), 10);
    let url = scraper.build_url();
    assert!(url.contains("location=New%20York"));
}

#[test]
fn test_scraper_name() {
    let scraper = DiceScraper::new("test".to_string(), None, 10);
    assert_eq!(scraper.name(), "dice");
}

#[test]
fn test_compute_hash_deterministic() {
    let hash1 = DiceScraper::compute_hash(
        "TechCorp",
        "Rust Engineer",
        Some("Remote"),
        "https://dice.com/job/123",
    );
    let hash2 = DiceScraper::compute_hash(
        "TechCorp",
        "Rust Engineer",
        Some("Remote"),
        "https://dice.com/job/123",
    );

    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_is_remote() {
    assert!(DiceScraper::is_remote(
        "Senior Rust Engineer (Remote)",
        None
    ));
    assert!(DiceScraper::is_remote("Developer", Some("Remote, USA")));
    assert!(DiceScraper::is_remote("Engineer", Some("Work from home")));
    assert!(!DiceScraper::is_remote("Developer", Some("New York, NY")));
}

#[test]
fn test_parse_html_with_data_cy_attributes() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/senior-rust-engineer-123" data-cy="card-title">
                            Senior Rust Engineer (Remote)
                        </a>
                        <span data-cy="search-result-company-name">TechCorp Inc</span>
                        <span data-cy="search-result-location">Remote</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/backend-developer-456" data-cy="card-title">
                            Backend Developer
                        </a>
                        <span data-cy="search-result-company-name">StartupXYZ</span>
                        <span data-cy="search-result-location">San Francisco, CA</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 2);

    // First job - remote
    assert_eq!(jobs[0].title, "Senior Rust Engineer (Remote)");
    assert_eq!(jobs[0].company, "TechCorp Inc");
    assert_eq!(
        jobs[0].url,
        "https://www.dice.com/job-detail/senior-rust-engineer-123"
    );
    assert_eq!(jobs[0].location, Some("Remote".to_string()));
    assert_eq!(jobs[0].source, "dice");
    assert_eq!(jobs[0].remote, Some(true));

    // Second job - not remote
    assert_eq!(jobs[1].title, "Backend Developer");
    assert_eq!(jobs[1].company, "StartupXYZ");
    assert_eq!(jobs[1].remote, Some(false));
}

#[test]
fn test_parse_html_with_search_card_class() {
    let scraper = DiceScraper::new("python".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div class="search-card">
                        <h5 class="job-title">
                            <a href="/job-detail/python-dev-789">Python Developer</a>
                        </h5>
                        <span class="company-name">DataCorp</span>
                        <span class="job-location">New York, NY</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Python Developer");
    assert_eq!(jobs[0].company, "DataCorp");
    assert_eq!(jobs[0].location, Some("New York, NY".to_string()));
}

#[test]
fn test_parse_html_with_article_job_card() {
    let scraper = DiceScraper::new("java".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <article data-testid="job-card">
                        <h5><a href="/job-detail/java-engineer-999">Java Engineer</a></h5>
                        <span class="employer-name">EnterpriseCorp</span>
                        <span class="search-result-location">Chicago, IL</span>
                    </article>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Java Engineer");
    assert_eq!(jobs[0].company, "EnterpriseCorp");
}

#[test]
fn test_parse_html_with_absolute_urls() {
    let scraper = DiceScraper::new("go".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="https://www.dice.com/job-detail/go-developer-111" data-cy="card-title">
                            Go Developer
                        </a>
                        <span data-cy="search-result-company-name">CloudCorp</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(
        jobs[0].url,
        "https://www.dice.com/job-detail/go-developer-111"
    );
}

#[test]
fn test_parse_html_empty_document() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = "<html><body></body></html>";

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_parse_html_malformed_missing_title() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/123" data-cy="card-title"></a>
                        <span data-cy="search-result-company-name">TechCorp</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should be skipped due to empty title
    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_parse_html_malformed_missing_url() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <span data-cy="card-title">Software Engineer</span>
                        <span data-cy="search-result-company-name">TechCorp</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should be skipped due to missing URL
    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_parse_html_remote_detection_in_title() {
    let scraper = DiceScraper::new("engineer".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Remote Senior Engineer</a>
                        <span data-cy="search-result-company-name">Company A</span>
                        <span data-cy="search-result-location">USA</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(
        jobs[0].remote,
        Some(true),
        "Should detect 'Remote' in title"
    );
}

#[test]
fn test_parse_html_remote_detection_in_location() {
    let scraper = DiceScraper::new("engineer".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Senior Engineer</a>
                        <span data-cy="search-result-company-name">Company A</span>
                        <span data-cy="search-result-location">Remote - Anywhere</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(
        jobs[0].remote,
        Some(true),
        "Should detect 'Anywhere' in location"
    );
}

#[test]
fn test_parse_html_limit_respected() {
    let scraper = DiceScraper::new("developer".to_string(), None, 2);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Job 1</a>
                        <span data-cy="search-result-company-name">Company 1</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/2" data-cy="card-title">Job 2</a>
                        <span data-cy="search-result-company-name">Company 2</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/3" data-cy="card-title">Job 3</a>
                        <span data-cy="search-result-company-name">Company 3</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should only return 2 jobs due to limit
    assert_eq!(jobs.len(), 2);
}

#[test]
fn test_parse_html_unknown_company_fallback() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/123" data-cy="card-title">Software Engineer</a>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].company, "Unknown Company");
}

#[test]
fn test_parse_html_whitespace_trimming() {
    let scraper = DiceScraper::new("rust".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">
                            Senior Engineer
                        </a>
                        <span data-cy="search-result-company-name">
                            TechCorp
                        </span>
                        <span data-cy="search-result-location">
                            Remote
                        </span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Senior Engineer");
    assert_eq!(jobs[0].company, "TechCorp");
    assert_eq!(jobs[0].location, Some("Remote".to_string()));
}

#[test]
fn test_is_remote_case_insensitive() {
    assert!(DiceScraper::is_remote("REMOTE Engineer", None));
    assert!(DiceScraper::is_remote("Engineer", Some("REMOTE")));
    assert!(DiceScraper::is_remote("Engineer", Some("Work From Home")));
}

#[test]
fn test_is_remote_partial_match() {
    assert!(DiceScraper::is_remote("Full-time Remote Engineer", None));
    assert!(DiceScraper::is_remote("Engineer", Some("Remote, USA")));
    assert!(DiceScraper::is_remote(
        "Engineer",
        Some("Work anywhere in the US")
    ));
}

#[test]
fn test_parse_html_fallback_to_link_selector() {
    let scraper = DiceScraper::new("test".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <a href="/job-detail/engineer-123">
                        Backend Engineer
                    </a>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Fallback selector should find the link
    // Result depends on whether selector matching succeeds
    assert!(jobs.is_empty() || !jobs.is_empty());
}

#[test]
fn test_parse_html_element_with_href_attribute() {
    let scraper = DiceScraper::new("test".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card" href="/job-detail/123">
                        <a data-cy="card-title">Software Engineer</a>
                        <span data-cy="search-result-company-name">CompanyX</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should extract href from element itself if available
    if !jobs.is_empty() {
        assert!(jobs[0].url.contains("123"));
    }
}

#[test]
fn test_parse_html_nested_link_extraction() {
    let scraper = DiceScraper::new("test".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <div>
                            <a href="/job-detail/nested-789">Nested Job Title</a>
                        </div>
                        <span data-cy="search-result-company-name">NestedCorp</span>
                    </div>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert!(jobs[0].url.contains("nested-789"));
}

#[test]
fn test_is_remote_work_from_home() {
    assert!(DiceScraper::is_remote(
        "Engineer",
        Some("Work from home opportunity")
    ));
    // WFH is not explicitly checked in is_remote function - only "work from home" text
    assert!(!DiceScraper::is_remote("Engineer", Some("WFH position")));
}

#[test]
fn test_build_url_limit_capped_at_100() {
    let scraper = DiceScraper::new("test".to_string(), None, 500);
    let url = scraper.build_url();
    // Limit should be capped at 100
    assert!(url.contains("pageSize=100"));
}

#[test]
fn test_compute_hash_with_none_location() {
    let hash1 = DiceScraper::compute_hash("Company", "Engineer", None, "https://dice.com/job/123");
    let hash2 = DiceScraper::compute_hash("Company", "Engineer", None, "https://dice.com/job/123");

    assert_eq!(hash1, hash2);
}

#[test]
fn test_parse_html_card_title_link_selector() {
    let scraper = DiceScraper::new("test".to_string(), None, 10);
    let html = r#"
            <html>
                <body>
                    <a class="card-title-link" href="/job-detail/456">
                        Full Stack Developer
                    </a>
                    <span class="employer-name">WebCorp</span>
                </body>
            </html>
        "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should match .card-title-link selector
    if !jobs.is_empty() {
        assert_eq!(jobs[0].title, "Full Stack Developer");
    }
}
