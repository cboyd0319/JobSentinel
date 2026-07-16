use std::collections::HashSet;

use super::taxonomy::*;

pub(in crate::ats_analyzer) fn extract_physical_weight_keywords(text: &str) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn is_physical_weight_requirement(keyword_lower: &str) -> bool {
    PHYSICAL_WEIGHT_RE.is_match(keyword_lower)
}

pub(in crate::ats_analyzer) fn physical_weight_search_terms(keyword_lower: &str) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn human_languages() -> &'static [String] {
    &TAXONOMY.human_languages
}

pub(in crate::ats_analyzer) fn bullet_power_words() -> &'static [String] {
    &TAXONOMY.bullet_power_words
}

pub(in crate::ats_analyzer) fn conservative_search_term_groups() -> &'static [Vec<String>] {
    &TAXONOMY.conservative_search_term_groups
}

pub(in crate::ats_analyzer) fn base_industry_catalog_terms() -> &'static [String] {
    &TAXONOMY.base_industry_catalog_terms
}

pub(in crate::ats_analyzer) fn canonical_requirement_keyword(keyword: &str) -> String {
    for alias in &TAXONOMY.canonical_requirement_keyword_aliases {
        if alias.terms.iter().any(|term| term == keyword) {
            return alias.canonical.clone();
        }
    }

    keyword.to_string()
}

pub(in crate::ats_analyzer) fn role_specific_evidence_prompt(
    job_desc_lower: &str,
) -> Option<&'static str> {
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

pub(in crate::ats_analyzer) fn hard_constraint_degree_equivalent_exclusion(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY
            .hard_constraint_keyword_sets
            .degree_equivalent_exclusion,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_citizenship_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.citizenship, keyword)
}

pub(in crate::ats_analyzer) fn hard_constraint_work_authorization_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.work_authorization,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_security_clearance_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.security_clearance,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_license_or_certification_keyword(
    keyword: &str,
) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY
            .hard_constraint_keyword_sets
            .license_or_certification,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_education_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.education, keyword)
}

pub(in crate::ats_analyzer) fn hard_constraint_experience_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.experience, keyword)
}

pub(in crate::ats_analyzer) fn hard_constraint_background_screening_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.background_screening,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_physical_requirement_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.physical_requirement,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_location_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(&TAXONOMY.hard_constraint_keyword_sets.location, keyword)
}

pub(in crate::ats_analyzer) fn hard_constraint_driving_record_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.driving_record,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_vehicle_insurance_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.vehicle_insurance,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_age_requirement_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.age_requirement,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn hard_constraint_seniority_level_keyword(keyword: &str) -> bool {
    hard_constraint_keyword_set_matches(
        &TAXONOMY.hard_constraint_keyword_sets.seniority_level,
        keyword,
    )
}

pub(in crate::ats_analyzer) fn extract_supplemental_keywords(text: &str) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn supplemental_keyword_catalog_terms() -> Vec<String> {
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

pub(in crate::ats_analyzer) fn supplemental_keyword_search_terms(
    keyword_lower: &str,
) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn extract_credential_keywords(text: &str) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn credential_keyword_search_terms(keyword_lower: &str) -> Vec<String> {
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

pub(in crate::ats_analyzer) fn credential_keyword_catalog_terms() -> Vec<String> {
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

pub(in crate::ats_analyzer) fn specific_credential_keywords() -> HashSet<String> {
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

pub(in crate::ats_analyzer) fn is_credential_keyword(keyword_lower: &str) -> bool {
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
