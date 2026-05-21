//! Shared URL validation for user-controlled external destinations.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::Url;

const MAX_LOG_URL_LEN: usize = 80;

fn truncate_log_label(label: &str) -> String {
    if label.len() <= MAX_LOG_URL_LEN {
        return label.to_string();
    }

    let end = label
        .char_indices()
        .map(|(index, _)| index)
        .take_while(|index| *index <= MAX_LOG_URL_LEN)
        .last()
        .unwrap_or(MAX_LOG_URL_LEN);

    format!("{}...", &label[..end])
}

/// Parse and validate a URL intended for an external browser or HTTP fetch.
///
/// Allows public `http` and `https` URLs only. Localhost, private, link-local,
/// shared-address, unspecified, and multicast IP targets are rejected.
pub fn validate_external_http_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "Invalid URL format".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(format!(
                "Blocked scheme '{}': only http/https allowed",
                scheme
            ));
        }
    }

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Blocked URL with embedded credentials".to_string());
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "URL must include a host".to_string())?
        .trim_end_matches('.')
        .to_ascii_lowercase();

    if host == "localhost" || host.ends_with(".localhost") {
        return Err("Blocked localhost URL".to_string());
    }

    let ip_host = host
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(&host);

    if let Ok(ip) = ip_host.parse::<IpAddr>() {
        if is_blocked_ip(ip) {
            return Err("Blocked non-public IP address".to_string());
        }
    }

    Ok(parsed)
}

/// Return a URL label safe for logs.
///
/// Removes userinfo, query strings, and fragments because user-controlled URLs
/// can include credentials, session tokens, search terms, and location filters.
#[must_use]
pub fn sanitize_url_for_logging(url: &str) -> String {
    let Ok(mut parsed_url) = Url::parse(url) else {
        return "<invalid-url>".to_string();
    };

    let _ = parsed_url.set_username("");
    let _ = parsed_url.set_password(None);
    parsed_url.set_query(None);
    parsed_url.set_fragment(None);

    truncate_log_label(parsed_url.as_ref())
}

fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => is_blocked_ipv4(ip),
        IpAddr::V6(ip) => is_blocked_ipv6(ip),
    }
}

fn is_blocked_ipv4(ip: Ipv4Addr) -> bool {
    let octets = ip.octets();

    ip.is_loopback()
        || ip.is_private()
        || ip.is_link_local()
        || ip.is_unspecified()
        || ip.is_broadcast()
        || ip.is_multicast()
        || octets[0] == 0
        || (octets[0] == 100 && (64..=127).contains(&octets[1]))
}

fn is_blocked_ipv6(ip: Ipv6Addr) -> bool {
    let octets = ip.octets();

    if octets[..10] == [0; 10] && octets[10] == 0xff && octets[11] == 0xff {
        let mapped = Ipv4Addr::new(octets[12], octets[13], octets[14], octets[15]);
        return is_blocked_ipv4(mapped);
    }

    ip.is_loopback()
        || ip.is_unspecified()
        || ip.is_multicast()
        || (octets[0] & 0xfe) == 0xfc
        || (octets[0] == 0xfe && (octets[1] & 0xc0) == 0x80)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_public_http_urls() {
        assert!(validate_external_http_url("https://example.com/jobs").is_ok());
        assert!(validate_external_http_url("http://example.com/jobs").is_ok());
    }

    #[test]
    fn blocks_localhost_names() {
        assert!(validate_external_http_url("http://localhost:3000/jobs").is_err());
        assert!(validate_external_http_url("http://app.localhost/jobs").is_err());
        assert!(validate_external_http_url("http://localhost./jobs").is_err());
    }

    #[test]
    fn blocks_private_ipv4_ranges() {
        for url in [
            "http://127.0.0.1/jobs",
            "http://10.0.0.1/jobs",
            "http://172.16.0.1/jobs",
            "http://192.168.1.1/jobs",
            "http://169.254.1.1/jobs",
            "http://100.64.0.1/jobs",
            "http://0.0.0.0/jobs",
        ] {
            assert!(validate_external_http_url(url).is_err(), "{url}");
        }
    }

    #[test]
    fn blocked_private_ip_errors_do_not_echo_host() {
        let err =
            validate_external_http_url("http://192.168.1.10/internal?token=secret").unwrap_err();

        assert_eq!(err, "Blocked non-public IP address");
        assert!(!err.contains("192.168.1.10"), "host leaked: {err}");
        assert!(!err.contains("secret"), "query leaked: {err}");
    }

    #[test]
    fn blocks_private_ipv6_ranges() {
        for url in [
            "http://[::1]/jobs",
            "http://[::]/jobs",
            "http://[fc00::1]/jobs",
            "http://[fd00::1]/jobs",
            "http://[fe80::1]/jobs",
            "http://[::ffff:127.0.0.1]/jobs",
            "http://[::ffff:192.168.1.1]/jobs",
        ] {
            assert!(validate_external_http_url(url).is_err(), "{url}");
        }
    }

    #[test]
    fn blocks_non_http_schemes() {
        assert!(validate_external_http_url("file:///etc/passwd").is_err());
        assert!(validate_external_http_url("javascript:alert(1)").is_err());
    }

    #[test]
    fn blocks_embedded_credentials() {
        for url in [
            "https://user@example.com/jobs",
            "https://user:pass@example.com/jobs",
        ] {
            assert!(validate_external_http_url(url).is_err(), "{url}");
        }
    }

    #[test]
    fn sanitized_log_url_removes_sensitive_parts() {
        let sanitized = sanitize_url_for_logging(
            "https://user:pass@example.com/jobs/123?token=secret&location=Denver#private",
        );

        assert_eq!(sanitized, "https://example.com/jobs/123");
        assert!(!sanitized.contains("secret"));
        assert!(!sanitized.contains("Denver"));
        assert!(!sanitized.contains("user"));
        assert!(!sanitized.contains("pass"));
    }

    #[test]
    fn sanitized_log_url_truncates_long_paths() {
        let sanitized = sanitize_url_for_logging(&format!(
            "https://example.com/jobs/{}?q=rust",
            "a".repeat(120)
        ));

        assert!(sanitized.ends_with("..."));
        assert!(sanitized.len() <= MAX_LOG_URL_LEN + 3);
        assert!(!sanitized.contains("?q="));
    }

    #[test]
    fn sanitized_log_url_handles_invalid_url() {
        let sanitized = sanitize_url_for_logging("not a url with token=secret");

        assert_eq!(sanitized, "<invalid-url>");
    }
}
