/// Encode untrusted plain text for an HTML text or attribute context.
#[must_use]
pub fn encode_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Return a stable debug label without exposing a secret value.
#[must_use]
pub fn redacted_secret_for_debug(value: &str) -> &'static str {
    if value.is_empty() {
        "[empty]"
    } else {
        "[REDACTED]"
    }
}
