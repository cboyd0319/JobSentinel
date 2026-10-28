//! Binds local semantic matching to current resume and job evidence.

use anyhow::{Context, Result};
use jobsentinel_domain::{
    v3_contracts::SchemaId,
    v3_manifests::{ModelProvenance, VectorFreshness},
    ResumeEvidenceCitation, ResumeEvidenceSnapshot,
};
use jobsentinel_local_ai::{
    default_resume_embedding_provenance, validate_local_matching_inputs,
    validate_resume_embeddings, validate_v3_vector_contract, InferenceCancellation,
    SemanticMatchResult, SemanticMatcher,
};
use jobsentinel_storage::{
    v3_vectors::{resume_vector_subject, StoredVectorRead},
    Database,
};
use sha2::{Digest, Sha256};
use std::path::PathBuf;

const RESUME_VECTOR_CHUNKER: &str = "ordered_first_resume_evidence_v2";
const RESUME_VECTOR_NORMALIZER: &str = "exact_utf8_v1";

#[derive(Debug, Clone, serde::Serialize)]
pub struct EvidenceBoundSemanticMatch {
    #[serde(flatten)]
    pub semantic_match: SemanticMatchResult,
    /// One citation per matched skill, in the same order.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub match_evidence: Vec<ResumeEvidenceCitation>,
    pub job_description_sha256: String,
}

fn resume_vector_freshness(model: &ModelProvenance, first_skill: &str) -> Result<VectorFreshness> {
    let freshness = VectorFreshness {
        schema: SchemaId::VectorFreshnessV1,
        model_id: model.model_id.clone(),
        model_revision: model.revision.clone(),
        backend: model.backend.clone(),
        dimension: model.dimension,
        instruction_profile: model.instruction_profile.clone(),
        chunker_version: RESUME_VECTOR_CHUNKER.to_string(),
        normalizer_version: RESUME_VECTOR_NORMALIZER.to_string(),
        pooling: model.pooling.clone(),
        normalization: model.normalization.clone(),
        model_manifest_sha256: model.manifest_sha256.clone(),
        content_sha256: hex::encode(Sha256::digest(first_skill.as_bytes())),
    };
    validate_v3_vector_contract(model, &freshness)?;
    Ok(freshness)
}

async fn load_or_rebuild_first_resume_vector<F>(
    database: &Database,
    resume_id: i64,
    snapshot: &ResumeEvidenceSnapshot,
    first_skill: Option<&str>,
    model: &ModelProvenance,
    model_available: bool,
    rebuild: F,
) -> Result<Option<Vec<f32>>>
where
    F: FnOnce(&str) -> Result<Vec<f32>>,
{
    let subject = resume_vector_subject(resume_id)?;
    let freshness = resume_vector_freshness(model, first_skill.unwrap_or_default())?;
    if !model_available || first_skill.is_none() {
        database.read_v3_vector(&subject, &freshness, None).await?;
        return Ok(None);
    }
    let first_skill = first_skill.context("resume vector requires a first skill")?;

    if let StoredVectorRead::Ready(vector) = database
        .read_v3_vector(&subject, &freshness, Some(model))
        .await?
    {
        if validate_resume_embeddings(1, model.dimension as usize, std::slice::from_ref(&vector))
            .is_ok()
        {
            return Ok(Some(vector));
        }
    }

    let vector = rebuild(first_skill)?;
    validate_resume_embeddings(1, model.dimension as usize, std::slice::from_ref(&vector))?;
    database
        .store_v3_resume_vector_if_current(resume_id, snapshot, &freshness, model, &vector)
        .await?;
    Ok(Some(vector))
}

pub(super) fn validate_review_inputs(
    user_skills: &[String],
    job_skills: &[String],
    contextual_requirements: &[String],
) -> Result<()> {
    validate_local_matching_inputs(user_skills, job_skills)?;
    validate_local_matching_inputs(user_skills, contextual_requirements)?;
    anyhow::ensure!(
        !user_skills.is_empty() && !job_skills.is_empty() && !contextual_requirements.is_empty(),
        "invalid local matching input: no eligible evidence or requirements"
    );
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub(super) async fn match_loaded_resume_skills(
    database: &Database,
    app_data_dir: PathBuf,
    resume_id: i64,
    snapshot: &ResumeEvidenceSnapshot,
    user_skills: &[String],
    job_skills: &[String],
    contextual_requirements: &[String],
    cancellation: InferenceCancellation,
) -> Result<SemanticMatchResult> {
    validate_review_inputs(user_skills, job_skills, contextual_requirements)?;
    let matcher = SemanticMatcher::new_with_cancellation(app_data_dir, cancellation.clone())?;
    let model = default_resume_embedding_provenance()?;
    let first_vector = load_or_rebuild_first_resume_vector(
        database,
        resume_id,
        snapshot,
        user_skills.first().map(String::as_str),
        &model,
        matcher.uses_persistent_resume_vectors(),
        |skill| {
            matcher
                .embed_resume_chunks(&[skill.to_string()])?
                .pop()
                .context("local model returned no resume vector")
        },
    )
    .await?;

    let Some(first_vector) = first_vector else {
        return matcher.match_skills(user_skills, job_skills);
    };
    let mut vectors = Vec::with_capacity(user_skills.len());
    vectors.push(first_vector);
    if user_skills.len() > 1 {
        vectors.extend(matcher.embed_resume_chunks(&user_skills[1..])?);
    }
    matcher.match_skills_with_resume_vectors(user_skills, contextual_requirements, &vectors)
}

pub async fn match_resume_semantic(
    database: &Database,
    app_data_dir: PathBuf,
    resume_id: i64,
    job_hash: &str,
) -> Result<EvidenceBoundSemanticMatch> {
    match_resume_semantic_with_cancellation(
        database,
        app_data_dir,
        resume_id,
        job_hash,
        InferenceCancellation::default(),
    )
    .await
}

pub async fn match_resume_semantic_with_cancellation(
    database: &Database,
    app_data_dir: PathBuf,
    resume_id: i64,
    job_hash: &str,
    cancellation: InferenceCancellation,
) -> Result<EvidenceBoundSemanticMatch> {
    cancellation.check()?;
    let resume_matcher = database.resume_matcher();
    let before = resume_matcher
        .get_resume_evidence_snapshot(resume_id)
        .await?
        .context("resume not found")?;
    let user_skills = resume_matcher
        .get_user_skills(resume_id)
        .await?
        .into_iter()
        .map(|skill| skill.skill_name)
        .collect::<Vec<_>>();
    let resume = resume_matcher.get_resume(resume_id).await?;
    let snapshot = resume_matcher
        .get_resume_evidence_snapshot(resume_id)
        .await?
        .context("resume not found")?;
    if snapshot != before {
        anyhow::bail!("resume changed during local matching");
    }
    let job = database
        .get_job_by_hash(job_hash)
        .await?
        .context("job not found")?;
    let description = job
        .description
        .as_deref()
        .context("job has no description")?;
    let analysis = super::AtsAnalyzer::analyze_text_for_job_with_source_and_snapshot(
        &user_skills.join("\n"),
        &user_skills,
        &format!("Required\n{description}"),
        None,
        &snapshot,
    );
    let job_skills = super::semantic_review::requirements(&analysis);
    let chunks = super::semantic_review::saved_resume_chunks(
        &user_skills,
        resume.parsed_text.as_deref().unwrap_or_default(),
    );
    let texts = super::semantic_review::chunk_texts(&chunks);
    let semantic_match = match_loaded_resume_skills(
        database,
        app_data_dir,
        resume_id,
        &snapshot,
        &texts,
        &job_skills,
        &super::AtsAnalyzer::extract_semantic_requirements(description),
        cancellation.clone(),
    )
    .await?;
    cancellation.check()?;
    let current = resume_matcher
        .get_resume_evidence_snapshot(resume_id)
        .await?
        .context("resume not found")?;
    let current_job = database
        .get_job_by_hash(job_hash)
        .await?
        .context("job changed during local matching")?;
    ensure_job_snapshot(&job, &current_job)?;
    anyhow::ensure!(snapshot == current, "resume changed during local matching");
    super::semantic_review::bind_assessment(
        &snapshot,
        &current,
        &chunks,
        description,
        semantic_match,
    )
}

pub(super) fn description_digest(description: &str) -> String {
    hex::encode(Sha256::digest(description.as_bytes()))
}

fn ensure_job_snapshot(
    expected: &jobsentinel_domain::Job,
    current: &jobsentinel_domain::Job,
) -> Result<()> {
    anyhow::ensure!(
        expected.hash == current.hash
            && expected.description == current.description
            && expected.updated_at == current.updated_at
            && expected.title == current.title
            && expected.company == current.company
            && expected.url == current.url,
        "job changed during local matching"
    );
    Ok(())
}

#[cfg(test)]
#[path = "semantic_tests.rs"]
mod tests;
