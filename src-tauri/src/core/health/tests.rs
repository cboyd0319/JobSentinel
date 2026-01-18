//! Tests for health monitoring module

use super::*;

#[test]
fn test_run_status_serialization() {
    assert_eq!(RunStatus::Running.as_str(), "running");
    assert_eq!(RunStatus::Success.as_str(), "success");
    assert_eq!(RunStatus::Failure.as_str(), "failure");
    assert_eq!(RunStatus::Timeout.as_str(), "timeout");
}

#[test]
fn test_run_status_deserialization() {
    assert_eq!(RunStatus::from_str("running"), RunStatus::Running);
    assert_eq!(RunStatus::from_str("success"), RunStatus::Success);
    assert_eq!(RunStatus::from_str("failure"), RunStatus::Failure);
    assert_eq!(RunStatus::from_str("timeout"), RunStatus::Timeout);
    assert_eq!(RunStatus::from_str("unknown"), RunStatus::Failure); // fallback
}

#[test]
fn test_health_status_deserialization() {
    assert_eq!(HealthStatus::from_str("healthy"), HealthStatus::Healthy);
    assert_eq!(HealthStatus::from_str("degraded"), HealthStatus::Degraded);
    assert_eq!(HealthStatus::from_str("down"), HealthStatus::Down);
    assert_eq!(HealthStatus::from_str("disabled"), HealthStatus::Disabled);
    assert_eq!(HealthStatus::from_str("unknown"), HealthStatus::Unknown);
}

#[test]
fn test_selector_health_deserialization() {
    assert_eq!(SelectorHealth::from_str("healthy"), SelectorHealth::Healthy);
    assert_eq!(
        SelectorHealth::from_str("degraded"),
        SelectorHealth::Degraded
    );
    assert_eq!(SelectorHealth::from_str("broken"), SelectorHealth::Broken);
    assert_eq!(SelectorHealth::from_str("unknown"), SelectorHealth::Unknown);
}

#[test]
fn test_scraper_type_deserialization() {
    assert_eq!(ScraperType::from_str("api"), ScraperType::Api);
    assert_eq!(ScraperType::from_str("html"), ScraperType::Html);
    assert_eq!(ScraperType::from_str("rss"), ScraperType::Rss);
    assert_eq!(ScraperType::from_str("graphql"), ScraperType::Graphql);
}

#[test]
fn test_credential_status_deserialization() {
    assert_eq!(CredentialStatus::from_str("valid"), CredentialStatus::Valid);
    assert_eq!(
        CredentialStatus::from_str("expiring"),
        CredentialStatus::Expiring
    );
    assert_eq!(
        CredentialStatus::from_str("expired"),
        CredentialStatus::Expired
    );
    assert_eq!(
        CredentialStatus::from_str("unknown"),
        CredentialStatus::Unknown
    );
}

#[test]
fn test_smoke_test_type_serialization() {
    assert_eq!(SmokeTestType::Connectivity.as_str(), "connectivity");
    assert_eq!(SmokeTestType::Selector.as_str(), "selector");
    assert_eq!(SmokeTestType::Auth.as_str(), "auth");
    assert_eq!(SmokeTestType::RateLimit.as_str(), "rate_limit");
}

#[test]
fn test_retry_config_default() {
    let config = RetryConfig::default();
    assert_eq!(config.max_attempts, 3);
    assert_eq!(config.initial_delay_ms, 1000);
    assert_eq!(config.max_delay_ms, 30000);
    assert_eq!(config.backoff_multiplier, 2.0);
    assert!(config.retryable_status_codes.contains(&429));
    assert!(config.retryable_status_codes.contains(&503));
}

#[test]
fn test_retry_config_conservative() {
    let config = RetryConfig::conservative();
    assert_eq!(config.max_attempts, 3);
    assert_eq!(config.initial_delay_ms, 2000);
    assert!(config.max_delay_ms > RetryConfig::default().max_delay_ms);
}

#[test]
fn test_retry_config_aggressive() {
    let config = RetryConfig::aggressive();
    assert_eq!(config.max_attempts, 5);
    assert!(config.initial_delay_ms < RetryConfig::default().initial_delay_ms);
}
