//! Adds cited, advisory local matching to the maintained ATS review workflows.

use super::*;
use anyhow::Context;
use jobsentinel_domain::ResumeEvidenceCitation;
use jobsentinel_local_ai::{SemanticMatchResult, SemanticMatcher};
use std::path::PathBuf;

// The caller runs these workflows on a blocking thread while holding the model lifecycle reservation.
pub async fn review_active_resume_for_job(
    database: &Database,
    job_description: &str,
    profile: Option<ResumeMatchingProfile>,
    app_data_dir: PathBuf,
) -> Result<ResumeJobReview, ActiveResumeAnalysisError> {
    let context = load_active_resume_analysis_context(database).await?;
    let snapshot = ResumeEvidenceSnapshot {
        source_id: format!("resume:{}", context.resume_id),
        revision: context.revision.to_rfc3339(),
    };
    let analysis = analyze_captured_resume(&context, job_description, profile);
    let chunks = saved_resume_chunks(&context.skill_names, &context.parsed_text);
    let texts = chunk_texts(&chunks);
    let requirements = requirements(&analysis);
    let contextual = AtsAnalyzer::extract_semantic_requirements(job_description);
    if semantic::validate_review_inputs(&texts, &requirements, &contextual).is_err() {
        ensure_active_resume_analysis_context(database, &context).await?;
        return Ok(ResumeJobReview::from(analysis)
            .without_semantic(SemanticUnavailableReason::InputUnavailable)
            .with_resume_snapshot(&context));
    }
    let result = semantic::match_loaded_resume_skills(
        database,
        app_data_dir,
        context.resume_id,
        &snapshot,
        &texts,
        &requirements,
        &contextual,
    )
    .await;
    ensure_active_resume_analysis_context(database, &context).await?;
    let Ok(result) = result else {
        return Ok(ResumeJobReview::from(analysis)
            .without_semantic(SemanticUnavailableReason::ModelUnavailable)
            .with_resume_snapshot(&context));
    };
    Ok(completed_review(
        analysis,
        bind_assessment(&snapshot, &snapshot, &chunks, job_description, result),
    )
    .with_resume_snapshot(&context))
}

pub fn review_structured_resume_for_job(
    input: ResumeAnalysisInput,
    job_description: &str,
    profile: Option<ResumeMatchingProfile>,
    app_data_dir: PathBuf,
) -> anyhow::Result<ResumeJobReview> {
    review_structured_with_matcher(
        input,
        job_description,
        profile,
        |texts, requirements, contextual| {
            let matcher = SemanticMatcher::new(app_data_dir)?;
            matcher.match_skills(
                texts,
                if matcher.uses_persistent_resume_vectors() {
                    contextual
                } else {
                    requirements
                },
            )
        },
    )
}

fn review_structured_with_matcher(
    input: ResumeAnalysisInput,
    job_description: &str,
    profile: Option<ResumeMatchingProfile>,
    match_skills: impl FnOnce(&[String], &[String], &[String]) -> anyhow::Result<SemanticMatchResult>,
) -> anyhow::Result<ResumeJobReview> {
    let snapshot = ephemeral_resume_snapshot(&input)?;
    let chunks = structured_chunks(&input);
    let analysis = analyze_structured_resume_for_job_with_profile(input, job_description, profile)?;
    let texts = chunk_texts(&chunks);
    let requirements = requirements(&analysis);
    let contextual = AtsAnalyzer::extract_semantic_requirements(job_description);
    if semantic::validate_review_inputs(&texts, &requirements, &contextual).is_err() {
        return Ok(ResumeJobReview::from(analysis)
            .without_semantic(SemanticUnavailableReason::InputUnavailable));
    }
    let Ok(result) = match_skills(&texts, &requirements, &contextual) else {
        return Ok(ResumeJobReview::from(analysis)
            .without_semantic(SemanticUnavailableReason::ModelUnavailable));
    };
    Ok(completed_review(
        analysis,
        bind_assessment(&snapshot, &snapshot, &chunks, job_description, result),
    ))
}

fn completed_review(
    analysis: AtsAnalysisResult,
    assessment: anyhow::Result<EvidenceBoundSemanticMatch>,
) -> ResumeJobReview {
    match assessment {
        Ok(assessment) => ResumeJobReview {
            analysis,
            resume_snapshot: None,
            semantic_assessment: Some(assessment),
            semantic_unavailable_reason: None,
        },
        Err(_) => ResumeJobReview::from(analysis)
            .without_semantic(SemanticUnavailableReason::ModelUnavailable),
    }
}

pub(super) fn requirements(analysis: &AtsAnalysisResult) -> Vec<String> {
    // Similarity is never evidence of a license, clearance, authorization or other hard constraint.
    analysis
        .requirement_reviews
        .iter()
        .filter(|review| !review.hard_constraint)
        .map(|review| review.keyword.clone())
        .collect()
}

pub(super) fn chunk_texts(chunks: &[(String, String)]) -> Vec<String> {
    chunks.iter().map(|(text, _)| text.clone()).collect()
}

fn push_chunk(chunks: &mut Vec<(String, String)>, text: &str, path: String) {
    if !text.trim().is_empty() && !chunks.iter().any(|(existing, _)| existing == text) {
        chunks.push((text.to_string(), path));
    }
}

pub(super) fn saved_resume_chunks(skills: &[String], text: &str) -> Vec<(String, String)> {
    let mut chunks = Vec::new();
    for (index, skill) in skills.iter().enumerate() {
        push_chunk(&mut chunks, skill, format!("skills.{index}"));
    }
    for (index, line) in text.trim().lines().enumerate() {
        push_chunk(&mut chunks, line, format!("resume_text.{index}"));
    }
    chunks
}

fn structured_chunks(input: &ResumeAnalysisInput) -> Vec<(String, String)> {
    let mut chunks = Vec::new();
    let resume = &input.resume;
    if let Some(summary) = &resume.summary {
        push_chunk(&mut chunks, summary, "summary".into());
    }
    for (index, experience) in resume.experience.iter().enumerate() {
        push_chunk(
            &mut chunks,
            &experience.title,
            format!("experience.{index}.title"),
        );
        for (item, text) in experience.achievements.iter().enumerate() {
            push_chunk(
                &mut chunks,
                text,
                format!("experience.{index}.achievements.{item}"),
            );
        }
    }
    for (category, skills) in resume.skills.iter().enumerate() {
        for (index, skill) in skills.skills.iter().enumerate() {
            push_chunk(
                &mut chunks,
                &skill.name,
                format!("skills.{category}.skills.{index}.name"),
            );
        }
    }
    for (index, education) in resume.education.iter().enumerate() {
        push_chunk(
            &mut chunks,
            &education.degree,
            format!("education.{index}.degree"),
        );
    }
    for (index, project) in resume.projects.iter().enumerate() {
        push_chunk(
            &mut chunks,
            &project.description,
            format!("projects.{index}.description"),
        );
    }
    chunks
}

pub(super) fn bind_assessment(
    snapshot: &ResumeEvidenceSnapshot,
    current_snapshot: &ResumeEvidenceSnapshot,
    chunks: &[(String, String)],
    description: &str,
    result: SemanticMatchResult,
) -> anyhow::Result<EvidenceBoundSemanticMatch> {
    anyhow::ensure!(
        snapshot == current_snapshot,
        "resume changed during local matching"
    );
    let match_evidence = result
        .matched_skills
        .iter()
        .map(|matched| {
            let mut sources = chunks
                .iter()
                .filter(|(text, _)| text == &matched.user_skill);
            let (_, path) = sources
                .next()
                .context("semantic match evidence is unavailable")?;
            anyhow::ensure!(
                sources.next().is_none(),
                "semantic match evidence is unavailable"
            );
            ResumeEvidenceCitation::for_field(snapshot, path)
                .context("semantic match evidence is unavailable")
        })
        .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(EvidenceBoundSemanticMatch {
        semantic_match: result,
        match_evidence,
        job_description_sha256: semantic::description_digest(description),
    })
}

#[cfg(test)]
#[path = "semantic_review_tests.rs"]
mod tests;
