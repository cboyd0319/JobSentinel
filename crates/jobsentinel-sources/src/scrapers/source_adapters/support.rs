use url::Url;

pub(super) fn first_non_empty<'a>(
    values: impl IntoIterator<Item = Option<&'a str>>,
) -> Option<&'a str> {
    values
        .into_iter()
        .flatten()
        .find(|value| !value.trim().is_empty())
}

pub(super) fn is_absolute_http_url(value: &str) -> bool {
    Url::parse(value)
        .ok()
        .is_some_and(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
}

pub(super) fn normalize_ws(value: &str) -> String {
    value
        .replace('\u{00a0}', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub(super) fn hex_prefix(bytes: &[u8], length: usize) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(length);
    for byte in bytes {
        if output.len() >= length {
            break;
        }
        output.push(HEX[(byte >> 4) as usize] as char);
        if output.len() >= length {
            break;
        }
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_non_empty_skips_missing_and_blank_values() {
        assert_eq!(
            first_non_empty([None, Some("  "), Some("job-123")]),
            Some("job-123")
        );
    }

    #[test]
    fn absolute_http_url_requires_supported_scheme_and_host() {
        assert!(is_absolute_http_url("https://example.com/jobs/1"));
        assert!(is_absolute_http_url("http://example.com/jobs/1"));
        assert!(!is_absolute_http_url("/jobs/1"));
        assert!(!is_absolute_http_url("ftp://example.com/jobs/1"));
        assert!(!is_absolute_http_url("https://"));
    }

    #[test]
    fn whitespace_normalization_handles_non_breaking_spaces() {
        assert_eq!(normalize_ws(" Remote\u{00a0}\n  role "), "Remote role");
    }

    #[test]
    fn hexadecimal_prefix_honors_odd_and_oversized_lengths() {
        assert_eq!(hex_prefix(&[0xab, 0xcd], 3), "abc");
        assert_eq!(hex_prefix(&[0xab, 0xcd], 8), "abcd");
    }
}
