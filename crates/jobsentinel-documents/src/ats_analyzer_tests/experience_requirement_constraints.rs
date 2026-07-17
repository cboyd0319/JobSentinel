use super::sample_resume;
use crate::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState};

#[path = "experience_requirement_constraints/physical_requirement_constraints.rs"]
mod physical_requirement_constraints;

#[test]
fn test_missing_required_years_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: CRM, 8+ years of payroll management");

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "8+ years of payroll management"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("Do not round up")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "8+ years of payroll management"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_age_requirement_is_not_years_experience_constraint() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nHandled intake scheduling and case documentation.",
        &[],
        "Required: must be 18 years of age, CRM",
    );

    assert!(result.overall_score <= 70.0);
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "18 years of age"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "18 years of age"
            && risk.category == HardConstraintCategory::Age
            && risk.score_cap == 70.0
            && risk.action.contains("minimum-age")
            && risk.action.contains("do not claim it")
    }));
    assert!(!result
        .requirement_reviews
        .iter()
        .any(|review| review.keyword == "18 years of age"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Direct));
    assert!(!result.hard_constraint_risks.iter().any(|risk| {
        risk.category == HardConstraintCategory::Experience && risk.requirement.contains("18 years")
    }));
}

#[test]
fn test_missing_required_senior_level_constraint_caps_overall_score() {
    let mut resume = sample_resume();
    resume.resume.summary = Some("Client service coordinator with intake scheduling".to_string());
    resume.resume.experience[0].title = "Client Service Coordinator".to_string();
    resume.resume.experience[0].achievements =
        vec!["Handled intake scheduling and case documentation".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: senior-level experience, CRM");

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "senior-level experience"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("Do not round up")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "senior-level experience"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_higher_seniority_requirement_warns_about_lower_level_evidence() {
    let mut resume = sample_resume();
    resume.resume.summary =
        Some("Senior service coordinator with 7 years of intake scheduling".to_string());
    resume.resume.experience[0].title = "Senior Service Coordinator".to_string();
    resume.resume.experience[0].achievements =
        vec!["Handled intake scheduling and case documentation".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: staff-level experience, CRM");

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "staff/principal-level experience"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("lower-title or fewer-years")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "staff/principal-level experience"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_required_senior_level_uses_current_lead_and_year_evidence() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: senior-level experience, CRM");

    let seniority = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "senior-level experience")
        .expect("senior-level review");
    assert_eq!(seniority.match_state, RequirementMatchState::Strong);
    assert!(seniority.evidence_sections.contains(&"summary".to_string()));
    assert!(seniority
        .evidence_sections
        .contains(&"current experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "senior-level experience"));
}

#[test]
fn test_missing_required_shift_lead_constraint_caps_overall_score() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled intake scheduling and case documentation.",
            &[],
            "Required: shift lead experience, CRM",
        );

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "lead-level experience"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("Do not round up")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "lead-level experience"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_shift_lead_requirement_accepts_shift_lead_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nShift lead for front desk intake coverage.",
        &[],
        "Required: shift lead experience",
    );

    let lead = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "lead-level experience")
        .expect("lead-level review");
    assert_eq!(lead.match_state, RequirementMatchState::Direct);
    assert!(lead.hard_constraint);
    assert!(lead.evidence_sections.contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "lead-level experience"));
}

#[test]
fn test_missing_required_supervisor_experience_caps_overall_score() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled intake scheduling and case documentation.",
            &[],
            "Required: supervisor experience, CRM",
        );

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "management experience"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("Do not round up")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "management experience"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_supervisor_experience_accepts_supervised_staff_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupervised staff coverage for client intake schedules.",
            &[],
            "Required: supervisor experience",
        );

    let management = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "management experience")
        .expect("management experience review");
    assert_eq!(management.match_state, RequirementMatchState::Direct);
    assert!(management.hard_constraint);
    assert!(management
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "management experience"));
}

#[test]
fn test_missing_required_managed_team_constraint_caps_overall_score() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled intake scheduling and case documentation.",
            &[],
            "Required: managed a team, CRM",
        );

    assert!(result.overall_score <= 65.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "management experience"
            && risk.category == HardConstraintCategory::Experience
            && risk.score_cap == 65.0
            && risk.action.contains("Do not round up")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "management experience"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_managed_team_requirement_accepts_managed_staff_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nManaged staff schedules for client intake coverage.",
            &[],
            "Required: managed a team",
        );

    let management = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "management experience")
        .expect("management experience review");
    assert!(matches!(
        management.match_state,
        RequirementMatchState::Direct | RequirementMatchState::Strong
    ));
    assert!(management.hard_constraint);
    assert!(management
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "management experience"));
}

#[test]
fn test_missing_required_citizenship_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, US citizenship");

    assert!(result.overall_score <= 50.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "us citizenship"
            && risk.category == HardConstraintCategory::Citizenship
            && risk.score_cap == 50.0
            && risk.action.contains("Check citizenship before tailoring")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "us citizenship"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_us_citizenship_requirement_accepts_us_citizen_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nSummary\nU.S. citizen.",
        &[],
        "Required: US citizenship",
    );

    let citizenship = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "us citizenship")
        .expect("citizenship review");
    assert_eq!(citizenship.match_state, RequirementMatchState::Direct);
    assert!(citizenship.hard_constraint);
    assert!(citizenship
        .evidence_sections
        .contains(&"summary".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "us citizenship"));
}

#[test]
fn test_work_authorization_requirement_accepts_authorized_to_work_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nSummary\nAuthorized to work in the United States.",
        &[],
        "Required: work authorization",
    );

    let authorization = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "work authorization")
        .expect("work authorization review");
    assert_eq!(authorization.match_state, RequirementMatchState::Direct);
    assert!(authorization.hard_constraint);
    assert!(authorization
        .evidence_sections
        .contains(&"summary".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "work authorization"));
}

#[test]
fn test_missing_required_transportation_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, reliable transportation");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "reliable transportation"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "reliable transportation"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_reliable_transportation_accepts_own_transportation_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nOwn transportation for client site visits.",
        &[],
        "Required: reliable transportation",
    );

    let transportation = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "reliable transportation")
        .expect("reliable transportation review");
    assert_eq!(transportation.match_state, RequirementMatchState::Direct);
    assert!(transportation.hard_constraint);
    assert!(transportation
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "reliable transportation"));
}

#[test]
fn test_commute_requirement_accepts_commuting_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nCommuting to client appointments weekly.",
        &[],
        "Required: commute",
    );

    let commute = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "commute")
        .expect("commute review");
    assert_eq!(commute.match_state, RequirementMatchState::Direct);
    assert!(commute.hard_constraint);
    assert!(commute
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "commute"));
}
