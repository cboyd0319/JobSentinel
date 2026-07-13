use super::*;

#[test]
fn test_shared_client_is_singleton() {
    let client1 = get_client();
    let client2 = get_client();
    // Both should point to the same client
    assert!(std::ptr::eq(client1, client2));
}

#[test]
fn test_shared_client_is_functional() {
    let client = get_client();
    // Verify the client is actually usable
    assert!(client.get("https://example.com").build().is_ok());
}

#[test]
fn test_create_custom_client() {
    let client = create_custom_client("TestAgent/1.0", 10);
    assert!(client.is_ok());
}

#[test]
fn test_create_custom_client_with_empty_user_agent() {
    let client = create_custom_client("", 10);
    // Empty user agent is technically valid
    assert!(client.is_ok());
}

#[test]
fn test_create_custom_client_with_zero_timeout() {
    let client = create_custom_client("TestAgent/1.0", 0);
    // Zero timeout should work (means no timeout)
    assert!(client.is_ok());
}

#[test]
fn test_create_custom_client_with_long_timeout() {
    let client = create_custom_client("TestAgent/1.0", 3600);
    assert!(client.is_ok());
}

#[test]
fn test_custom_client_with_custom_user_agent() {
    let custom_agent = "CustomBot/2.0 (Test)";
    let client = create_custom_client(custom_agent, 10).unwrap();

    // Verify the client can build requests successfully
    // Note: reqwest doesn't expose the default user agent from the client,
    // but we can verify the client was created with the custom config
    let request = client.get("https://example.com").build().unwrap();
    assert_eq!(request.method(), reqwest::Method::GET);
    assert_eq!(request.url().as_str(), "https://example.com/");
}

#[test]
fn test_default_constants() {
    assert!(!DEFAULT_USER_AGENT.is_empty());
    // DEFAULT_TIMEOUT_SECS is a const, so this is a compile-time check
    const _: () = assert!(DEFAULT_TIMEOUT_SECS > 0);
}

#[test]
fn test_default_user_agent_format() {
    // Verify it looks like a browser user agent
    assert!(DEFAULT_USER_AGENT.contains("Mozilla"));
    assert!(DEFAULT_USER_AGENT.contains("Chrome"));
    assert!(DEFAULT_USER_AGENT.contains("Windows NT"));
}

#[test]
fn test_default_timeout_is_reasonable() {
    // Timeout should be neither too short nor too long
    assert!(DEFAULT_TIMEOUT_SECS >= 10);
    assert!(DEFAULT_TIMEOUT_SECS <= 120);
}

#[test]
fn test_init_shared_client_success() {
    let result = init_shared_client();
    assert!(result.is_ok());

    let client = result.unwrap();
    // Verify the client can build requests
    assert!(client.get("https://example.com").build().is_ok());
}

#[test]
fn test_shared_client_request_building() {
    let client = get_client();

    // Test various HTTP methods
    assert!(client.get("https://example.com").build().is_ok());
    assert!(client.post("https://example.com").build().is_ok());
    assert!(client.head("https://example.com").build().is_ok());
}

#[test]
fn test_custom_client_request_building() {
    let client = create_custom_client("TestAgent/1.0", 10).unwrap();

    // Verify the custom client can build requests
    assert!(client.get("https://example.com").build().is_ok());
    assert!(client.post("https://example.com").build().is_ok());
}

#[test]
fn test_custom_client_with_special_characters_in_user_agent() {
    let client = create_custom_client("Test-Agent/1.0 (Special!@#)", 10);
    // Special characters in user agent should be handled
    assert!(client.is_ok());
}

#[test]
fn test_custom_client_with_unicode_user_agent() {
    let client = create_custom_client("TestAgent/1.0 (テスト)", 10);
    // Unicode in user agent should be handled
    assert!(client.is_ok());
}

#[test]
fn test_custom_client_with_very_long_user_agent() {
    let long_agent = "A".repeat(1000);
    let client = create_custom_client(&long_agent, 10);
    // Very long user agent should still work
    assert!(client.is_ok());
}

#[test]
fn test_retry_constants() {
    assert_eq!(MAX_RETRIES, 3);
    assert_eq!(BASE_DELAY_SECS, 1);
    assert_eq!(MAX_RETRY_AFTER_DELAY_SECS, 60);
}

#[test]
fn test_retryable_status_classification() {
    assert!(is_retryable_status(reqwest::StatusCode::TOO_MANY_REQUESTS));
    assert!(is_retryable_status(
        reqwest::StatusCode::INTERNAL_SERVER_ERROR
    ));
    assert!(is_retryable_status(reqwest::StatusCode::BAD_GATEWAY));
    assert!(!is_retryable_status(reqwest::StatusCode::BAD_REQUEST));
    assert!(!is_retryable_status(reqwest::StatusCode::UNAUTHORIZED));
    assert!(!is_retryable_status(reqwest::StatusCode::NOT_FOUND));
}

#[test]
fn test_calculate_backoff_delay_exponential() {
    // Test the exponential backoff logic
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
    assert_eq!(BASE_DELAY_SECS * 2_u64.pow(0), 1);
    assert_eq!(BASE_DELAY_SECS * 2_u64.pow(1), 2);
    assert_eq!(BASE_DELAY_SECS * 2_u64.pow(2), 4);
    assert_eq!(BASE_DELAY_SECS * 2_u64.pow(3), 8);
}

#[test]
fn test_retry_after_delay_is_bounded() {
    assert_eq!(bounded_retry_after_secs(0), 0);
    assert_eq!(bounded_retry_after_secs(10), 10);
    assert_eq!(
        bounded_retry_after_secs(MAX_RETRY_AFTER_DELAY_SECS + 60),
        MAX_RETRY_AFTER_DELAY_SECS
    );
}

#[tokio::test]
#[ignore = "requires network access - may fail in CI or offline environments"]
async fn test_get_with_retry_success() {
    // Test with httpbin which should succeed
    let result = get_with_retry("https://httpbin.org/status/200").await;
    assert!(result.is_ok());
}

#[tokio::test]
#[ignore = "requires network access - may fail in CI or offline environments"]
async fn test_get_with_retry_client_error_no_retry() {
    // 404 should not retry
    let result = get_with_retry("https://httpbin.org/status/404").await;
    assert!(result.is_err());
    let err_msg = result.unwrap_err().to_string();
    assert!(err_msg.contains("404"));
}

#[tokio::test]
async fn test_send_with_retry_retries_status_and_preserves_headers() {
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    let server = MockServer::start().await;
    let path_value = "/jobs";
    let url = format!("{}{}", server.uri(), path_value);

    Mock::given(method("GET"))
        .and(path(path_value))
        .and(header("x-source", "custom"))
        .respond_with(ResponseTemplate::new(429).insert_header("retry-after", "0"))
        .up_to_n_times(1)
        .with_priority(1)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path(path_value))
        .and(header("x-source", "custom"))
        .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
        .expect(1)
        .with_priority(2)
        .mount(&server)
        .await;

    let response =
        send_with_retry_to_test_url(&url, |client| client.get(&url).header("x-source", "custom"))
            .await
            .expect("retry should return eventual success");

    assert_eq!(response.status(), reqwest::StatusCode::OK);
    assert_eq!(response.text().await.expect("body"), "ok");
}

#[tokio::test]
async fn test_send_with_retry_blocks_loopback_before_request() {
    use wiremock::MockServer;

    let server = MockServer::start().await;
    let url = format!("{}/internal", server.uri());

    let error = send_with_retry(&url, |client| client.get(&url))
        .await
        .expect_err("loopback targets should be rejected before network I/O");

    assert!(
        error.to_string().contains("Blocked non-public IP address")
            || error.to_string().contains("Blocked localhost URL"),
        "{error}"
    );
    let requests = server.received_requests().await.unwrap();
    assert!(
        requests.is_empty(),
        "blocked loopback target should not receive a request"
    );
}

#[tokio::test]
async fn test_send_with_retry_rejects_request_builder_target_drift() {
    let target = ResolvedExternalUrl::from_parts_for_test(
        url::Url::parse("https://example.com/jobs").unwrap(),
        None,
        Vec::new(),
    );

    let error = send_with_retry_to_resolved_url(get_client(), &target, |client| {
        client.get("https://example.org/jobs")
    })
    .await
    .expect_err("request builders must keep the validated target");

    assert!(
        error
            .to_string()
            .contains("changed the validated scraper request target"),
        "{error}"
    );
}

#[tokio::test]
async fn test_send_with_retry_returns_final_non_retryable_status() {
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    let server = MockServer::start().await;
    let path_value = "/not-found";
    let url = format!("{}{}", server.uri(), path_value);

    Mock::given(method("GET"))
        .and(path(path_value))
        .respond_with(ResponseTemplate::new(404))
        .expect(1)
        .mount(&server)
        .await;

    let response = send_with_retry_to_test_url(&url, |client| client.get(&url))
        .await
        .expect("non-retryable statuses should be returned to callers");

    assert_eq!(response.status(), reqwest::StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_send_with_retry_does_not_follow_redirects() {
    use reqwest::StatusCode;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    let server = MockServer::start().await;
    let start_path = "/start";
    let target_path = "/target";
    let start_url = format!("{}{}", server.uri(), start_path);
    let target_url = format!("{}{}", server.uri(), target_path);

    Mock::given(method("GET"))
        .and(path(start_path))
        .respond_with(
            ResponseTemplate::new(StatusCode::FOUND.as_u16()).append_header("Location", target_url),
        )
        .expect(1)
        .mount(&server)
        .await;

    Mock::given(method("GET"))
        .and(path(target_path))
        .respond_with(ResponseTemplate::new(StatusCode::OK.as_u16()))
        .expect(0)
        .mount(&server)
        .await;

    let response = send_with_retry_to_test_url(&start_url, |client| client.get(&start_url))
        .await
        .expect("redirect response should be returned to caller");

    assert_eq!(response.status(), StatusCode::FOUND);
}
