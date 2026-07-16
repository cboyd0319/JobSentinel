use crate::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_requirement_review_uses_care_plan_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUsed care-plan notes for patient visits.",
        &[],
        "Required: care plans",
    );

    let care_plans = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "care plans")
        .expect("care plans review");
    assert_eq!(care_plans.match_state, RequirementMatchState::Direct);
    assert!(care_plans
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUsed care plans for patient visits.",
        &[],
        "Required: care-plan",
    );

    let care_plan_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "care-plan")
        .expect("care-plan review");
    assert_eq!(care_plan_hyphen.match_state, RequirementMatchState::Direct);
    assert!(care_plan_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_vital_sign_plural_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nRecorded vital sign readings for patient visits.",
        &[],
        "Required: vital signs",
    );

    let vital_signs = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "vital signs")
        .expect("vital signs review");
    assert_eq!(vital_signs.match_state, RequirementMatchState::Direct);
    assert!(vital_signs
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nRecorded vital signs for patient visits.",
        &[],
        "Required: vital sign",
    );

    let vital_sign = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "vital sign")
        .expect("vital sign review");
    assert_eq!(vital_sign.match_state, RequirementMatchState::Direct);
    assert!(vital_sign
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_vital_sign_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nRecorded vital-sign readings for patient visits.",
        &[],
        "Required: vital signs",
    );

    let vital_signs = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "vital signs")
        .expect("vital signs review");
    assert_eq!(vital_signs.match_state, RequirementMatchState::Direct);
    assert!(vital_signs
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nRecorded vital signs for patient visits.",
        &[],
        "Required: vital-sign",
    );

    let vital_sign_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "vital-sign")
        .expect("vital-sign review");
    assert_eq!(vital_sign_hyphen.match_state, RequirementMatchState::Direct);
    assert!(vital_sign_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
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
