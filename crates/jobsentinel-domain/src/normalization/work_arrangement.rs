use serde::Deserialize;
use std::sync::LazyLock;

const WORK_ARRANGEMENT_TAXONOMY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../resources/taxonomies/work-arrangements.json"
));

static WORK_ARRANGEMENT_TAXONOMY: LazyLock<WorkArrangementTaxonomy> = LazyLock::new(|| {
    serde_json::from_str(WORK_ARRANGEMENT_TAXONOMY_JSON)
        .unwrap_or_else(|error| panic!("work arrangement taxonomy must be valid JSON: {error}"))
});

#[derive(Debug, Deserialize)]
struct WorkArrangementTaxonomy {
    #[serde(rename = "workArrangementIndicators")]
    indicators: WorkArrangementIndicators,
}

#[derive(Debug, Deserialize)]
struct WorkArrangementIndicators {
    hybrid: Vec<String>,
    remote: Vec<String>,
    onsite: Vec<String>,
}

/// Work arrangement inferred from structured source data or generic text.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemoteStatus {
    Remote,
    Hybrid,
    Onsite,
    Unspecified,
}

impl RemoteStatus {
    #[must_use]
    pub const fn is_remote(self) -> bool {
        matches!(self, Self::Remote)
    }
}

/// Infer a work arrangement from unstructured text.
#[must_use]
pub fn infer_remote_status(texts: &[&str]) -> RemoteStatus {
    let combined = texts.join(" ").to_lowercase();
    let indicators = &WORK_ARRANGEMENT_TAXONOMY.indicators;

    if contains_any(&combined, &indicators.hybrid) {
        RemoteStatus::Hybrid
    } else if contains_any(&combined, &indicators.remote) {
        RemoteStatus::Remote
    } else if contains_any(&combined, &indicators.onsite) {
        RemoteStatus::Onsite
    } else {
        RemoteStatus::Unspecified
    }
}

/// Prefer a structured source value and use text inference only when absent.
#[must_use]
pub fn resolve_remote_status(
    structured: Option<RemoteStatus>,
    fallback_texts: &[&str],
) -> RemoteStatus {
    structured.unwrap_or_else(|| infer_remote_status(fallback_texts))
}

fn contains_any(text: &str, indicators: &[String]) -> bool {
    indicators
        .iter()
        .any(|indicator| text.contains(indicator.as_str()))
}
