use regex::Regex;
use serde::Deserialize;
use std::sync::LazyLock;

const JOB_POSTING_RISK_TAXONOMY_JSON: &str =
    include_str!("../../../../resources/taxonomies/job-posting-risk.json");

static JOB_POSTING_RISK_TAXONOMY: LazyLock<JobPostingRiskTaxonomy> =
    LazyLock::new(load_job_posting_risk_taxonomy);

static GENERIC_PHRASES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(&JOB_POSTING_RISK_TAXONOMY.generic_phrases, "generic phrase")
});

static VAGUE_TITLES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.vague_title_patterns,
        "vague title",
    )
});

static UNREALISTIC_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.unrealistic_requirement_patterns,
        "unrealistic requirement",
    )
});

static URGENCY_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(&JOB_POSTING_RISK_TAXONOMY.urgency_patterns, "urgency")
});

static PROMOTIONAL_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.promotional_patterns,
        "promotional",
    )
});

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobPostingRiskTaxonomy {
    schema_version: u32,
    generic_phrases: Vec<String>,
    vague_title_patterns: Vec<String>,
    unrealistic_requirement_patterns: Vec<String>,
    urgency_patterns: Vec<String>,
    promotional_patterns: Vec<String>,
    substance_keywords: Vec<String>,
    fluff_keywords: Vec<String>,
    ghost_templates: Vec<String>,
}

pub(super) fn generic_phrases() -> &'static [Regex] {
    &GENERIC_PHRASES
}

pub(super) fn vague_titles() -> &'static [Regex] {
    &VAGUE_TITLES
}

pub(super) fn unrealistic_patterns() -> &'static [Regex] {
    &UNREALISTIC_PATTERNS
}

pub(super) fn urgency_patterns() -> &'static [Regex] {
    &URGENCY_PATTERNS
}

pub(super) fn promotional_patterns() -> &'static [Regex] {
    &PROMOTIONAL_PATTERNS
}

pub(super) fn substance_keywords() -> &'static [String] {
    &JOB_POSTING_RISK_TAXONOMY.substance_keywords
}

pub(super) fn fluff_keywords() -> &'static [String] {
    &JOB_POSTING_RISK_TAXONOMY.fluff_keywords
}

pub(super) fn ghost_templates() -> &'static [String] {
    &JOB_POSTING_RISK_TAXONOMY.ghost_templates
}

fn load_job_posting_risk_taxonomy() -> JobPostingRiskTaxonomy {
    let taxonomy: JobPostingRiskTaxonomy =
        match serde_json::from_str(JOB_POSTING_RISK_TAXONOMY_JSON) {
            Ok(taxonomy) => taxonomy,
            Err(error) => panic!("job posting risk taxonomy must be valid JSON: {error}"),
        };

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported job posting risk taxonomy schema version"
    );

    taxonomy
}

fn compile_case_insensitive_patterns(patterns: &[String], label: &str) -> Vec<Regex> {
    patterns
        .iter()
        .map(|pattern| {
            let case_insensitive_pattern = format!("(?i){pattern}");
            match Regex::new(&case_insensitive_pattern) {
                Ok(regex) => regex,
                Err(error) => panic!("invalid {label} regex pattern {pattern:?}: {error}"),
            }
        })
        .collect()
}
