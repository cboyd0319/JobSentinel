use crate::core::resume::{AtsAnalyzer, RequirementMatchState};

#[test]
fn test_requirement_review_recognizes_healthcare_and_education_terms() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nDelivered patient care, medication administration, and lesson planning support.",
            &[],
            "Required: patient care, medication administration, lesson planning",
        );

    for keyword in [
        "patient care",
        "medication administration",
        "lesson planning",
    ] {
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == keyword)
            .expect("recognized broad-audience review");
        assert_eq!(review.match_state, RequirementMatchState::Direct);
        assert!(review.evidence_sections.contains(&"experience".to_string()));
    }
}

#[test]
fn test_requirement_review_uses_student_support_services_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nCoordinated student services for workshop attendance.",
            &[],
            "Required: student support",
        );

    let student_support = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "student support")
        .expect("student support review");
    assert_eq!(student_support.match_state, RequirementMatchState::Direct);
    assert!(student_support
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_parent_family_communication_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nPrepared family communication notes for classroom updates.",
            &[],
            "Required: parent communication",
        );

    let parent_communication = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "parent communication")
        .expect("parent communication review");
    assert_eq!(
        parent_communication.match_state,
        RequirementMatchState::Direct
    );
    assert!(parent_communication
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_conservative_acronym_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nMaintained customer relationship management records for client follow-up.",
            &[],
            "Required: CRM",
        );

    let crm = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "crm")
        .expect("crm review");
    assert_eq!(crm.match_state, RequirementMatchState::Strong);
    assert!(crm.evidence_sections.contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_customer_support_service_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nDelivered customer support for billing questions.",
            &[],
            "Required: customer service",
        );

    let customer_service = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "customer service")
        .expect("customer service review");
    assert_eq!(customer_service.match_state, RequirementMatchState::Direct);
    assert!(customer_service
        .evidence_sections
        .contains(&"experience".to_string()));

    let guest_service = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nHandled guest service issues at the front desk.",
            &[],
            "Required: customer service",
        );

    let customer_service = guest_service
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "customer service")
        .expect("customer service review");
    assert_eq!(customer_service.match_state, RequirementMatchState::Direct);
    assert!(customer_service
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_front_desk_reception_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nManaged reception check-in and appointment calls.",
            &[],
            "Required: front desk",
        );

    let front_desk = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "front desk")
        .expect("front desk review");
    assert_eq!(front_desk.match_state, RequirementMatchState::Direct);
    assert!(front_desk
        .evidence_sections
        .contains(&"experience".to_string()));

    let receptionist = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nHandled front desk visitor check-in.",
        &[],
        "Required: receptionist",
    );

    let receptionist_review = receptionist
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "receptionist")
        .expect("receptionist review");
    assert_eq!(
        receptionist_review.match_state,
        RequirementMatchState::Direct
    );
    assert!(receptionist_review
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_case_coordination_management_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nProvided case coordination for client services.",
            &[],
            "Required: case management",
        );

    let case_management = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "case management")
        .expect("case management review");
    assert_eq!(case_management.match_state, RequirementMatchState::Direct);
    assert!(case_management
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nProvided case management for client services.",
            &[],
            "Required: case coordination",
        );

    let case_coordination = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "case coordination")
        .expect("case coordination review");
    assert_eq!(case_coordination.match_state, RequirementMatchState::Direct);
    assert!(case_coordination
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_calendar_management_scheduling_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUsed calendar management for client appointments.",
            &[],
            "Required: scheduling",
        );

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Direct);
    assert!(scheduling
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nHandled scheduling.",
        &[],
        "Required: calendar management",
    );

    let calendar_management = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "calendar management")
        .expect("calendar management review");
    assert_eq!(
        calendar_management.match_state,
        RequirementMatchState::Direct
    );
    assert!(calendar_management
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_onboarding_orientation_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nLed new hire orientation for front desk staff.",
            &[],
            "Required: onboarding",
        );

    let onboarding = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "onboarding")
        .expect("onboarding review");
    assert_eq!(onboarding.match_state, RequirementMatchState::Direct);
    assert!(onboarding
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_training_trained_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nTrained new employees on intake steps.",
        &[],
        "Required: training",
    );

    let training = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "training")
        .expect("training review");
    assert_eq!(training.match_state, RequirementMatchState::Direct);
    assert!(training
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_qa_quality_assurance_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nPerformed QA checks for intake records.",
        &[],
        "Required: quality assurance",
    );

    let quality_assurance = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "quality assurance")
        .expect("quality assurance review");
    assert_eq!(quality_assurance.match_state, RequirementMatchState::Direct);
    assert!(quality_assurance
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nPerformed quality assurance checks for intake records.",
            &[],
            "Required: QA",
        );

    let qa = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "qa")
        .expect("qa review");
    assert_eq!(qa.match_state, RequirementMatchState::Direct);
    assert!(qa.evidence_sections.contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_patient_care_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nProvided patient-care support.",
        &[],
        "Required: patient care",
    );

    let patient_care = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "patient care")
        .expect("patient care review");
    assert_eq!(patient_care.match_state, RequirementMatchState::Direct);
    assert!(patient_care
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nProvided patient care support.",
        &[],
        "Required: patient-care",
    );

    let patient_care_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "patient-care")
        .expect("patient-care review");
    assert_eq!(
        patient_care_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(patient_care_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_medication_administration_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported medication-administration checks for patient visits.",
            &[],
            "Required: medication administration",
        );

    let medication_administration = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medication administration")
        .expect("medication administration review");
    assert_eq!(
        medication_administration.match_state,
        RequirementMatchState::Direct
    );
    assert!(medication_administration
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupported medication administration checks for patient visits.",
            &[],
            "Required: medication-administration",
        );

    let medication_administration_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medication-administration")
        .expect("medication-administration review");
    assert_eq!(
        medication_administration_hyphen.match_state,
        RequirementMatchState::Direct
    );
    assert!(medication_administration_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_medical_record_plural_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUpdated medical record notes for patient visits.",
            &[],
            "Required: medical records",
        );

    let medical_records = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medical records")
        .expect("medical records review");
    assert_eq!(medical_records.match_state, RequirementMatchState::Strong);
    assert!(medical_records
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUpdated medical records for patient visits.",
        &[],
        "Required: medical record",
    );

    let medical_record = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medical record")
        .expect("medical record review");
    assert_eq!(medical_record.match_state, RequirementMatchState::Strong);
    assert!(medical_record
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_medical_record_hyphen_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nUpdated medical-record notes for patient visits.",
            &[],
            "Required: medical records",
        );

    let medical_records = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medical records")
        .expect("medical records review");
    assert_eq!(medical_records.match_state, RequirementMatchState::Strong);
    assert!(medical_records
        .evidence_sections
        .contains(&"experience".to_string()));

    let inverse = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUpdated medical records for patient visits.",
        &[],
        "Required: medical-record",
    );

    let medical_record_hyphen = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "medical-record")
        .expect("medical-record review");
    assert_eq!(
        medical_record_hyphen.match_state,
        RequirementMatchState::Strong
    );
    assert!(medical_record_hyphen
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_requirement_review_uses_care_plan_plural_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUsed care plan notes for patient visits.",
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
        "Required: care plan",
    );

    let care_plan = inverse
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "care plan")
        .expect("care plan review");
    assert_eq!(care_plan.match_state, RequirementMatchState::Direct);
    assert!(care_plan
        .evidence_sections
        .contains(&"experience".to_string()));
}

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
