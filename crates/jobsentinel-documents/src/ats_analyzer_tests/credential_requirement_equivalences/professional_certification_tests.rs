use super::*;

#[test]
fn test_requirement_review_uses_osha_10_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nOSHA 10-Hour Construction Safety",
        &[],
        "Required: OSHA 10 certification",
    );

    let osha = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "osha 10 certification")
        .expect("osha 10 certification review");
    assert_eq!(osha.match_state, RequirementMatchState::Direct);
    assert!(osha.hard_constraint);
    assert!(osha
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "osha 10 certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_osha_30_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nOSHA 30-Hour Construction Safety",
        &[],
        "Required: OSHA 30 certification",
    );

    let osha = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "osha 30 certification")
        .expect("osha 30 certification review");
    assert_eq!(osha.match_state, RequirementMatchState::Direct);
    assert!(osha.hard_constraint);
    assert!(osha
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "osha 30 certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_cpa_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nCertified Public Accountant",
        &[],
        "Required: CPA certification",
    );

    let cpa = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cpa")
        .expect("cpa review");
    assert_eq!(cpa.match_state, RequirementMatchState::Direct);
    assert!(cpa.hard_constraint);
    assert!(cpa
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "cpa"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_six_sigma_belt_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nLean Six Sigma Green Belt",
        &[],
        "Required: Six Sigma certification",
    );

    let six_sigma = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "six sigma certification")
        .expect("six sigma review");
    assert_eq!(six_sigma.match_state, RequirementMatchState::Direct);
    assert!(six_sigma.hard_constraint);
    assert!(six_sigma
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "six sigma certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_cpa_marketing_metric_is_not_treated_as_accounting_credential() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nReduced paid search CPA through conversion optimization.",
        &[],
        "Required: CPA optimization and paid search reporting",
    );

    assert!(!result
        .requirement_reviews
        .iter()
        .any(|review| review.keyword == "cpa" && review.hard_constraint));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "cpa"));
}

#[test]
fn test_requirement_review_uses_aws_certified_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nAWS Certified Cloud Practitioner",
        &[],
        "Required: AWS certification",
    );

    let aws = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "aws certification")
        .expect("aws certification review");
    assert_eq!(aws.match_state, RequirementMatchState::Direct);
    assert!(aws.hard_constraint);
    assert!(aws
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "aws certification"));
}

#[test]
fn test_requirement_review_uses_hr_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nSHRM Certified Professional",
        &[],
        "Required: SHRM-CP certification",
    );

    let shrm_cp = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "shrm-cp")
        .expect("shrm-cp review");
    assert_eq!(shrm_cp.match_state, RequirementMatchState::Direct);
    assert!(shrm_cp.hard_constraint);
    assert!(shrm_cp
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "shrm-cp"));
}

#[test]
fn test_requirement_review_uses_certified_medical_assistant_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nCertified Medical Assistant",
        &[],
        "Required: medical assistant certification",
    );

    let medical_assistant = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medical assistant certification")
        .expect("medical assistant certification review");
    assert_eq!(medical_assistant.match_state, RequirementMatchState::Direct);
    assert!(medical_assistant.hard_constraint);
    assert!(medical_assistant
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "medical assistant certification"));
}

#[test]
fn test_requirement_review_uses_medical_coding_cpc_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nCertified Professional Coder",
        &[],
        "Required: CPC certification",
    );

    let cpc = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cpc")
        .expect("cpc review");
    assert_eq!(cpc.match_state, RequirementMatchState::Direct);
    assert!(cpc.hard_constraint);
    assert!(cpc
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "cpc"));
}

#[test]
fn test_requirement_review_uses_arrt_and_pharmacy_tech_equivalences() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nARRT Certification\nPharmacy Technician Certification",
        &[],
        "Required: ARRT certification and pharmacy technician certification",
    );

    for keyword in ["arrt certification", "pharmacy technician certification"] {
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == keyword)
            .unwrap_or_else(|| panic!("credential review for {keyword}"));
        assert_eq!(review.match_state, RequirementMatchState::Direct);
        assert!(review.hard_constraint);
        assert!(review
            .evidence_sections
            .contains(&"certifications".to_string()));
        assert!(!result
            .hard_constraint_risks
            .iter()
            .any(|risk| risk.requirement == keyword));
    }
}

#[test]
fn test_requirement_review_uses_cda_and_hvac_specific_equivalences() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nChild Development Associate\nEPA 608\nNATE Certified",
        &[],
        "Required: CDA credential, EPA 608 certification, and NATE certification",
    );

    for keyword in [
        "cda credential",
        "epa 608 certification",
        "nate certification",
    ] {
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == keyword)
            .unwrap_or_else(|| panic!("credential review for {keyword}"));
        assert!(
            matches!(
                review.match_state,
                RequirementMatchState::Direct | RequirementMatchState::Strong
            ),
            "{keyword} should have direct or stronger credential evidence"
        );
        assert!(review.hard_constraint);
        assert!(review
            .evidence_sections
            .contains(&"certifications".to_string()));
        assert!(!result
            .hard_constraint_risks
            .iter()
            .any(|risk| risk.requirement == keyword));
    }
}
