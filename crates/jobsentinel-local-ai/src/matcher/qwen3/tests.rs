use super::*;
use crate::{
    EvalDatasetKind, EvalFixtureSet, HardNegativeExample, RerankScore,
    UnmatchedRequirementDiagnostic,
};
use std::path::PathBuf;

const ORIGINAL_QWEN3_REQUIREMENT_QUERIES: [&str; 3] = [
    "Experience making product help clear for customers",
    "Experience with patient intake and electronic health records",
    "Experience building cloud audit detections for privilege escalation",
];
const EXPANDED_QWEN3_REQUIREMENT_QUERIES: [&str; 3] = [
    "Current unrestricted registered nurse (RN) license required",
    "Experience managing at least ten software engineers",
    "Experience owning a GAAP month-end close",
];

#[test]
fn reranker_selection_preserves_dense_score_and_typed_provenance() {
    let selected = select_reranked_match(
        &[(2, 0.72), (5, 0.88)],
        &[score("5", 3.4, 1), score("2", -1.2, 2)],
    )
    .unwrap()
    .unwrap();

    assert_eq!(selected.user_index, 5);
    assert_eq!(selected.dense_score, 0.88);
    assert_eq!(selected.reranker_score, 3.4);
    assert_eq!(selected.reranker_rank, 1);
    let serialized = serde_json::to_value(SkillMatch {
        job_skill: "Kubernetes security".to_string(),
        user_skill: "Kubernetes audit detections".to_string(),
        similarity: selected.dense_score,
        reranker_score: Some(selected.reranker_score),
        reranker_rank: Some(selected.reranker_rank),
    })
    .unwrap();
    let fields = serialized.as_object().unwrap();
    assert_eq!(fields.len(), 5);
    for field in [
        "job_skill",
        "user_skill",
        "similarity",
        "reranker_score",
        "reranker_rank",
    ] {
        assert!(fields.contains_key(field));
    }
}

#[test]
fn reranker_selection_rejects_untrusted_or_inconsistent_output() {
    let dense = [(2, 0.72), (5, 0.88)];
    for scores in [
        vec![score("9", 3.4, 1), score("2", -1.2, 2)],
        vec![score("2", 3.4, 1), score("2", -1.2, 2)],
        vec![score("5", f32::NAN, 1), score("2", -1.2, 2)],
        vec![score("5", 3.4, 2), score("2", -1.2, 1)],
        vec![score("5", -1.2, 1), score("2", 3.4, 2)],
        vec![score("5", 3.4, 1)],
    ] {
        assert!(select_reranked_match(&dense, &scores).is_err());
    }
    for dense_score in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY, -1.1, 1.1] {
        assert!(select_reranked_match(&[(2, dense_score)], &[score("2", 3.4, 1)]).is_err());
    }
    assert!(select_reranked_match(&[(2, 0.8), (2, 0.7)], &[]).is_err());
}

#[test]
fn reranker_acceptance_abstains_below_calibrated_minimum() {
    let accepted = RerankedMatch {
        user_index: 0,
        dense_score: 0.42,
        reranker_score: 5.24,
        reranker_rank: 1,
    };
    let rejected = RerankedMatch {
        user_index: 1,
        dense_score: 0.48,
        reranker_score: 1.25,
        reranker_rank: 1,
    };

    assert_eq!(
        apply_reranker_acceptance(Some(accepted), 3.0)
            .unwrap()
            .unwrap()
            .user_index,
        0
    );
    assert!(apply_reranker_acceptance(Some(rejected), 3.0)
        .unwrap()
        .is_none());
    assert!(apply_reranker_acceptance(None, 3.0).unwrap().is_none());
    assert!(apply_reranker_acceptance(None, f32::NAN).is_err());
}

#[test]
fn qwen_abstention_reasons_distinguish_retrieval_from_acceptance() {
    let selected = RerankedMatch {
        user_index: 0,
        dense_score: 0.42,
        reranker_score: 5.24,
        reranker_rank: 1,
    };

    assert_eq!(
        qwen_unmatched_reason(&[], None),
        Some(SemanticUnmatchedReason::BelowRetrievalThreshold)
    );
    assert_eq!(
        qwen_unmatched_reason(&[(0, 0.42)], None),
        Some(SemanticUnmatchedReason::BelowRerankerAcceptance)
    );
    assert_eq!(qwen_unmatched_reason(&[(0, 0.42)], Some(&selected)), None);
}

#[test]
#[ignore]
fn pinned_qwen3_preserves_original_requirement_hard_negative_baseline() {
    const EXPECTED_DENSE_SCORES: [[f32; 2]; 3] = [
        [0.4218491, 0.35205674],
        [0.67955077, 0.4145699],
        [0.63454574, 0.48090482],
    ];
    const EXPECTED_RERANKER_SCORES: [[f32; 2]; 3] = [
        [5.246351, -7.0783405],
        [5.893036, -3.9874773],
        [6.3774714, 1.2468202],
    ];
    const DENSE_SCORE_TOLERANCE: f32 = 0.01;
    const RERANKER_SCORE_TOLERANCE: f32 = 0.1;
    const MINIMUM_RETRIEVAL_MARGIN: f32 = 0.04;
    const MINIMUM_ACCEPTANCE_MARGIN: f32 = 1.0;

    let app_data_dir = std::env::var_os("JOBSENTINEL_QWEN3_TEST_CACHE")
        .map(PathBuf::from)
        .expect("JOBSENTINEL_QWEN3_TEST_CACHE must name an explicit verified test cache");
    let runtime = Qwen3SemanticRuntime::new(
        Qwen3EmbeddingBackend::new(app_data_dir.clone()).expect("embedding model should load"),
        Qwen3RerankerBackend::new(app_data_dir).expect("reranker model should load"),
    );
    let hard_negatives = selected_requirement_hard_negatives(&ORIGINAL_QWEN3_REQUIREMENT_QUERIES);

    for (fixture_index, fixture) in hard_negatives.into_iter().enumerate() {
        let user_skills = vec![fixture.positive, fixture.hard_negative];
        let requirement = fixture.query;
        let user_embeddings = runtime
            .embedding
            .embed_documents(
                &user_skills
                    .iter()
                    .map(|text| EmbeddingInput {
                        text: text.clone(),
                        instruction: None,
                        input_kind: EmbeddingInputKind::ResumeChunk,
                    })
                    .collect::<Vec<_>>(),
            )
            .expect("frozen resume evidence should embed");
        let requirement_embedding = runtime
            .embedding
            .embed_query(&EmbeddingInput {
                text: requirement.clone(),
                instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                input_kind: EmbeddingInputKind::Requirement,
            })
            .expect("frozen requirement should embed");
        let dense = dense_candidates(
            &requirement_embedding,
            &user_embeddings,
            runtime.threshold,
            QWEN3_RERANK_TOP_K,
        )
        .expect("dense retrieval should complete");
        let mut dense_ids = dense.iter().map(|(id, _)| *id).collect::<Vec<_>>();
        dense_ids.sort_unstable();

        assert_eq!(dense_ids, [0, 1]);
        for (candidate_id, score) in &dense {
            assert!(
                (*score - EXPECTED_DENSE_SCORES[fixture_index][*candidate_id]).abs()
                    <= DENSE_SCORE_TOLERANCE,
                "frozen fixture {fixture_index} candidate {candidate_id} dense score drifted"
            );
            assert!(*score - runtime.threshold >= MINIMUM_RETRIEVAL_MARGIN);
        }
        let candidates = dense
            .iter()
            .map(|(user_index, similarity)| RerankCandidate {
                id: user_index.to_string(),
                text: user_skills[*user_index].clone(),
                metadata: serde_json::json!({ "dense_similarity": similarity }),
            })
            .collect::<Vec<_>>();
        let scores = runtime
            .reranker
            .rerank(
                &RerankQuery {
                    text: requirement.clone(),
                    instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                    query_kind: RerankQueryKind::ResumeRequirement,
                },
                &candidates,
            )
            .expect("frozen candidates should rerank");
        assert_eq!(scores.len(), 2);
        assert_eq!(scores[0].candidate_id, "0");
        assert_eq!(scores[0].rank, 1);
        assert_eq!(scores[1].candidate_id, "1");
        assert_eq!(scores[1].rank, 2);
        assert!(scores[0].score > scores[1].score);
        for candidate in &scores {
            let candidate_id = candidate.candidate_id.parse::<usize>().unwrap();
            assert!(
                (candidate.score - EXPECTED_RERANKER_SCORES[fixture_index][candidate_id]).abs()
                    <= RERANKER_SCORE_TOLERANCE,
                "frozen fixture {fixture_index} candidate {candidate_id} reranker score drifted"
            );
        }
        assert!(scores[0].score - runtime.reranker_acceptance >= MINIMUM_ACCEPTANCE_MARGIN);
        assert!(runtime.reranker_acceptance - scores[1].score >= MINIMUM_ACCEPTANCE_MARGIN);
        let selected = apply_reranker_acceptance(
            select_reranked_match(&dense, &scores)
                .expect("complete reranker provenance should validate"),
            runtime.reranker_acceptance,
        )
        .expect("reranker acceptance should validate")
        .expect("one candidate should be selected");

        assert_eq!(selected.user_index, 0);
        assert_eq!(selected.reranker_rank, 1);
        assert!(selected.reranker_score.is_finite());
        assert_eq!(
            selected.dense_score,
            dense
                .iter()
                .find(|(candidate_id, _)| *candidate_id == 0)
                .unwrap()
                .1
        );

        let paired_result = runtime
            .match_skills_with_resume_vectors(
                &user_skills,
                std::slice::from_ref(&requirement),
                None,
            )
            .expect("production matching should complete");
        let cached_result = runtime
            .match_skills_with_resume_vectors(
                &user_skills,
                std::slice::from_ref(&requirement),
                Some(&user_embeddings),
            )
            .expect("persisted-vector matching should complete");
        assert_eq!(
            serde_json::to_value(&cached_result).unwrap(),
            serde_json::to_value(&paired_result).unwrap()
        );
        assert_eq!(
            paired_result.runtime_profile,
            SemanticRuntimeProfile::Qwen3Reranked
        );
        assert_eq!(paired_result.matched_skills.len(), 1);
        assert_eq!(paired_result.matched_skills[0].user_skill, user_skills[0]);
        assert_eq!(paired_result.matched_skills[0].reranker_rank, Some(1));
        assert!(paired_result.matched_skills[0]
            .reranker_score
            .is_some_and(|score| score >= runtime.reranker_acceptance));

        let hard_negative_result = runtime
            .match_skills_with_resume_vectors(
                std::slice::from_ref(&user_skills[1]),
                std::slice::from_ref(&requirement),
                None,
            )
            .expect("hard-negative-only production matching should complete");
        assert_eq!(
            hard_negative_result.runtime_profile,
            SemanticRuntimeProfile::Qwen3Reranked
        );
        assert!(hard_negative_result.matched_skills.is_empty());
        assert_eq!(hard_negative_result.unmatched_requirements, [requirement]);
        assert_eq!(
            hard_negative_result.unmatched_diagnostics,
            [UnmatchedRequirementDiagnostic {
                requirement: hard_negative_result.unmatched_requirements[0].clone(),
                reason: SemanticUnmatchedReason::BelowRerankerAcceptance,
            }]
        );
        assert_eq!(hard_negative_result.overall_score, 0.0);
    }
}

#[test]
#[ignore]
fn pinned_qwen3_calibrates_expanded_requirement_hard_negatives() {
    const EXPECTED_DENSE_SCORES: [[f32; 2]; 3] = [
        [0.65237284, 0.2954709],
        [0.6330073, 0.60327697],
        [0.70158964, 0.31112427],
    ];
    const EXPECTED_RERANKER_SCORES: [[f32; 2]; 3] = [
        [5.5918465, -9.155273],
        [7.062503, 1.0978334],
        [7.194971, -4.8113165],
    ];
    const DENSE_SCORE_TOLERANCE: f32 = 0.01;
    const RERANKER_SCORE_TOLERANCE: f32 = 0.1;
    const MINIMUM_POSITIVE_RETRIEVAL_MARGIN: f32 = 0.25;
    const MINIMUM_ACCEPTANCE_MARGIN: f32 = 1.0;

    let app_data_dir = std::env::var_os("JOBSENTINEL_QWEN3_TEST_CACHE")
        .map(PathBuf::from)
        .expect("JOBSENTINEL_QWEN3_TEST_CACHE must name an explicit verified test cache");
    let runtime = Qwen3SemanticRuntime::new(
        Qwen3EmbeddingBackend::new(app_data_dir.clone()).expect("embedding model should load"),
        Qwen3RerankerBackend::new(app_data_dir).expect("reranker model should load"),
    );
    let hard_negatives = selected_requirement_hard_negatives(&EXPANDED_QWEN3_REQUIREMENT_QUERIES);

    for (fixture_index, fixture) in hard_negatives.into_iter().enumerate() {
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
            .expect("frozen resume evidence should embed");
        let requirement_embedding = runtime
            .embedding
            .embed_query(&EmbeddingInput {
                text: fixture.query.clone(),
                instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                input_kind: EmbeddingInputKind::Requirement,
            })
            .expect("frozen requirement should embed");
        let dense = [
            checked_cosine_similarity(&requirement_embedding, &evidence_embeddings[0])
                .expect("positive embedding should compare"),
            checked_cosine_similarity(&requirement_embedding, &evidence_embeddings[1])
                .expect("hard-negative embedding should compare"),
        ];
        let retrieved = dense_candidates(
            &requirement_embedding,
            &evidence_embeddings,
            runtime.threshold,
            QWEN3_RERANK_TOP_K,
        )
        .expect("dense retrieval should complete");

        assert!(retrieved.iter().any(|(candidate_id, _)| *candidate_id == 0));
        assert_eq!(
            retrieved.iter().any(|(candidate_id, _)| *candidate_id == 1),
            dense[1] >= runtime.threshold
        );
        assert!(dense[0] - runtime.threshold >= MINIMUM_POSITIVE_RETRIEVAL_MARGIN);
        for candidate_id in 0..2 {
            assert!(
                (dense[candidate_id] - EXPECTED_DENSE_SCORES[fixture_index][candidate_id]).abs()
                    <= DENSE_SCORE_TOLERANCE,
                "expanded fixture {fixture_index} candidate {candidate_id} dense score drifted"
            );
        }

        let scores = runtime
            .reranker
            .rerank(
                &RerankQuery {
                    text: fixture.query,
                    instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                    query_kind: RerankQueryKind::ResumeRequirement,
                },
                &evidence
                    .iter()
                    .enumerate()
                    .map(|(id, text)| RerankCandidate {
                        id: id.to_string(),
                        text: text.clone(),
                        metadata: serde_json::Value::Null,
                    })
                    .collect::<Vec<_>>(),
            )
            .expect("frozen candidates should rerank");

        assert_eq!(scores.len(), 2);
        assert_eq!(scores[0].candidate_id, "0");
        assert_eq!(scores[0].rank, 1);
        assert_eq!(scores[1].candidate_id, "1");
        assert_eq!(scores[1].rank, 2);
        let mut observed_reranker_scores = [0.0; 2];
        for score in &scores {
            let candidate_id = score.candidate_id.parse::<usize>().unwrap();
            observed_reranker_scores[candidate_id] = score.score;
            assert!(
                (score.score - EXPECTED_RERANKER_SCORES[fixture_index][candidate_id]).abs()
                    <= RERANKER_SCORE_TOLERANCE,
                "expanded fixture {fixture_index} candidate {candidate_id} reranker score drifted"
            );
        }
        assert!(
            observed_reranker_scores[0] - runtime.reranker_acceptance >= MINIMUM_ACCEPTANCE_MARGIN
        );
        assert!(
            runtime.reranker_acceptance - observed_reranker_scores[1] >= MINIMUM_ACCEPTANCE_MARGIN
        );
    }
}

#[test]
fn requirement_hard_negative_selection_follows_requested_query_order() {
    let requested = [
        EXPANDED_QWEN3_REQUIREMENT_QUERIES[2],
        EXPANDED_QWEN3_REQUIREMENT_QUERIES[0],
        EXPANDED_QWEN3_REQUIREMENT_QUERIES[1],
    ];
    let selected = selected_requirement_hard_negatives(&requested);

    assert_eq!(
        selected
            .iter()
            .map(|fixture| fixture.query.as_str())
            .collect::<Vec<_>>(),
        requested
    );
}

fn selected_requirement_hard_negatives(queries: &[&str]) -> Vec<HardNegativeExample> {
    let fixtures = EvalFixtureSet::seed().expect("frozen eval fixtures should load");
    let all = fixtures
        .hard_negatives
        .into_iter()
        .filter(|fixture| fixture.dataset_kind == EvalDatasetKind::JobRequirementToResumeEvidence)
        .collect::<Vec<_>>();
    queries
        .iter()
        .map(|query| {
            let mut matches = all.iter().filter(|fixture| fixture.query == *query);
            let selected = matches
                .next()
                .expect("selected requirement query should be frozen");
            assert!(
                matches.next().is_none(),
                "selected requirement query should be unique"
            );
            selected.clone()
        })
        .collect()
}

fn score(candidate_id: &str, score: f32, rank: usize) -> RerankScore {
    RerankScore {
        candidate_id: candidate_id.to_string(),
        score,
        rank,
    }
}
