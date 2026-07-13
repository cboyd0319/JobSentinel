use super::*;

#[test]
fn test_browser_launch_error() {
    let err = AutomationError::browser_launch("Chrome not found");
    assert!(matches!(err, AutomationError::BrowserLaunch { .. }));
    assert!(err.to_string().contains("Chrome not found"));
}

#[test]
fn test_captcha_error() {
    let err = AutomationError::captcha("https://example.com/apply");
    assert!(matches!(err, AutomationError::CaptchaDetected { .. }));
    assert!(err.requires_user_action());
}

#[test]
fn test_is_retryable() {
    let timeout = AutomationError::PageLoadTimeout {
        url: "https://example.com".to_string(),
        timeout_secs: 30,
    };
    assert!(timeout.is_retryable());

    let captcha = AutomationError::captcha("https://example.com");
    assert!(!captcha.is_retryable());
}

#[test]
fn test_requires_user_action() {
    let incomplete = AutomationError::incomplete_profile(vec!["phone".to_string()]);
    assert!(incomplete.requires_user_action());

    let timeout = AutomationError::PageLoadTimeout {
        url: "test".to_string(),
        timeout_secs: 30,
    };
    assert!(!timeout.requires_user_action());
}

#[test]
fn test_user_message() {
    let err = AutomationError::incomplete_profile(vec!["email".to_string(), "phone".to_string()]);
    let msg = err.user_message();
    assert!(msg.contains("email"));
    assert!(msg.contains("phone"));

    let err = AutomationError::DailyLimitReached {
        current: 10,
        max: 10,
    };
    let msg = err.user_message();
    assert!(msg.contains("Daily Prepare Form limit"));
}

#[test]
fn test_user_message_uses_plain_prepare_form_copy() {
    let captcha = AutomationError::CaptchaDetected {
        url: "https://example.com/jobs?token=secret".to_string(),
    };
    let timeout = AutomationError::PageLoadTimeout {
        url: "https://example.com/jobs?token=secret".to_string(),
        timeout_secs: 30,
    };
    let resume = AutomationError::ResumeError {
        reason: "raw private resume parse failure".to_string(),
    };

    let copy = [
        captcha.user_message(),
        timeout.user_message(),
        resume.user_message(),
    ]
    .join("\n");

    assert!(!copy.contains("CAPTCHA"));
    assert!(!copy.contains("token=secret"));
    assert!(!copy.contains("raw private resume"));
    assert!(copy.contains("human check"));
    assert!(copy.contains("page took too long"));
    assert!(copy.contains("Resume details need review"));
}

#[test]
fn test_sanitize_selector() {
    let selector = "input[name=\"email\"]";
    let sanitized = AutomationError::sanitize_selector(selector);
    assert_eq!(sanitized, "email");
}

#[test]
fn test_display_messages_do_not_expose_raw_urls() {
    let raw_url = "https://user:pass@example.com/apply?token=secret123&query=security#private";

    let navigation = AutomationError::navigation(raw_url, "redirect failed");
    let navigation_text = navigation.to_string();
    assert!(navigation_text.contains("https://example.com/apply"));
    assert!(!navigation_text.contains("secret123"));
    assert!(!navigation_text.contains("query=security"));
    assert!(!navigation_text.contains("user"));
    assert!(!navigation_text.contains("pass"));
    assert!(!navigation_text.contains("private"));

    let element = AutomationError::element_not_found("input[name=\"email\"]", raw_url);
    let element_text = element.to_string();
    assert!(element_text.contains("https://example.com/apply"));
    assert!(!element_text.contains("secret123"));
    assert!(!element_text.contains("user"));
    assert!(!element_text.contains("pass"));

    let javascript = AutomationError::JavaScriptError {
        url: raw_url.to_string(),
        message: "script failed".to_string(),
    };
    let javascript_text = javascript.to_string();
    assert!(javascript_text.contains("https://example.com/apply"));
    assert!(!javascript_text.contains("secret123"));
    assert!(!javascript_text.contains("private"));
}
