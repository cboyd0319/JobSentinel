use super::*;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;

const TEST_AUTH_TOKEN: &str = "secret-token";

#[test]
fn test_calculate_job_hash() {
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

async fn bookmarklet_test_database() -> Arc<Database> {
    let database = Database::connect_memory()
        .await
        .expect("test database should connect");
    database
        .migrate()
        .await
        .expect("test database should migrate");
    Arc::new(database)
}

async fn stored_job_count(database: &Database) -> i64 {
    sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
        .fetch_one(database.pool())
        .await
        .expect("job count should load")
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

#[tokio::test]
async fn test_bookmarklet_import_queues_valid_job_for_review_without_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let pending_imports = bookmarklet_pending_imports();
    let body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "description": "Coordinate care appointments",
        "url": "https://example.com/jobs/1",
        "location": "Denver, CO",
        "remote": true
    }));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("success response should be JSON");
    let previews = pending_bookmarklet_import_previews(&pending_imports);

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["success"], true);
    assert_eq!(parsed["pending"], 1);
    assert_eq!(parsed["imported"], serde_json::Value::Null);
    assert_eq!(stored_job_count(&database).await, 0);
    assert_eq!(previews.len(), 1);
    assert_eq!(previews[0].title, "Care Coordinator");
    assert_eq!(previews[0].company, "Community Care");
    assert_eq!(previews[0].url, "https://example.com/jobs/1");
    assert_eq!(previews[0].location, Some("Denver, CO".to_string()));
    assert!(previews[0].remote);

    let confirm_result =
        confirm_pending_bookmarklet_imports(&database, &pending_imports, &[previews[0].id.clone()])
            .await
            .expect("confirm should save queued import");
    let stored: (String, String, String, bool, String, Option<String>) =
        sqlx::query_as("SELECT title, company, source, remote, hash, location FROM jobs LIMIT 1")
            .fetch_one(database.pool())
            .await
            .expect("stored job should load after confirmation");

    assert_eq!(confirm_result.imported, 1);
    assert_eq!(confirm_result.skipped, 0);
    assert_eq!(
        pending_bookmarklet_import_previews(&pending_imports).len(),
        0
    );
    assert_eq!(stored.0, "Care Coordinator");
    assert_eq!(stored.1, "Community Care");
    assert_eq!(stored.2, "bookmarklet");
    assert!(stored.3);
    assert_eq!(
        stored.4,
        calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Denver, CO"),
            "https://example.com/jobs/1"
        )
    );
    assert_eq!(stored.5, Some("Denver, CO".to_string()));
}

#[tokio::test]
async fn test_bookmarklet_import_queues_visible_job_batch_for_review_without_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let pending_imports = bookmarklet_pending_imports();
    let body = bookmarklet_import_batch_body(serde_json::json!([
        {
            "title": "Principal Systems Security Engineer",
            "company": "Sierra Nevada Corporation",
            "description": "Rendered LinkedIn card selected by the user",
            "url": "https://www.linkedin.com/jobs/view/100?currentJobId=100&referralSearchId=private",
            "location": "Centennial, CO"
        },
        {
            "title": "Lead Platform Security Engineer",
            "company": "HDR",
            "description": "Rendered LinkedIn card selected by the user",
            "url": "https://www.linkedin.com/jobs/view/200?origin=private",
            "location": "Denver, CO"
        }
    ]));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request_from_origin(
            &body,
            "https://www.linkedin.com",
            "https://www.linkedin.com/jobs/",
        ),
        &auth_state,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("batch response should be JSON");
    let previews = pending_bookmarklet_import_previews(&pending_imports);

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["success"], true);
    assert_eq!(parsed["pending"], 2);
    assert_eq!(stored_job_count(&database).await, 0);
    assert_eq!(previews.len(), 2);
    assert_eq!(previews[0].title, "Principal Systems Security Engineer");
    assert_eq!(previews[0].company, "Sierra Nevada Corporation");
    assert_eq!(previews[0].url, "https://www.linkedin.com/jobs/view/100");
    assert_eq!(previews[1].title, "Lead Platform Security Engineer");
    assert_eq!(previews[1].company, "HDR");
    assert_eq!(previews[1].url, "https://www.linkedin.com/jobs/view/200");
}

#[tokio::test]
async fn test_bookmarklet_import_rejects_batch_origin_mismatch() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let body = bookmarklet_import_batch_body(serde_json::json!([
        {
            "title": "Principal Systems Security Engineer",
            "company": "Sierra Nevada Corporation",
            "url": "https://www.linkedin.com/jobs/view/100"
        },
        {
            "title": "Lead Platform Security Engineer",
            "company": "HDR",
            "url": "https://evil.example/jobs/200"
        }
    ]));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request_from_origin(
            &body,
            "https://www.linkedin.com",
            "https://www.linkedin.com/jobs/",
        ),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], "Invalid browser import origin");
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_rejects_invalid_batch_without_partial_insert() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let body = bookmarklet_import_batch_body(serde_json::json!([
        {
            "title": "Principal Systems Security Engineer",
            "company": "Sierra Nevada Corporation",
            "url": "https://www.linkedin.com/jobs/view/100"
        },
        {
            "title": "Missing Company",
            "company": "",
            "url": "https://www.linkedin.com/jobs/view/200"
        }
    ]));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request_from_origin(
            &body,
            "https://www.linkedin.com",
            "https://www.linkedin.com/jobs/",
        ),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("error response should be JSON");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["error"], "Company name is required");
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_minimizes_url_before_storage() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let pending_imports = bookmarklet_pending_imports();
    let body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "description": "Coordinate care appointments",
        "url": "https://example.com/jobs?utm_source=browser&gh_jid=123&token=secret&candidate_email=person@example.com&query=care#private",
        "location": "Denver, CO"
    }));

    let (response, content_type) = handle_import_request(
        &bookmarklet_import_request(&body),
        &auth_state,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value =
        serde_json::from_str(&response).expect("success response should be JSON");
    let previews = pending_bookmarklet_import_previews(&pending_imports);
    let confirm_result =
        confirm_pending_bookmarklet_imports(&database, &pending_imports, &[previews[0].id.clone()])
            .await
            .expect("confirm should save queued import");
    let stored_url: String = sqlx::query_scalar("SELECT url FROM jobs LIMIT 1")
        .fetch_one(database.pool())
        .await
        .expect("stored URL should load");

    assert_eq!(content_type, "application/json");
    assert_eq!(parsed["success"], true);
    assert_eq!(parsed["pending"], 1);
    assert_eq!(confirm_result.imported, 1);
    assert_eq!(stored_url, "https://example.com/jobs?gh_jid=123&query=care");
    assert!(!stored_url.contains("utm_source"));
    assert!(!stored_url.contains("token"));
    assert!(!stored_url.contains("candidate_email"));
    assert!(!stored_url.contains("person@example.com"));
    assert!(!stored_url.contains("private"));
}

#[tokio::test]
async fn test_bookmarklet_import_consumes_token_after_first_valid_use() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let pending_imports = bookmarklet_pending_imports();
    let first_body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "url": "https://example.com/jobs/1"
    }));
    let second_body = bookmarklet_import_body(serde_json::json!({
        "title": "Patient Scheduler",
        "company": "Community Care",
        "url": "https://example.com/jobs/2"
    }));

    let (first_response, _) = handle_import_request(
        &bookmarklet_import_request(&first_body),
        &auth_state,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let (second_response, _) = handle_import_request(
        &bookmarklet_import_request(&second_body),
        &auth_state,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let first: serde_json::Value =
        serde_json::from_str(&first_response).expect("first response should be JSON");
    let second: serde_json::Value =
        serde_json::from_str(&second_response).expect("second response should be JSON");

    assert_eq!(first["success"], true);
    assert_eq!(second["error"], BOOKMARKLET_UNAUTHORIZED_MESSAGE);
    assert_eq!(
        pending_bookmarklet_import_previews(&pending_imports).len(),
        1
    );
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_import_consumes_token_after_invalid_authenticated_payload() {
    let database = bookmarklet_test_database().await;
    let auth_state = bookmarklet_auth_state(TEST_AUTH_TOKEN, bookmarklet_auth_expiry());
    let unsafe_body = bookmarklet_import_body(serde_json::json!({
        "title": "Care Coordinator",
        "company": "Community Care",
        "url": "javascript:alert(1)"
    }));
    let valid_body = bookmarklet_import_body(serde_json::json!({
        "title": "Patient Scheduler",
        "company": "Community Care",
        "url": "https://example.com/jobs/2"
    }));

    let (first_response, _) = handle_import_request(
        &bookmarklet_import_request(&unsafe_body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let (second_response, _) = handle_import_request(
        &bookmarklet_import_request(&valid_body),
        &auth_state,
        bookmarklet_pending_imports(),
        database.clone(),
    )
    .await;
    let first: serde_json::Value =
        serde_json::from_str(&first_response).expect("first response should be JSON");
    let second: serde_json::Value =
        serde_json::from_str(&second_response).expect("second response should be JSON");

    assert_eq!(first["error"], "Job link must be a public https address");
    assert_eq!(second["error"], BOOKMARKLET_UNAUTHORIZED_MESSAGE);
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn test_bookmarklet_start_returns_bind_error_for_occupied_port() {
    let occupied_listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("test listener should bind");
    let occupied_port = occupied_listener
        .local_addr()
        .expect("test listener should expose address")
        .port();
    let database = bookmarklet_test_database().await;
    let mut server = BookmarkletServer::new(BookmarkletConfig {
        port: occupied_port,
        ..Default::default()
    });
    let config = server.config().clone();

    let error = server
        .start(config, database)
        .await
        .expect_err("occupied port should fail before server is marked running");

    match error {
        BookmarkletError::BindError { port, .. } => assert_eq!(port, occupied_port),
        other => panic!("expected bind error, got {other:?}"),
    }
    assert!(!server.is_running());
}

#[tokio::test]
async fn test_bookmarklet_server_lifecycle() {
    let config = BookmarkletConfig {
        port: 0,
        ..Default::default()
    }; // Use random port
    let server = BookmarkletServer::new(config);

    assert!(!server.is_running());

    // Note: Cannot fully test start/stop without a real database
    // This would require integration tests
}
