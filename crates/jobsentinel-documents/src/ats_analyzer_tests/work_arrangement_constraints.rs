use super::sample_resume;
use crate::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState};

#[path = "work_arrangement_constraints/language_mobility_constraints.rs"]
mod language_mobility_constraints;

#[test]
fn test_missing_required_availability_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, weekend availability");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "weekend availability"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "weekend availability"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_night_shift_accepts_overnight_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for overnight shift coverage.",
        &[],
        "Required: night shift",
    );

    let night_shift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "night shift")
        .expect("night shift review");
    assert_eq!(night_shift.match_state, RequirementMatchState::Direct);
    assert!(night_shift.hard_constraint);
    assert!(night_shift
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "night shift"));
}

#[test]
fn test_night_shift_accepts_third_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for third shift coverage.",
        &[],
        "Required: night shift",
    );

    let night_shift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "night shift")
        .expect("night shift review");
    assert_eq!(night_shift.match_state, RequirementMatchState::Direct);
    assert!(night_shift.hard_constraint);
    assert!(night_shift
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "night shift"));
}

#[test]
fn test_weekend_availability_accepts_weekend_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for weekend shifts.",
        &[],
        "Required: weekend availability",
    );

    let weekend = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "weekend availability")
        .expect("weekend availability review");
    assert_eq!(weekend.match_state, RequirementMatchState::Direct);
    assert!(weekend.hard_constraint);
    assert!(weekend
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "weekend availability"));
}

#[test]
fn test_evening_shift_accepts_second_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for second shift coverage.",
        &[],
        "Required: evening shift",
    );

    let evening_shift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "evening shift")
        .expect("evening shift review");
    assert_eq!(evening_shift.match_state, RequirementMatchState::Direct);
    assert!(evening_shift.hard_constraint);
    assert!(evening_shift
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "evening shift"));
}

#[test]
fn test_day_shift_accepts_first_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for first shift coverage.",
        &[],
        "Required: day shift",
    );

    let day_shift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "day shift")
        .expect("day shift review");
    assert_eq!(day_shift.match_state, RequirementMatchState::Direct);
    assert!(day_shift.hard_constraint);
    assert!(day_shift
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "day shift"));
}

#[test]
fn test_availability_accepts_available_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for full-time coverage.",
        &[],
        "Required: availability",
    );

    let availability = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "availability")
        .expect("availability review");
    assert_eq!(availability.match_state, RequirementMatchState::Direct);
    assert!(availability.hard_constraint);
    assert!(availability
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "availability"));
}

#[test]
fn test_missing_required_overtime_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, overtime availability");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "overtime availability"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "overtime availability"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_overtime_availability_accepts_overtime_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for overtime coverage.",
        &[],
        "Required: overtime availability",
    );

    let overtime = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "overtime availability")
        .expect("overtime availability review");
    assert_eq!(overtime.match_state, RequirementMatchState::Direct);
    assert!(overtime.hard_constraint);
    assert!(overtime
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "overtime availability"));
}

#[test]
fn test_missing_required_holiday_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, holiday availability");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "holiday availability"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "holiday availability"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_holiday_availability_accepts_holiday_shift_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for holiday shifts.",
        &[],
        "Required: holiday availability",
    );

    let holiday = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "holiday availability")
        .expect("holiday availability review");
    assert_eq!(holiday.match_state, RequirementMatchState::Direct);
    assert!(holiday.hard_constraint);
    assert!(holiday
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "holiday availability"));
}

#[test]
fn test_missing_required_full_time_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result =
        AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, full-time availability");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "full-time availability"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "full-time availability"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_full_time_requirement_accepts_full_time_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for full time schedule coverage.",
        &[],
        "Required: full-time availability",
    );

    let full_time = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "full-time availability")
        .expect("full-time availability review");
    assert_eq!(full_time.match_state, RequirementMatchState::Direct);
    assert!(full_time.hard_constraint);
    assert!(full_time
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "full-time availability"));
}

#[test]
fn test_on_site_requirement_accepts_onsite_resume_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for onsite client-facing shifts.",
        &[],
        "Required: on-site role",
    );

    let onsite = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "on-site")
        .expect("on-site review");
    assert_eq!(onsite.match_state, RequirementMatchState::Direct);
    assert!(onsite.hard_constraint);
    assert!(onsite.evidence_sections.contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "on-site"));
}

#[test]
fn test_spaced_on_site_requirement_accepts_hyphen_resume_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for on-site client-facing shifts.",
        &[],
        "Required: on site role",
    );

    let onsite = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "on site")
        .expect("on site review");
    assert_eq!(onsite.match_state, RequirementMatchState::Direct);
    assert!(onsite.hard_constraint);
    assert!(onsite.evidence_sections.contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "on site"));
}

#[test]
fn test_missing_required_hybrid_work_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, hybrid work");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "hybrid work"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
    assert!(result.requirement_reviews.iter().any(|review| {
        review.keyword == "hybrid work"
            && review.hard_constraint
            && review.match_state == RequirementMatchState::Missing
    }));
}

#[test]
fn test_remote_work_requirement_accepts_remote_role_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nAvailable for remote role coverage.",
        &[],
        "Required: remote work",
    );

    let remote = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "remote work")
        .expect("remote work review");
    assert_eq!(remote.match_state, RequirementMatchState::Direct);
    assert!(remote.hard_constraint);
    assert!(remote.evidence_sections.contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "remote work"));
}

#[test]
fn test_reliable_internet_requirement_accepts_high_speed_internet_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nReliable high-speed internet for remote work.",
        &[],
        "Required: reliable internet connection",
    );

    let internet = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "reliable internet connection")
        .expect("reliable internet connection review");
    assert_eq!(internet.match_state, RequirementMatchState::Direct);
    assert!(internet.hard_constraint);
    assert!(internet
        .evidence_sections
        .contains(&"experience".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "reliable internet connection"));
}

#[test]
fn test_missing_required_home_office_constraint_caps_overall_score() {
    let resume = sample_resume();

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: client intake, home office");

    assert!(result.overall_score <= 70.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "home office"
            && risk.category == HardConstraintCategory::Location
            && risk.score_cap == 70.0
            && risk
                .action
                .contains("Check location, schedule, availability, or travel")
    }));
}
