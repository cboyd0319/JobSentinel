use super::assert_requirement_equivalence;
use crate::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_requirement_review_uses_care_plan_hyphen_equivalence() {
    assert_requirement_equivalence(
        "Used care-plan notes for patient visits.",
        "care plans",
        RequirementMatchState::Direct,
    );
    assert_requirement_equivalence(
        "Used care plans for patient visits.",
        "care-plan",
        RequirementMatchState::Direct,
    );
}

#[test]
fn test_requirement_review_uses_vital_sign_plural_equivalence() {
    assert_requirement_equivalence(
        "Recorded vital sign readings for patient visits.",
        "vital signs",
        RequirementMatchState::Direct,
    );
    assert_requirement_equivalence(
        "Recorded vital signs for patient visits.",
        "vital sign",
        RequirementMatchState::Direct,
    );
}

#[test]
fn test_requirement_review_uses_vital_sign_hyphen_equivalence() {
    assert_requirement_equivalence(
        "Recorded vital-sign readings for patient visits.",
        "vital signs",
        RequirementMatchState::Direct,
    );
    assert_requirement_equivalence(
        "Recorded vital signs for patient visits.",
        "vital-sign",
        RequirementMatchState::Direct,
    );
}

#[test]
fn test_requirement_review_uses_data_entry_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nCompleted data-entry updates for intake records.",
        &[],
        "Required: data entry",
    );

    let data_entry = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "data entry")
        .expect("data entry review");
    assert_eq!(data_entry.match_state, RequirementMatchState::Direct);
    assert!(data_entry
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_data_analysis_analytics_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nBuilt analytics dashboards for service trends.",
        &[],
        "Required: data analysis",
    );

    let data_analysis = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "data analysis")
        .expect("data analysis review");
    assert_eq!(data_analysis.match_state, RequirementMatchState::Direct);
    assert!(data_analysis
        .evidence_sections
        .contains(&"experience".to_string()));
}
