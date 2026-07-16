use std::sync::LazyLock;

use regex::Regex;
use serde::Deserialize;

pub(super) const TAXONOMY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../resources/taxonomies/resume-keywords.json"
));

#[derive(Debug, Deserialize)]
pub(super) struct ResumeKeywordTaxonomy {
    #[serde(rename = "schemaVersion")]
    pub(super) schema_version: u32,
    #[serde(rename = "humanLanguages")]
    pub(super) human_languages: Vec<String>,
    #[serde(rename = "bulletPowerWords")]
    pub(super) bullet_power_words: Vec<String>,
    #[serde(rename = "physicalWeightRequirements")]
    pub(super) physical_weight_requirements: PhysicalWeightRequirements,
    #[serde(rename = "conservativeSearchTermGroups")]
    pub(super) conservative_search_term_groups: Vec<Vec<String>>,
    #[serde(rename = "canonicalRequirementKeywordAliases")]
    pub(super) canonical_requirement_keyword_aliases: Vec<CanonicalRequirementKeywordAlias>,
    #[serde(rename = "baseIndustryCatalogTerms")]
    pub(super) base_industry_catalog_terms: Vec<String>,
    #[serde(rename = "roleSpecificEvidencePrompts")]
    pub(super) role_specific_evidence_prompts: Vec<RoleSpecificEvidencePrompt>,
    #[serde(rename = "hardConstraintKeywordSets")]
    pub(super) hard_constraint_keyword_sets: HardConstraintKeywordSets,
    #[serde(rename = "credentialKeywordGroups")]
    pub(super) credential_keyword_groups: Vec<CredentialKeywordGroup>,
    #[serde(rename = "supplementalKeywordGroups")]
    pub(super) supplemental_keyword_groups: Vec<SupplementalKeywordGroup>,
}

#[derive(Debug, Deserialize)]
pub(super) struct PhysicalWeightRequirements {
    #[serde(rename = "optionalAmountPrefixPattern")]
    pub(super) optional_amount_prefix_pattern: String,
    #[serde(rename = "unitPattern")]
    pub(super) unit_pattern: String,
    #[serde(rename = "searchUnits")]
    pub(super) search_units: Vec<String>,
    pub(super) families: Vec<PhysicalWeightFamily>,
}

#[derive(Debug, Deserialize)]
pub(super) struct PhysicalWeightFamily {
    #[allow(dead_code)]
    pub(super) id: String,
    #[serde(rename = "requirementPattern")]
    pub(super) requirement_pattern: String,
    #[serde(rename = "evidencePrefixes")]
    pub(super) evidence_prefixes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct SupplementalKeywordGroup {
    pub(super) canonical: String,
    pub(super) terms: Vec<String>,
    #[serde(default, rename = "catalogTerms")]
    pub(super) catalog_terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct CanonicalRequirementKeywordAlias {
    pub(super) canonical: String,
    pub(super) terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct RoleSpecificEvidencePrompt {
    pub(super) id: String,
    pub(super) prompt: String,
    pub(super) terms: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct HardConstraintKeywordSets {
    #[serde(rename = "degreeEquivalentExclusion")]
    pub(super) degree_equivalent_exclusion: HardConstraintKeywordSet,
    pub(super) citizenship: HardConstraintKeywordSet,
    #[serde(rename = "workAuthorization")]
    pub(super) work_authorization: HardConstraintKeywordSet,
    #[serde(rename = "securityClearance")]
    pub(super) security_clearance: HardConstraintKeywordSet,
    #[serde(rename = "licenseOrCertification")]
    pub(super) license_or_certification: HardConstraintKeywordSet,
    pub(super) education: HardConstraintKeywordSet,
    pub(super) experience: HardConstraintKeywordSet,
    #[serde(rename = "backgroundScreening")]
    pub(super) background_screening: HardConstraintKeywordSet,
    #[serde(rename = "physicalRequirement")]
    pub(super) physical_requirement: HardConstraintKeywordSet,
    pub(super) location: HardConstraintKeywordSet,
    #[serde(rename = "drivingRecord")]
    pub(super) driving_record: HardConstraintKeywordSet,
    #[serde(rename = "vehicleInsurance")]
    pub(super) vehicle_insurance: HardConstraintKeywordSet,
    #[serde(rename = "ageRequirement")]
    pub(super) age_requirement: HardConstraintKeywordSet,
    #[serde(rename = "seniorityLevel")]
    pub(super) seniority_level: HardConstraintKeywordSet,
}

#[derive(Debug, Default, Deserialize)]
pub(super) struct HardConstraintKeywordSet {
    #[serde(default)]
    pub(super) contains: Vec<String>,
    #[serde(default)]
    pub(super) exact: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub(super) struct CredentialKeywordGroup {
    pub(super) canonical: String,
    pub(super) terms: Vec<String>,
    #[serde(default, rename = "requirementTerms")]
    pub(super) requirement_terms: Vec<String>,
    #[serde(
        default = "default_preserve_requirement_text",
        rename = "preserveRequirementText"
    )]
    pub(super) preserve_requirement_text: bool,
    #[serde(default, rename = "catalogTerms")]
    pub(super) catalog_terms: Vec<String>,
}

pub(super) struct CompiledPhysicalWeightFamily {
    pub(super) regex: Regex,
    pub(super) evidence_prefixes: Vec<String>,
}

pub(super) struct CompiledSupplementalKeywordGroup {
    pub(super) canonical: String,
    pub(super) regexes: Vec<Regex>,
}

pub(super) struct CompiledCredentialKeywordGroup {
    pub(super) canonical: String,
    pub(super) preserve_requirement_text: bool,
    pub(super) requirement_regexes: Vec<(String, Regex)>,
}

pub(super) static TAXONOMY: LazyLock<ResumeKeywordTaxonomy> = LazyLock::new(|| {
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

pub(super) static PHYSICAL_WEIGHT_RE: LazyLock<Regex> = LazyLock::new(|| {
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

pub(super) static PHYSICAL_WEIGHT_FAMILY_REGEXES: LazyLock<Vec<CompiledPhysicalWeightFamily>> =
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

pub(super) static SUPPLEMENTAL_KEYWORD_GROUPS: LazyLock<Vec<CompiledSupplementalKeywordGroup>> =
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

pub(super) static CREDENTIAL_KEYWORD_GROUPS: LazyLock<Vec<CompiledCredentialKeywordGroup>> =
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

pub(super) fn physical_weight_match(keyword_lower: &str) -> Option<(String, &[String])> {
    for family in PHYSICAL_WEIGHT_FAMILY_REGEXES.iter() {
        let Some(captures) = family.regex.captures(keyword_lower) else {
            continue;
        };
        let amount = captures.get(1)?.as_str().to_string();
        return Some((amount, &family.evidence_prefixes));
    }

    None
}

pub(super) fn validate_hard_constraint_keyword_set(name: &str, set: &HardConstraintKeywordSet) {
    assert!(
        (!set.contains.is_empty() || !set.exact.is_empty())
            && set.contains.iter().all(|term| !term.trim().is_empty())
            && set.exact.iter().all(|term| !term.trim().is_empty()),
        "shared hard-constraint keyword set {name} must be non-empty"
    );
}

pub(super) fn hard_constraint_keyword_set_matches(
    set: &HardConstraintKeywordSet,
    keyword: &str,
) -> bool {
    let lower = keyword.to_lowercase();
    set.exact.contains(&lower) || set.contains.iter().any(|term| lower.contains(term))
}

pub(super) fn literal_term_pattern(term: &str) -> String {
    regex::escape(term).replace(r"\ ", r"[\s-]+")
}

pub(super) fn whole_term_regex(term: &str) -> Regex {
    Regex::new(&format!(
        r"(?i)(?:^|[^[:alnum:]_]){}(?:$|[^[:alnum:]_])",
        literal_term_pattern(term)
    ))
    .expect("shared credential keyword regex must compile")
}

pub(super) fn default_preserve_requirement_text() -> bool {
    true
}
