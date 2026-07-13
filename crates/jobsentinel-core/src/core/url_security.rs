//! Shared URL validation for user-controlled external destinations.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use tokio::net::lookup_host;
use url::{form_urlencoded::Serializer, Url};

const MAX_LOG_URL_LEN: usize = 80;
const BLOCKED_HOST_SUFFIXES: &[&str] = &["local", "lan", "home", "internal", "corp"];
const SENSITIVE_JOB_QUERY_MARKERS: &[&str] = &[
    "token",
    "session",
    "auth",
    "credential",
    "password",
    "email",
    "candidate",
];

#[derive(Clone, Debug)]
pub struct ResolvedExternalUrl {
    url: Url,
    dns_host: Option<String>,
    socket_addrs: Vec<SocketAddr>,
}

impl ResolvedExternalUrl {
    #[must_use]
    pub fn url(&self) -> &Url {
        &self.url
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        self.url.as_str()
    }

    #[must_use]
    pub fn into_url(self) -> Url {
        self.url
    }

    #[must_use]
    pub fn dns_override(&self) -> Option<(&str, &[SocketAddr])> {
        self.dns_host
            .as_deref()
            .map(|host| (host, self.socket_addrs.as_slice()))
    }

    #[cfg(test)]
    pub(crate) fn from_parts_for_test(
        url: Url,
        dns_host: Option<String>,
        socket_addrs: Vec<SocketAddr>,
    ) -> Self {
        Self {
            url,
            dns_host,
            socket_addrs,
        }
    }
}

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

    let host = normalized_host(&parsed)?;

    if host == "localhost" || host.ends_with(".localhost") {
        return Err("Blocked localhost URL".to_string());
    }

    if has_blocked_host_suffix(&host) {
        return Err("Blocked internal hostname".to_string());
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

    if let Some(ip) = embedded_ipv4_address(&host) {
        if is_blocked_ip(IpAddr::V4(ip)) {
            return Err("Blocked non-public IP address".to_string());
        }
    }

    Ok(parsed)
}

/// Parse and validate an external HTTPS-only URL.
pub fn validate_external_https_url(url: &str) -> Result<Url, String> {
    let parsed = validate_external_http_url(url)?;

    if parsed.scheme() != "https" {
        return Err("Blocked insecure URL: https required".to_string());
    }

    Ok(parsed)
}

/// Validate a URL for an actual HTTP fetch.
///
/// This keeps config validation deterministic while fetch paths also reject
/// hostnames that resolve to loopback, private, link-local, or other non-public
/// addresses.
pub async fn validate_external_http_url_for_fetch(url: &str) -> Result<Url, String> {
    resolve_external_http_url_for_fetch(url)
        .await
        .map(ResolvedExternalUrl::into_url)
}

/// Resolve and validate a URL for an actual HTTP fetch.
///
/// In addition to rejecting non-public resolved IPs, this returns the checked
/// socket addresses so callers can pin reqwest DNS resolution for the request
/// and avoid a validate-then-reconnect DNS rebinding gap.
pub async fn resolve_external_http_url_for_fetch(url: &str) -> Result<ResolvedExternalUrl, String> {
    let parsed = validate_external_http_url(url)?;
    resolve_external_url_for_fetch(parsed).await
}

/// Validate an HTTPS-only URL for an actual HTTP fetch.
pub async fn validate_external_https_url_for_fetch(url: &str) -> Result<Url, String> {
    resolve_external_https_url_for_fetch(url)
        .await
        .map(ResolvedExternalUrl::into_url)
}

/// Resolve and validate an HTTPS-only URL for an actual HTTP fetch.
pub async fn resolve_external_https_url_for_fetch(
    url: &str,
) -> Result<ResolvedExternalUrl, String> {
    let parsed = validate_external_https_url(url)?;
    resolve_external_url_for_fetch(parsed).await
}

async fn resolve_external_url_for_fetch(parsed: Url) -> Result<ResolvedExternalUrl, String> {
    let host = normalized_host(&parsed)?;

    if host.parse::<IpAddr>().is_ok() {
        return Ok(ResolvedExternalUrl {
            url: parsed,
            dns_host: None,
            socket_addrs: Vec::new(),
        });
    }

    let port = parsed
        .port_or_known_default()
        .ok_or_else(|| "URL must include a valid port".to_string())?;
    let addrs = lookup_host((host.as_str(), port))
        .await
        .map_err(|_| "Could not verify URL host".to_string())?;
    let socket_addrs: Vec<SocketAddr> = addrs.collect();

    validate_resolved_ips(socket_addrs.iter().map(|addr| addr.ip()))?;

    Ok(ResolvedExternalUrl {
        url: parsed,
        dns_host: Some(host),
        socket_addrs,
    })
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

/// Canonicalize a user-supplied job-posting URL before local storage or hash use.
///
/// User-controlled job links can carry credentials, tracking parameters,
/// candidate identifiers, session tokens, and private fragments. This keeps
/// stable public job identifiers while removing data that should not be stored
/// or later sent through optional notification channels.
pub fn canonicalize_user_supplied_job_url(url: &str) -> Result<String, String> {
    let mut parsed = Url::parse(url).map_err(|_| "Invalid URL format".to_string())?;

    let _ = parsed.set_username("");
    let _ = parsed.set_password(None);
    parsed.set_fragment(None);

    let retained_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .filter(|(name, value)| !is_sensitive_job_query_param(name, value))
        .map(|(name, value)| (name.into_owned(), value.into_owned()))
        .collect();

    let encoded_query = Serializer::new(String::new())
        .extend_pairs(
            retained_pairs
                .iter()
                .map(|(name, value)| (name.as_str(), value.as_str())),
        )
        .finish();

    if encoded_query.is_empty() {
        parsed.set_query(None);
    } else {
        parsed.set_query(Some(&encoded_query));
    }

    validate_external_https_url(parsed.as_str())?;

    Ok(parsed.to_string())
}

fn is_sensitive_job_query_param(name: &str, value: &str) -> bool {
    let normalized = name.to_ascii_lowercase();

    normalized.starts_with("utm_")
        || matches!(
            normalized.as_str(),
            "fbclid"
                | "gclid"
                | "msclkid"
                | "mc_cid"
                | "mc_eid"
                | "igshid"
                | "source"
                | "ref"
                | "referrer"
        )
        || SENSITIVE_JOB_QUERY_MARKERS
            .iter()
            .any(|marker| normalized.contains(marker))
        || is_sensitive_job_query_value(value)
}

fn is_sensitive_job_query_value(value: &str) -> bool {
    if Url::parse(value).is_ok() {
        return true;
    }

    let normalized = value.to_ascii_lowercase();

    SENSITIVE_JOB_QUERY_MARKERS.iter().any(|marker| {
        normalized.contains(&format!("{marker}=")) || normalized.contains(&format!("{marker}%3d"))
    })
}

fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => is_blocked_ipv4(ip),
        IpAddr::V6(ip) => is_blocked_ipv6(ip),
    }
}

fn normalized_host(parsed: &Url) -> Result<String, String> {
    Ok(parsed
        .host_str()
        .ok_or_else(|| "URL must include a host".to_string())?
        .trim_end_matches('.')
        .to_ascii_lowercase())
}

fn has_blocked_host_suffix(host: &str) -> bool {
    BLOCKED_HOST_SUFFIXES
        .iter()
        .any(|suffix| host == *suffix || host.ends_with(&format!(".{suffix}")))
}

fn embedded_ipv4_address(host: &str) -> Option<Ipv4Addr> {
    let labels: Vec<&str> = host.split('.').collect();

    labels.windows(4).find_map(|window| {
        let [a, b, c, d] = window else {
            return None;
        };

        Some(Ipv4Addr::new(
            a.parse().ok()?,
            b.parse().ok()?,
            c.parse().ok()?,
            d.parse().ok()?,
        ))
    })
}

fn validate_resolved_ips(ips: impl IntoIterator<Item = IpAddr>) -> Result<(), String> {
    let mut saw_ip = false;

    for ip in ips {
        saw_ip = true;
        if is_blocked_ip(ip) {
            return Err("Blocked non-public IP address".to_string());
        }
    }

    if saw_ip {
        Ok(())
    } else {
        Err("Could not verify URL host".to_string())
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
mod tests;
