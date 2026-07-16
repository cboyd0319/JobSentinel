use super::*;

#[test]
fn test_masters_degree_requirement_accepts_master_degree_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster degree",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_science_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Science",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of science review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_business_administration_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Business Administration",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of business administration review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_engineering_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Engineering",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of engineering review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_education_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Education",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of education review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_fine_arts_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Fine Arts",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of fine arts review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_masters_degree_requirement_accepts_master_of_social_work_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nMaster of Social Work",
        &[],
        "Required: master's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "master's degree")
        .expect("master of social work review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "master's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_associates_degree_requirement_accepts_associate_degree_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nAssociate degree",
        &[],
        "Required: associate's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "associate's degree")
        .expect("associate degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "associate's degree"));
}

#[test]
fn test_associates_degree_requirement_accepts_associate_of_arts_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nAssociate of Arts",
        &[],
        "Required: associate's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "associate's degree")
        .expect("associate of arts review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "associate's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_associates_degree_requirement_accepts_associate_of_science_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nAssociate of Science",
        &[],
        "Required: associate's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "associate's degree")
        .expect("associate of science review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "associate's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_associates_degree_requirement_accepts_associate_of_applied_science_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nAssociate of Applied Science",
        &[],
        "Required: associate's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "associate's degree")
        .expect("associate of applied science review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "associate's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_doctorate_degree_requirement_accepts_phd_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nPhD in Biology",
        &[],
        "Required: doctorate degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "doctorate degree")
        .expect("doctorate degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "doctorate degree"));
}
