//! Pure privacy, redaction, and untrusted URL policy.

mod logging;
mod output;
mod url;
mod webhook;

pub use logging::path_label_for_logging;
pub use output::{encode_html_text, redacted_secret_for_debug};
pub use url::{
    canonicalize_user_supplied_job_url, sanitize_url_for_logging, strip_sensitive_url_components,
    validate_external_http_url, validate_external_https_url, validate_resolved_ips,
};
pub use webhook::{validate_webhook_target, WebhookTarget};

#[cfg(test)]
mod contract_tests {
    use super::{
        encode_html_text, redacted_secret_for_debug, validate_webhook_target, WebhookTarget,
    };

    #[test]
    fn webhook_targets_accept_only_owned_https_host_and_path_shapes() {
        for (target, valid) in [
            (
                WebhookTarget::Slack,
                "https://hooks.slack.com/services/T000/B000/secret",
            ),
            (
                WebhookTarget::Discord,
                "https://discord.com/api/webhooks/123/secret",
            ),
            (
                WebhookTarget::Teams,
                "https://outlook.office.com/webhook/tenant/IncomingWebhook/key/group",
            ),
            (
                WebhookTarget::Teams,
                "https://tenant.webhook.office.com/abc/IncomingWebhook/def/ghi",
            ),
            (
                WebhookTarget::Teams,
                "https://region.logic.azure.com/workflows/id/triggers/manual/paths/invoke",
            ),
        ] {
            assert!(validate_webhook_target(valid, target).is_ok(), "{valid}");
        }

        for (target, invalid) in [
            (
                WebhookTarget::Slack,
                "https://hooks.slack.com.evil.example/services/T/B/key",
            ),
            (
                WebhookTarget::Discord,
                "https://user@discord.com/api/webhooks/123/key",
            ),
            (
                WebhookTarget::Teams,
                "https://webhook.office.com/abc/IncomingWebhook/def/ghi",
            ),
            (
                WebhookTarget::Teams,
                "https://logic.azure.com/workflows/id/triggers/manual/paths/invoke",
            ),
            (
                WebhookTarget::Teams,
                "https://tenant.webhook.office.com:444/abc/IncomingWebhook/def/ghi",
            ),
        ] {
            assert!(
                validate_webhook_target(invalid, target).is_err(),
                "{invalid}"
            );
        }
    }

    #[test]
    fn html_text_encoder_covers_all_markup_delimiters() {
        assert_eq!(
            encode_html_text("A&B <C> \"quote\" 'apostrophe'"),
            "A&amp;B &lt;C&gt; &quot;quote&quot; &#39;apostrophe&#39;"
        );
    }

    #[test]
    fn debug_secret_label_distinguishes_empty_without_exposing_values() {
        assert_eq!(redacted_secret_for_debug(""), "[empty]");
        assert_eq!(redacted_secret_for_debug("private-value"), "[REDACTED]");
    }
}
