use std::collections::BTreeMap;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use url::Url;

use super::contract::{CanonicalJobRecord, SourceAdapterLane};
use super::support::{first_non_empty, hex_prefix, is_absolute_http_url, normalize_ws};

pub(super) const DEFAULT_LIMIT: u16 = 20;
pub(super) const DEFAULT_OFFSET: u32 = 0;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct WorkdayCxsSource {
    pub rank: u16,
    pub company: String,
    pub endpoint_url: String,
    pub tenant: String,
    pub site: String,
    pub careers_url: Option<String>,
}

impl WorkdayCxsSource {
    pub(super) fn landing_base_url(&self) -> Option<String> {
        let endpoint = Url::parse(&self.endpoint_url).ok()?;
        Some(format!(
            "{}://{}/{}",
            endpoint.scheme(),
            endpoint.host_str()?,
            self.site
        ))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct WorkdayCxsRequest {
    pub endpoint_url: String,
    pub applied_facets: Value,
    pub limit: u16,
    pub offset: u32,
    pub search_text: String,
}

impl WorkdayCxsRequest {
    pub(super) fn new(endpoint_url: impl Into<String>) -> Self {
        Self {
            endpoint_url: endpoint_url.into(),
            applied_facets: json!({}),
            limit: DEFAULT_LIMIT,
            offset: DEFAULT_OFFSET,
            search_text: String::new(),
        }
    }

    pub(super) fn payload(&self) -> Value {
        json!({
            "appliedFacets": self.applied_facets,
            "limit": self.limit,
            "offset": self.offset,
            "searchText": self.search_text,
        })
    }

    pub(super) fn cache_key(&self) -> String {
        let payload = serde_json::to_vec(&self.payload()).unwrap_or_default();
        let digest = Sha256::digest(payload);
        let prefix = hex_prefix(&digest, 16);
        let parsed = Url::parse(&self.endpoint_url).ok();
        let host = parsed
            .as_ref()
            .and_then(|url| url.host_str())
            .unwrap_or("invalid-host");
        let path = parsed.as_ref().map(Url::path).unwrap_or("");

        format!("workday-cxs:{host}:{path}:{prefix}")
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct WorkdayCxsListing {
    pub total: Option<u64>,
    pub jobs: Vec<CanonicalJobRecord>,
    pub parse_warnings: Vec<String>,
}

pub(super) fn parse_workday_cxs_listing(
    payload: &Value,
    source: &WorkdayCxsSource,
) -> WorkdayCxsListing {
    let postings = payload
        .get("jobPostings")
        .or_else(|| payload.get("jobs"))
        .and_then(Value::as_array);
    let parse_warnings = if postings.is_some() {
        Vec::new()
    } else {
        vec!["missing jobPostings or jobs list".to_string()]
    };
    let jobs = postings
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .map(|item| normalize_workday_job(item, source))
        .collect();

    WorkdayCxsListing {
        total: payload.get("total").and_then(Value::as_u64),
        jobs,
        parse_warnings,
    }
}

fn normalize_workday_job(
    item: &serde_json::Map<String, Value>,
    source: &WorkdayCxsSource,
) -> CanonicalJobRecord {
    let title = first_string(item, &["title", "jobTitle"]);
    let external_path = first_string(item, &["externalPath", "jobPostingUrl", "url"]);
    let job_url = external_path
        .as_deref()
        .and_then(|path| build_job_url(path, source));
    let location = item
        .get("locationsText")
        .or_else(|| item.get("location"))
        .or_else(|| item.get("locations"))
        .and_then(normalize_location);
    let job_id = derive_job_id(item, external_path.as_deref());
    let identity = first_non_empty([
        job_id.as_deref(),
        job_url.as_deref(),
        title.as_deref(),
        Some("unknown"),
    ])
    .unwrap_or("unknown")
    .to_string();
    let mut record = CanonicalJobRecord::new(
        SourceAdapterLane::WorkdayCxsListingAdapter,
        source.company.clone(),
        title.unwrap_or_default(),
        job_url.unwrap_or_default(),
        job_id.unwrap_or_default(),
        format!("workday:{}:{}:{}", source.tenant, source.site, identity),
    );

    record.rank = Some(source.rank);
    record.location = location;
    record.posted_at_text = first_string(item, &["postedOn", "postedDate"]);
    record.raw_source_ref = Some(source.endpoint_url.clone());
    record.metadata = BTreeMap::from([
        ("tenant".to_string(), source.tenant.clone()),
        ("site".to_string(), source.site.clone()),
        ("endpoint_url".to_string(), source.endpoint_url.clone()),
    ]);
    if let Some(external_path) = external_path {
        record
            .metadata
            .insert("external_path".to_string(), external_path);
    }

    record
}

fn build_job_url(external_path: &str, source: &WorkdayCxsSource) -> Option<String> {
    if is_absolute_http_url(external_path) {
        return Some(external_path.to_string());
    }

    let base = Url::parse(&(source.landing_base_url()? + "/")).ok()?;
    base.join(external_path.trim_start_matches('/'))
        .ok()
        .map(|url| url.to_string())
}

fn derive_job_id(
    item: &serde_json::Map<String, Value>,
    external_path: Option<&str>,
) -> Option<String> {
    let explicit = first_string(
        item,
        &[
            "jobReqId",
            "jobRequisitionId",
            "requisitionId",
            "reqId",
            "jobId",
            "id",
        ],
    );
    if explicit.is_some() {
        return explicit;
    }

    if let Some(path) = external_path.and_then(path_tail) {
        if let Some((_, suffix)) = path.rsplit_once('_') {
            if !suffix.trim().is_empty() {
                return Some(suffix.trim().to_string());
            }
        }
    }

    let bullet_fields = item.get("bulletFields").and_then(Value::as_array)?;
    bullet_fields
        .iter()
        .filter_map(Value::as_str)
        .find(|value| looks_like_job_id(value))
        .map(normalize_ws)
}

fn normalize_location(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return Some(normalize_ws(text));
    }

    if let Some(items) = value.as_array() {
        let parts: Vec<String> = items
            .iter()
            .filter_map(|item| {
                item.as_str().map(normalize_ws).or_else(|| {
                    item.as_object().and_then(|object| {
                        first_string(object, &["displayName", "location", "name", "descriptor"])
                    })
                })
            })
            .collect();
        return (!parts.is_empty()).then(|| normalize_ws(&parts.join("; ")));
    }

    match value {
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

fn first_string(item: &serde_json::Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| item.get(*key).and_then(Value::as_str))
        .find(|value| !value.trim().is_empty())
        .map(normalize_ws)
}

fn looks_like_job_id(value: &str) -> bool {
    let normalized = value.trim();
    if normalized.is_empty() {
        return false;
    }
    if matches!(
        normalized.to_ascii_lowercase().as_str(),
        "regular" | "full time" | "part time" | "temporary" | "internship"
    ) {
        return false;
    }
    normalized.len() <= 40
        && normalized
            .chars()
            .any(|character| character.is_ascii_digit())
}

fn path_tail(value: &str) -> Option<&str> {
    let path = value.split(['?', '#']).next().unwrap_or(value);
    path.trim_end_matches('/').rsplit('/').next()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn source() -> WorkdayCxsSource {
        WorkdayCxsSource {
            rank: 44,
            company: "Example Workday".to_string(),
            endpoint_url: "https://example.myworkdayjobs.com/wday/cxs/example/External/jobs"
                .to_string(),
            tenant: "example".to_string(),
            site: "External".to_string(),
            careers_url: None,
        }
    }

    #[test]
    fn request_cache_key_is_stable_for_payload() {
        let mut request = WorkdayCxsRequest::new(
            "https://example.myworkdayjobs.com/wday/cxs/example/External/jobs",
        );
        request.search_text = "security".to_string();

        assert!(request
            .cache_key()
            .starts_with("workday-cxs:example.myworkdayjobs.com:/wday/cxs/example/External/jobs:"));
        assert_eq!(
            request.payload(),
            json!({
                "appliedFacets": {},
                "limit": DEFAULT_LIMIT,
                "offset": DEFAULT_OFFSET,
                "searchText": "security",
            })
        );
    }

    #[test]
    fn parses_workday_cxs_job_postings() {
        let payload = json!({
            "total": 2,
            "jobPostings": [
                {
                    "title": "Principal Security Engineer",
                    "externalPath": "/en-US/External/job/Principal-Security-Engineer_R123",
                    "locationsText": "Denver, CO",
                    "jobReqId": "R123",
                    "postedOn": "3 days ago"
                },
                {
                    "jobTitle": "Cloud Detection Engineer",
                    "jobPostingUrl": "https://example.myworkdayjobs.com/External/job/R456",
                    "locations": [{"displayName": "Remote"}],
                    "bulletFields": ["Regular", "R456"]
                }
            ]
        });

        let listing = parse_workday_cxs_listing(&payload, &source());

        assert_eq!(listing.total, Some(2));
        assert!(listing.parse_warnings.is_empty());
        assert_eq!(listing.jobs.len(), 2);
        assert_eq!(listing.jobs[0].source_job_id, "R123");
        assert_eq!(
            listing.jobs[0].url,
            "https://example.myworkdayjobs.com/External/en-US/External/job/Principal-Security-Engineer_R123"
        );
        assert_eq!(listing.jobs[0].dedupe_key, "workday:example:External:R123");
        assert_eq!(listing.jobs[1].source_job_id, "R456");
        assert_eq!(listing.jobs[1].location.as_deref(), Some("Remote"));
        assert!(listing.jobs.iter().all(|job| job.validate().is_empty()));
    }

    #[test]
    fn warns_when_postings_list_is_missing() {
        let listing = parse_workday_cxs_listing(&json!({"total": 0}), &source());

        assert_eq!(listing.jobs, Vec::new());
        assert_eq!(listing.parse_warnings, ["missing jobPostings or jobs list"]);
    }
}
