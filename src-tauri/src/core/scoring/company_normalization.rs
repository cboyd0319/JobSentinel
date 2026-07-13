use serde::Deserialize;
use std::sync::LazyLock;

const COMPANY_NORMALIZATION_TAXONOMY_JSON: &str =
    include_str!("../../../../resources/taxonomies/company-normalization.json");

static COMPANY_NORMALIZATION_TAXONOMY: LazyLock<CompanyNormalizationTaxonomy> =
    LazyLock::new(load_company_normalization_taxonomy);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompanyNormalizationTaxonomy {
    schema_version: u32,
    company_suffix_patterns: Vec<String>,
}

fn load_company_normalization_taxonomy() -> CompanyNormalizationTaxonomy {
    let taxonomy: CompanyNormalizationTaxonomy =
        match serde_json::from_str(COMPANY_NORMALIZATION_TAXONOMY_JSON) {
            Ok(taxonomy) => taxonomy,
            Err(error) => panic!("company normalization taxonomy must be valid JSON: {error}"),
        };

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported company normalization taxonomy schema version"
    );
    assert!(
        !taxonomy.company_suffix_patterns.is_empty(),
        "company normalization taxonomy must define suffix patterns"
    );
    for suffix in &taxonomy.company_suffix_patterns {
        assert!(
            suffix.starts_with(' ') && !suffix.trim().is_empty(),
            "company suffix patterns must start with a word-boundary space"
        );
    }

    taxonomy
}

pub(super) fn company_suffix_patterns() -> &'static [String] {
    &COMPANY_NORMALIZATION_TAXONOMY.company_suffix_patterns
}
