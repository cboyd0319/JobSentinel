use super::test_helpers::{build_payload, inertia_html};
use super::*;

#[test]
fn test_parse_inertia_limit_respected() {
    let scraper = YcStartupScraper::new(None, false, 2);
    let payload = build_payload(&[(
        "Startup",
        vec![
            ("Job 1", "/companies/s/jobs/1", None),
            ("Job 2", "/companies/s/jobs/2", None),
            ("Job 3", "/companies/s/jobs/3", None),
        ],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 2);
}

#[test]
fn test_parse_inertia_remote_filter() {
    let scraper = YcStartupScraper::new(None, true, 10);
    let payload = build_payload(&[(
        "Startup",
        vec![
            ("Remote Engineer", "/companies/s/jobs/1", Some("Remote")),
            (
                "Onsite Engineer",
                "/companies/s/jobs/2",
                Some("San Francisco"),
            ),
        ],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].remote, Some(true));
}

#[test]
fn test_parse_inertia_query_filter_title() {
    let scraper = YcStartupScraper::new(Some("rust".to_string()), false, 10);
    let payload = build_payload(&[(
        "Startup",
        vec![
            ("Rust Engineer", "/companies/s/jobs/1", None),
            ("Python Developer", "/companies/s/jobs/2", None),
        ],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert!(jobs[0].title.to_lowercase().contains("rust"));
}

#[test]
fn test_parse_inertia_query_filter_company() {
    let scraper = YcStartupScraper::new(Some("ai".to_string()), false, 10);
    let payload = build_payload(&[
        (
            "AI Innovations Inc",
            vec![("Software Engineer", "/companies/ai/jobs/1", None)],
        ),
        (
            "WebCorp",
            vec![("Backend Developer", "/companies/web/jobs/2", None)],
        ),
    ]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert!(jobs[0].company.to_lowercase().contains("ai"));
}

#[test]
fn test_parse_inertia_query_filter_case_insensitive() {
    let scraper = YcStartupScraper::new(Some("ENGINEER".to_string()), false, 10);
    let payload = build_payload(&[(
        "Startup",
        vec![("software engineer", "/companies/s/jobs/1", None)],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
}

#[test]
fn test_parse_inertia_combined_filters() {
    let scraper = YcStartupScraper::new(Some("backend".to_string()), true, 10);
    let payload = build_payload(&[(
        "Startup",
        vec![
            (
                "Remote Backend Engineer",
                "/companies/s/jobs/1",
                Some("Remote"),
            ),
            (
                "Backend Engineer",
                "/companies/s/jobs/2",
                Some("San Francisco"),
            ),
            (
                "Remote Frontend Engineer",
                "/companies/s/jobs/3",
                Some("Remote"),
            ),
        ],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert!(jobs[0].title.to_lowercase().contains("backend"));
    assert_eq!(jobs[0].remote, Some(true));
}

#[test]
fn test_parse_inertia_multiple_companies() {
    let scraper = YcStartupScraper::new(None, false, 10);
    let payload = build_payload(&[
        (
            "Company A",
            vec![("Engineer A1", "/companies/a/jobs/1", None)],
        ),
        (
            "Company B",
            vec![("Engineer B1", "/companies/b/jobs/1", None)],
        ),
    ]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 2);
    assert_eq!(jobs[0].company, "Company A");
    assert_eq!(jobs[1].company, "Company B");
}

#[test]
fn test_parse_inertia_salary_range_parsed() {
    let scraper = YcStartupScraper::new(None, false, 10);
    let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{"name":"Startup"},"jobPostings":[{"title":"Senior Engineer","url":"/companies/startup/jobs/1","location":null,"type":"Full Time","role":"eng","salaryRange":"$120K - $180K"}]}]},"url":"/jobs","version":"1"}"#;
    let html = inertia_html(payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].salary_min, Some(120_000));
    assert_eq!(jobs[0].salary_max, Some(180_000));
}

#[test]
fn test_parse_inertia_null_salary_range() {
    let scraper = YcStartupScraper::new(None, false, 10);
    let payload = build_payload(&[("Startup", vec![("Engineer", "/companies/s/jobs/1", None)])]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].salary_min, None);
    assert_eq!(jobs[0].salary_max, None);
}

#[test]
fn test_parse_inertia_url_prefixed_with_base() {
    let scraper = YcStartupScraper::new(None, false, 10);
    let payload = build_payload(&[(
        "Startup",
        vec![("Engineer", "/companies/mystartup/jobs/555", None)],
    )]);
    let html = inertia_html(&payload);
    let jobs = scraper
        .parse_inertia_page(&html)
        .expect("valid YC Inertia payload");
    assert_eq!(jobs.len(), 1);
    assert_eq!(
        jobs[0].url,
        "https://www.ycombinator.com/companies/mystartup/jobs/555"
    );
}

#[test]
fn test_extract_inertia_payload_present() {
    let payload = r#"{"props":{"companiesWithJobs":[]}}"#;
    let html = inertia_html(payload);
    let extracted = YcStartupScraper::extract_inertia_payload(&html);
    assert!(extracted.is_some());
    let parsed: serde_json::Value = serde_json::from_str(&extracted.unwrap()).unwrap();
    assert!(parsed.get("props").is_some());
}

#[test]
fn test_extract_inertia_payload_absent() {
    let html = "<html><body><div id=\"app\"></div></body></html>";
    let extracted = YcStartupScraper::extract_inertia_payload(html);
    assert!(extracted.is_none());
}
