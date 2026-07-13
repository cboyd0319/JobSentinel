use std::collections::HashSet;
use std::sync::LazyLock;

use regex::Regex;
use serde::Deserialize;

const TAXONOMY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../resources/taxonomies/resume-keywords.json"
));

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
    #[serde(rename = "conservativeSearchTermGroups")]
    conservative_search_term_groups: Vec<Vec<String>>,
    #[serde(rename = "canonicalRequirementKeywordAliases")]
    canonical_requirement_keyword_aliases: Vec<CanonicalRequirementKeywordAlias>,
    #[serde(rename = "baseIndustryCatalogTerms")]
    base_industry_catalog_terms: Vec<String>,
    #[serde(rename = "roleSpecificEvidencePrompts")]
    role_specific_evidence_prompts: Vec<RoleSpecificEvidencePrompt>,
    #[serde(rename = "hardConstraintKeywordSets")]
    hard_constraint_keyword_sets: HardConstraintKeywordSets,
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
struct CanonicalRequirementKeywordAlias {
    canonical: String,
    terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RoleSpecificEvidencePrompt {
    id: String,
    prompt: String,
    terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct HardConstraintKeywordSets {
    #[serde(rename = "degreeEquivalentExclusion")]
    degree_equivalent_exclusion: HardConstraintKeywordSet,
    citizenship: HardConstraintKeywordSet,
    #[serde(rename = "workAuthorization")]
    work_authorization: HardConstraintKeywordSet,
    #[serde(rename = "securityClearance")]
    security_clearance: HardConstraintKeywordSet,
    #[serde(rename = "licenseOrCertification")]
    license_or_certification: HardConstraintKeywordSet,
    education: HardConstraintKeywordSet,
    experience: HardConstraintKeywordSet,
    #[serde(rename = "backgroundScreening")]
    background_screening: HardConstraintKeywordSet,
    #[serde(rename = "physicalRequirement")]
    physical_requirement: HardConstraintKeywordSet,
    location: HardConstraintKeywordSet,
    #[serde(rename = "drivingRecord")]
    driving_record: HardConstraintKeywordSet,
    #[serde(rename = "vehicleInsurance")]
    vehicle_insurance: HardConstraintKeywordSet,
    #[serde(rename = "ageRequirement")]
    age_requirement: HardConstraintKeywordSet,
    #[serde(rename = "seniorityLevel")]
    seniority_level: HardConstraintKeywordSet,
}

#[derive(Debug, Default, Deserialize)]
struct HardConstraintKeywordSet {
    #[serde(default)]
    contains: Vec<String>,
    #[serde(default)]
    exact: Vec<String>,
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

static TAXONOMY: LazyLock<ResumeKeywordTaxonomy> = LazyLock::new(|| {
    let taxonomy: ResumeKeywordTaxonomy = serde_json::from_str(TAXONOMY_JSON)
        .expect("shared resume keyword taxonomy JSON must be valid");
    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported shared resume keyword taxonomy schema"
    );
    assert!(
        taxonomy
            .conservative_search_term_groups
            .iter()
            .all(|group| group.len() >= 2 && group.iter().all(|term| !term.trim().is_empty())),
        "shared conservative search term groups must contain at least two non-empty terms"
    );
    assert!(
        !taxonomy.base_industry_catalog_terms.is_empty()
            && taxonomy
                .base_industry_catalog_terms
                .iter()
                .all(|term| !term.trim().is_empty()),
        "shared base industry catalog terms must be non-empty"
    );
    assert!(
        taxonomy
            .canonical_requirement_keyword_aliases
            .iter()
            .all(|alias| !alias.canonical.trim().is_empty()
                && !alias.terms.is_empty()
                && alias.terms.iter().all(|term| !term.trim().is_empty())),
        "shared canonical requirement keyword aliases must be non-empty"
    );
    assert!(
        !taxonomy.role_specific_evidence_prompts.is_empty()
            && taxonomy
                .role_specific_evidence_prompts
                .iter()
                .all(|prompt| !prompt.id.trim().is_empty()
                    && !prompt.prompt.trim().is_empty()
                    && !prompt.terms.is_empty()
                    && prompt.terms.iter().all(|term| !term.trim().is_empty())),
        "shared role-specific evidence prompts must be non-empty"
    );
    validate_hard_constraint_keyword_set(
        "degreeEquivalentExclusion",
        &taxonomy
            .hard_constraint_keyword_sets
            .degree_equivalent_exclusion,
    );
    validate_hard_constraint_keyword_set(
        "citizenship",
        &taxonomy.hard_constraint_keyword_sets.citizenship,
    );
    validate_hard_constraint_keyword_set(
        "workAuthorization",
        &taxonomy.hard_constraint_keyword_sets.work_authorization,
    );
    validate_hard_constraint_keyword_set(
        "securityClearance",
        &taxonomy.hard_constraint_keyword_sets.security_clearance,
    );
    validate_hard_constraint_keyword_set(
        "licenseOrCertification",
        &taxonomy
            .hard_constraint_keyword_sets
            .license_or_certification,
    );
    validate_hard_constraint_keyword_set(
        "education",
        &taxonomy.hard_constraint_keyword_sets.education,
    );
    validate_hard_constraint_keyword_set(
        "experience",
        &taxonomy.hard_constraint_keyword_sets.experience,
    );
    validate_hard_constraint_keyword_set(
        "backgroundScreening",
        &taxonomy.hard_constraint_keyword_sets.background_screening,
    );
    validate_hard_constraint_keyword_set(
        "physicalRequirement",
        &taxonomy.hard_constraint_keyword_sets.physical_requirement,
    );
    validate_hard_constraint_keyword_set(
        "location",
        &taxonomy.hard_constraint_keyword_sets.location,
    );
    validate_hard_constraint_keyword_set(
        "drivingRecord",
        &taxonomy.hard_constraint_keyword_sets.driving_record,
    );
    validate_hard_constraint_keyword_set(
        "vehicleInsurance",
        &taxonomy.hard_constraint_keyword_sets.vehicle_insurance,
    );
    validate_hard_constraint_keyword_set(
        "ageRequirement",
        &taxonomy.hard_constraint_keyword_sets.age_requirement,
    );
    validate_hard_constraint_keyword_set(
        "seniorityLevel",
        &taxonomy.hard_constraint_keyword_sets.seniority_level,
    );
    taxonomy
});

static PHYSICAL_WEIGHT_RE: LazyLock<Regex> = LazyLock::new(|| {
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

static PHYSICAL_WEIGHT_FAMILY_REGEXES: LazyLock<Vec<CompiledPhysicalWeightFamily>> =
    LazyLock::new(|| {
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

static SUPPLEMENTAL_KEYWORD_GROUPS: LazyLock<Vec<CompiledSupplementalKeywordGroup>> =
    LazyLock::new(|| {
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

static CREDENTIAL_KEYWORD_GROUPS: LazyLock<Vec<CompiledCredentialKeywordGroup>> =
    LazyLock::new(|| {
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

pub(super) fn conservative_search_term_groups() -> &'static [Vec<String>] {
    &TAXONOMY.conservative_search_term_groups
}

pub(super) fn base_industry_catalog_terms() -> &'static [String] {
    &TAXONOMY.base_industry_catalog_terms
}

pub(super) fn canonical_requirement_keyword(keyword: &str) -> String {
    for alias in &TAXONOMY.canonical_requirement_keyword_aliases {
        if alias.terms.iter().any(|term| term == keyword) {
            return alias.canonical.clone();
        }
    }

    keyword.to_string()
}

pub(super) fn role_specific_evidence_prompt(job_desc_lower: &str) -> Option<&'static str> {
    TAXONOMY
        .role_specific_evidence_prompts
        .iter()
        .find(|prompt| {
            prompt
                .terms
                .iter()
                .any(|term| job_desc_lower.contains(term))
        })
        .map(|prompt| prompt.prompt.as_str())
}

pub(super) fn hard_constraint_degree_equivalent_exclusion(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY
            .hard_constraint_keyword_sets
            .degree_equivalent_exclusion,
        keyword,
    )
}

pub(super) fn hard_constraint_citizenship_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.citizenship, keyword)
}

pub(super) fn hard_constraint_work_authorization_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.work_authorization,
        keyword,
    )
}

pub(super) fn hard_constraint_security_clearance_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.security_clearance,
        keyword,
    )
}

pub(super) fn hard_constraint_license_or_certification_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY
            .hard_constraint_keyword_sets
            .license_or_certification,
        keyword,
    )
}

pub(super) fn hard_constraint_education_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.education, keyword)
}

pub(super) fn hard_constraint_experience_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.experience, keyword)
}

pub(super) fn hard_constraint_background_screening_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.background_screening,
        keyword,
    )
}

pub(super) fn hard_constraint_physical_requirement_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.physical_requirement,
        keyword,
    )
}

pub(super) fn hard_constraint_location_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.location, keyword)
}

pub(super) fn hard_constraint_driving_record_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.driving_record,
        keyword,
    )
}

pub(super) fn hard_constraint_vehicle_insurance_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.vehicle_insurance,
        keyword,
    )
}

pub(super) fn hard_constraint_age_requirement_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.age_requirement,
        keyword,
    )
}

pub(super) fn hard_constraint_seniority_level_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.seniority_level,
        keyword,
    )
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

fn validate_hard_constraint_keyword_set(name: &str, set: &HardConstraintKeywordSet) {
    assert!(
        (!set.contains.is_empty() || !set.exact.is_empty())
            && set.contains.iter().all(|term| !term.trim().is_empty())
            && set.exact.iter().all(|term| !term.trim().is_empty()),
        "shared hard-constraint keyword set {name} must be non-empty"
    );
}

fn hard_constraint_keyword_set_matches(set: &HardConstraintKeywordSet, keyword: &str) -> bool {
    let lower = keyword.to_lowercase();
    set.exact.contains(&lower) || set.contains.iter().any(|term| lower.contains(term))
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
