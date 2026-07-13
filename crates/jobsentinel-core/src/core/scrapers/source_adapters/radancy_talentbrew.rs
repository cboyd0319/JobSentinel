use std::collections::BTreeMap;

use regex::Regex;
use scraper::{Html, Selector};
use serde_json::Value;
use sha2::{Digest, Sha256};
use url::Url;

use super::contract::{CanonicalJobRecord, SourceAdapterLane};

pub const DEFAULT_PAGE: u16 = 1;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyscoRadancySource {
    pub rank: u16,
    pub company: String,
    pub careers_url: String,
    pub search_url: String,
    pub detail_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyscoRadancyRequest {
    pub search_url: String,
    pub page: u16,
    pub keyword: String,
}

impl SyscoRadancyRequest {
    pub fn new(search_url: impl Into<String>) -> Self {
        Self {
            search_url: search_url.into(),
            page: DEFAULT_PAGE,
            keyword: String::new(),
        }
    }

    pub fn url(&self) -> String {
        if self.keyword.trim().is_empty() && self.page <= 1 {
            return self.search_url.clone();
        }

        let Ok(mut url) = Url::parse(&self.search_url) else {
            return self.search_url.clone();
        };
        {
            let mut pairs = url.query_pairs_mut();
            if !self.keyword.trim().is_empty() {
                pairs.append_pair("k", self.keyword.trim());
            }
            if self.page > 1 {
                pairs.append_pair("p", &self.page.to_string());
            }
        }
        url.to_string()
    }

    pub fn cache_key(&self) -> String {
        let resolved_url = self.url();
        let digest = Sha256::digest(resolved_url.as_bytes());
        let prefix = hex_prefix(&digest, 16);
        let parsed = Url::parse(&self.search_url).ok();
        let host = parsed
            .as_ref()
            .and_then(|url| url.host_str())
            .unwrap_or("invalid-host");
        let path = parsed.as_ref().map(Url::path).unwrap_or("");

        format!("sysco-radancy:{host}:{path}:{prefix}")
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RadancyListingMetadata {
    pub current_page: Option<u16>,
    pub records_per_page: Option<u16>,
    pub total_results: Option<u32>,
    pub total_job_results: Option<u32>,
    pub total_pages: Option<u16>,
    pub keywords: Option<String>,
    pub search_type: Option<String>,
    pub results_type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyscoRadancyListing {
    pub page_title: String,
    pub metadata: RadancyListingMetadata,
    pub jobs: Vec<CanonicalJobRecord>,
    pub parse_warnings: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct JsonLdJobPosting {
    pub title: Option<String>,
    pub identifier: Option<String>,
    pub url: Option<String>,
    pub date_posted: Option<String>,
    pub hiring_organization: Option<String>,
    pub description_present: bool,
    pub base_salary_present: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyscoRadancyDetail {
    pub page_title: String,
    pub json_ld_jobpostings: Vec<JsonLdJobPosting>,
    pub workday_apply_urls: Vec<String>,
    pub parse_warnings: Vec<String>,
}

pub fn parse_sysco_radancy_listing(
    html: &str,
    source: &SyscoRadancySource,
    request: &SyscoRadancyRequest,
) -> SyscoRadancyListing {
    let document = Html::parse_document(html);
    let page_title = first_text(&document, "title").unwrap_or_default();
    let metadata = parse_metadata(&document);
    let jobs = parse_listing_jobs(&document, source, request);
    let parse_warnings = if jobs.is_empty() {
        vec!["missing Radancy/TalentBrew job rows".to_string()]
    } else {
        Vec::new()
    };

    SyscoRadancyListing {
        page_title,
        metadata,
        jobs,
        parse_warnings,
    }
}

pub fn parse_sysco_radancy_detail(html: &str) -> SyscoRadancyDetail {
    let document = Html::parse_document(html);
    let page_title = first_text(&document, "title").unwrap_or_default();
    let json_ld_jobpostings = parse_json_ld_jobpostings(&document);
    let workday_apply_urls = extract_workday_apply_urls(html);
    let parse_warnings = if json_ld_jobpostings.is_empty() {
        vec!["missing JSON-LD JobPosting".to_string()]
    } else {
        Vec::new()
    };

    SyscoRadancyDetail {
        page_title,
        json_ld_jobpostings,
        workday_apply_urls,
        parse_warnings,
    }
}

fn parse_metadata(document: &Html) -> RadancyListingMetadata {
    let Some(selector) = parse_selector("section#search-results") else {
        return RadancyListingMetadata::default();
    };
    let Some(section) = document.select(&selector).next() else {
        return RadancyListingMetadata::default();
    };
    let attrs = section.value();

    RadancyListingMetadata {
        current_page: parse_u16(attrs.attr("data-current-page")),
        records_per_page: parse_u16(attrs.attr("data-records-per-page")),
        total_results: parse_u32(attrs.attr("data-total-results")),
        total_job_results: parse_u32(attrs.attr("data-total-job-results")),
        total_pages: parse_u16(attrs.attr("data-total-pages")),
        keywords: non_empty(attrs.attr("data-keywords")),
        search_type: non_empty(attrs.attr("data-search-type")),
        results_type: non_empty(attrs.attr("data-results-type")),
    }
}

fn parse_listing_jobs(
    document: &Html,
    source: &SyscoRadancySource,
    request: &SyscoRadancyRequest,
) -> Vec<CanonicalJobRecord> {
    let Some(job_link_selector) = parse_selector(r#"a[href*="/en/job/"]"#) else {
        return Vec::new();
    };
    let title_selector = parse_selector("h2");
    let location_selector = parse_selector(".job-location, span[class*=\"job-location\"]");

    document
        .select(&job_link_selector)
        .filter_map(|link| {
            let href = link.value().attr("href")?;
            let url = normalize_url(href, &request.url())?;
            let title = title_selector
                .as_ref()
                .and_then(|selector| text_from_child(&link, selector))
                .or_else(|| non_empty_text(link.text()));
            let location = location_selector
                .as_ref()
                .and_then(|selector| text_from_child(&link, selector));
            let source_job_id = non_empty(link.value().attr("data-job-id"))
                .or_else(|| job_id_from_url(&url))
                .unwrap_or_else(|| "unknown".to_string());
            let identity = first_non_empty([
                Some(source_job_id.as_str()),
                Some(url.as_str()),
                title.as_deref(),
            ])
            .unwrap_or("unknown")
            .to_string();
            let mut record = CanonicalJobRecord::new(
                SourceAdapterLane::SyscoRadancyTalentBrewHtmlAdapter,
                source.company.clone(),
                title.unwrap_or_default(),
                url,
                source_job_id,
                format!("sysco-radancy:{}", identity),
            );

            record.rank = Some(source.rank);
            record.location = location;
            record.raw_source_ref = Some(request.url());
            record.metadata = BTreeMap::from([
                ("search_url".to_string(), source.search_url.clone()),
                ("careers_url".to_string(), source.careers_url.clone()),
                ("page".to_string(), request.page.to_string()),
                ("keyword".to_string(), request.keyword.clone()),
            ]);
            Some(record)
        })
        .collect()
}

fn parse_json_ld_jobpostings(document: &Html) -> Vec<JsonLdJobPosting> {
    let Some(selector) = parse_selector(r#"script[type="application/ld+json"]"#) else {
        return Vec::new();
    };

    document
        .select(&selector)
        .flat_map(|script| {
            let raw = script.text().collect::<String>();
            serde_json::from_str::<Value>(&raw)
                .ok()
                .into_iter()
                .flat_map(json_ld_candidates)
        })
        .filter_map(|candidate| {
            is_job_posting(&candidate).then(|| JsonLdJobPosting {
                title: string_value(candidate.get("title")),
                identifier: parse_identifier(candidate.get("identifier")),
                url: candidate
                    .get("url")
                    .and_then(Value::as_str)
                    .and_then(|value| normalize_url(value, "https://careers.sysco.com/en/")),
                date_posted: string_value(candidate.get("datePosted")),
                hiring_organization: candidate
                    .get("hiringOrganization")
                    .and_then(|value| value.get("name"))
                    .and_then(Value::as_str)
                    .map(normalize_ws),
                description_present: candidate.get("description").is_some(),
                base_salary_present: candidate.get("baseSalary").is_some(),
            })
        })
        .collect()
}

fn json_ld_candidates(value: Value) -> Vec<Value> {
    if let Some(items) = value.as_array() {
        return items.clone();
    }
    if let Some(graph) = value.get("@graph").and_then(Value::as_array) {
        return graph.clone();
    }
    vec![value]
}

fn is_job_posting(value: &Value) -> bool {
    match value.get("@type") {
        Some(Value::String(kind)) => kind == "JobPosting",
        Some(Value::Array(kinds)) => kinds.iter().any(|kind| kind.as_str() == Some("JobPosting")),
        _ => false,
    }
}

fn extract_workday_apply_urls(html: &str) -> Vec<String> {
    let Ok(regex) = Regex::new(r#"https://wd5\.myworkday(?:site)?\.com/[^\s"'<>]+"#) else {
        return Vec::new();
    };
    let mut urls: Vec<String> = regex
        .find_iter(html)
        .map(|match_| match_.as_str())
        .filter(|url| url.to_ascii_lowercase().contains("/apply"))
        .filter_map(|url| normalize_url(url, "https://careers.sysco.com/en/"))
        .collect();
    urls.sort();
    urls.dedup();
    urls
}

fn parse_identifier(value: Option<&Value>) -> Option<String> {
    match value {
        Some(Value::String(text)) => Some(normalize_ws(text)),
        Some(Value::Object(object)) => object
            .get("value")
            .or_else(|| object.get("name"))
            .and_then(Value::as_str)
            .map(normalize_ws),
        _ => None,
    }
}

fn first_text(document: &Html, selector: &str) -> Option<String> {
    let selector = parse_selector(selector)?;
    document
        .select(&selector)
        .next()
        .and_then(|node| non_empty_text(node.text()))
}

fn text_from_child(element: &scraper::ElementRef<'_>, selector: &Selector) -> Option<String> {
    element
        .select(selector)
        .next()
        .and_then(|node| non_empty_text(node.text()))
}

fn non_empty_text<'a>(parts: impl Iterator<Item = &'a str>) -> Option<String> {
    non_empty(Some(&parts.collect::<Vec<_>>().join(" ")))
}

fn string_value(value: Option<&Value>) -> Option<String> {
    value.and_then(Value::as_str).map(normalize_ws)
}

fn parse_u16(value: Option<&str>) -> Option<u16> {
    value.and_then(|value| value.parse().ok())
}

fn parse_u32(value: Option<&str>) -> Option<u32> {
    value.and_then(|value| value.parse().ok())
}

fn job_id_from_url(value: &str) -> Option<String> {
    let parsed = Url::parse(value).ok()?;
    parsed
        .path_segments()?
        .rfind(|part| !part.trim().is_empty())
        .map(normalize_ws)
}

fn normalize_url(value: &str, base_url: &str) -> Option<String> {
    let parsed = Url::parse(value)
        .or_else(|_| Url::parse(base_url)?.join(value))
        .ok()?;
    let mut url = parsed;
    if url.query().is_some() {
        let kept_pairs: Vec<(String, String)> = url
            .query_pairs()
            .map(|(key, value)| {
                if is_sensitive_query_key(&key) {
                    (key.to_string(), "[REDACTED]".to_string())
                } else {
                    (key.to_string(), value.to_string())
                }
            })
            .collect();
        url.query_pairs_mut().clear().extend_pairs(kept_pairs);
    }
    Some(url.to_string())
}

fn is_sensitive_query_key(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    matches!(
        lower.as_str(),
        "apikey"
            | "api_key"
            | "key"
            | "token"
            | "access_token"
            | "client_secret"
            | "password"
            | "secret"
    ) || lower.contains("token")
        || lower.contains("secret")
        || lower.contains("key")
}

fn first_non_empty<'a>(values: impl IntoIterator<Item = Option<&'a str>>) -> Option<&'a str> {
    values
        .into_iter()
        .flatten()
        .find(|value| !value.trim().is_empty())
}

fn non_empty(value: Option<&str>) -> Option<String> {
    value
        .map(normalize_ws)
        .filter(|value| !value.trim().is_empty())
}

fn normalize_ws(value: &str) -> String {
    value
        .replace('\u{00a0}', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn parse_selector(pattern: &str) -> Option<Selector> {
    Selector::parse(pattern).ok()
}

fn hex_prefix(bytes: &[u8], length: usize) -> String {
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

    fn source() -> SyscoRadancySource {
        SyscoRadancySource {
            rank: 56,
            company: "Sysco".to_string(),
            careers_url: "https://careers.sysco.com/en".to_string(),
            search_url: "https://careers.sysco.com/en/search-jobs".to_string(),
            detail_url: Some(
                "https://careers.sysco.com/en/job/knoxville/new-business-developer/1105/96011044768"
                    .to_string(),
            ),
        }
    }

    #[test]
    fn request_url_and_cache_key_match_search_contract() {
        let mut request = SyscoRadancyRequest::new("https://careers.sysco.com/en/search-jobs");
        assert_eq!(request.url(), "https://careers.sysco.com/en/search-jobs");
        assert!(request
            .cache_key()
            .starts_with("sysco-radancy:careers.sysco.com:/en/search-jobs:"));

        request.page = 2;
        request.keyword = "driver".to_string();
        assert_eq!(
            request.url(),
            "https://careers.sysco.com/en/search-jobs?k=driver&p=2"
        );
    }

    #[test]
    fn parses_sysco_radancy_listing_rows_and_metadata() {
        let request = SyscoRadancyRequest::new("https://careers.sysco.com/en/search-jobs");
        let html = r#"
            <html>
              <head><title>Search Jobs - Sysco</title></head>
              <body>
                <section id="search-results" data-current-page="1" data-records-per-page="15"
                  data-total-results="1289" data-total-job-results="1289" data-total-pages="86"
                  data-keywords="" data-search-type="external" data-results-type="jobs">
                  <a href="/en/job/knoxville/new-business-developer/1105/96011044768" data-job-id="96011044768">
                    <h2>New Business Developer</h2>
                    <span class="job-location">Knoxville, TN</span>
                  </a>
                  <a href="https://careers.sysco.com/en/job/farmington/cdl-a-local-delivery-truck-driver/1105/96670296992?token=secret">
                    <h2>CDL A Local Delivery Truck Driver</h2>
                    <span class="job-location">Farmington, NM</span>
                  </a>
                </section>
              </body>
            </html>
        "#;

        let listing = parse_sysco_radancy_listing(html, &source(), &request);

        assert_eq!(listing.page_title, "Search Jobs - Sysco");
        assert_eq!(listing.metadata.current_page, Some(1));
        assert_eq!(listing.metadata.total_job_results, Some(1289));
        assert_eq!(listing.jobs.len(), 2);
        assert!(listing.parse_warnings.is_empty());
        assert_eq!(listing.jobs[0].source_job_id, "96011044768");
        assert_eq!(listing.jobs[0].dedupe_key, "sysco-radancy:96011044768");
        assert_eq!(listing.jobs[0].location.as_deref(), Some("Knoxville, TN"));
        assert_eq!(
            listing.jobs[1].url,
            "https://careers.sysco.com/en/job/farmington/cdl-a-local-delivery-truck-driver/1105/96670296992?token=%5BREDACTED%5D"
        );
        assert!(listing.jobs.iter().all(|job| job.validate().is_empty()));
    }

    #[test]
    fn parses_detail_json_ld_without_fetching_workday_apply_target() {
        let html = r#"
            <html>
              <head>
                <title>New Business Developer</title>
                <script type="application/ld+json">
                  {
                    "@type": "JobPosting",
                    "title": "New Business Developer",
                    "identifier": {"value": "96011044768"},
                    "url": "https://careers.sysco.com/en/job/knoxville/new-business-developer/1105/96011044768",
                    "datePosted": "2026-06-19",
                    "hiringOrganization": {"name": "Sysco"},
                    "description": "Sales role",
                    "baseSalary": {"@type": "MonetaryAmount"}
                  }
                </script>
              </head>
              <body>
                <a href="https://wd5.myworkdaysite.com/sysco/apply/96011044768?token=secret">Apply</a>
              </body>
            </html>
        "#;

        let detail = parse_sysco_radancy_detail(html);

        assert_eq!(detail.page_title, "New Business Developer");
        assert!(detail.parse_warnings.is_empty());
        assert_eq!(detail.json_ld_jobpostings.len(), 1);
        assert_eq!(
            detail.json_ld_jobpostings[0].identifier.as_deref(),
            Some("96011044768")
        );
        assert!(detail.json_ld_jobpostings[0].description_present);
        assert!(detail.json_ld_jobpostings[0].base_salary_present);
        assert_eq!(
            detail.workday_apply_urls,
            ["https://wd5.myworkdaysite.com/sysco/apply/96011044768?token=%5BREDACTED%5D"]
        );
    }
}
