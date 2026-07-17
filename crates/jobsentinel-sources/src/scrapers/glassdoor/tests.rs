use super::*;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[test]
fn test_scraper_name() {
    let scraper = GlassdoorScraper::new("care coordinator".to_string(), None, 10);
    assert_eq!(scraper.name(), "glassdoor");
}

#[test]
fn test_is_remote() {
    let scraper = GlassdoorScraper::new("test".to_string(), None, 10);

    assert_eq!(scraper.is_remote(Some("Remote")), Some(true));
    assert_eq!(scraper.is_remote(Some("Work From Home")), Some(true));
    assert_eq!(scraper.is_remote(Some("San Francisco, CA")), Some(false));
    assert_eq!(scraper.is_remote(None), None);
}

#[test]
fn test_strip_html() {
    assert_eq!(
        GlassdoorScraper::strip_html("<p>Hello <b>World</b></p>"),
        "Hello World"
    );
    assert_eq!(
        GlassdoorScraper::strip_html("No   tags   here"),
        "No tags here"
    );
}

#[test]
fn test_compute_hash_deterministic() {
    let hash1 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Program Coordinator",
        Some("NYC"),
        "https://glassdoor.com/job/123",
    );
    let hash2 = jobsentinel_domain::calculate_job_hash(
        "Company",
        "Program Coordinator",
        Some("NYC"),
        "https://glassdoor.com/job/123",
    );
    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_extract_salary_schema_org() {
    let scraper = GlassdoorScraper::new("test".to_string(), None, 10);

    let data = serde_json::json!({
        "baseSalary": {
            "value": {
                "minValue": 100000.0,
                "maxValue": 150000.0
            }
        }
    });

    let (min, max) = scraper.extract_salary(&data);
    assert_eq!(min, Some(100000));
    assert_eq!(max, Some(150000));
}

#[test]
fn test_extract_salary_glassdoor_format() {
    let scraper = GlassdoorScraper::new("test".to_string(), None, 10);

    let data = serde_json::json!({
        "salaryRange": {
            "min": 80000.0,
            "max": 120000.0
        }
    });

    let (min, max) = scraper.extract_salary(&data);
    assert_eq!(min, Some(80000));
    assert_eq!(max, Some(120000));
}

#[test]
fn test_json_ld_to_job() {
    let scraper = GlassdoorScraper::new("test".to_string(), None, 10);

    let data = serde_json::json!({
        "@type": "JobPosting",
        "title": "Customer Support Manager",
        "url": "https://glassdoor.com/job/123",
        "hiringOrganization": {
            "name": "FreshMart"
        },
        "jobLocation": {
            "address": {
                "addressLocality": "San Francisco"
            }
        },
        "description": "Support customer care operations"
    });

    let job = scraper.json_ld_to_job(&data).unwrap();

    assert_eq!(job.title, "Customer Support Manager");
    assert_eq!(job.company, "FreshMart");
    assert_eq!(job.location, Some("San Francisco".to_string()));
    assert_eq!(job.source, "glassdoor");
}

#[test]
fn test_extract_json_ld_accepts_script_attributes() {
    let scraper = GlassdoorScraper::new("test".to_string(), None, 10);
    let html = r#"
            <html>
              <body>
                <script id="job-data" type="application/ld+json" data-source="schema">
                  {
                    "@type": "JobPosting",
                    "title": "Program Coordinator",
                    "url": "https://glassdoor.com/job/456",
                    "hiringOrganization": { "name": "City Health" },
                    "jobLocation": { "address": { "addressLocality": "Denver" } },
                    "description": "Coordinate public programs"
                  }
                </script>
              </body>
            </html>
        "#;

    let jobs = scraper
        .extract_json_ld(html)
        .expect("json-ld extraction should parse script attributes")
        .expect("json-ld jobs should be found");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Program Coordinator");
    assert_eq!(jobs[0].company, "City Health");
}

#[tokio::test]
async fn fetch_jobs_reports_cloudflare_status_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/jobs"))
        .respond_with(ResponseTemplate::new(503).set_body_string("service unavailable"))
        .mount(&server)
        .await;

    let scraper = GlassdoorScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/jobs", server.uri()))
        .await
        .expect_err("blocked status should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}

#[tokio::test]
async fn fetch_jobs_reports_cloudflare_challenge_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/jobs"))
        .respond_with(ResponseTemplate::new(200).set_body_string("<html>cf_chl_opt</html>"))
        .mount(&server)
        .await;

    let scraper = GlassdoorScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/jobs", server.uri()))
        .await
        .expect_err("challenge page should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}

#[tokio::test]
async fn fetch_jobs_reports_access_denied_html_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
            .and(path("/jobs"))
            .respond_with(ResponseTemplate::new(200).set_body_string(
                "<html><body>Please verify you are a human. Access to this page has been denied.</body></html>",
            ))
            .mount(&server)
            .await;

    let scraper = GlassdoorScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/jobs", server.uri()))
        .await
        .expect_err("access denied page should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}
