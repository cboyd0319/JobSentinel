use super::*;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;

mod repository;
use repository::*;

const TEST_AUTH_TOKEN: &str = "secret-token";

#[test]
fn job_hash_is_stable() {
    let hash1 = calculate_job_hash(
        "Community Care",
        "Care Coordinator",
        Some("Denver, CO"),
        "https://example.com/job/1",
    );
    let hash2 = calculate_job_hash(
        "Community Care",
        "Care Coordinator",
        Some("Denver, CO"),
        "https://example.com/job/1",
    );
    let hash3 = calculate_job_hash(
        "Community Care",
        "Care Coordinator",
        Some("Phoenix, AZ"),
        "https://example.com/job/1",
    );
    let hash4 = calculate_job_hash(
        "Community Care",
        "Care Coordinator",
        Some("Denver, CO"),
        "https://example.com/job/2",
    );

    assert_eq!(hash1, hash2);
    assert_ne!(hash1, hash3);
    assert_ne!(hash1, hash4);
}

#[test]
fn test_json_error_response_escapes_message() {
    let response = json_error_response("bad \"quote\"\nnext line");
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be valid JSON");

    assert_eq!(parsed["error"], "bad \"quote\"\nnext line");
}

#[test]
fn test_bookmarklet_token_validation_requires_matching_header() {
    let request = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nX-JobSentinel-Token: secret-token\r\n\r\n{}";

    assert!(has_valid_bookmarklet_token(request, "secret-token"));
    assert!(!has_valid_bookmarklet_token(request, "other-token"));
    assert!(!has_valid_bookmarklet_token(request, ""));
    assert!(!has_valid_bookmarklet_token(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\n{}",
        "secret-token"
    ));
    assert!(!has_valid_bookmarklet_token(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\nX-JobSentinel-Token: secret-token",
        "secret-token"
    ));
}

#[test]
fn test_bookmarklet_token_validation_requires_exact_token() {
    let request = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nX-JobSentinel-Token: secret-token\r\n\r\n{}";

    assert!(constant_time_ascii_eq(TEST_AUTH_TOKEN, TEST_AUTH_TOKEN));
    assert!(!constant_time_ascii_eq("secret", TEST_AUTH_TOKEN));
    assert!(!constant_time_ascii_eq(
        "secret-token-extra",
        TEST_AUTH_TOKEN
    ));
    assert!(!constant_time_ascii_eq("secret-taken", TEST_AUTH_TOKEN));
    assert!(!constant_time_ascii_eq("", TEST_AUTH_TOKEN));
    assert!(!has_valid_bookmarklet_token(request, "secret"));
    assert!(!has_valid_bookmarklet_token(request, "secret-token-extra"));
}

#[test]
fn test_bookmarklet_token_validation_accepts_body_envelope() {
    let body = serde_json::json!({
        "token": TEST_AUTH_TOKEN,
        "job": {
            "title": "Care Coordinator",
            "company": "Community Care",
            "url": "https://example.com/jobs/1"
        }
    });

    assert!(body_has_valid_bookmarklet_token(&body, TEST_AUTH_TOKEN));
    assert!(!body_has_valid_bookmarklet_token(&body, "other-token"));
    assert!(!body_has_valid_bookmarklet_token(&body, ""));
}

#[test]
fn test_bookmarklet_host_validation_requires_loopback_host_with_port() {
    let localhost = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\n\r\n{}";
    let loopback = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: 127.0.0.1:4321\r\n\r\n{}";
    let ipv6_loopback = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: [::1]:4321\r\n\r\n{}";

    assert!(has_valid_bookmarklet_host(localhost, 4321));
    assert!(has_valid_bookmarklet_host(loopback, 4321));
    assert!(has_valid_bookmarklet_host(ipv6_loopback, 4321));
    assert!(!has_valid_bookmarklet_host(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\n{}",
        4321
    ));
    assert!(!has_valid_bookmarklet_host(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: rebinding.example:4321\r\n\r\n{}",
        4321
    ));
    assert!(!has_valid_bookmarklet_host(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: 127.0.0.1:4322\r\n\r\n{}",
        4321
    ));
}

#[test]
fn test_bookmarklet_origin_validation_rejects_non_web_contexts() {
    let no_origin = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\n\r\n{}";
    let https_origin = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: https://jobs.example\r\nReferer: https://jobs.example/posting\r\n\r\n{}";
    let null_origin =
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: null\r\n\r\n{}";
    let file_referer = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nReferer: file:///Users/example/job.html\r\n\r\n{}";
    let extension_origin = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: chrome-extension://abcdef\r\n\r\n{}";

    assert!(has_allowed_bookmarklet_origin(no_origin));
    assert!(has_allowed_bookmarklet_origin(https_origin));
    assert!(!has_allowed_bookmarklet_origin(null_origin));
    assert!(!has_allowed_bookmarklet_origin(file_referer));
    assert!(!has_allowed_bookmarklet_origin(extension_origin));
}

#[test]
fn test_bookmarklet_payload_origin_must_match_job_url() {
    let body = serde_json::json!({
        "token": TEST_AUTH_TOKEN,
        "job": {
            "title": "Care Coordinator",
            "company": "Community Care",
            "url": "https://jobs.example/posting/1?token=private#apply"
        }
    });
    let matching_origin = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: https://jobs.example\r\nReferer: https://jobs.example/posting/1\r\n\r\n{}";
    let mismatched_origin = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: https://other.example\r\nReferer: https://jobs.example/posting/1\r\n\r\n{}";
    let mismatched_referer = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\nOrigin: https://jobs.example\r\nReferer: https://other.example/posting/1\r\n\r\n{}";

    assert!(bookmarklet_payload_matches_request_origin(
        matching_origin,
        &body
    ));
    assert!(!bookmarklet_payload_matches_request_origin(
        mismatched_origin,
        &body
    ));
    assert!(!bookmarklet_payload_matches_request_origin(
        mismatched_referer,
        &body
    ));
}

#[test]
fn test_bookmarklet_payload_origin_allows_legacy_requests_without_origin_headers() {
    let body = serde_json::json!({
        "token": TEST_AUTH_TOKEN,
        "job": {
            "title": "Care Coordinator",
            "company": "Community Care",
            "url": "https://jobs.example/posting/1"
        }
    });
    let request = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost:4321\r\n\r\n{}";

    assert!(bookmarklet_payload_matches_request_origin(request, &body));
}

#[test]
fn test_bookmarklet_http_response_does_not_advertise_wildcard_cors() {
    let response = http_response_data("200 OK", "application/json", "{\"success\":true}");

    assert!(!response.contains("Access-Control-Allow-Origin"));
    assert!(!response.contains("Access-Control-Allow-Headers"));
}

#[test]
fn test_bookmarklet_http_response_has_defensive_headers() {
    let response = http_response_data("200 OK", "application/json", "{\"success\":true}");

    assert!(response.contains("Cache-Control: no-store"));
    assert!(response.contains("Pragma: no-cache"));
    assert!(response.contains("X-Content-Type-Options: nosniff"));
    assert!(response.contains("Referrer-Policy: no-referrer"));
    assert!(response.contains("Cross-Origin-Resource-Policy: same-origin"));
    assert!(response.contains("Connection: close"));
}

#[test]
fn test_bookmarklet_connection_limit_releases_permits() {
    let connection_limit = Arc::new(Semaphore::new(1));
    let permit = try_bookmarklet_connection_permit(&connection_limit)
        .expect("first connection should get a permit");

    assert!(try_bookmarklet_connection_permit(&connection_limit).is_none());

    drop(permit);
    assert!(try_bookmarklet_connection_permit(&connection_limit).is_some());
}

#[test]
fn test_bookmarklet_config_refreshes_auth_token_with_expiry() {
    let mut config = BookmarkletConfig {
        port: 4321,
        auth_token: "old-token".to_string(),
        auth_token_expires_at: Utc::now() - TimeDelta::minutes(1),
    };

    assert!(!config.auth_token_is_current(Utc::now()));
    config.refresh_auth_token();

    assert_ne!(config.auth_token, "old-token");
    assert!(config.auth_token_is_current(Utc::now()));
}

#[test]
fn test_bookmarklet_server_updates_auth_state_without_restart() {
    let original_expires_at = Utc::now() + TimeDelta::minutes(5);
    let next_expires_at = Utc::now() + TimeDelta::minutes(10);
    let mut server = BookmarkletServer::new(BookmarkletConfig {
        port: 4321,
        auth_token: "old-token".to_string(),
        auth_token_expires_at: original_expires_at,
    });

    let original_auth = current_bookmarklet_auth(&server.auth_state);
    assert_eq!(original_auth.auth_token, "old-token");
    assert_eq!(original_auth.auth_token_expires_at, original_expires_at);

    server.update_auth_token("new-token".to_string(), next_expires_at);
    let next_auth = current_bookmarklet_auth(&server.auth_state);

    assert_eq!(server.config().auth_token, "new-token");
    assert_eq!(server.config().auth_token_expires_at, next_expires_at);
    assert_eq!(next_auth.auth_token, "new-token");
    assert_eq!(next_auth.auth_token_expires_at, next_expires_at);
    assert!(!server.is_running());
}

#[test]
fn test_request_buffer_waits_for_declared_body() {
    let headers_only =
        b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\n\r\n";
    let complete_request = b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\n\r\nhello";

    assert!(!request_buffer_has_complete_body(headers_only));
    assert!(request_buffer_has_complete_body(complete_request));
    assert!(request_buffer_has_complete_body(
        b"OPTIONS /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\n"
    ));
}

#[test]
fn test_request_buffer_stops_when_declared_body_exceeds_cap() {
    let oversized_request =
        b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 25000\r\n\r\n";

    assert!(!request_buffer_has_complete_body(oversized_request));
    assert!(request_buffer_has_declared_oversized_body(
        oversized_request,
        MAX_BOOKMARKLET_REQUEST_BYTES
    ));
    assert!(request_buffer_should_stop_reading(
        oversized_request,
        MAX_BOOKMARKLET_REQUEST_BYTES
    ));
}

#[tokio::test]
async fn test_bookmarklet_connection_times_out_incomplete_body() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("test listener should bind");
    let addr = listener
        .local_addr()
        .expect("test listener should expose address");
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let pending_imports = new_pending_bookmarklet_imports();

    let server_task = tokio::spawn(async move {
        let (stream, _) = listener
            .accept()
            .await
            .expect("test connection should be accepted");
        handle_connection(stream, auth_state, pending_imports, database).await
    });

    let mut client = tokio::net::TcpStream::connect(addr)
        .await
        .expect("test client should connect");
    client
        .write_all(
            b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\n\r\n",
        )
        .await
        .expect("test request should write");

    let result = tokio::time::timeout(Duration::from_secs(1), server_task)
        .await
        .expect("incomplete request should not hold a connection indefinitely")
        .expect("server task should not panic");

    assert!(result.is_err());
}

fn bookmarklet_import_request(body: &str) -> String {
    format!(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: {}\r\n\r\n{}",
        body.len(),
        body
    )
}

fn bookmarklet_import_request_from_origin(body: &str, origin: &str, referer: &str) -> String {
    format!(
        "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nOrigin: {}\r\nReferer: {}\r\nContent-Length: {}\r\n\r\n{}",
        origin,
        referer,
        body.len(),
        body
    )
}

fn bookmarklet_import_body(job: serde_json::Value) -> String {
    serde_json::json!({
        "token": TEST_AUTH_TOKEN,
        "job": job,
    })
    .to_string()
}

fn bookmarklet_import_batch_body(jobs: serde_json::Value) -> String {
    serde_json::json!({
        "token": TEST_AUTH_TOKEN,
        "jobs": jobs,
    })
    .to_string()
}

fn bookmarklet_auth_state(
    token: &str,
    expires_at: DateTime<Utc>,
) -> Arc<RwLock<BookmarkletAuthState>> {
    Arc::new(RwLock::new(BookmarkletAuthState {
        auth_token: token.to_string(),
        auth_token_expires_at: expires_at,
    }))
}

fn bookmarklet_pending_imports() -> PendingBookmarkletImports {
    new_pending_bookmarklet_imports()
}

#[test]
fn test_bookmarklet_import_route_requires_exact_path() {
    assert!(is_bookmarklet_import_request(
        "POST /api/bookmarklet/import HTTP/1.1\r\n\r\n"
    ));
    assert!(is_bookmarklet_import_request(
        "POST /api/bookmarklet/import?source=button HTTP/1.1\r\n\r\n"
    ));
    assert!(!is_bookmarklet_import_request(
        "POST /api/bookmarklet/importevil HTTP/1.1\r\n\r\n"
    ));
}

#[tokio::test]
async fn test_bookmarklet_import_rejects_unsafe_url_without_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "url": "javascript:alert(1)"
    }));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], "Job link must be a public https address");
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_rejects_missing_body_token_without_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let body = serde_json::json!({
        "job": {
            "title": "Care Coordinator",
            "company": "Community Care",
            "url": "https://example.com/jobs/1"
        }
    })
    .to_string();

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], BOOKMARKLET_UNAUTHORIZED_MESSAGE);
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_rejects_expired_token_without_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, Utc::now() - TimeDelta::minutes(1));
    let body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "url": "https://example.com/jobs/1"
    }));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], BOOKMARKLET_UNAUTHORIZED_MESSAGE);
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_uses_shared_job_length_validation() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let body = bookmarklet_import_body(serde_json::json!({
        "title": "T".repeat(501),
        "company": "Community Care",
        "url": "https://example.com/jobs/1"
    }));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], BOOKMARKLET_DATABASE_FAILURE_MESSAGE);
    assert_eq!(stored_job_count(&database).await, 0);
}

mod lifecycle;
#[path = "tests/queued_import_tests.rs"]
mod queued_import_tests;
