use super::*;
use crate::core::config::{AlertConfig, AutoRefreshConfig, LinkedInConfig, LocationPreferences};
use reqwest::StatusCode;
use url::Url;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn jobswithgpt_smoke_config(endpoint: &str) -> Config {
    let mut config = Config {
        title_allowlist: vec!["Care Coordinator".to_string()],
        title_blocklist: vec![],
        keywords_boost: vec![],
        keywords_exclude: vec![],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 100_000,
        salary_target_usd: None,
        penalize_missing_salary: false,
        bookmarklet_port: 4321,
        immediate_alert_threshold: 0.8,
        scraping_interval_hours: 2,
        alerts: AlertConfig::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: LinkedInConfig::default(),
        restricted_source_acknowledgements: Default::default(),
        auto_refresh: AutoRefreshConfig::default(),
        jobswithgpt_endpoint: endpoint.to_string(),
        jobswithgpt_approval: Default::default(),
        external_ai: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        ghost_config: None,
        preferred_companies: vec![],
        blocked_companies: vec![],
        use_resume_matching: false,
    };
    config.jobswithgpt_approval.enabled = true;
    config.jobswithgpt_approval.payload = config.jobswithgpt_payload_preview();
    config
}

#[tokio::test]
async fn smoke_client_does_not_follow_redirects() {
    let target = MockServer::start().await;
    let source = MockServer::start().await;
    let location = format!("{}/capture", target.uri());

    Mock::given(method("GET"))
        .and(path("/private"))
        .respond_with(ResponseTemplate::new(302).insert_header("Location", location))
        .mount(&source)
        .await;

    let client = smoke_client(None).expect("smoke client should build");
    let response = client
        .get(format!("{}/private", source.uri()))
        .header("Authorization-Key", "secret-token")
        .send()
        .await
        .expect("request should complete");

    assert_eq!(response.status(), StatusCode::FOUND);
    assert!(
        target.received_requests().await.unwrap().is_empty(),
        "smoke client must not forward credentialed requests across redirects"
    );
}

#[tokio::test]
async fn smoke_client_uses_resolved_target_dns_override() {
    let server = MockServer::start().await;
    let target = ResolvedExternalUrl::from_parts_for_test(
        Url::parse(&format!(
            "http://example.com:{}/health",
            server.address().port()
        ))
        .unwrap(),
        Some("example.com".to_string()),
        vec![*server.address()],
    );

    Mock::given(method("GET"))
        .and(path("/health"))
        .respond_with(ResponseTemplate::new(StatusCode::OK.as_u16()))
        .expect(1)
        .mount(&server)
        .await;

    let client = smoke_client_for_resolved_target(None, &target)
        .expect("smoke client should build with DNS override");
    let response = client
        .get(target.as_str())
        .send()
        .await
        .expect("request should use pinned address");

    assert_eq!(response.status(), StatusCode::OK);
    server.verify().await;
}

#[tokio::test]
async fn jobswithgpt_smoke_rejects_plain_http_endpoint() {
    let db = Database::connect_memory()
        .await
        .expect("test database should connect");
    db.migrate().await.expect("test database should migrate");
    let config = jobswithgpt_smoke_config("http://example.com/mcp");

    let result = run_smoke_test(&db, &config, "jobswithgpt")
        .await
        .expect("smoke test should record a failed result");

    assert!(!result.passed);
    assert!(result.details.is_none());
    assert!(!result.error.unwrap_or_default().contains("http://"));
}

#[tokio::test]
async fn restricted_smoke_test_skips_without_user_acknowledgement() {
    let db = Database::connect_memory()
        .await
        .expect("test database should connect");
    db.migrate().await.expect("test database should migrate");
    let config = jobswithgpt_smoke_config("https://example.test/jobs");

    let result = run_smoke_test(&db, &config, "indeed")
        .await
        .expect("smoke test should record a skipped result");

    assert!(result.passed);
    assert_eq!(
        result
            .details
            .as_ref()
            .and_then(|details| details.get("status")),
        Some(&serde_json::json!("skipped"))
    );
    assert_eq!(
        result
            .details
            .as_ref()
            .and_then(|details| details.get("reason")),
        Some(&serde_json::json!(RESTRICTED_SOURCE_CHECK_ACK_REQUIRED))
    );
}

#[test]
fn restricted_source_check_accepts_one_time_or_saved_acknowledgement() {
    let mut config = jobswithgpt_smoke_config("https://example.test/jobs");

    assert!(!restricted_source_check_acknowledged(
        &config, "dice", false
    ));
    assert!(restricted_source_check_acknowledged(&config, "dice", true));

    config.restricted_source_acknowledgements.dice = true;
    assert!(restricted_source_check_acknowledged(&config, "dice", false));
    assert!(restricted_source_check_acknowledged(
        &config,
        "greenhouse",
        false
    ));
}

#[test]
fn validate_smoke_details_allows_skipped_sources() {
    let details = serde_json::json!({
        "status": "skipped",
        "reason": "source disabled"
    });

    validate_smoke_details("usajobs", &details).expect("skipped checks are neutral");
}

#[test]
fn validate_smoke_details_rejects_missing_selectors() {
    let details = serde_json::json!({
        "status": 200,
        "selectors_found": false,
        "html_size_kb": 12
    });

    let error = validate_smoke_details("glassdoor", &details).unwrap_err();
    assert!(error.to_string().contains("expected job selectors"));
}

#[test]
fn validate_smoke_details_rejects_empty_job_counts() {
    let details = serde_json::json!({
        "status": 200,
        "jobs_found": 0,
        "format": "rss"
    });

    let error = validate_smoke_details("simplyhired", &details).unwrap_err();
    assert!(error.to_string().contains("did not find any jobs"));
}

#[test]
fn source_check_error_message_hides_raw_urls_and_tokens() {
    let error = anyhow::anyhow!(
        "JobsWithGPT smoke test request failed: error sending request for url https://example.test/jobs?token=secret"
    );
    let message = source_check_error_message(&error);

    assert_eq!(message, SOURCE_CHECK_NETWORK_ERROR);
    assert!(!message.contains("https://"));
    assert!(!message.contains("token"));
    assert!(!message.contains("secret"));
    assert!(!message.contains("JobsWithGPT"));
}

#[test]
fn source_check_error_message_keeps_status_actionable_without_provider_detail() {
    let cases = [
        (
            anyhow::anyhow!("HTTP 429 Too Many Requests"),
            SOURCE_CHECK_RATE_LIMITED,
        ),
        (anyhow::anyhow!("HTTP 403 Forbidden"), SOURCE_CHECK_REJECTED),
        (
            anyhow::anyhow!("HTTP 500 Internal Server Error"),
            SOURCE_CHECK_BAD_RESPONSE,
        ),
        (
            anyhow::anyhow!("Failed to parse JSON response from https://example.test/private"),
            SOURCE_CHECK_READ_ERROR,
        ),
    ];

    for (error, expected) in cases {
        let message = source_check_error_message(&error);
        assert_eq!(message, expected);
        assert!(!message.contains("https://"));
        assert!(!message.contains("Forbidden"));
        assert!(!message.contains("Internal Server Error"));
    }
}
