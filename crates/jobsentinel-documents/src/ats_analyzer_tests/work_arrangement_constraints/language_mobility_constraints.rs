use super::sample_resume;
use crate::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState};

#[test]
fn test_missing_required_bilingual_spanish_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, bilingual Spanish");

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "bilingual spanish"
            && risk.category == HardConstraintCategory::Language
            && risk.score_cap == 65.0
            && risk
                .action
                .contains("Check language fluency before tailoring")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "bilingual spanish"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_bilingual_spanish_requirement_accepts_spanish_fluency_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nFluent in Spanish for client intake calls.",
        &[],
        "Required: bilingual Spanish",
    );

    let bilingual = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bilingual spanish")
        .expect("bilingual Spanish review");
    assert_eq!(bilingual.match_state, RequirementMatchState::Direct);
    assert!(bilingual.hard_constraint);
    assert!(bilingual
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bilingual spanish"));
}

#[test]
fn test_bilingual_mandarin_requirement_accepts_mandarin_fluency_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nFluent in Mandarin for client intake calls.",
        &[],
        "Required: bilingual Mandarin",
    );

    let bilingual = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bilingual mandarin")
        .expect("bilingual Mandarin review");
    assert_eq!(bilingual.match_state, RequirementMatchState::Direct);
    assert!(bilingual.hard_constraint);
    assert!(bilingual
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bilingual mandarin"));
}

#[test]
fn test_relocation_accepts_willing_to_relocate_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nWilling to relocate for client site coverage.",
        &[],
        "Required: relocation",
    );

    let relocation = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "relocation")
        .expect("relocation review");
    assert_eq!(relocation.match_state, RequirementMatchState::Direct);
    assert!(relocation.hard_constraint);
    assert!(relocation
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "relocation"));
}
