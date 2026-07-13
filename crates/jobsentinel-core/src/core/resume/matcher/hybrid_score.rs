use crate::core::resume::types::{EducationRequirement, ExperienceRequirement};

#[cfg(any(not(feature = "embedded-ml"), test))]
const SKILLS_WEIGHT: f64 = 0.5;
#[cfg(any(not(feature = "embedded-ml"), test))]
const EXPERIENCE_WEIGHT: f64 = 0.3;
#[cfg(any(not(feature = "embedded-ml"), test))]
const EDUCATION_WEIGHT: f64 = 0.2;

pub(super) fn calculate_overall_score(
    matching_skills: &[String],
    missing_skills: &[String],
    skills_match_score: f64,
    experience_match_score: f64,
    experience_reqs: &[ExperienceRequirement],
    education_match_score: f64,
    education_req: Option<&EducationRequirement>,
) -> f64 {
    #[cfg(feature = "embedded-ml")]
    {
        calculate_hybrid_score(
            matching_skills,
            missing_skills,
            skills_match_score,
            experience_match_score,
            experience_reqs,
            education_match_score,
            education_req,
        )
    }

    #[cfg(not(feature = "embedded-ml"))]
    {
        let _ = (
            matching_skills,
            missing_skills,
            experience_reqs,
            education_req,
        );
        calculate_legacy_score(
            skills_match_score,
            experience_match_score,
            education_match_score,
        )
    }
}

#[cfg(any(not(feature = "embedded-ml"), test))]
fn calculate_legacy_score(
    skills_match_score: f64,
    experience_match_score: f64,
    education_match_score: f64,
) -> f64 {
    (skills_match_score * SKILLS_WEIGHT)
        + (experience_match_score * EXPERIENCE_WEIGHT)
        + (education_match_score * EDUCATION_WEIGHT)
}

#[cfg(feature = "embedded-ml")]
fn calculate_hybrid_score(
    matching_skills: &[String],
    missing_skills: &[String],
    skills_match_score: f64,
    experience_match_score: f64,
    experience_reqs: &[ExperienceRequirement],
    education_match_score: f64,
    education_req: Option<&EducationRequirement>,
) -> f64 {
    use crate::core::ml::{HybridCandidate, HybridScorer, MatchBlocker};

    let required_coverage = required_coverage(
        matching_skills,
        missing_skills,
        skills_match_score,
        experience_match_score,
        experience_reqs,
        education_match_score,
        education_req,
    );
    let mut blockers = Vec::new();
    if !missing_skills.is_empty() && skills_match_score < 0.5 {
        blockers.push(MatchBlocker::MissingRequiredSkill(
            missing_skills[0].clone(),
        ));
    }
    if experience_reqs
        .iter()
        .any(|requirement| requirement.is_required)
        && experience_match_score < 0.5
    {
        blockers.push(MatchBlocker::MissingRequiredSkill(
            "experience requirement".to_string(),
        ));
    }
    if education_req.is_some_and(|requirement| requirement.is_required)
        && education_match_score < 1.0
    {
        blockers.push(MatchBlocker::MissingRequiredSkill(
            "education requirement".to_string(),
        ));
    }

    let score = HybridScorer::default()
        .score(&[HybridCandidate {
            id: "resume-job-match".to_string(),
            dense_score: None,
            bm25_score: None,
            skill_coverage: skill_coverage(matching_skills, missing_skills, skills_match_score),
            required_coverage,
            seniority_match: seniority_match(experience_reqs, experience_match_score),
            reranker_score: None,
            skill_hits: matching_skills.to_vec(),
            blockers,
        }])
        .into_iter()
        .next()
        .map(|score| score.score)
        .unwrap_or_default();

    f64::from(score)
}

#[cfg(feature = "embedded-ml")]
fn skill_coverage(
    matching_skills: &[String],
    missing_skills: &[String],
    skills_match_score: f64,
) -> Option<f32> {
    let total = matching_skills.len() + missing_skills.len();
    (total > 0).then_some(clamp01(skills_match_score))
}

#[cfg(feature = "embedded-ml")]
fn required_coverage(
    matching_skills: &[String],
    missing_skills: &[String],
    skills_match_score: f64,
    experience_match_score: f64,
    experience_reqs: &[ExperienceRequirement],
    education_match_score: f64,
    education_req: Option<&EducationRequirement>,
) -> Option<f32> {
    let mut scores = Vec::new();
    if !matching_skills.is_empty() || !missing_skills.is_empty() {
        scores.push(clamp01(skills_match_score));
    }
    if experience_reqs
        .iter()
        .any(|requirement| requirement.is_required)
    {
        scores.push(clamp01(experience_match_score));
    }
    if education_req.is_some_and(|requirement| requirement.is_required) {
        scores.push(clamp01(education_match_score));
    }

    if scores.is_empty() {
        None
    } else {
        Some(scores.iter().sum::<f32>() / scores.len() as f32)
    }
}

#[cfg(feature = "embedded-ml")]
fn seniority_match(
    experience_reqs: &[ExperienceRequirement],
    experience_match_score: f64,
) -> Option<f32> {
    (!experience_reqs.is_empty()).then_some(clamp01(experience_match_score))
}

#[cfg(feature = "embedded-ml")]
fn clamp01(value: f64) -> f32 {
    if value.is_finite() {
        value.clamp(0.0, 1.0) as f32
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(feature = "embedded-ml")]
    use crate::core::resume::types::DegreeLevel;

    #[test]
    fn legacy_score_preserves_existing_formula() {
        let score = calculate_legacy_score(0.5, 1.0, 1.0);

        assert!((score - 0.75).abs() < f64::EPSILON);
    }

    #[cfg(feature = "embedded-ml")]
    #[test]
    fn hybrid_score_caps_missing_required_skills() {
        let score =
            calculate_overall_score(&[], &[String::from("Kubernetes")], 0.0, 1.0, &[], 1.0, None);

        assert!(score <= 0.45);
    }

    #[cfg(feature = "embedded-ml")]
    #[test]
    fn hybrid_score_keeps_strong_direct_matches_high() {
        let score = calculate_overall_score(
            &[String::from("Python"), String::from("React")],
            &[],
            1.0,
            1.0,
            &[ExperienceRequirement {
                skill: None,
                min_years: 3.0,
                max_years: None,
                is_required: true,
            }],
            1.0,
            Some(&EducationRequirement {
                degree_level: DegreeLevel::Bachelor,
                fields: Vec::new(),
                is_required: true,
            }),
        );

        assert!(score >= 0.9);
    }
}
