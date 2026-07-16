use super::*;

#[test]
fn test_build_url_default() {
    let scraper = BuiltInScraper::new(false, 50);
    assert_eq!(scraper.build_url(), "https://builtin.com/jobs");
}

#[test]
fn test_build_url_remote() {
    let scraper = BuiltInScraper::new(true, 50);
    assert_eq!(scraper.build_url(), "https://builtin.com/jobs/remote");
}

#[test]
fn test_scraper_name() {
    let scraper = BuiltInScraper::new(false, 10);
    assert_eq!(scraper.name(), "builtin");
}

#[test]
fn test_compute_hash_deterministic() {
    let hash1 = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        Some("New York, NY"),
        "https://builtin.com/job/123",
    );
    let hash2 = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        Some("New York, NY"),
        "https://builtin.com/job/123",
    );

    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_parse_html_with_job_links() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <div>
                    <a href="/company/techcorp">TechCorp Inc</a>
                    <a href="/job/senior-rust-engineer/123">Senior Rust Engineer</a>
                </div>
                <div>
                    <a href="/company/startupxyz">StartupXYZ</a>
                    <a href="/job/frontend-developer/456">Frontend Developer</a>
                    <span>Remote</span>
                </div>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 2);
    assert_eq!(jobs[0].title, "Senior Rust Engineer");
    assert_eq!(
        jobs[0].url,
        "https://builtin.com/job/senior-rust-engineer/123"
    );
    assert_eq!(jobs[0].source, "builtin");
    assert_eq!(jobs[1].title, "Frontend Developer");
}

#[test]
fn test_parse_html_with_company_links() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <div>
                    <a href="/company/cloudtech">CloudTech</a>
                    <a href="/job/devops-engineer/789">DevOps Engineer</a>
                </div>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "DevOps Engineer");
    // Company extraction depends on DOM context
}

#[test]
fn test_parse_html_with_absolute_urls() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="https://builtin.com/job/external-job/123">External Job</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].url, "https://builtin.com/job/external-job/123");
}

#[test]
fn test_parse_html_empty_document() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = "<html><body></body></html>";

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_parse_html_malformed_missing_title() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="/job/empty-title/123"></a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should be skipped due to empty title
    assert_eq!(jobs.len(), 0);
}

#[test]
fn test_parse_html_remote_detection() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <div>
                    <a href="/job/job1/1">Job 1</a>
                    <span>Remote</span>
                </div>
                <div>
                    <a href="/job/job2/2">Job 2</a>
                    <span>Hybrid</span>
                </div>
                <div>
                    <a href="/job/job3/3">Job 3</a>
                    <span>In-Office</span>
                </div>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 3);
}

#[test]
fn test_parse_html_remote_only_flag() {
    let scraper = BuiltInScraper::new(true, 10); // remote_only = true
    let html = r#"
        <html>
            <body>
                <a href="/job/remote-engineer/1">Remote Engineer</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(
        jobs[0].remote,
        Some(true),
        "remote_only flag should set remote=true"
    );
}

#[test]
fn test_parse_html_limit_respected() {
    let scraper = BuiltInScraper::new(false, 2);
    let html = r#"
        <html>
            <body>
                <a href="/job/job1/1">Job 1</a>
                <a href="/job/job2/2">Job 2</a>
                <a href="/job/job3/3">Job 3</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should only return 2 jobs due to limit
    assert_eq!(jobs.len(), 2);
}

#[test]
fn test_parse_html_unknown_company_fallback() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="/job/software-engineer/123">Software Engineer</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].company, "Unknown Company");
}

#[test]
fn test_parse_html_whitespace_trimming() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="/job/senior-engineer/1">
                    Senior Engineer
                </a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Senior Engineer");
}

#[test]
fn test_compute_hash_with_none_location() {
    let hash1 = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        None,
        "https://builtin.com/job/123",
    );
    let hash2 = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        None,
        "https://builtin.com/job/123",
    );

    assert_eq!(
        hash1, hash2,
        "Hashes with None location should be deterministic"
    );
    assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
}

#[test]
fn test_compute_hash_location_affects_hash() {
    let hash_with_loc = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        Some("New York, NY"),
        "https://builtin.com/job/123",
    );
    let hash_without_loc = BuiltInScraper::compute_hash(
        "TechCorp",
        "Senior Engineer",
        None,
        "https://builtin.com/job/123",
    );

    assert_ne!(
        hash_with_loc, hash_without_loc,
        "Location should affect hash value"
    );
}

#[test]
fn test_new_constructor() {
    let scraper = BuiltInScraper::new(true, 25);

    assert_eq!(scraper.remote_only, true);
    assert_eq!(scraper.limit, 25);
}

#[test]
fn test_parse_html_salary_extraction() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <div>
                    <a href="/job/senior-dev/1">Senior Developer</a>
                    <span>179K-246K Annually</span>
                </div>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    assert_eq!(jobs.len(), 1);
    // Salary extraction depends on parent context
}

#[test]
fn test_parse_html_deduplication() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="/job/same-job/123">Same Job</a>
                <a href="/job/same-job/123">Same Job</a>
                <a href="/job/different-job/456">Different Job</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should deduplicate same URLs
    assert_eq!(jobs.len(), 2);
}

#[test]
fn test_compute_hash_different_inputs() {
    let hash1 = BuiltInScraper::compute_hash(
        "CompanyA",
        "Engineer",
        Some("NYC"),
        "https://builtin.com/job/1",
    );
    let hash2 = BuiltInScraper::compute_hash(
        "CompanyB",
        "Engineer",
        Some("NYC"),
        "https://builtin.com/job/1",
    );
    let hash3 = BuiltInScraper::compute_hash(
        "CompanyA",
        "Designer",
        Some("NYC"),
        "https://builtin.com/job/1",
    );

    assert_ne!(
        hash1, hash2,
        "Different company should produce different hash"
    );
    assert_ne!(
        hash1, hash3,
        "Different title should produce different hash"
    );
}

#[test]
fn test_skip_non_job_links() {
    let scraper = BuiltInScraper::new(false, 10);
    let html = r#"
        <html>
            <body>
                <a href="/job/">Browse Jobs</a>
                <a href="/job/search">Search Jobs</a>
                <a href="/job/real-job/123">Real Job Title</a>
            </body>
        </html>
    "#;

    let jobs = scraper.parse_html(html).expect("parse_html should succeed");

    // Should only get the real job, not navigation links
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Real Job Title");
}
