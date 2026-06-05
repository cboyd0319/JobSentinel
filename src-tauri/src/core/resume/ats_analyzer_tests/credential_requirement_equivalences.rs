use crate::core::resume::{AtsAnalyzer, HardConstraintCategory, RequirementMatchState};

#[test]
fn test_drivers_license_requirement_accepts_driver_license_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nValid driver license",
        &[],
        "Required: driver's license",
    );

    let license = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "driver's license")
        .expect("driver license review");
    assert_eq!(license.match_state, RequirementMatchState::Direct);
    assert!(license.hard_constraint);
    assert!(license.evidence_sections.contains(&"licenses".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "driver's license"));
}

#[test]
fn test_cdl_requirement_accepts_commercial_drivers_license_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nCommercial drivers license",
        &[],
        "Required: CDL",
    );

    let cdl = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cdl")
        .expect("cdl review");
    assert_eq!(cdl.match_state, RequirementMatchState::Direct);
    assert!(cdl.hard_constraint);
    assert!(cdl.evidence_sections.contains(&"licenses".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "cdl"));
}

#[test]
fn test_commercial_driver_license_requirement_accepts_cdl_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nCDL",
        &[],
        "Required: commercial driver license",
    );

    let cdl = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "commercial driver license")
        .expect("commercial driver license review");
    assert_eq!(cdl.match_state, RequirementMatchState::Direct);
    assert!(cdl.hard_constraint);
    assert!(cdl.evidence_sections.contains(&"licenses".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "commercial driver license"));
    assert!(!result.hard_constraint_risks.iter().any(|risk| {
        ["driver's license", "drivers license", "driver license"]
            .contains(&risk.requirement.as_str())
    }));
}

#[test]
fn test_clean_driving_record_requirement_caps_when_missing() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nDriver license",
        &[],
        "Required: clean driving record",
    );

    let driving_record = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "clean driving record")
        .expect("clean driving record review");
    assert_eq!(driving_record.match_state, RequirementMatchState::Missing);
    assert!(driving_record.hard_constraint);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "clean driving record"
            && risk.category == HardConstraintCategory::BackgroundScreening
            && risk.action.contains("driving record")
    }));
}

#[test]
fn test_mvr_requirement_accepts_motor_vehicle_record_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nScreening\nMotor vehicle record reviewed for field work.",
        &[],
        "Required: MVR",
    );

    let mvr = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "mvr")
        .expect("mvr review");
    assert_eq!(mvr.match_state, RequirementMatchState::Direct);
    assert!(mvr.hard_constraint);
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "mvr"));
}

#[test]
fn test_auto_insurance_requirement_caps_when_missing() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nDriver license",
        &[],
        "Required: proof of auto insurance",
    );

    let insurance = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "proof of auto insurance")
        .expect("auto insurance review");
    assert_eq!(insurance.match_state, RequirementMatchState::Missing);
    assert!(insurance.hard_constraint);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "proof of auto insurance"
            && risk.category == HardConstraintCategory::Location
            && risk.action.contains("auto insurance")
    }));
}

#[test]
fn test_auto_insurance_requirement_accepts_insured_vehicle_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nSummary\nReliable insured vehicle for client visits.",
        &[],
        "Required: proof of auto insurance",
    );

    let insurance = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "proof of auto insurance")
        .expect("auto insurance review");
    assert_eq!(insurance.match_state, RequirementMatchState::Direct);
    assert!(insurance.hard_constraint);
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "proof of auto insurance"));
}

#[test]
fn test_rn_license_requirement_accepts_registered_nurse_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nRegistered Nurse",
        &[],
        "Required: RN license",
    );

    let rn = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "rn license")
        .expect("rn license review");
    assert_eq!(rn.match_state, RequirementMatchState::Direct);
    assert!(rn.hard_constraint);
    assert!(rn.evidence_sections.contains(&"licenses".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "rn license"));
}

#[test]
fn test_registered_nurse_license_requirement_accepts_rn_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nLicenses\nRN",
        &[],
        "Required: Registered Nurse license",
    );

    let rn = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "registered nurse license")
        .expect("registered nurse license review");
    assert_eq!(rn.match_state, RequirementMatchState::Direct);
    assert!(rn.hard_constraint);
    assert!(rn.evidence_sections.contains(&"licenses".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "registered nurse license"));
}

#[test]
fn test_requirement_review_uses_pmp_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nProject Management Professional",
        &[],
        "Required: PMP certification",
    );

    let pmp = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "pmp")
        .expect("pmp review");
    assert_eq!(pmp.match_state, RequirementMatchState::Direct);
    assert!(pmp.hard_constraint);
    assert!(pmp
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "pmp"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_food_safety_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nServSafe Food Handler",
        &[],
        "Required: food safety certification",
    );

    let food_safety = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "food safety certification")
        .expect("food safety certification review");
    assert_eq!(food_safety.match_state, RequirementMatchState::Direct);
    assert!(food_safety.hard_constraint);
    assert!(food_safety
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "food safety certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_security_plus_requirement_accepts_written_plus_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nSecurity Plus",
        &[],
        "Required: Security+ certification",
    );

    let security_plus = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "security+")
        .expect("security+ review");
    assert_eq!(security_plus.match_state, RequirementMatchState::Direct);
    assert!(security_plus.hard_constraint);
    assert!(security_plus
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "security+"));
}

#[test]
fn test_cissp_full_name_requirement_accepts_cissp_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nCISSP",
        &[],
        "Required: Certified Information Systems Security Professional",
    );

    let cissp = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "certified information systems security professional")
        .expect("cissp full-name review");
    assert_eq!(cissp.match_state, RequirementMatchState::Direct);
    assert!(cissp.hard_constraint);
    assert!(cissp
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certified information systems security professional"));
}

#[test]
fn test_food_handler_requirement_accepts_hyphenated_requirement() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nFood handler card",
        &[],
        "Required: food-handler card",
    );

    let food_handler = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "food-handler card")
        .expect("food-handler card review");
    assert_eq!(food_handler.match_state, RequirementMatchState::Direct);
    assert!(food_handler.hard_constraint);
    assert!(food_handler
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "food-handler card"));
}

#[test]
fn test_food_handlers_card_requirement_accepts_food_handler_card_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nFood handler card",
        &[],
        "Required: food handler's card",
    );

    let food_handler = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "food handler's card")
        .expect("food handler's card review");
    assert_eq!(food_handler.match_state, RequirementMatchState::Direct);
    assert!(food_handler.hard_constraint);
    assert!(food_handler
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "food handler's card"));
}

#[test]
fn test_requirement_review_uses_first_aid_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nFirst Aid Certified",
        &[],
        "Required: first aid certification",
    );

    let first_aid = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "first aid certification")
        .expect("first aid certification review");
    assert_eq!(first_aid.match_state, RequirementMatchState::Direct);
    assert!(first_aid.hard_constraint);
    assert!(first_aid
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "first aid certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_forklift_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nForklift Operator Certification",
        &[],
        "Required: forklift certification",
    );

    let forklift = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "forklift certification")
        .expect("forklift certification review");
    assert_eq!(forklift.match_state, RequirementMatchState::Direct);
    assert!(forklift.hard_constraint);
    assert!(forklift
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "forklift certification"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

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
