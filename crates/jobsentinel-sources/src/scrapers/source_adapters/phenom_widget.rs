use std::collections::BTreeMap;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use url::Url;

use super::contract::{CanonicalJobRecord, SourceAdapterLane};
use super::support::{
    first_non_empty, first_string, hex_prefix, is_absolute_http_url, normalize_ws, path_tail,
};

pub(super) const DEFAULT_SIZE: u16 = 20;
pub(super) const DEFAULT_FROM_OFFSET: u32 = 0;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct PhenomWidgetSource {
    pub rank: u16,
    pub company: String,
    pub widget_url: String,
    pub ref_num: String,
    pub locale: String,
    pub base_url: String,
    pub careers_url: Option<String>,
}

impl PhenomWidgetSource {
    pub(super) fn referer(&self) -> Option<String> {
        Url::parse(&(self.base_url.trim_end_matches('/').to_string() + "/"))
            .ok()?
            .join("search-results")
            .ok()
            .map(|url| url.to_string())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct PhenomWidgetRequest {
    pub widget_url: String,
    pub ref_num: String,
    pub locale: String,
    pub from_offset: u32,
    pub size: u16,
    pub keywords: String,
    pub selected_fields: Value,
    pub location_data: Value,
}

impl PhenomWidgetRequest {
    pub(super) fn new(
        widget_url: impl Into<String>,
        ref_num: impl Into<String>,
        locale: impl Into<String>,
    ) -> Self {
        Self {
            widget_url: widget_url.into(),
            ref_num: ref_num.into(),
            locale: locale.into(),
            from_offset: DEFAULT_FROM_OFFSET,
            size: DEFAULT_SIZE,
            keywords: String::new(),
            selected_fields: json!({}),
            location_data: json!({}),
        }
    }

    pub(super) fn payload(&self) -> Value {
        json!({
            "refNum": self.ref_num,
            "locale": self.locale,
            "ddoKey": "refineSearch",
            "sortBy": "",
            "subsearch": "",
            "from": self.from_offset,
            "jobs": true,
            "counts": true,
            "all_fields": ["category", "country", "state", "city"],
            "size": self.size,
            "clearAll": false,
            "jdsource": "facets",
            "isSliderEnable": false,
            "pageName": "search-results",
            "siteType": "external",
            "keywords": self.keywords,
            "global": true,
            "selected_fields": self.selected_fields,
            "locationData": self.location_data,
        })
    }

    pub(super) fn cache_key(&self) -> String {
        let payload = serde_json::to_vec(&self.payload()).unwrap_or_default();
        let digest = Sha256::digest(payload);
        let prefix = hex_prefix(&digest, 16);
        let parsed = Url::parse(&self.widget_url).ok();
        let host = parsed
            .as_ref()
            .and_then(|url| url.host_str())
            .unwrap_or("invalid-host");
        let path = parsed.as_ref().map(Url::path).unwrap_or("");

        format!(
            "phenom-widget:{host}:{path}:{}:{}:{prefix}",
            self.ref_num, self.locale
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct PhenomWidgetListing {
    pub total: Option<u64>,
    pub jobs: Vec<CanonicalJobRecord>,
    pub parse_warnings: Vec<String>,
}

pub(super) fn parse_phenom_widget_listing(
    payload: &Value,
    source: &PhenomWidgetSource,
) -> PhenomWidgetListing {
    let Some(refine_search) = payload.get("refineSearch").and_then(Value::as_object) else {
        return failed_parse("missing refineSearch object");
    };
    let Some(data) = refine_search.get("data").and_then(Value::as_object) else {
        return failed_parse("missing refineSearch.data object");
    };
    let Some(postings) = data.get("jobs").and_then(Value::as_array) else {
        return failed_parse("missing refineSearch.data.jobs list");
    };

    let jobs = postings
        .iter()
        .filter_map(Value::as_object)
        .map(|item| normalize_phenom_job(item, source))
        .collect();

    PhenomWidgetListing {
        total: parse_total(refine_search.get("totalHits")),
        jobs,
        parse_warnings: Vec::new(),
    }
}

fn failed_parse(error: &str) -> PhenomWidgetListing {
    PhenomWidgetListing {
        total: None,
        jobs: Vec::new(),
        parse_warnings: vec![error.to_string()],
    }
}

fn normalize_phenom_job(
    item: &serde_json::Map<String, Value>,
    source: &PhenomWidgetSource,
) -> CanonicalJobRecord {
    let title = first_string(item, &["title", "jobTitle"]);
    let apply_url = first_string(item, &["applyUrl", "jobUrl", "url"]);
    let job_url = apply_url
        .as_deref()
        .and_then(|url| normalize_job_url(url, source));
    let location = item
        .get("location")
        .or_else(|| item.get("cityStateCountry"))
        .or_else(|| item.get("cityState"))
        .and_then(normalize_location);
    let job_id = derive_job_id(item, apply_url.as_deref());
    let job_seq_no = first_string(item, &["jobSeqNo"]);
    let identity = first_non_empty([
        job_id.as_deref(),
        job_seq_no.as_deref(),
        job_url.as_deref(),
        title.as_deref(),
        Some("unknown"),
    ])
    .unwrap_or("unknown")
    .to_string();
    let mut record = CanonicalJobRecord::new(
        SourceAdapterLane::PhenomWidgetAdapter,
        source.company.clone(),
        title.unwrap_or_default(),
        job_url.unwrap_or_default(),
        job_id.unwrap_or_default(),
        format!("phenom:{}:{}", source.ref_num, identity),
    );

    record.rank = Some(source.rank);
    record.location = location;
    record.posted_at_text = first_string(item, &["postedDate", "dateCreated"]);
    record.category = first_string(item, &["category"]);
    record.raw_source_ref = Some(source.widget_url.clone());
    record.metadata = BTreeMap::from([
        ("ref_num".to_string(), source.ref_num.clone()),
        ("locale".to_string(), source.locale.clone()),
        ("widget_url".to_string(), source.widget_url.clone()),
    ]);
    if let Some(job_seq_no) = job_seq_no {
        record.metadata.insert("job_seq_no".to_string(), job_seq_no);
    }
    if let Some(external_apply) = item.get("externalApply").and_then(Value::as_bool) {
        record
            .metadata
            .insert("external_apply".to_string(), external_apply.to_string());
    }

    record
}

fn normalize_job_url(value: &str, source: &PhenomWidgetSource) -> Option<String> {
    if is_absolute_http_url(value) {
        return Some(value.to_string());
    }

    let base = Url::parse(&(source.base_url.trim_end_matches('/').to_string() + "/")).ok()?;
    base.join(value.trim_start_matches('/'))
        .ok()
        .map(|url| url.to_string())
}

fn derive_job_id(item: &serde_json::Map<String, Value>, url: Option<&str>) -> Option<String> {
    let explicit = first_string(item, &["jobId", "reqId", "requisitionId", "id"]);
    if explicit.is_some() {
        return explicit;
    }

    if let Some(seq_no) = first_string(item, &["jobSeqNo"]) {
        return Some(seq_no);
    }

    if let Some(path) = url.and_then(path_tail) {
        let tail = path.trim_end_matches("/apply");
        if let Some((_, suffix)) = tail.rsplit_once('_') {
            if !suffix.trim().is_empty() {
                return Some(suffix.trim().to_string());
            }
        }
    }

    None
}

fn normalize_location(value: &Value) -> Option<String> {
    if let Some(text) = value.as_str() {
        return Some(normalize_ws(text));
    }

    if let Some(items) = value.as_array() {
        let parts: Vec<String> = items
            .iter()
            .filter_map(|item| item.as_str().map(normalize_ws))
            .collect();
        return (!parts.is_empty()).then(|| parts.join("; "));
    }

    match value {
        Value::Number(number) => Some(number.to_string()),
        Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

fn parse_total(value: Option<&Value>) -> Option<u64> {
    value.and_then(|value| {
        value.as_u64().or_else(|| {
            value
                .as_str()
                .filter(|text| text.chars().all(|character| character.is_ascii_digit()))
                .and_then(|text| text.parse::<u64>().ok())
        })
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn source() -> PhenomWidgetSource {
        PhenomWidgetSource {
            rank: 12,
            company: "Example Phenom".to_string(),
            widget_url: "https://jobs.example.com/widgets".to_string(),
            ref_num: "EXAMPLE".to_string(),
            locale: "en_us".to_string(),
            base_url: "https://jobs.example.com".to_string(),
            careers_url: None,
        }
    }

    #[test]
    fn request_payload_matches_refine_search_shape() {
        let request =
            PhenomWidgetRequest::new("https://jobs.example.com/widgets", "EXAMPLE", "en_us");

        assert_eq!(
            source().referer().as_deref(),
            Some("https://jobs.example.com/search-results")
        );
        assert!(request
            .cache_key()
            .starts_with("phenom-widget:jobs.example.com:/widgets:EXAMPLE:en_us:"));
        assert_eq!(request.payload()["ddoKey"], "refineSearch");
        assert_eq!(request.payload()["jobs"], true);
        assert_eq!(request.payload()["refNum"], "EXAMPLE");
    }

    #[test]
    fn parses_phenom_widget_jobs() {
        let payload = json!({
            "refineSearch": {
                "totalHits": "2",
                "data": {
                    "jobs": [
                        {
                            "title": "Staff Security Engineer",
                            "applyUrl": "/job/Denver-Staff-Security-Engineer_R789",
                            "location": "Denver, CO",
                            "jobId": "R789",
                            "postedDate": "Today",
                            "category": "Security",
                            "externalApply": true
                        },
                        {
                            "jobTitle": "Cloud Detection Engineer",
                            "jobUrl": "https://jobs.example.com/job/Cloud_R456/apply",
                            "cityStateCountry": "Remote",
                            "jobSeqNo": "456"
                        }
                    ]
                }
            }
        });

        let listing = parse_phenom_widget_listing(&payload, &source());

        assert_eq!(listing.total, Some(2));
        assert!(listing.parse_warnings.is_empty());
        assert_eq!(listing.jobs.len(), 2);
        assert_eq!(listing.jobs[0].source_job_id, "R789");
        assert_eq!(
            listing.jobs[0].url,
            "https://jobs.example.com/job/Denver-Staff-Security-Engineer_R789"
        );
        assert_eq!(listing.jobs[0].dedupe_key, "phenom:EXAMPLE:R789");
        assert_eq!(listing.jobs[0].category.as_deref(), Some("Security"));
        assert_eq!(listing.jobs[1].source_job_id, "456");
        assert_eq!(listing.jobs[1].location.as_deref(), Some("Remote"));
        assert!(listing.jobs.iter().all(|job| job.validate().is_empty()));
    }

    #[test]
    fn warns_when_refine_search_shape_is_missing() {
        let listing = parse_phenom_widget_listing(&json!({}), &source());

        assert_eq!(listing.jobs, Vec::new());
        assert_eq!(listing.parse_warnings, ["missing refineSearch object"]);
    }
}
