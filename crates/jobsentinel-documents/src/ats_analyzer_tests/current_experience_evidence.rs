use super::sample_resume;
use crate::{AtsAnalyzer, RequirementMatchState};
use chrono::Datelike;

#[test]
fn test_plain_text_requirement_review_treats_skills_section_as_partial_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nSkills\nCRM\n\nExperience\nLed intake scheduling rollout.",
            &[],
            "Required: CRM, scheduling",
        );

    let crm = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "crm")
        .expect("crm review");
    assert_eq!(crm.match_state, RequirementMatchState::Partial);
    assert!(crm.evidence_sections.contains(&"skills".to_string()));

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Direct);
    assert!(scheduling
        .evidence_sections
        .contains(&"experience".to_string()));
}

#[test]
fn test_plain_text_current_experience_recency_counts_as_strong_evidence() {
    let current_result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupport Coordinator | Present\nHandled scheduling.",
            &[],
            "Required: scheduling",
        );

    let current = current_result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("current scheduling review");
    assert_eq!(current.match_state, RequirementMatchState::Strong);
    assert_eq!(current.evidence_sections, vec!["current experience"]);

    let past_result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nExperience\nSupport Coordinator | 2020 - 2022\nHandled scheduling.",
            &[],
            "Required: scheduling",
        );

    let past = past_result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("past scheduling review");
    assert_eq!(past.match_state, RequirementMatchState::Direct);
    assert_eq!(past.evidence_sections, vec!["experience"]);
}

#[test]
fn test_plain_text_recent_ended_role_counts_as_recent_evidence() {
    let recent_year = chrono::Utc::now().year() - 1;
    let older_year = chrono::Utc::now().year() - 4;
    let recent_result = AtsAnalyzer::analyze_text_for_job(
            &format!(
                "Jordan Lee\njordan@example.com\n\nExperience\nSupport Coordinator | {older_year} - {recent_year}\nHandled scheduling."
            ),
            &[],
            "Required: scheduling",
        );

    let recent = recent_result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("recent scheduling review");
    assert_eq!(recent.match_state, RequirementMatchState::Strong);
    assert_eq!(recent.evidence_sections, vec!["recent experience"]);

    let old_result = AtsAnalyzer::analyze_text_for_job(
            &format!(
                "Jordan Lee\njordan@example.com\n\nExperience\nSupport Coordinator | {} - {older_year}\nHandled scheduling.",
                older_year - 4
            ),
            &[],
            "Required: scheduling",
        );

    let old = old_result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("old scheduling review");
    assert_eq!(old.match_state, RequirementMatchState::Direct);
    assert_eq!(old.evidence_sections, vec!["experience"]);
}

#[test]
fn test_plain_text_service_headings_count_as_experience_evidence() {
    for heading in [
        "Volunteer Experience",
        "Community Involvement",
        "Military Service",
    ] {
        let resume_text = format!(
                "Jordan Lee\njordan@example.com\n\n{heading}\nCoordinated records management for client services."
            );
        let result =
            AtsAnalyzer::analyze_text_for_job(&resume_text, &[], "Required: records management");
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == "records management")
            .expect("records management review");

        assert_eq!(review.match_state, RequirementMatchState::Strong);
        assert!(
            review.evidence_sections.contains(&"experience".to_string()),
            "{heading} should count as experience evidence"
        );
        assert!(!review
            .evidence_sections
            .contains(&"resume text".to_string()));
    }
}

#[test]
fn test_plain_text_history_headings_count_as_experience_evidence() {
    for heading in ["Employment History", "Work History", "Professional History"] {
        let resume_text = format!(
                "Jordan Lee\njordan@example.com\n\n{heading}\nCoordinated records management for client services."
            );
        let result =
            AtsAnalyzer::analyze_text_for_job(&resume_text, &[], "Required: records management");
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == "records management")
            .expect("records management review");

        assert!(
            review.evidence_sections.contains(&"experience".to_string()),
            "{heading} should count as experience evidence"
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
fn test_plain_text_qualified_experience_headings_count_as_experience_evidence() {
    for heading in [
        "Relevant Experience",
        "Selected Experience",
        "Additional Experience",
    ] {
        let resume_text = format!(
                "Jordan Lee\njordan@example.com\n\n{heading}\nCoordinated records management for client services."
            );
        let result =
            AtsAnalyzer::analyze_text_for_job(&resume_text, &[], "Required: records management");
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == "records management")
            .expect("records management review");

        assert!(
            review.evidence_sections.contains(&"experience".to_string()),
            "{heading} should count as experience evidence"
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
fn test_plain_text_academic_headings_count_as_education_evidence() {
    for heading in [
        "Academic Background",
        "Academic History",
        "Education Background",
    ] {
        let resume_text = format!(
            "Jordan Lee\njordan@example.com\n\n{heading}\nBachelor of Science, State University"
        );
        let result =
            AtsAnalyzer::analyze_text_for_job(&resume_text, &[], "Required: bachelor's degree");
        let review = result
            .requirement_reviews
            .iter()
            .find(|review| review.keyword == "bachelor's degree")
            .expect("bachelor's degree review");

        assert!(
            review.evidence_sections.contains(&"education".to_string()),
            "{heading} should count as education evidence"
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
fn test_structured_requirement_review_marks_current_experience_evidence() {
    let result = AtsAnalyzer::analyze_for_job(&sample_resume(), "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert!(scheduling
        .evidence_sections
        .contains(&"current experience".to_string()));
}

#[test]
fn test_plain_text_requirement_review_marks_current_experience_evidence() {
    let result = AtsAnalyzer::analyze_text_for_job(
            "Jordan Lee\njordan@example.com\n\nSummary\nCare coordinator with scheduling experience.\n\nExperience\nCare Coordinator | 2021 - Present\n- Coordinated client intake scheduling.\n\nSupport Associate | 2018 - 2020\n- Maintained CRM records.",
            &[],
            "Required: scheduling, CRM",
        );

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert!(scheduling
        .evidence_sections
        .contains(&"current experience".to_string()));

    let crm = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "crm")
        .expect("crm review");
    assert_eq!(crm.match_state, RequirementMatchState::Strong);
    assert!(crm.evidence_sections.contains(&"experience".to_string()));
    assert!(!crm
        .evidence_sections
        .contains(&"current experience".to_string()));
}

#[test]
fn test_metric_backed_current_experience_counts_as_strong_evidence() {
    let mut resume = sample_resume();
    resume.resume.summary = None;
    resume.resume.skills.clear();
    resume.resume.experience[0].achievements = vec!["Reduced scheduling delays by 30%".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert_eq!(
        scheduling.evidence_sections,
        vec!["current experience".to_string()]
    );
}

#[test]
fn test_scope_backed_current_experience_counts_as_strong_evidence() {
    let mut resume = sample_resume();
    resume.resume.summary = None;
    resume.resume.skills.clear();
    resume.resume.experience[0].achievements =
        vec!["Coordinated scheduling across three service teams".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert_eq!(
        scheduling.evidence_sections,
        vec!["current experience".to_string()]
    );
}

#[test]
fn test_responsibility_backed_current_experience_counts_as_strong_evidence() {
    let mut resume = sample_resume();
    resume.resume.summary = None;
    resume.resume.skills.clear();
    resume.resume.experience[0].achievements =
        vec!["Owned scheduling workflows for client intake".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert_eq!(
        scheduling.evidence_sections,
        vec!["current experience".to_string()]
    );
}

#[test]
fn test_recent_ended_experience_counts_as_recent_evidence() {
    let recent_year = chrono::Utc::now().year() - 1;
    let mut resume = sample_resume();
    resume.resume.summary = None;
    resume.resume.skills.clear();
    resume.resume.experience[0].is_current = false;
    resume.resume.experience[0].end_date = Some(format!("Dec {recent_year}"));
    resume.resume.experience[0].achievements = vec!["Handled scheduling.".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert_eq!(
        scheduling.evidence_sections,
        vec!["recent experience".to_string()]
    );
}

#[test]
fn test_duty_backed_past_experience_counts_as_strong_evidence() {
    let mut resume = sample_resume();
    resume.resume.summary = None;
    resume.resume.skills.clear();
    resume.resume.experience[0].is_current = false;
    resume.resume.experience[0].end_date = Some("Dec 2022".to_string());
    resume.resume.experience[0].achievements =
        vec!["Coordinated scheduling requests for client appointments".to_string()];

    let result = AtsAnalyzer::analyze_for_job(&resume, "Required: scheduling");

    let scheduling = result
        .requirement_reviews
        .iter()
        .find(|review| review.keyword == "scheduling")
        .expect("scheduling review");
    assert_eq!(scheduling.match_state, RequirementMatchState::Strong);
    assert_eq!(scheduling.evidence_sections, vec!["experience".to_string()]);
}
