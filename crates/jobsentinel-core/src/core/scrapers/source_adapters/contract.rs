use std::collections::{BTreeMap, HashSet};

use url::Url;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SourceAdapterLane {
    WorkdayCxsListingAdapter,
    PhenomWidgetAdapter,
    SyscoRadancyTalentBrewHtmlAdapter,
    GreenhouseJobBoardApiAdapter,
    LeverPostingsApiAdapter,
    SmartRecruitersPostingApiAdapter,
    OracleFusionCareerAdapter,
    OracleTaleoCareerAdapter,
    RadancyTalentBrewSearchHtmlAdapter,
}

impl SourceAdapterLane {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::WorkdayCxsListingAdapter => "WorkdayCxsListingAdapter",
            Self::PhenomWidgetAdapter => "PhenomWidgetAdapter",
            Self::SyscoRadancyTalentBrewHtmlAdapter => "SyscoRadancyTalentBrewHtmlAdapter",
            Self::GreenhouseJobBoardApiAdapter => "GreenhouseJobBoardApiAdapter",
            Self::LeverPostingsApiAdapter => "LeverPostingsApiAdapter",
            Self::SmartRecruitersPostingApiAdapter => "SmartRecruitersPostingApiAdapter",
            Self::OracleFusionCareerAdapter => "OracleFusionCareerAdapter",
            Self::OracleTaleoCareerAdapter => "OracleTaleoCareerAdapter",
            Self::RadancyTalentBrewSearchHtmlAdapter => "RadancyTalentBrewSearchHtmlAdapter",
        }
    }

    pub const fn source_platform(self) -> SourcePlatform {
        match self {
            Self::WorkdayCxsListingAdapter => SourcePlatform::WorkdayCxs,
            Self::PhenomWidgetAdapter => SourcePlatform::PhenomWidget,
            Self::SyscoRadancyTalentBrewHtmlAdapter => SourcePlatform::SyscoRadancyTalentBrewHtml,
            Self::GreenhouseJobBoardApiAdapter => SourcePlatform::GreenhouseJobBoardApi,
            Self::LeverPostingsApiAdapter => SourcePlatform::LeverPostingsApi,
            Self::SmartRecruitersPostingApiAdapter => SourcePlatform::SmartRecruitersPostingApi,
            Self::OracleFusionCareerAdapter => SourcePlatform::OracleFusionRecruitingCeApi,
            Self::OracleTaleoCareerAdapter => SourcePlatform::OracleTaleoPublicHtml,
            Self::RadancyTalentBrewSearchHtmlAdapter => SourcePlatform::RadancyTalentBrewSearchHtml,
        }
    }

    pub const fn fetch_contract(self) -> FetchContract {
        match self {
            Self::WorkdayCxsListingAdapter => FetchContract {
                method: HttpMethod::Post,
                static_http_only: true,
                respect_robots: true,
                browser_execution: false,
                response_body_persisted: false,
                job_detail_crawl: false,
                workday_apply_page_fetch: false,
                workday_cxs_listing_fetch: true,
            },
            Self::PhenomWidgetAdapter | Self::SmartRecruitersPostingApiAdapter => FetchContract {
                method: HttpMethod::Post,
                static_http_only: true,
                respect_robots: true,
                browser_execution: false,
                response_body_persisted: false,
                job_detail_crawl: false,
                workday_apply_page_fetch: false,
                workday_cxs_listing_fetch: false,
            },
            _ => FetchContract {
                method: HttpMethod::Get,
                static_http_only: true,
                respect_robots: true,
                browser_execution: false,
                response_body_persisted: false,
                job_detail_crawl: false,
                workday_apply_page_fetch: false,
                workday_cxs_listing_fetch: false,
            },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SourcePlatform {
    WorkdayCxs,
    PhenomWidget,
    SyscoRadancyTalentBrewHtml,
    GreenhouseJobBoardApi,
    LeverPostingsApi,
    SmartRecruitersPostingApi,
    OracleFusionRecruitingCeApi,
    OracleTaleoPublicHtml,
    RadancyTalentBrewSearchHtml,
}

impl SourcePlatform {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::WorkdayCxs => "workday_cxs",
            Self::PhenomWidget => "phenom_widget",
            Self::SyscoRadancyTalentBrewHtml => "sysco_radancy_talentbrew_html",
            Self::GreenhouseJobBoardApi => "greenhouse_job_board_api",
            Self::LeverPostingsApi => "lever_postings_api",
            Self::SmartRecruitersPostingApi => "smartrecruiters_posting_api",
            Self::OracleFusionRecruitingCeApi => "oracle_fusion_recruiting_ce_api",
            Self::OracleTaleoPublicHtml => "oracle_taleo_public_html",
            Self::RadancyTalentBrewSearchHtml => "radancy_talentbrew_search_html",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum HttpMethod {
    Get,
    Post,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FetchContract {
    pub method: HttpMethod,
    pub static_http_only: bool,
    pub respect_robots: bool,
    pub browser_execution: bool,
    pub response_body_persisted: bool,
    pub job_detail_crawl: bool,
    pub workday_apply_page_fetch: bool,
    pub workday_cxs_listing_fetch: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CanonicalJobRecord {
    pub adapter_lane: SourceAdapterLane,
    pub source_platform: SourcePlatform,
    pub company: String,
    pub rank: Option<u16>,
    pub title: String,
    pub location: Option<String>,
    pub url: String,
    pub source_job_id: String,
    pub dedupe_key: String,
    pub posted_at_text: Option<String>,
    pub category: Option<String>,
    pub raw_source_ref: Option<String>,
    pub source_artifact: Option<String>,
    pub metadata: BTreeMap<String, String>,
}

impl CanonicalJobRecord {
    pub fn new(
        adapter_lane: SourceAdapterLane,
        company: impl Into<String>,
        title: impl Into<String>,
        url: impl Into<String>,
        source_job_id: impl Into<String>,
        dedupe_key: impl Into<String>,
    ) -> Self {
        Self {
            adapter_lane,
            source_platform: adapter_lane.source_platform(),
            company: company.into(),
            rank: None,
            title: title.into(),
            location: None,
            url: url.into(),
            source_job_id: source_job_id.into(),
            dedupe_key: dedupe_key.into(),
            posted_at_text: None,
            category: None,
            raw_source_ref: None,
            source_artifact: None,
            metadata: BTreeMap::new(),
        }
    }

    pub fn validate(&self) -> Vec<String> {
        let mut errors = Vec::new();
        if self.company.trim().is_empty() {
            errors.push("missing company".to_string());
        }
        if self.title.trim().is_empty() {
            errors.push("missing title".to_string());
        }
        if self.url.trim().is_empty() {
            errors.push("missing url".to_string());
        } else if !is_absolute_http_url(&self.url) {
            errors.push("url is not absolute HTTP(S)".to_string());
        }
        if self.source_job_id.trim().is_empty() {
            errors.push("missing source_job_id".to_string());
        }
        if self.dedupe_key.trim().is_empty() {
            errors.push("missing dedupe_key".to_string());
        }
        if self.source_platform != self.adapter_lane.source_platform() {
            errors.push(format!(
                "source_platform {} does not match adapter_lane {}",
                self.source_platform.as_str(),
                self.adapter_lane.as_str()
            ));
        }
        errors
    }
}

pub fn validate_canonical_records(records: &[CanonicalJobRecord]) -> Vec<String> {
    let mut errors = Vec::new();
    let mut seen_dedupe_keys: HashSet<&str> = HashSet::new();

    for (index, record) in records.iter().enumerate() {
        for error in record.validate() {
            errors.push(format!(
                "row {} {} {}: {}",
                index + 1,
                record.adapter_lane.as_str(),
                record.company,
                error
            ));
        }

        if !record.dedupe_key.is_empty() && !seen_dedupe_keys.insert(record.dedupe_key.as_str()) {
            errors.push(format!(
                "row {} duplicate dedupe_key {}",
                index + 1,
                record.dedupe_key
            ));
        }
    }

    errors
}

fn is_absolute_http_url(value: &str) -> bool {
    Url::parse(value)
        .ok()
        .is_some_and(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_source_platforms_and_fetch_contracts() {
        let lanes = [
            SourceAdapterLane::WorkdayCxsListingAdapter,
            SourceAdapterLane::PhenomWidgetAdapter,
            SourceAdapterLane::SyscoRadancyTalentBrewHtmlAdapter,
            SourceAdapterLane::GreenhouseJobBoardApiAdapter,
            SourceAdapterLane::LeverPostingsApiAdapter,
            SourceAdapterLane::SmartRecruitersPostingApiAdapter,
            SourceAdapterLane::OracleFusionCareerAdapter,
            SourceAdapterLane::OracleTaleoCareerAdapter,
            SourceAdapterLane::RadancyTalentBrewSearchHtmlAdapter,
        ];
        let names: HashSet<_> = lanes.iter().map(|lane| lane.as_str()).collect();
        let platforms: HashSet<_> = lanes
            .iter()
            .map(|lane| lane.source_platform().as_str())
            .collect();

        assert_eq!(names.len(), lanes.len());
        assert_eq!(platforms.len(), lanes.len());

        let lane = lanes[0];
        let contract = lane.fetch_contract();

        assert_eq!(lane.source_platform(), SourcePlatform::WorkdayCxs);
        assert_eq!(lane.source_platform().as_str(), "workday_cxs");
        assert_eq!(contract.method, HttpMethod::Post);
        assert!(contract.static_http_only);
        assert!(contract.respect_robots);
        assert!(!contract.browser_execution);
        assert!(!contract.response_body_persisted);
        assert!(contract.workday_cxs_listing_fetch);
    }

    #[test]
    fn validates_canonical_records() {
        let record = CanonicalJobRecord::new(
            SourceAdapterLane::PhenomWidgetAdapter,
            "Example",
            "Security Engineer",
            "https://jobs.example.com/123",
            "123",
            "phenom:EXAMPLE:123",
        );

        assert!(record.validate().is_empty());
    }

    #[test]
    fn rejects_invalid_records_and_duplicate_dedupe_keys() {
        let mut invalid = CanonicalJobRecord::new(
            SourceAdapterLane::PhenomWidgetAdapter,
            "",
            "",
            "/relative/job",
            "",
            "same",
        );
        invalid.source_platform = SourcePlatform::WorkdayCxs;
        let duplicate = CanonicalJobRecord::new(
            SourceAdapterLane::PhenomWidgetAdapter,
            "Example",
            "Security Engineer",
            "https://jobs.example.com/123",
            "123",
            "same",
        );

        let errors = validate_canonical_records(&[invalid, duplicate]);

        assert!(errors.iter().any(|error| error.contains("missing company")));
        assert!(errors
            .iter()
            .any(|error| error.contains("url is not absolute HTTP(S)")));
        assert!(errors
            .iter()
            .any(|error| error.contains("source_platform workday_cxs")));
        assert!(errors
            .iter()
            .any(|error| error.contains("duplicate dedupe_key same")));
    }
}
