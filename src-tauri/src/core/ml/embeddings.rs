//! Embedding Generation
//!
//! Converts text into dense vector embeddings for semantic similarity.

use super::model::{ModelManager, SentenceTransformer};
use super::MlError;
use anyhow::{Context, Result};
use candle_core::{DType, Device, Tensor};
use std::path::PathBuf;
use tokenizers::{Encoding, Tokenizer};

/// Maximum sequence length for the model
const MAX_SEQUENCE_LENGTH: usize = 128;

/// Generates sentence embeddings for text
pub struct EmbeddingGenerator {
    model: SentenceTransformer,
    tokenizer: Tokenizer,
    device: Device,
}

impl EmbeddingGenerator {
    /// Create new embedding generator
    ///
    /// Requires model to be downloaded first via `ModelManager::download_model()`
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let manager = ModelManager::new(app_data_dir);

        if !manager.is_model_downloaded() {
            return Err(MlError::ModelNotDownloaded(
                "Model not found. Call download_model() first.".to_string()
            ).into());
        }

        let device = ModelManager::get_device()?;
        let tokenizer = manager.load_tokenizer()?;
        let vb = manager.load_model(&device)?;
        let model = SentenceTransformer::load(vb, device.clone())?;

        Ok(Self {
            model,
            tokenizer,
            device,
        })
    }

    /// Generate embedding for a single text
    pub fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        let embeddings = self.embed_batch(&[text])?;
        Ok(embeddings.into_iter().next()
            .ok_or_else(|| MlError::InferenceFailed("No embedding generated".to_string()))?)
    }

    /// Generate embeddings for multiple texts in a batch
    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        // Tokenize all texts
        let encodings = self.tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| MlError::TokenizationFailed(e.to_string()))?;

        // Convert to tensors
        let (input_ids, attention_mask) = self.encodings_to_tensors(&encodings)?;

        // Run inference
        let embeddings_tensor = self.model.forward(&input_ids, &attention_mask)?;

        // Convert back to Vec<Vec<f32>>
        self.tensor_to_vec2d(&embeddings_tensor)
    }

    /// Tokenize and convert to tensors
    fn encodings_to_tensors(&self, encodings: &[Encoding]) -> Result<(Tensor, Tensor)> {
        let batch_size = encodings.len();

        // Prepare input_ids and attention_mask
        let mut input_ids_vec = Vec::new();
        let mut attention_mask_vec = Vec::new();

        for encoding in encodings {
            let mut ids = encoding.get_ids().to_vec();
            let mut mask = encoding.get_attention_mask().to_vec();

            // Truncate or pad to MAX_SEQUENCE_LENGTH
            ids.truncate(MAX_SEQUENCE_LENGTH);
            mask.truncate(MAX_SEQUENCE_LENGTH);

            while ids.len() < MAX_SEQUENCE_LENGTH {
                ids.push(0); // PAD token
                mask.push(0);
            }

            input_ids_vec.extend(ids.iter().map(|&id| id as u32));
            attention_mask_vec.extend(mask.iter().map(|&m| m as u32));
        }

        // Create tensors
        let input_ids = Tensor::from_vec(
            input_ids_vec,
            (batch_size, MAX_SEQUENCE_LENGTH),
            &self.device,
        )
        .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let attention_mask = Tensor::from_vec(
            attention_mask_vec,
            (batch_size, MAX_SEQUENCE_LENGTH),
            &self.device,
        )
        .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        Ok((input_ids, attention_mask))
    }

    /// Convert tensor to Vec<Vec<f32>>
    fn tensor_to_vec2d(&self, tensor: &Tensor) -> Result<Vec<Vec<f32>>> {
        let (batch_size, embedding_dim) = tensor
            .dims2()
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let flat_data = tensor
            .to_dtype(DType::F32)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .to_vec1::<f32>()
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let mut result = Vec::with_capacity(batch_size);
        for i in 0..batch_size {
            let start = i * embedding_dim;
            let end = start + embedding_dim;
            result.push(flat_data[start..end].to_vec());
        }

        Ok(result)
    }

    /// Normalize embedding to unit length (for cosine similarity)
    pub fn normalize_embedding(embedding: &[f32]) -> Vec<f32> {
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm == 0.0 {
            return embedding.to_vec();
        }
        embedding.iter().map(|x| x / norm).collect()
    }

    /// Compute cosine similarity between two embeddings
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() {
            return 0.0;
        }

        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }

        dot_product / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_embedding() {
        let embedding = vec![3.0, 4.0]; // Length 5
        let normalized = EmbeddingGenerator::normalize_embedding(&embedding);

        assert_eq!(normalized.len(), 2);
        assert!((normalized[0] - 0.6).abs() < 1e-6);
        assert!((normalized[1] - 0.8).abs() < 1e-6);

        // Check unit length
        let length: f32 = normalized.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((length - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((EmbeddingGenerator::cosine_similarity(&a, &b) - 1.0).abs() < 1e-6);

        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        assert!(EmbeddingGenerator::cosine_similarity(&a, &b).abs() < 1e-6);

        let a = vec![1.0, 1.0];
        let b = vec![1.0, 1.0];
        assert!((EmbeddingGenerator::cosine_similarity(&a, &b) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_mismatched_length() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0];
        assert_eq!(EmbeddingGenerator::cosine_similarity(&a, &b), 0.0);
    }
}
