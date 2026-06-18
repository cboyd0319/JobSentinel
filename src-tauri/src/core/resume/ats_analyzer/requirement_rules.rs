use std::collections::HashSet;

use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;

const TAXONOMY_JSON: &str = include_str!("../../../../../src/shared/resumeKeywordTaxonomy.json");

#[derive(Debug, Deserialize)]
struct ResumeKeywordTaxonomy {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    #[serde(rename = "humanLanguages")]
    human_languages: Vec<String>,
    #[serde(rename = "bulletPowerWords")]
    bullet_power_words: Vec<String>,
    #[serde(rename = "physicalWeightRequirements")]
    physical_weight_requirements: PhysicalWeightRequirements,
    #[serde(rename = "credentialKeywordGroups")]
    credential_keyword_groups: Vec<CredentialKeywordGroup>,
    #[serde(rename = "supplementalKeywordGroups")]
    supplemental_keyword_groups: Vec<SupplementalKeywordGroup>,
}

#[derive(Debug, Deserialize)]
struct PhysicalWeightRequirements {
    #[serde(rename = "optionalAmountPrefixPattern")]
    optional_amount_prefix_pattern: String,
    #[serde(rename = "unitPattern")]
    unit_pattern: String,
    #[serde(rename = "searchUnits")]
    search_units: Vec<String>,
    families: Vec<PhysicalWeightFamily>,
}

#[derive(Debug, Deserialize)]
struct PhysicalWeightFamily {
    #[allow(dead_code)]
    id: String,
    #[serde(rename = "requirementPattern")]
    requirement_pattern: String,
    #[serde(rename = "evidencePrefixes")]
    evidence_prefixes: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SupplementalKeywordGroup {
    canonical: String,
    terms: Vec<String>,
    #[serde(default, rename = "catalogTerms")]
    catalog_terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct CredentialKeywordGroup {
    canonical: String,
    terms: Vec<String>,
    #[serde(default, rename = "requirementTerms")]
    requirement_terms: Vec<String>,
    #[serde(
        default = "default_preserve_requirement_text",
        rename = "preserveRequirementText"
    )]
    preserve_requirement_text: bool,
    #[serde(default, rename = "catalogTerms")]
    catalog_terms: Vec<String>,
}

struct CompiledPhysicalWeightFamily {
    regex: Regex,
    evidence_prefixes: Vec<String>,
}

struct CompiledSupplementalKeywordGroup {
    canonical: String,
    regexes: Vec<Regex>,
}

struct CompiledCredentialKeywordGroup {
    canonical: String,
    preserve_requirement_text: bool,
    requirement_regexes: Vec<(String, Regex)>,
}

static TAXONOMY: Lazy<ResumeKeywordTaxonomy> = Lazy::new(|| {
    let taxonomy: ResumeKeywordTaxonomy = serde_json::from_str(TAXONOMY_JSON)
        .expect("shared resume keyword taxonomy JSON must be valid");
    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported shared resume keyword taxonomy schema"
    );
    taxonomy
});

static PHYSICAL_WEIGHT_RE: Lazy<Regex> = Lazy::new(|| {
    let rules = &TAXONOMY.physical_weight_requirements;
    let family_pattern = rules
        .families
        .iter()
        .map(|family| family.requirement_pattern.as_str())
        .collect::<Vec<_>>()
        .join("|");
    Regex::new(&format!(
        r"(?i)\b(?:{family_pattern}){}\s+\d+\s*{}\b",
        rules.optional_amount_prefix_pattern, rules.unit_pattern
    ))
    .expect("shared physical-weight requirement regex must compile")
});

static PHYSICAL_WEIGHT_FAMILY_REGEXES: Lazy<Vec<CompiledPhysicalWeightFamily>> = Lazy::new(|| {
    let rules = &TAXONOMY.physical_weight_requirements;
    rules
        .families
        .iter()
        .map(|family| CompiledPhysicalWeightFamily {
            regex: Regex::new(&format!(
                r"(?i)\b{}{}\s+(\d+)\s*{}\b",
                family.requirement_pattern,
                rules.optional_amount_prefix_pattern,
                rules.unit_pattern
            ))
            .expect("shared physical-weight family regex must compile"),
            evidence_prefixes: family.evidence_prefixes.clone(),
        })
        .collect()
});

static SUPPLEMENTAL_KEYWORD_GROUPS: Lazy<Vec<CompiledSupplementalKeywordGroup>> = Lazy::new(|| {
    TAXONOMY
        .supplemental_keyword_groups
        .iter()
        .map(|group| CompiledSupplementalKeywordGroup {
            canonical: group.canonical.clone(),
            regexes: group
                .terms
                .iter()
                .map(|term| {
                    Regex::new(&format!(r"(?i)\b{}\b", literal_term_pattern(term)))
                        .expect("shared supplemental keyword regex must compile")
                })
                .collect(),
        })
        .collect()
});

static CREDENTIAL_KEYWORD_GROUPS: Lazy<Vec<CompiledCredentialKeywordGroup>> = Lazy::new(|| {
    TAXONOMY
        .credential_keyword_groups
        .iter()
        .map(|group| {
            let requirement_terms = if group.requirement_terms.is_empty() {
                std::iter::once(&group.canonical)
                    .chain(group.terms.iter())
                    .collect::<Vec<_>>()
            } else {
                group.requirement_terms.iter().collect::<Vec<_>>()
            };

            CompiledCredentialKeywordGroup {
                canonical: group.canonical.clone(),
                preserve_requirement_text: group.preserve_requirement_text,
                requirement_regexes: requirement_terms
                    .into_iter()
                    .map(|term| (term.clone(), whole_term_regex(term)))
                    .collect(),
            }
        })
        .collect()
});

pub(super) fn extract_physical_weight_keywords(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut keywords = Vec::new();

    for matched in PHYSICAL_WEIGHT_RE.find_iter(text) {
        let keyword = matched.as_str().to_lowercase();
        if seen.insert(keyword.clone()) {
            keywords.push(keyword);
        }
    }

    keywords
}

pub(super) fn is_physical_weight_requirement(keyword_lower: &str) -> bool {
    PHYSICAL_WEIGHT_RE.is_match(keyword_lower)
}

pub(super) fn physical_weight_search_terms(keyword_lower: &str) -> Vec<String> {
    let Some((amount, evidence_prefixes)) = physical_weight_match(keyword_lower) else {
        return Vec::new();
    };
    let mut terms = Vec::new();

    for prefix in evidence_prefixes {
        for unit in &TAXONOMY.physical_weight_requirements.search_units {
            let term = format!("{prefix} {amount} {unit}");
            if !terms.iter().any(|existing| existing == &term) {
                terms.push(term);
            }
        }
    }

    terms
}

pub(super) fn human_languages() -> &'static [String] {
    &TAXONOMY.human_languages
}

pub(super) fn bullet_power_words() -> &'static [String] {
    &TAXONOMY.bullet_power_words
}

pub(super) fn extract_supplemental_keywords(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut keywords = Vec::new();

    for group in SUPPLEMENTAL_KEYWORD_GROUPS.iter() {
        if group.regexes.iter().any(|regex| regex.is_match(text))
            && seen.insert(group.canonical.clone())
        {
            keywords.push(group.canonical.clone());
        }
    }

    keywords
}

pub(super) fn supplemental_keyword_catalog_terms() -> Vec<String> {
    let mut seen = HashSet::new();
    let mut terms = Vec::new();

    for group in &TAXONOMY.supplemental_keyword_groups {
        let catalog_terms: &[String] = if group.catalog_terms.is_empty() {
            std::slice::from_ref(&group.canonical)
        } else {
            &group.catalog_terms
        };

        for term in catalog_terms {
            if seen.insert(term.clone()) {
                terms.push(term.clone());
            }
        }
    }

    terms
}

pub(super) fn supplemental_keyword_search_terms(keyword_lower: &str) -> Vec<String> {
    let Some(group) = TAXONOMY.supplemental_keyword_groups.iter().find(|group| {
        group.canonical == keyword_lower || group.terms.iter().any(|term| term == keyword_lower)
    }) else {
        return Vec::new();
    };

    let mut terms = Vec::new();
    for term in std::iter::once(&group.canonical).chain(group.terms.iter()) {
        if !terms.iter().any(|existing| existing == term) {
            terms.push(term.clone());
        }
    }
    terms
}

pub(super) fn extract_credential_keywords(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut keywords = Vec::new();

    for group in CREDENTIAL_KEYWORD_GROUPS.iter() {
        let matched_term = group
            .requirement_regexes
            .iter()
            .find(|(_, regex)| regex.is_match(text))
            .map(|(term, _)| term);
        let Some(matched_term) = matched_term else {
            continue;
        };

        let keyword = if group.preserve_requirement_text {
            matched_term.clone()
        } else {
            group.canonical.clone()
        };
        if seen.insert(keyword.clone()) {
            keywords.push(keyword);
        }
    }

    keywords
}

pub(super) fn credential_keyword_search_terms(keyword_lower: &str) -> Vec<String> {
    let Some(group) = TAXONOMY.credential_keyword_groups.iter().find(|group| {
        group.canonical == keyword_lower || group.terms.iter().any(|term| term == keyword_lower)
    }) else {
        return Vec::new();
    };

    let mut terms = Vec::new();
    for term in std::iter::once(&group.canonical).chain(group.terms.iter()) {
        if !terms.iter().any(|existing| existing == term) {
            terms.push(term.clone());
        }
    }
    terms
}

pub(super) fn credential_keyword_catalog_terms() -> Vec<String> {
    let mut seen = HashSet::new();
    let mut terms = Vec::new();

    for group in &TAXONOMY.credential_keyword_groups {
        let catalog_terms = if group.catalog_terms.is_empty() {
            std::iter::once(&group.canonical).collect::<Vec<_>>()
        } else {
            group.catalog_terms.iter().collect::<Vec<_>>()
        };

        for term in catalog_terms {
            if seen.insert(term.clone()) {
                terms.push(term.clone());
            }
        }
    }

    terms
}

pub(super) fn specific_credential_keywords() -> HashSet<String> {
    let mut keywords = HashSet::new();

    for group in &TAXONOMY.credential_keyword_groups {
        keywords.insert(group.canonical.clone());
        for term in group
            .terms
            .iter()
            .chain(group.requirement_terms.iter())
            .chain(group.catalog_terms.iter())
        {
            keywords.insert(term.clone());
        }
    }

    keywords
}

pub(super) fn is_credential_keyword(keyword_lower: &str) -> bool {
    TAXONOMY.credential_keyword_groups.iter().any(|group| {
        group.canonical == keyword_lower
            || group.terms.iter().any(|term| term == keyword_lower)
            || group
                .requirement_terms
                .iter()
                .any(|term| term == keyword_lower)
            || group.catalog_terms.iter().any(|term| term == keyword_lower)
    })
}

fn physical_weight_match(keyword_lower: &str) -> Option<(String, &[String])> {
    for family in PHYSICAL_WEIGHT_FAMILY_REGEXES.iter() {
        let Some(captures) = family.regex.captures(keyword_lower) else {
            continue;
        };
        let amount = captures.get(1)?.as_str().to_string();
        return Some((amount, &family.evidence_prefixes));
    }

    None
}

fn literal_term_pattern(term: &str) -> String {
    regex::escape(term).replace(r"\ ", r"[\s-]+")
}

fn whole_term_regex(term: &str) -> Regex {
    Regex::new(&format!(
        r"(?i)(?:^|[^[:alnum:]_]){}(?:$|[^[:alnum:]_])",
        literal_term_pattern(term)
    ))
    .expect("shared credential keyword regex must compile")
}

fn default_preserve_requirement_text() -> bool {
    true
}
