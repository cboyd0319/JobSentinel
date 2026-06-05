use super::sample_resume;
use crate::core::resume::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState, Skill};

#[test]
fn test_missing_required_hard_constraint_caps_overall_score() {
    let mut resume = sample_resume();
    resume.summary =
        "Customer success manager with onboarding, retention, and CRM experience".to_string();
    resume.skills = vec![
        Skill {
            name: "Customer service".to_string(),
            category: "Client Services".to_string(),
            proficiency: None,
        },
        Skill {
            name: "CRM".to_string(),
            category: "Tools".to_string(),
            proficiency: None,
        },
        Skill {
            name: "Salesforce".to_string(),
            category: "Tools".to_string(),
            proficiency: None,
        },
    ];

    let result = AtsAnalyzer::analyze_for_job(
        &resume,
        "Required: customer service, CRM, Salesforce, security clearance",
    );

    assert!(result.overall_score <= 60.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "security clearance"
            && risk.category == HardConstraintCategory::SecurityClearance
            && risk.score_cap == 60.0
            && risk.action.contains("Check clearance before tailoring")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "security clearance"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_security_clearance_requirement_accepts_clearance_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nSummary\nActive clearance.",
        &[],
        "Required: security clearance",
    );

    let clearance = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "security clearance")
        .expect("clearance review");
    assert_eq!(clearance.match_state, RequirementMatchState::Direct);
    assert!(clearance.hard_constraint);
    assert!(clearance.evidence_sections.contains(&"summary".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "security clearance"));
}

#[test]
fn test_skills_only_required_hard_constraint_caps_overall_score() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nSummary\nCustomer support lead.",
        &["security clearance".to_string()],
        "Required: customer service, security clearance",
    );

    let clearance = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "security clearance")
        .expect("clearance review");
    assert_eq!(clearance.match_state, RequirementMatchState::Partial);
    assert!(clearance.hard_constraint);
    assert!(clearance.evidence_sections.contains(&"skills".to_string()));
    assert!(result.overall_score <= 60.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "security clearance"
            && risk.category == HardConstraintCategory::SecurityClearance
            && risk.score_cap == 60.0
    }));
}

#[test]
fn test_missing_required_background_screening_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(
        &resume,
        "Required: client intake, background check, drug screen",
    );

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "background check"
            && risk.category == HardConstraintCategory::BackgroundScreening
            && risk.score_cap == 70.0
            && risk.action.contains("Check background, drug")
    }));
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "drug screen"
            && risk.category == HardConstraintCategory::BackgroundScreening
            && risk.score_cap == 70.0
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "background check"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_background_check_accepts_background_screening_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nSummary\nCompleted background screening for client-site work.",
            &[],
            "Required: background check",
        );

    let background_check = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "background check")
        .expect("background check review");
    assert_eq!(background_check.match_state, RequirementMatchState::Direct);
    assert!(background_check.hard_constraint);
    assert!(background_check
        .evidence_sections
        .contains(&"summary".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "background check"));
}

#[test]
fn test_drug_screen_accepts_drug_test_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nSummary\nCompleted drug testing for safety-sensitive site work.",
            &[],
            "Required: drug screen",
        );

    let drug_screen = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "drug screen")
        .expect("drug screen review");
    assert_eq!(drug_screen.match_state, RequirementMatchState::Direct);
    assert!(drug_screen.hard_constraint);
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "drug screen"));
}
