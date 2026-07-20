use super::*;
use crate::RerankScore;

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

fn score(candidate_id: &str, score: f32, rank: usize) -> RerankScore {
    RerankScore {
        candidate_id: candidate_id.to_string(),
        score,
        rank,
    }
}
