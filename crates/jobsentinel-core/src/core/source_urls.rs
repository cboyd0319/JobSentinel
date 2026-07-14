//! Validation helpers for configured ATS source board URLs.

use url::Url;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct CompanyBoardUrl {
    pub id: String,
    pub url: String,
}

const GREENHOUSE_BOARD_HOSTS: &[&str] = &["boards.greenhouse.io", "job-boards.greenhouse.io"];
const CURRENT_GREENHOUSE_BOARD_HOST: &str = "job-boards.greenhouse.io";

pub(crate) fn parse_greenhouse_company_url(value: &str) -> Result<CompanyBoardUrl, String> {
    parse_company_board_url(
        value,
        GREENHOUSE_BOARD_HOSTS,
        "Greenhouse",
        CURRENT_GREENHOUSE_BOARD_HOST,
    )
}

pub(crate) fn parse_lever_company_url(value: &str) -> Result<CompanyBoardUrl, String> {
    parse_company_board_url(value, &["jobs.lever.co"], "Lever", "jobs.lever.co")
}

pub(crate) fn is_safe_company_board_id(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

fn parse_company_board_url(
    value: &str,
    expected_hosts: &[&str],
    source_label: &str,
    canonical_host: &str,
) -> Result<CompanyBoardUrl, String> {
    let value = value.trim();
    let lowered = value.to_ascii_lowercase();
    if lowered.contains("/../")
        || lowered.ends_with("/..")
        || lowered.contains('\\')
        || lowered.contains("%2f")
        || lowered.contains("%5c")
    {
        return Err(format!(
            "{source_label} URL contains unsupported path characters"
        ));
    }

    let parsed = Url::parse(value).map_err(|_| format!("{source_label} URL is not valid"))?;

    if parsed.scheme() != "https" {
        return Err(format!("{source_label} URL must use https"));
    }

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(format!(
            "{source_label} URL must not include embedded credentials"
        ));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| format!("{source_label} URL must include a host"))?
        .trim_end_matches('.')
        .to_ascii_lowercase();
    if !expected_hosts.contains(&host.as_str()) {
        let allowed = expected_hosts.join(" or ");
        return Err(format!("{source_label} URL must use host {allowed}"));
    }

    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err(format!(
            "{source_label} URL must not include a query string or fragment"
        ));
    }

    let mut segments = parsed
        .path_segments()
        .ok_or_else(|| format!("{source_label} URL must include a company id"))?
        .filter(|segment| !segment.is_empty());
    let id = segments
        .next()
        .ok_or_else(|| format!("{source_label} URL must include a company id"))?;

    if segments.next().is_some() {
        return Err(format!(
            "{source_label} URL must point to a company board, not a nested path"
        ));
    }

    if !is_safe_company_board_id(id) {
        return Err(format!(
            "{source_label} company id contains unsupported characters"
        ));
    }

    Ok(CompanyBoardUrl {
        id: id.to_string(),
        url: format!("https://{canonical_host}/{id}"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_valid_company_board_urls() {
        let greenhouse =
            parse_greenhouse_company_url("https://boards.greenhouse.io/community-care_network/")
                .expect("greenhouse board URL should parse");
        let lever =
            parse_lever_company_url("https://jobs.lever.co/freshmart-123").expect("lever URL");

        assert_eq!(greenhouse.id, "community-care_network");
        assert_eq!(
            greenhouse.url,
            "https://job-boards.greenhouse.io/community-care_network"
        );
        assert_eq!(lever.id, "freshmart-123");
        assert_eq!(lever.url, "https://jobs.lever.co/freshmart-123");
    }

    #[test]
    fn parses_current_greenhouse_host() {
        let greenhouse = parse_greenhouse_company_url("https://job-boards.greenhouse.io/primerai/")
            .expect("current Greenhouse board URL should parse");

        assert_eq!(greenhouse.id, "primerai");
        assert_eq!(greenhouse.url, "https://job-boards.greenhouse.io/primerai");
    }

    #[test]
    fn rejects_authority_and_host_confusion() {
        for value in [
            "https://boards.greenhouse.io@127.0.0.1/company",
            "https://boards.greenhouse.io@evil.example/company",
            "https://user:pass@boards.greenhouse.io/company",
            "https://boards.greenhouse.io.evil.example/company",
            "http://boards.greenhouse.io/company",
        ] {
            assert!(
                parse_greenhouse_company_url(value).is_err(),
                "URL should be rejected: {value}"
            );
        }
    }

    #[test]
    fn rejects_nested_or_unsafe_company_ids() {
        for value in [
            "https://jobs.lever.co/company/job-id",
            "https://jobs.lever.co/../admin",
            "https://jobs.lever.co/%2Fadmin",
            "https://jobs.lever.co/company?token=secret",
            "https://jobs.lever.co/company#fragment",
        ] {
            assert!(
                parse_lever_company_url(value).is_err(),
                "URL should be rejected: {value}"
            );
        }
    }
}
