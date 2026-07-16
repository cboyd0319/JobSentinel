use super::*;

#[test]
fn test_requirement_review_uses_conservative_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nBasic Life Support",
        &[],
        "Required: BLS",
    );

    let bls = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bls")
        .expect("bls review");
    assert_eq!(bls.match_state, RequirementMatchState::Direct);
    assert!(bls
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "bls"));
}

#[test]
fn test_requirement_review_uses_cna_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nCertified Nursing Assistant",
        &[],
        "Required: CNA certification",
    );

    let cna = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "cna")
        .expect("cna review");
    assert_eq!(cna.match_state, RequirementMatchState::Direct);
    assert!(cna.hard_constraint);
    assert!(cna
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "cna"));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "certification"));
}

#[test]
fn test_requirement_review_uses_lpn_credential_equivalence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nCertifications\nLicensed Practical Nurse",
        &[],
        "Required: LPN license",
    );

    let lpn = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "lpn")
        .expect("lpn review");
    assert_eq!(lpn.match_state, RequirementMatchState::Direct);
    assert!(lpn.hard_constraint);
    assert!(lpn
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!result
        .hard_constraint_risks
        .iter()
        .any(|risk| risk.requirement == "lpn"));
}

#[test]
fn test_plain_text_training_heading_counts_as_credential_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nTraining\nBasic Life Support",
        &[],
        "Required: BLS",
    );

    let bls = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "bls")
        .expect("bls review");
    assert_eq!(bls.match_state, RequirementMatchState::Direct);
    assert!(bls
        .evidence_sections
        .contains(&"certifications".to_string()));
    assert!(!bls.evidence_sections.contains(&"resume text".to_string()));
    assert!(!result
        .format_issues
        .iter()
        .any(|issue| issue.issue.contains("standard resume section headings")));
}

#[test]
fn test_plain_text_combined_license_certification_headings_count_as_credential_evidence() {
    for heading in [
        "Licenses & Certifications",
        "Licenses and Certifications",
        "Certifications and Licenses",
    ] {
        let resume_text = format!("Jordan Lee\njordan@example.com\n\n{heading}\nPMP certification");
        let result = AtsAnalyzer::analyze_text_for_job(&resume_text, &[], "Required: PMP");
        let pmp = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == "pmp")
            .expect("pmp review");

        assert!(
            pmp.evidence_sections
                .contains(&"certifications".to_string()),
            "{heading} should count as certification evidence"
        );
        assert!(
            !result
                .format_issues
                .iter()
                .any(|issue| issue.issue.contains("standard resume section headings")),
            "{heading} should count as a standard heading"
        );
    }
}

#[test]
fn test_missing_required_credential_equivalence_caps_overall_score() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nLed intake scheduling.",
        &[],
        "Required: BLS",
    );

    assert!(result.overall_score <= 60.0);
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "bls"
            && risk.category == HardConstraintCategory::LicenseOrCertification
            && risk.score_cap == 60.0
            && risk.action.contains("license or certification")
    }));
}

#[test]
fn test_conservative_acronym_equivalence_does_not_double_count_same_line() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Jordan Lee\njordan@example.com\n\nExperience\nUsed CRM (customer relationship management).",
        &[],
        "Required: CRM",
    );

    let crm = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "crm")
        .expect("crm review");
    assert_eq!(crm.match_state, RequirementMatchState::Direct);
    assert_eq!(crm.evidence_sections, vec!["experience".to_string()]);
}

#[test]
fn test_overall_score_calculation() {
    let resume = sample_resume();
    let job_desc = "Required: Rust, Python, Docker";

    let result = AtsAnalyzer::analyze_for_job(&resume, job_desc);

    // Overall score should be weighted average
    let expected = (result.keyword_score * 0.4)
        + (result.format_score * 0.3)
        + (result.completeness_score * 0.3);

    assert!((result.overall_score - expected).abs() < 0.01);
}
