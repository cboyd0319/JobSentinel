use super::super::*;

#[test]
fn test_valid_office_com_webhook_url_passes() {
    let valid_url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid outlook.office.com webhook URL should pass validation"
    );
}

#[test]
fn test_valid_office365_com_webhook_url_passes() {
    let valid_url = "https://outlook.office365.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid outlook.office365.com webhook URL should pass validation"
    );
}

#[test]
fn test_valid_webhook_office_com_url_passes() {
    let valid_url = "https://tenant.webhook.office.com/12345678-1234-1234-1234-123456789012";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid webhook.office.com Teams URL should pass validation"
    );
}

#[test]
fn test_valid_logic_azure_workflow_url_passes() {
    let valid_url =
        "https://prod-12.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid logic.azure.com Teams workflow URL should pass validation"
    );
}

#[test]
fn test_base_webhook_office_and_logic_azure_hosts_fail() {
    for url in [
        "https://webhook.office.com/123",
        "https://logic.azure.com/workflows/abc",
        "https://prod-12.westus.logic.azure.com/",
    ] {
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "{url} should fail validation");
    }
}

#[test]
fn test_invalid_scheme_fails() {
    let invalid_url = "http://outlook.office.com/webhook/123/456";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("full Teams connection link"));
}

#[test]
fn test_wrong_domain_fails() {
    let invalid_url = "https://evil.com/webhook/123/456";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong domain should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Teams"));
}

#[test]
fn test_wrong_path_fails() {
    let invalid_url = "https://outlook.office.com/wrong/123/456";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong path should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Teams"));
}

#[test]
fn test_malformed_url_fails() {
    let invalid_url = "not a url at all";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Malformed URL should fail validation");
}

#[test]
fn test_empty_url_fails() {
    let result = validate_webhook_url("");
    assert!(result.is_err(), "Empty URL should fail validation");
}

#[test]
fn test_query_param_bypass_attack_fails() {
    let attack_url =
        "https://evil.com/steal?url=https://outlook.office.com/webhook/xxx@yyy/IncomingWebhook/zzz";
    let result = validate_webhook_url(attack_url);
    assert!(
        result.is_err(),
        "Query param bypass attack should be blocked"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Teams"));
}

#[test]
fn test_subdomain_bypass_attack_fails() {
    let attack_url = "https://outlook.office.com.evil.com/webhook/xxx@yyy/IncomingWebhook/zzz";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Subdomain bypass attack should be blocked");
}

#[test]
fn test_path_bypass_attack_fails() {
    let attack_url = "https://evil.com/outlook.office.com/webhook/xxx@yyy/IncomingWebhook/zzz";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Path bypass attack should be blocked");
}
