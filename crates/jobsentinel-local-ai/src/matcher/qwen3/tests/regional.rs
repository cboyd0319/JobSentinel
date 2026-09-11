// Verifies typed regional hard-negative fixtures and opt-in Qwen3 evidence behavior.

use super::super::*;
use crate::{
    EvalDatasetKind, EvalFixtureSet, HardNegativeExample, HardNegativeMiningSource,
    UnmatchedRequirementDiagnostic,
};
use std::path::PathBuf;

const REGIONAL_REQUIREMENT_FIXTURE_JSON: &str =
    include_str!("../../../eval_fixtures/regional_requirement_hard_negatives_v1.json");
const REGIONAL_REQUIREMENT_QUERIES: [&str; 3] = [
    "Experience running monthly PAYE payroll and producing payslips",
    "Experience maintaining warehouse inventory records and reconciling stock",
    "Documented assessed competence against SSC/N0514 is required.",
];

#[test]
fn regional_requirement_fixture_has_three_typed_evidence_boundaries() {
    let fixtures = regional_requirement_hard_negatives();

    assert_eq!(fixtures.len(), REGIONAL_REQUIREMENT_QUERIES.len());
    assert_eq!(
        fixtures
            .iter()
            .map(|fixture| fixture.query.as_str())
            .collect::<Vec<_>>(),
        REGIONAL_REQUIREMENT_QUERIES
    );
    for fixture in fixtures {
        assert_eq!(
            fixture.dataset_kind,
            EvalDatasetKind::JobRequirementToResumeEvidence
        );
        assert_eq!(fixture.mining_source, HardNegativeMiningSource::SeedFixture);
        assert_ne!(fixture.positive, fixture.hard_negative);
        assert!(fixture.reason.is_some());
    }
}

#[test]
#[ignore = "requires an explicit verified Qwen3 test cache and several minutes of local inference"]
fn pinned_qwen3_evaluates_regional_requirement_hard_negatives() {
    let app_data_dir = std::env::var_os("JOBSENTINEL_QWEN3_TEST_CACHE")
        .map(PathBuf::from)
        .expect("JOBSENTINEL_QWEN3_TEST_CACHE must name an explicit verified test cache");
    let runtime = Qwen3SemanticRuntime::new(
        Qwen3EmbeddingBackend::new(app_data_dir.clone()).expect("embedding model should load"),
        Qwen3RerankerBackend::new(app_data_dir).expect("reranker model should load"),
    );

    let mut observations = Vec::new();
    for fixture in regional_requirement_hard_negatives() {
        let evidence = [fixture.positive, fixture.hard_negative];
        let evidence_embeddings = runtime
            .embedding
            .embed_documents(
                &evidence
                    .iter()
                    .map(|text| EmbeddingInput {
                        text: text.clone(),
                        instruction: None,
                        input_kind: EmbeddingInputKind::ResumeChunk,
                    })
                    .collect::<Vec<_>>(),
            )
            .expect("synthetic evidence should embed");
        let requirement_embedding = runtime
            .embedding
            .embed_query(&EmbeddingInput {
                text: fixture.query.clone(),
                instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                input_kind: EmbeddingInputKind::Requirement,
            })
            .expect("synthetic requirement should embed");
        let dense_scores = evidence_embeddings
            .iter()
            .map(|embedding| {
                checked_cosine_similarity(&requirement_embedding, embedding)
                    .expect("synthetic embeddings should compare")
            })
            .collect::<Vec<_>>();
        let dense = dense_candidates(
            &requirement_embedding,
            &evidence_embeddings,
            runtime.threshold,
            QWEN3_RERANK_TOP_K,
        )
        .expect("dense retrieval should complete");
        let candidates = dense
            .iter()
            .map(|(id, similarity)| RerankCandidate {
                id: id.to_string(),
                text: evidence[*id].clone(),
                metadata: serde_json::json!({ "dense_similarity": similarity }),
            })
            .collect::<Vec<_>>();
        let reranker_scores = runtime
            .reranker
            .rerank(
                &RerankQuery {
                    text: fixture.query.clone(),
                    instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                    query_kind: RerankQueryKind::ResumeRequirement,
                },
                &candidates,
            )
            .expect("retrieved synthetic evidence should rerank");
        let selected = apply_reranker_acceptance(
            select_reranked_match(&dense, &reranker_scores)
                .expect("retrieval and reranking provenance should validate"),
            runtime.reranker_acceptance,
        )
        .expect("reranker acceptance should validate")
        .map(|match_| {
            (
                match_.user_index,
                match_.dense_score,
                match_.reranker_score,
                match_.reranker_rank,
            )
        });

        let paired_result = runtime
            .match_skills_with_resume_vectors(
                &evidence,
                std::slice::from_ref(&fixture.query),
                Some(&evidence_embeddings),
            )
            .expect("production regional matching should complete");
        let hard_negative_result = runtime
            .match_skills_with_resume_vectors(
                std::slice::from_ref(&evidence[1]),
                std::slice::from_ref(&fixture.query),
                Some(&evidence_embeddings[1..]),
            )
            .expect("hard-negative matching should complete");
        observations.push(RegionalObservation {
            query: fixture.query,
            positive: evidence[0].clone(),
            dense_scores,
            dense,
            reranker_scores: reranker_scores
                .iter()
                .map(|score| (score.candidate_id.clone(), score.score, score.rank))
                .collect(),
            selected,
            paired_result,
            hard_negative_result,
        });
    }

    for observation in &observations {
        eprintln!(
            "regional query {:?}: dense {:?}, retrieved {:?}, reranker {:?}, selected {:?}, paired {:?}, hard negative {:?}",
            observation.query,
            observation.dense_scores,
            observation.dense,
            observation.reranker_scores,
            observation.selected,
            observation.paired_result,
            observation.hard_negative_result
        );
    }

    for observation in observations {
        let selected = observation
            .selected
            .expect("direct evidence should be accepted");
        assert_eq!(selected.0, 0);
        assert!(selected.1 >= runtime.threshold);
        assert!(selected.2 >= runtime.reranker_acceptance);
        assert_eq!(selected.3, 1);
        assert_eq!(
            observation.paired_result.runtime_profile,
            SemanticRuntimeProfile::Qwen3Reranked
        );
        assert_eq!(observation.paired_result.matched_skills.len(), 1);
        assert_eq!(
            observation.paired_result.matched_skills[0].user_skill,
            observation.positive
        );
        assert!(observation.hard_negative_result.matched_skills.is_empty());
        assert_eq!(
            observation.hard_negative_result.unmatched_requirements,
            [observation.query]
        );
        assert!(matches!(
            observation.hard_negative_result.unmatched_diagnostics.as_slice(),
            [UnmatchedRequirementDiagnostic { reason, .. }]
                if matches!(reason, SemanticUnmatchedReason::BelowRetrievalThreshold | SemanticUnmatchedReason::BelowRerankerAcceptance)
        ));
    }
}

struct RegionalObservation {
    query: String,
    positive: String,
    dense_scores: Vec<f32>,
    dense: Vec<(usize, f32)>,
    reranker_scores: Vec<(String, f32, usize)>,
    selected: Option<(usize, f32, f32, usize)>,
    paired_result: SemanticMatchResult,
    hard_negative_result: SemanticMatchResult,
}

fn regional_requirement_hard_negatives() -> Vec<HardNegativeExample> {
    let fixture: EvalFixtureSet = serde_json::from_str(REGIONAL_REQUIREMENT_FIXTURE_JSON)
        .expect("regional eval fixture should parse");
    assert_eq!(fixture.schema_version, 1);
    assert!(fixture.evidence_labels.is_empty());
    assert!(fixture.pairwise_preferences.is_empty());
    fixture.hard_negatives
}
