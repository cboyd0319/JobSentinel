use super::*;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[test]
fn test_scraper_name() {
    let scraper = SimplyHiredScraper::new("care coordinator".to_string(), None, 10);
    assert_eq!(scraper.name(), "simplyhired");
}

#[test]
fn test_decode_html_entities() {
    assert_eq!(
        SimplyHiredScraper::decode_html_entities("Care &amp; Support"),
        "Care & Support"
    );
    assert_eq!(
        SimplyHiredScraper::decode_html_entities("Test &lt;tag&gt;"),
        "Test <tag>"
    );
}

#[test]
fn test_strip_html_tags() {
    assert_eq!(
        SimplyHiredScraper::strip_html_tags("<p>Hello <b>World</b></p>"),
        "Hello World"
    );
    assert_eq!(
        SimplyHiredScraper::strip_html_tags("No tags here"),
        "No tags here"
    );
}

#[test]
fn test_extract_company_from_title() {
    let scraper = SimplyHiredScraper::new("test".to_string(), None, 10);

    let company = scraper.extract_company("Care Coordinator - Acme Health", None);
    assert_eq!(company, Some("Acme Health".to_string()));

    let company = scraper.extract_company("Inventory Manager at FreshMart", None);
    assert_eq!(company, Some("FreshMart".to_string()));
}

#[test]
fn test_is_remote_job() {
    let scraper = SimplyHiredScraper::new("remote care coordinator".to_string(), None, 10);
    assert_eq!(
        scraper.is_remote_job("remote care coordinator", None),
        Some(true)
    );

    let scraper = SimplyHiredScraper::new("care coordinator".to_string(), None, 10);
    assert_eq!(
        scraper.is_remote_job("care coordinator", Some("Remote")),
        Some(true)
    );
    assert_eq!(
        scraper.is_remote_job("care coordinator", Some("San Francisco")),
        None
    );
}

#[test]
fn test_compute_hash_deterministic() {
    let hash1 = SimplyHiredScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("NYC"),
        "https://simplyhired.com/job/123",
    );
    let hash2 = SimplyHiredScraper::compute_hash(
        "Company",
        "Care Coordinator",
        Some("NYC"),
        "https://simplyhired.com/job/123",
    );
    assert_eq!(hash1, hash2);
    assert_eq!(hash1.len(), 64);
}

#[test]
fn test_extract_tag() {
    let xml = "<title>Care Coordinator</title><link>https://example.com</link>";
    assert_eq!(
        SimplyHiredScraper::extract_tag(xml, "title"),
        Some("Care Coordinator".to_string())
    );
    assert_eq!(
        SimplyHiredScraper::extract_tag(xml, "link"),
        Some("https://example.com".to_string())
    );
    assert_eq!(SimplyHiredScraper::extract_tag(xml, "missing"), None);
}

#[test]
fn test_parse_rss_accepts_item_attributes_and_namespaced_location() {
    let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
    let rss = r#"
        <rss>
          <channel>
            <item rdf:about="https://www.simplyhired.com/job/789">
              <title>Care Coordinator - Acme Health</title>
              <link>https://www.simplyhired.com/job/789</link>
              <description>&lt;p&gt;Company: Acme Health&lt;/p&gt;</description>
              <georss:point>39.7392 -104.9903</georss:point>
            </item>
          </channel>
        </rss>
    "#;

    let jobs = scraper
        .parse_rss(rss)
        .expect("rss should parse item attributes and namespaced fields");

    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].title, "Care Coordinator - Acme Health");
    assert_eq!(jobs[0].company, "Acme Health");
    assert_eq!(jobs[0].location, Some("39.7392 -104.9903".to_string()));
}

#[tokio::test]
async fn fetch_jobs_reports_cloudflare_status_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/rss"))
        .respond_with(ResponseTemplate::new(403).set_body_string("forbidden"))
        .mount(&server)
        .await;

    let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
        .await
        .expect_err("blocked status should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}

#[tokio::test]
async fn fetch_jobs_reports_cloudflare_challenge_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/rss"))
        .respond_with(
            ResponseTemplate::new(200).set_body_string("<html>Checking your browser</html>"),
        )
        .mount(&server)
        .await;

    let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
        .await
        .expect_err("challenge page should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}

#[tokio::test]
async fn fetch_jobs_reports_access_denied_html_as_bot_protection() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/rss"))
        .respond_with(ResponseTemplate::new(200).set_body_string(
            "<html><body>Access to this page has been denied because we believe you are using automation tools.</body></html>",
        ))
        .mount(&server)
        .await;

    let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
    let error = scraper
        .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
        .await
        .expect_err("access denied page should be source-health error");

    assert!(matches!(error, ScraperError::BotProtection { .. }));
}
