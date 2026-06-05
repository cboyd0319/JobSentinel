use std::collections::HashSet;

use super::super::ats_types::{
    HardConstraintCategory, HardConstraintRisk, KeywordImportance, RequirementMatchState,
    RequirementReview,
};
use super::term_expansion;

pub(super) fn build_hard_constraint_risks(
    reviews: &[RequirementReview],
) -> Vec<HardConstraintRisk> {
    let mut risks = reviews
        .iter()
        .filter(|review| {
            review.importance == KeywordImportance::Required
                && hard_constraint_review_needed(review.match_state)
        })
        .filter_map(|review| {
            let category = hard_constraint_category(&review.keyword)?;
            let score_cap = hard_constraint_score_cap(category);
            Some(HardConstraintRisk {
                requirement: review.keyword.clone(),
                category,
                score_cap,
                reason: "A required hard constraint was not clearly found in the resume."
                    .to_string(),
                action: hard_constraint_action(&review.keyword, category),
            })
        })
        .collect::<Vec<_>>();

    risks.sort_by(|a, b| {
        a.score_cap
            .total_cmp(&b.score_cap)
            .then(a.requirement.cmp(&b.requirement))
    });
    risks
}

fn hard_constraint_review_needed(match_state: RequirementMatchState) -> bool {
    matches!(
        match_state,
        RequirementMatchState::Missing
            | RequirementMatchState::Partial
            | RequirementMatchState::Implied
    )
}

pub(super) fn hard_constraint_score_cap(category: HardConstraintCategory) -> f64 {
    match category {
        HardConstraintCategory::WorkAuthorization => 50.0,
        HardConstraintCategory::Citizenship => 50.0,
        HardConstraintCategory::SecurityClearance => 60.0,
        HardConstraintCategory::LicenseOrCertification => 60.0,
        HardConstraintCategory::Education => 65.0,
        HardConstraintCategory::Experience => 65.0,
        HardConstraintCategory::Language => 65.0,
        HardConstraintCategory::BackgroundScreening => 70.0,
        HardConstraintCategory::PhysicalRequirement => 70.0,
        HardConstraintCategory::Location => 70.0,
    }
}

pub(super) fn hard_constraint_action(keyword: &str, category: HardConstraintCategory) -> String {
    if category == HardConstraintCategory::Experience && seniority_level_constraint_keyword(keyword)
    {
        return "Check whether your visible level matches this role; lower-title or fewer-years evidence may not satisfy it. Do not round up, stretch titles, or imply more experience than you have."
            .to_string();
    }
    if category == HardConstraintCategory::Citizenship
        || (category == HardConstraintCategory::WorkAuthorization
            && citizenship_constraint_keyword(keyword))
    {
        return "Check citizenship before tailoring. If it is not true for you, do not claim it. Do not treat work authorization as citizenship."
            .to_string();
    }

    let action = match category {
        HardConstraintCategory::WorkAuthorization => {
            "Check work authorization before tailoring. If it is not true for you, do not claim it."
        }
        HardConstraintCategory::Citizenship => {
            "Check citizenship before tailoring. If it is not true for you, do not claim it. Do not treat work authorization as citizenship."
        }
        HardConstraintCategory::SecurityClearance => {
            "Check clearance before tailoring. If it is not current or true for you, do not claim it."
        }
        HardConstraintCategory::LicenseOrCertification => {
            "Check license or certification before tailoring. If it is not current or true for you, do not claim it."
        }
        HardConstraintCategory::Education => {
            "Check the degree or education requirement before tailoring. If it is not true for you, do not claim it."
        }
        HardConstraintCategory::Experience => {
            "Check years or level before tailoring. Do not round up, stretch titles, or imply more experience than you have."
        }
        HardConstraintCategory::Language => {
            "Check language fluency before tailoring. If it is not true for you, do not claim it."
        }
        HardConstraintCategory::BackgroundScreening => {
            "Check background, drug, or pre-employment screening before tailoring. If it is not workable or true for you, do not claim or imply that it is."
        }
        HardConstraintCategory::PhysicalRequirement => {
            "Check this physical demand before tailoring. If it is not workable or safe for you, do not claim it."
        }
        HardConstraintCategory::Location => {
            "Check location, schedule, availability, or travel before tailoring. If it is not workable for you, do not claim it."
        }
    };
    action.to_string()
}

pub(super) fn citizenship_constraint_keyword(keyword: &str) -> bool {
    let lower = keyword.to_lowercase();
    lower.contains("us citizenship")
        || lower.contains("u.s. citizenship")
        || lower.contains("us citizen")
        || lower.contains("u.s. citizen")
        || lower.contains("citizenship required")
}

pub(super) fn seniority_level_constraint_keyword(keyword: &str) -> bool {
    matches!(
        keyword.to_lowercase().as_str(),
        "senior-level experience"
            | "mid-level experience"
            | "lead-level experience"
            | "staff/principal-level experience"
            | "director-level experience"
            | "executive-level experience"
    )
}

pub(super) fn hard_constraint_category(keyword: &str) -> Option<HardConstraintCategory> {
    let lower = keyword.to_lowercase();
    if lower.contains("equivalent experience") {
        return None;
    }
    if lower.contains("us citizenship")
        || lower.contains("u.s. citizenship")
        || lower.contains("us citizen")
        || lower.contains("u.s. citizen")
        || lower.contains("citizenship required")
    {
        return Some(HardConstraintCategory::Citizenship);
    }
    if lower.contains("work authorization")
        || lower.contains("authorized to work")
        || lower.contains("visa sponsorship")
    {
        return Some(HardConstraintCategory::WorkAuthorization);
    }
    if lower.contains("security clearance") || lower == "clearance" {
        return Some(HardConstraintCategory::SecurityClearance);
    }
    if lower.contains("license")
        || lower.contains("certification")
        || lower == "cdl"
        || lower == "cissp"
        || lower.contains("certified information systems security professional")
        || lower == "security+"
        || lower == "security plus"
        || lower == "rn"
        || lower == "cna"
        || lower == "lpn"
        || lower == "lvn"
        || lower == "bls"
        || lower == "acls"
        || lower == "cpr"
        || lower.contains("certified nursing assistant")
        || lower.contains("certified nurse assistant")
        || lower.contains("certified nurse aide")
        || lower.contains("licensed practical nurse")
        || lower.contains("licensed vocational nurse")
        || lower == "pmp"
        || lower.contains("project management professional")
        || lower == "servsafe"
        || lower.contains("food safety certification")
        || lower.contains("food handler")
        || lower.contains("food-handler")
        || lower.contains("first aid")
        || lower.contains("first-aid")
        || lower.contains("forklift certification")
        || lower.contains("forklift certified")
        || lower.contains("forklift license")
        || lower.contains("forklift operator")
        || lower.contains("osha 10")
        || lower.contains("osha10")
        || lower.contains("osha 30")
        || lower.contains("osha30")
        || lower.contains("basic life support")
        || lower.contains("advanced cardiovascular life support")
        || lower.contains("cardiopulmonary resuscitation")
    {
        return Some(HardConstraintCategory::LicenseOrCertification);
    }
    if lower.contains("degree")
        || lower.contains("bachelor")
        || lower.contains("master")
        || lower.contains("phd")
        || lower.contains("ph.d")
        || lower.contains("doctorate")
        || lower.contains("doctoral")
        || lower.contains("high school")
        || lower.contains("high-school")
        || lower.contains("general education development")
        || lower == "ged"
    {
        return Some(HardConstraintCategory::Education);
    }
    if lower.contains("year")
        || lower.contains("yrs")
        || lower.contains("level experience")
        || lower == "management experience"
    {
        return Some(HardConstraintCategory::Experience);
    }
    if term_expansion::known_human_language_requirement(&lower) {
        return Some(HardConstraintCategory::Language);
    }
    if lower.contains("background check")
        || lower.contains("background screening")
        || lower.contains("pre-employment screening")
        || lower.contains("pre employment screening")
        || lower.contains("drug screen")
        || lower.contains("drug screening")
        || lower.contains("drug test")
        || lower.contains("drug testing")
    {
        return Some(HardConstraintCategory::BackgroundScreening);
    }
    if lower.contains("lift ")
        || lower.contains("pound")
        || lower.contains("lbs")
        || lower.contains("physical requirement")
        || lower.contains("physical demand")
        || lower.contains("stand for long")
        || lower.contains("standing for long")
    {
        return Some(HardConstraintCategory::PhysicalRequirement);
    }
    if lower.contains("onsite")
        || lower.contains("on-site")
        || lower.contains("on site")
        || lower.contains("remote")
        || lower.contains("hybrid")
        || lower.contains("relocation")
        || lower.contains("relocate")
        || lower.contains("travel")
        || lower.contains("transportation")
        || lower.contains("commute")
        || lower.contains("commuting")
        || lower.contains("availability")
        || lower.contains("available")
        || lower.contains("schedule")
        || lower.contains("full-time")
        || lower.contains("full time")
        || lower.contains("part-time")
        || lower.contains("part time")
        || lower.contains("weekend")
        || lower.contains("night shift")
        || lower.contains("overnight shift")
        || lower.contains("third shift")
        || lower.contains("3rd shift")
        || lower.contains("second shift")
        || lower.contains("2nd shift")
        || lower.contains("day shift")
        || lower.contains("first shift")
        || lower.contains("1st shift")
        || lower.contains("overtime")
        || lower.contains("holiday")
        || lower.contains("evening")
    {
        return Some(HardConstraintCategory::Location);
    }
    None
}

pub(super) fn extract_hard_constraint_keywords(text: &str) -> Vec<String> {
    let mut keywords = HashSet::new();
    let degree_equivalent_re = regex::Regex::new(
            r"(?i)\b(?:ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree)\s+(?:or|/)\s+(?:(?:equivalent|commensurate)\s+(?:work\s+)?experience|equivalent\s+combination\s+of\s+education\s+and\s+experience)\b",
        )
        .unwrap();
    let has_degree_equivalent = degree_equivalent_re.is_match(text);
    if has_degree_equivalent {
        keywords.insert("degree or equivalent experience".to_string());
    }

    let hard_constraint_patterns = [
        r"(?i)\b(work authorization|authorized to work|visa sponsorship|u\.?s\.?\s+citizenship|u\.?s\.?\s+citizen|citizenship required)\b",
        r"(?i)\b(security clearance|clearance)\b",
        r"(?i)\bsecurity\+",
        r"(?i)\b(commercial driver'?s license|commercial driver license|driver'?s license|driver license|cdl|rn license|registered nurse license|nursing license|lpn|lvn|licensed practical nurse|licensed vocational nurse)\b",
        r"(?i)\b(certification|cissp|certified information systems security professional|security plus|bls|basic life support|acls|advanced cardiovascular life support|cpr|cardiopulmonary resuscitation|cna|certified nursing assistant|certified nurse assistant|certified nurse aide|pmp|project management professional|servsafe|food safety certification|food[- ]handler'?s?\s+(?:certification|certificate|permit|card)|first[- ]aid certification|first[- ]aid certified|first[- ]aid certificate|first[- ]aid|forklift certification|forklift certified|forklift operator certification|forklift operator certified|forklift license|forklift operator license|osha\s*10(?:[- ]hour)?(?:\s+certification)?|osha\s*30(?:[- ]hour)?(?:\s+certification)?)\b",
        r"(?i)\b(ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree|high[- ]school diploma|high[- ]school degree|ged|high[- ]school equivalency|general education development)\b",
        r"(?i)\b\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?[a-zA-Z][a-zA-Z0-9+#/.-]*(?:\s+[a-zA-Z][a-zA-Z0-9+#/.-]*){0,3}\b",
        r"(?i)\b(bilingual(?:\s+(?:english|spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean))?|(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)\s+fluency|fluent(?:\s+in)?\s+(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)|(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)\s+language|english/(?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean)|english and (?:spanish|french|mandarin|cantonese|arabic|portuguese|german|japanese|korean))\b",
        r"(?i)\b(background checks?|background screenings?|pre[- ]employment screenings?|drug screens?|drug screenings?|drug tests?|drug testing)\b",
        r"(?i)\b(lift(?:\s+up\s+to)?\s+\d+\s*(?:pounds?|lbs?)|(?:stand|standing) for long periods?|physical requirements?|physical demands?)\b",
        r"(?i)\b(onsite|on-site|on site|remote(?:[- ](?:work|role|position|job))?|hybrid(?:[- ](?:work|role|schedule|position|job))?|relocation|relocate|willing to relocate|travel|reliable transportation|own transportation|commute|commuting|full[- ]time(?:\s+availability)?|part[- ]time(?:\s+availability)?|availability|available|schedule|weekend availability|weekend shifts?|night shift|overnight shift|third shift|3rd shift|evening shift|second shift|2nd shift|day shift|first shift|1st shift|overtime(?:\s+(?:availability|shifts?|hours?))?|holiday(?:\s+(?:availability|shifts?|hours?))?)\b",
    ];

    for pattern in &hard_constraint_patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            for cap in re.captures_iter(text) {
                if let Some(m) = cap.get(0) {
                    keywords.insert(m.as_str().to_lowercase());
                }
            }
        }
    }
    if has_degree_equivalent {
        for exact_degree in [
            "degree",
            "associate's degree",
            "associate degree",
            "associates degree",
            "baccalaureate degree",
            "bachelor's degree",
            "bachelor degree",
            "bachelors degree",
            "master's degree",
            "master degree",
            "masters degree",
            "phd",
            "ph.d",
            "ph.d.",
            "phd degree",
            "ph.d degree",
            "ph.d. degree",
            "doctorate",
            "doctorate degree",
            "doctoral degree",
        ] {
            keywords.remove(exact_degree);
        }
    }
    if keywords.iter().any(|keyword| {
        matches!(
            keyword.as_str(),
            "commercial driver's license"
                | "commercial drivers license"
                | "commercial driver license"
                | "cdl"
        )
    }) {
        for generic_license in ["driver's license", "drivers license", "driver license"] {
            keywords.remove(generic_license);
        }
    }
    let specific_certification_keywords = [
        "cissp",
        "certified information systems security professional",
        "security+",
        "security plus",
        "bls",
        "basic life support",
        "acls",
        "advanced cardiovascular life support",
        "cpr",
        "cardiopulmonary resuscitation",
        "cna",
        "certified nursing assistant",
        "certified nurse assistant",
        "certified nurse aide",
        "lpn",
        "lvn",
        "licensed practical nurse",
        "licensed vocational nurse",
        "pmp",
        "project management professional",
        "servsafe",
        "food safety certification",
        "food handler certification",
        "food handler's certification",
        "food handlers certification",
        "food handler certificate",
        "food handler's certificate",
        "food handlers certificate",
        "food handler permit",
        "food handler's permit",
        "food handlers permit",
        "food handler card",
        "food handler's card",
        "food handlers card",
        "first aid",
        "first-aid",
        "first aid certification",
        "first-aid certification",
        "first aid certified",
        "first-aid certified",
        "first aid certificate",
        "first-aid certificate",
        "forklift certification",
        "forklift certified",
        "forklift operator certification",
        "forklift operator certified",
        "forklift license",
        "forklift operator license",
        "osha 10",
        "osha10",
        "osha 10 certification",
        "osha10 certification",
        "osha 10-hour",
        "osha 10-hour certification",
        "osha 10 hour",
        "osha 10 hour certification",
        "osha 30",
        "osha30",
        "osha 30 certification",
        "osha30 certification",
        "osha 30-hour",
        "osha 30-hour certification",
        "osha 30 hour",
        "osha 30 hour certification",
    ];
    if keywords
        .iter()
        .any(|keyword| specific_certification_keywords.contains(&keyword.as_str()))
    {
        keywords.remove("certification");
    }
    keywords.retain(|keyword| !age_requirement_keyword(keyword));
    for keyword in extract_seniority_constraint_keywords(text) {
        keywords.insert(keyword);
    }

    let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
    sorted_keywords.sort();
    sorted_keywords
}

fn age_requirement_keyword(keyword: &str) -> bool {
    let lower = keyword.to_lowercase();
    lower.contains("year of age")
        || lower.contains("years of age")
        || lower.contains("yr of age")
        || lower.contains("yrs of age")
        || lower.contains("year old")
        || lower.contains("years old")
        || lower.contains("yr old")
        || lower.contains("yrs old")
}

pub(super) fn extract_seniority_constraint_keywords(text: &str) -> Vec<String> {
    let mut keywords = HashSet::new();
    let seniority_patterns = [
        (
            r"(?i)\b(senior[- ]level|senior|sr\.)\b",
            "senior-level experience",
        ),
        (
            r"(?i)\b(lead[- ]level|team lead|shift lead|crew lead|lead worker|lead experience|leadership experience)\b",
            "lead-level experience",
        ),
        (
            r"(?i)\b(staff[- ]level|principal[- ]level|staff engineer|principal engineer|principal consultant)\b",
            "staff/principal-level experience",
        ),
        (
            r"(?i)\b(people management|management experience|manager[- ]level|supervisor[- ]level|supervisor experience|supervisory experience|supervision experience|team management|team supervision|supervising staff|supervised staff|managed\s+(?:a\s+)?team|managed staff|managed people|managed employees)\b",
            "management experience",
        ),
        (
            r"(?i)\b(director[- ]level|director experience|department director)\b",
            "director-level experience",
        ),
        (
            r"(?i)\b(executive[- ]level|executive leadership|c-suite|vice president|vp)\b",
            "executive-level experience",
        ),
        (
            r"(?i)\b(mid[- ]level|intermediate)\b",
            "mid-level experience",
        ),
    ];

    for (pattern, keyword) in seniority_patterns {
        if regex::Regex::new(pattern).unwrap().is_match(text) {
            keywords.insert(keyword.to_string());
        }
    }

    let mut sorted_keywords = keywords.into_iter().collect::<Vec<_>>();
    sorted_keywords.sort();
    sorted_keywords
}
