use crate::{
    AtsAnalyzer, HardConstraintCategory, ProfessionMatchingProfile, RegionalMatchingProfile,
    RequirementMatchState, ResumeMatchingProfile,
};

fn analyze(
    resume_text: &str,
    skills: &[String],
    job_description: &str,
    profession: ProfessionMatchingProfile,
    region: RegionalMatchingProfile,
) -> crate::AtsAnalysisResult {
    AtsAnalyzer::analyze_text_for_job_with_profile(
        resume_text,
        skills,
        job_description,
        ResumeMatchingProfile { profession, region },
    )
}

#[test]
fn explicit_profession_profile_marks_preferred_sections_without_changing_match_state() {
    let profile = ResumeMatchingProfile {
        profession: ProfessionMatchingProfile::Technical,
        region: RegionalMatchingProfile::UnitedKingdom,
    };
    let result = AtsAnalyzer::analyze_text_for_job_with_profile(
        "Projects\nKubernetes\n\nSkills\nExcel",
        &["Excel".to_string()],
        "Required: Kubernetes, Excel",
        profile,
    );

    assert_eq!(result.matching_profile, Some(profile));
    let kubernetes = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "kubernetes")
        .unwrap();
    assert_eq!(kubernetes.profile_preferred_section, Some(true));
    assert_eq!(kubernetes.match_state, RequirementMatchState::Direct);

    let excel = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "excel")
        .unwrap();
    assert_eq!(excel.profile_preferred_section, Some(false));
    assert_eq!(excel.match_state, RequirementMatchState::Partial);

    let unprofiled = AtsAnalyzer::analyze_text_for_job(
        "Projects\nKubernetes\n\nSkills\nExcel",
        &["Excel".to_string()],
        "Required: Kubernetes, Excel",
    );
    assert_eq!(result.keyword_score, unprofiled.keyword_score);
    assert_eq!(result.overall_score, unprofiled.overall_score);
}

#[test]
fn regional_profiles_match_reviewed_spelling_variants_but_us_does_not() {
    for region in [
        RegionalMatchingProfile::UnitedKingdom,
        RegionalMatchingProfile::EuropeanUnion,
        RegionalMatchingProfile::India,
    ] {
        let result = analyze(
            "Experience\nLed program evaluation.",
            &[],
            "Required: programme evaluation",
            ProfessionMatchingProfile::Operations,
            region,
        );
        assert_eq!(result.keyword_matches.len(), 1);
        assert_eq!(result.keyword_matches[0].keyword, "program evaluation");
    }

    let us = analyze(
        "Experience\nLed program evaluation.",
        &[],
        "Required: programme evaluation",
        ProfessionMatchingProfile::Operations,
        RegionalMatchingProfile::UnitedStates,
    );
    assert!(us.keyword_matches.is_empty());
}

#[test]
fn regional_profile_does_not_turn_a_different_concept_into_evidence() {
    let result = analyze(
        "Experience\nLed project evaluation.",
        &[],
        "Required: programme evaluation",
        ProfessionMatchingProfile::Operations,
        RegionalMatchingProfile::UnitedKingdom,
    );

    assert!(result.keyword_matches.is_empty());
    assert_eq!(result.missing_keywords, ["program evaluation"]);
}

#[test]
fn regional_spelling_keeps_missing_licence_as_a_hard_constraint() {
    let result = analyze(
        "Experience\nLed program evaluation.",
        &[],
        "Required: driver's licence, programme evaluation",
        ProfessionMatchingProfile::Operations,
        RegionalMatchingProfile::UnitedKingdom,
    );

    assert!(result
        .missing_keywords
        .iter()
        .any(|keyword| keyword == "driver's license"));
    assert!(result.hard_constraint_risks.iter().any(|risk| {
        risk.requirement == "driver's license"
            && risk.category == HardConstraintCategory::LicenseOrCertification
    }));
}

#[test]
fn existing_unprofiled_analysis_neither_infers_nor_serializes_a_profile() {
    let result = AtsAnalyzer::analyze_text_for_job(
        "Experience\nLed program evaluation.",
        &[],
        "Required: program evaluation",
    );

    assert!(result.matching_profile.is_none());
    assert!(result
        .requirement_reviews
        .iter()
        .all(|review| review.profile_preferred_section.is_none()));
    let serialized = serde_json::to_string(&result).unwrap();
    assert!(!serialized.contains("matching_profile"));
    assert!(!serialized.contains("profile_preferred_section"));
}

#[test]
fn matching_profiles_have_stable_wire_names() {
    let profile = ResumeMatchingProfile {
        profession: ProfessionMatchingProfile::EarlyCareer,
        region: RegionalMatchingProfile::India,
    };

    assert_eq!(
        serde_json::to_string(&profile).unwrap(),
        r#"{"profession":"early_career","region":"india"}"#
    );
}
