use super::*;

#[test]
fn test_sanitize_url() {
    let url = "https://example.com/api?token=secret123&key=abc";
    let sanitized = ScraperError::sanitize_url(url);
    assert_eq!(sanitized, "https://example.com/api");
    assert!(!sanitized.contains("secret123"));
}

#[test]
fn test_display_messages_do_not_expose_raw_urls_or_queries() {
    let raw_url = "https://user:pass@example.com/jobs?token=secret123&query=security#private";

    let status = ScraperError::http_status(503, raw_url, "Service Unavailable");
    let status_text = status.to_string();
    assert!(status_text.contains("https://example.com/jobs"));
    assert!(!status_text.contains("secret123"));
    assert!(!status_text.contains("query=security"));
    assert!(!status_text.contains("user"));
    assert!(!status_text.contains("pass"));
    assert!(!status_text.contains("private"));

    let invalid = ScraperError::InvalidUrl {
        url: raw_url.to_string(),
        reason: "bad host".to_string(),
    };
    let invalid_text = invalid.to_string();
    assert!(invalid_text.contains("https://example.com/jobs"));
    assert!(!invalid_text.contains("secret123"));
    assert!(!invalid_text.contains("user"));
    assert!(!invalid_text.contains("pass"));
    assert!(!invalid_text.contains("private"));
}

#[test]
fn test_from_anyhow_does_not_expose_raw_error_details() {
    let raw_error = anyhow::anyhow!(
        "Failed to send request: https://user:pass@example.com/jobs?token=secret123&query=private#fragment"
    );

    let error = ScraperError::from_anyhow("dice", raw_error);
    let text = error.to_string();

    assert!(text.contains("Job source request failed"));
    assert!(!text.contains("example.com"));
    assert!(!text.contains("secret123"));
    assert!(!text.contains("query=private"));
    assert!(!text.contains("user"));
    assert!(!text.contains("pass"));
    assert!(!text.contains("fragment"));
}

#[test]
fn test_from_anyhow_preserves_status_without_url() {
    let raw_error =
        anyhow::anyhow!("HTTP 503: https://example.com/jobs?token=secret123&query=private");

    let error = ScraperError::from_anyhow("dice", raw_error);
    let text = error.to_string();

    assert!(text.contains("HTTP 503"));
    assert!(!text.contains("example.com"));
    assert!(!text.contains("secret123"));
    assert!(!text.contains("query=private"));
}

#[test]
fn test_http_body_too_large_conversion_sanitizes_url() {
    let raw_url = "https://user:pass@example.com/jobs?token=secret123&query=private#fragment";
    let source = crate::core::http_body::HttpBodyReadError::ResponseTooLarge {
        url: raw_url.to_string(),
        max_bytes: 1024,
    };

    let error = ScraperError::from(source);
    let text = error.to_string();

    assert!(text.contains("https://example.com/jobs"));
    assert!(text.contains("1024 byte limit"));
    assert!(!text.contains("secret123"));
    assert!(!text.contains("query=private"));
    assert!(!text.contains("user"));
    assert!(!text.contains("pass"));
    assert!(!text.contains("fragment"));
}
