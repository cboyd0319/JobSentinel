use super::sample_resume;
use crate::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState};

#[test]
fn test_missing_required_physical_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, lift 50 pounds");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "lift 50 pounds"
            && risk.category == HardConstraintCategory::PhysicalRequirement
            && risk.score_cap == 70.0
            && risk.action.contains("not workable or safe")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "lift 50 pounds"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_lift_lbs_requirement_accepts_pounds_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAble to lift 50 pounds safely.",
        &[],
        "Required: lift 50 lbs",
    );

    let lift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "lift 50 lbs")
        .expect("lift review");
    assert_eq!(lift.match_state, RequirementMatchState::Direct);
    assert!(lift.hard_constraint);
    assert!(lift.evidence_sections.contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "lift 50 lbs"));
}

#[test]
fn test_missing_required_lift_and_carry_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, lift and carry 50 pounds");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "lift and carry 50 pounds"
            && risk.category == HardConstraintCategory::PhysicalRequirement
            && risk.score_cap == 70.0
            && risk.action.contains("not workable or safe")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "lift and carry 50 pounds"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_lift_and_carry_requirement_accepts_lifted_and_carried_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nLifted and carried 50 pounds safely during warehouse shifts.",
        &[],
        "Required: lift and carry 50 lbs",
    );

    let lift_and_carry = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "lift and carry 50 lbs")
        .expect("lift and carry review");
    assert_eq!(lift_and_carry.match_state, RequirementMatchState::Direct);
    assert!(lift_and_carry.hard_constraint);
    assert!(lift_and_carry
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "lift and carry 50 lbs"));
}

#[test]
fn test_stand_requirement_accepts_standing_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nStanding for long periods during service shifts.",
        &[],
        "Required: stand for long periods",
    );

    let standing = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "stand for long periods")
        .expect("standing review");
    assert_eq!(standing.match_state, RequirementMatchState::Direct);
    assert!(standing.hard_constraint);
    assert!(standing
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "stand for long periods"));
}

#[test]
fn test_missing_required_ladder_climbing_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, climb ladders");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "climb ladders"
            && risk.category == HardConstraintCategory::PhysicalRequirement
            && risk.score_cap == 70.0
            && risk.action.contains("not workable or safe")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "climb ladders"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_climb_ladders_requirement_accepts_climbing_ladders_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nClimbing ladders safely during inventory and maintenance work.",
        &[],
        "Required: climb ladders",
    );

    let climbing = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "climb ladders")
        .expect("climb ladders review");
    assert_eq!(climbing.match_state, RequirementMatchState::Direct);
    assert!(climbing.hard_constraint);
    assert!(climbing
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "climb ladders"));
}
