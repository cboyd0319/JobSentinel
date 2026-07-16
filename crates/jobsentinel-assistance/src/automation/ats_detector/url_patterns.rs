use url::Url;

pub(super) fn host_matches_domain(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{domain}"))
}

pub(super) fn path_has_segment(url: &Url, segment: &str) -> bool {
    url.path_segments()
        .is_some_and(|mut segments| segments.any(|part| part.eq_ignore_ascii_case(segment)))
}

pub(super) fn path_contains(url: &Url, needle: &str) -> bool {
    url.path().to_ascii_lowercase().contains(needle)
}
