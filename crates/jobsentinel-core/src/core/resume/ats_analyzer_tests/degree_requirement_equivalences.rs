use crate::core::resume::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_degree_or_equivalent_experience_avoids_exact_degree_cap() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\n6 years of client operations experience and records management.",
            &[],
            "Required: bachelor's degree or equivalent experience",
        );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "degree or equivalent experience")
        .expect("degree-equivalent review");
    assert!(matches!(
        review.match_state,
        RequirementMatchState::Direct | RequirementMatchState::Strong
    ));
    assert!(!review.hard_constraint);
    assert!(review.evidence_sections.contains(&"experience".to_string()));
    assert!(result
        .hard_constraint_risks
        .iter()
        .all(|risk| { risk.requirement != "degree" && risk.requirement != "bachelor's degree" }));
}

#[test]
fn test_degree_or_equivalent_combination_avoids_exact_degree_cap() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\n6 years of client operations experience and records management.",
            &[],
            "Required: bachelor's degree or equivalent combination of education and experience",
        );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "degree or equivalent experience")
        .expect("degree-equivalent combination review");
    assert!(matches!(
        review.match_state,
        RequirementMatchState::Direct | RequirementMatchState::Strong
    ));
    assert!(!review.hard_constraint);
    assert!(review.evidence_sections.contains(&"experience".to_string()));
    assert!(result
        .hard_constraint_risks
        .iter()
        .all(|risk| { risk.requirement != "degree" && risk.requirement != "bachelor's degree" }));
}

#[test]
fn test_associate_degree_or_equivalent_experience_avoids_exact_degree_cap() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\n6 years of client operations experience and records management.",
            &[],
            "Required: associate degree or equivalent experience",
        );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "degree or equivalent experience")
        .expect("associate degree-equivalent review");
    assert!(matches!(
        review.match_state,
        RequirementMatchState::Direct | RequirementMatchState::Strong
    ));
    assert!(!review.hard_constraint);
    assert!(review.evidence_sections.contains(&"experience".to_string()));
    assert!(result
        .hard_constraint_risks
        .iter()
        .all(|risk| { risk.requirement != "degree" && risk.requirement != "associate degree" }));
}

#[test]
fn test_doctorate_degree_or_equivalent_experience_avoids_exact_degree_cap() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\n6 years of client operations experience and records management.",
            &[],
            "Required: doctorate degree or equivalent experience",
        );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "degree or equivalent experience")
        .expect("doctorate degree-equivalent review");
    assert!(matches!(
        review.match_state,
        RequirementMatchState::Direct | RequirementMatchState::Strong
    ));
    assert!(!review.hard_constraint);
    assert!(review.evidence_sections.contains(&"experience".to_string()));
    assert!(result
        .hard_constraint_risks
        .iter()
        .all(|risk| { risk.requirement != "degree" && risk.requirement != "doctorate degree" }));
}

#[test]
fn test_high_school_diploma_recognizes_ged_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nGED",
        &[],
        "Required: high school diploma",
    );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "high school diploma")
        .expect("high school diploma review");
    assert_eq!(review.match_state, RequirementMatchState::Direct);
    assert!(review.hard_constraint);
    assert!(review.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "high school diploma"));
}

#[test]
fn test_high_school_diploma_accepts_hyphenated_requirement() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nHigh school diploma",
        &[],
        "Required: high-school diploma",
    );

    let review = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "high-school diploma")
        .expect("high-school diploma review");
    assert_eq!(review.match_state, RequirementMatchState::Direct);
    assert!(review.hard_constraint);
    assert!(review.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "high-school diploma"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_degree_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor degree",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_baccalaureate_degree_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBaccalaureate degree",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("baccalaureate degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_baccalaureate_degree_requirement_accepts_bachelor_degree_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor degree",
        &[],
        "Required: baccalaureate degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "baccalaureate degree")
        .expect("baccalaureate degree review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "baccalaureate degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_science_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Science",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of science review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_applied_science_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Applied Science",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of applied science review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_business_administration_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Business Administration",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of business administration review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_engineering_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Engineering",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of engineering review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_education_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Education",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of education review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_fine_arts_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Fine Arts",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of fine arts review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

#[test]
fn test_bachelors_degree_requirement_accepts_bachelor_of_social_work_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nEducation\nBachelor of Social Work",
        &[],
        "Required: bachelor's degree",
    );

    let degree = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bachelor's degree")
        .expect("bachelor of social work review");
    assert_eq!(degree.match_state, RequirementMatchState::Direct);
    assert!(degree.hard_constraint);
    assert!(degree.evidence_sections.contains(&"education".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bachelor's degree"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "degree"));
}

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
