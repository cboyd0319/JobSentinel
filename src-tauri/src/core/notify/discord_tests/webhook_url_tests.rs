use super::super::*;

#[test]
fn test_valid_discord_webhook_url_passes() {
    let valid_url = "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid Discord webhook URL should pass validation"
    );
}

#[test]
fn test_valid_discordapp_webhook_url_passes() {
    let valid_url = "https://discordapp.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid discordapp.com webhook URL should pass validation"
    );
}

#[test]
fn test_invalid_scheme_fails() {
    let invalid_url = "http://discord.com/api/webhooks/123456789/token";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("full Discord connection link"));
}

#[test]
fn test_wrong_domain_fails() {
    let invalid_url = "https://evil.com/api/webhooks/123456789/token";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong domain should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Discord"));
}

#[test]
fn test_wrong_path_fails() {
    let invalid_url = "https://discord.com/wrong/path/123456789/token";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong path should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Discord"));
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

// SECURITY TESTS: URL validation bypass attacks
#[test]
fn test_query_param_bypass_attack_fails() {
    // Attack: Try to bypass validation by putting allowed domain in query param.
    let attack_url = "https://evil.com/steal?url=https://discord.com/api/webhooks/123/token";
    let result = validate_webhook_url(attack_url);
    assert!(
        result.is_err(),
        "Query param bypass attack should be blocked"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Discord"));
}

#[test]
fn test_subdomain_bypass_attack_fails() {
    // Attack: Try to bypass validation using a subdomain of attacker's domain.
    let attack_url = "https://discord.com.evil.com/api/webhooks/123/token";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Subdomain bypass attack should be blocked");
}

#[test]
fn test_path_bypass_attack_fails() {
    // Attack: Try to bypass validation by embedding allowed domain in path.
    let attack_url = "https://evil.com/discord.com/api/webhooks/123/token";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Path bypass attack should be blocked");
}
