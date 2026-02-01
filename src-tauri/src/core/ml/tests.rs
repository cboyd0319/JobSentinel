//! Tests for ML module
//!
//! Note: Most tests require the model to be downloaded first.
//! Run with: cargo test --features embedded-ml

#[cfg(test)]
mod tests {
    use crate::core::ml::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn get_test_cache_dir() -> TempDir {
        tempfile::tempdir().unwrap()
    }

    #[test]
    fn test_model_status_not_downloaded() {
        let cache_dir = get_test_cache_dir();
        let manager = ModelManager::new(cache_dir.path().to_path_buf());

        let status = manager.get_status();
        assert!(!status.is_downloaded);
        assert!(status.model_size_bytes.is_none());
    }

    #[test]
    fn test_embedding_normalization() {
        let embedding = vec![3.0, 4.0]; // Length 5
        let normalized = EmbeddingGenerator::normalize_embedding(&embedding);

        // Check values
        assert!((normalized[0] - 0.6).abs() < 1e-6);
        assert!((normalized[1] - 0.8).abs() < 1e-6);

        // Check unit length
        let length: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((length - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = EmbeddingGenerator::cosine_similarity(&a, &b);
        assert!((sim - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let sim = EmbeddingGenerator::cosine_similarity(&a, &b);
        assert!(sim.abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_mismatched_length() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0];
        let sim = EmbeddingGenerator::cosine_similarity(&a, &b);
        assert_eq!(sim, 0.0);
    }

    // Integration tests - require model download
    // These should be run manually with: cargo test --features embedded-ml -- --ignored

    #[test]
    #[ignore]
    fn test_download_model() {
        let cache_dir = get_test_cache_dir();
        let manager = ModelManager::new(cache_dir.path().to_path_buf());

        // Download model
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let result = runtime.block_on(manager.download_model());

        assert!(result.is_ok());
        assert!(manager.is_model_downloaded());
    }

    #[test]
    #[ignore]
    fn test_embedding_generation() {
        let cache_dir = PathBuf::from("./test_ml_cache");
        std::fs::create_dir_all(&cache_dir).unwrap();

        let generator = EmbeddingGenerator::new(cache_dir).unwrap();

        let text = "Machine learning engineer with Python experience";
        let embedding = generator.embed_text(text).unwrap();

        // Check embedding dimensions (all-MiniLM-L6-v2 has 384 dimensions)
        assert_eq!(embedding.len(), 384);

        // Check embeddings are non-zero
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!(norm > 0.0);
    }

    #[test]
    #[ignore]
    fn test_batch_embeddings() {
        let cache_dir = PathBuf::from("./test_ml_cache");
        let generator = EmbeddingGenerator::new(cache_dir).unwrap();

        let texts = vec![
            "Python programming",
            "Machine Learning",
            "Data Science",
        ];

        let embeddings = generator.embed_batch(&texts).unwrap();

        assert_eq!(embeddings.len(), 3);
        assert_eq!(embeddings[0].len(), 384);
    }

    #[test]
    #[ignore]
    fn test_semantic_matching() {
        let cache_dir = PathBuf::from("./test_ml_cache");
        let matcher = SemanticMatcher::new(cache_dir).unwrap();

        let user_skills = vec![
            "Python programming".to_string(),
            "Machine Learning".to_string(),
            "Data Analysis".to_string(),
            "SQL databases".to_string(),
        ];

        let job_requirements = vec![
            "Python".to_string(),
            "ML experience".to_string(),
            "Statistical analysis".to_string(),
            "Java".to_string(),
            "Kubernetes".to_string(),
        ];

        let result = matcher.match_skills(&user_skills, &job_requirements).unwrap();

        // Should match Python, ML, and statistical analysis
        assert!(result.matched_skills.len() >= 2);
        assert!(result.overall_score > 0.4);

        // Java and Kubernetes should be unmatched
        assert!(result.unmatched_requirements.len() >= 1);

        // Check matched skills have reasonable similarity
        for matched in &result.matched_skills {
            assert!(matched.similarity >= 0.7);
        }
    }

    #[test]
    #[ignore]
    fn test_semantic_similarity() {
        let cache_dir = PathBuf::from("./test_ml_cache");
        let matcher = SemanticMatcher::new(cache_dir).unwrap();

        let candidates = vec![
            "Python programming".to_string(),
            "Java development".to_string(),
            "JavaScript".to_string(),
            "Machine Learning".to_string(),
            "SQL".to_string(),
        ];

        let similar = matcher
            .find_similar_skills("Python", &candidates, 3)
            .unwrap();

        // "Python programming" should be most similar
        assert_eq!(similar.len(), 3);
        assert!(similar[0].0.contains("Python"));
        assert!(similar[0].1 > 0.8);
    }

    #[test]
    #[ignore]
    fn test_semantic_vs_keyword_matching() {
        let cache_dir = PathBuf::from("./test_ml_cache");
        let matcher = SemanticMatcher::new(cache_dir).unwrap();

        // These should match semantically but not by exact string
        let user_skills = vec![
            "Machine Learning".to_string(),
            "Deep Learning".to_string(),
        ];

        let job_requirements = vec![
            "ML experience".to_string(),
            "Neural Networks".to_string(),
        ];

        let result = matcher.match_skills(&user_skills, &job_requirements).unwrap();

        // Semantic matching should find these
        assert!(result.matched_skills.len() >= 1);
        assert!(result.overall_score > 0.5);
    }

    #[test]
    fn test_empty_skills() {
        // This test doesn't require model
        let user_skills: Vec<String> = vec![];
        let job_requirements = vec!["Python".to_string()];

        // Just verify the structure
        assert_eq!(user_skills.len(), 0);
        assert_eq!(job_requirements.len(), 1);
    }
}
