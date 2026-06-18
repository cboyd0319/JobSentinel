//! Model Management
//!
//! Handles downloading, caching, and loading of the sentence embedding model.

use super::MlError;
use crate::core::logging::path_label_for_logging;
use anyhow::{Context, Result};
use candle_core::{DType, Device, Module, Tensor};
use candle_nn::VarBuilder;
use hf_hub::{api::tokio::Api, Repo, RepoType};
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::{BufReader, Read},
    path::{Path, PathBuf},
};
use tokenizers::Tokenizer;

/// Model identifier on HuggingFace Hub
const MODEL_ID: &str = "sentence-transformers/all-MiniLM-L6-v2";
/// Exact model repository revision verified for runtime downloads.
const MODEL_REVISION: &str = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41";
/// Required files for the model
const MODEL_FILES: &[ModelFile] = &[
    ModelFile {
        name: "config.json",
        sha256: "953f9c0d463486b10a6871cc2fd59f223b2c70184f49815e7efbcab5d8908b41",
    },
    ModelFile {
        name: "tokenizer.json",
        sha256: "be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037",
    },
    ModelFile {
        name: "model.safetensors",
        sha256: "53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db",
    },
];

#[derive(Debug, Clone, Copy)]
struct ModelFile {
    name: &'static str,
    sha256: &'static str,
}

/// Model download and loading status
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
    pub is_downloaded: bool,
    pub model_size_bytes: Option<u64>,
}

/// Manages model download and caching
pub struct ModelManager {
    cache_dir: PathBuf,
}

impl ModelManager {
    /// Create new model manager with app data directory
    pub fn new(app_data_dir: PathBuf) -> Self {
        let cache_dir = app_data_dir.join("ml_models");
        Self { cache_dir }
    }

    /// Check if model is already downloaded
    pub fn is_model_downloaded(&self) -> bool {
        let model_dir = self.cache_dir.join("all-MiniLM-L6-v2");

        if !model_dir.exists() {
            return false;
        }

        MODEL_FILES.iter().all(|file| {
            let path = model_dir.join(file.name);
            path.exists() && verify_model_file_checksum(&path, file.sha256).is_ok()
        })
    }

    /// Get model status
    pub fn get_status(&self) -> ModelStatus {
        let model_path = self.cache_dir.join("all-MiniLM-L6-v2");
        let is_downloaded = self.is_model_downloaded();

        let model_size_bytes = if is_downloaded {
            model_path
                .join("model.safetensors")
                .metadata()
                .ok()
                .map(|m| m.len())
        } else {
            None
        };

        ModelStatus {
            is_downloaded,
            model_size_bytes,
        }
    }

    /// Download model from HuggingFace Hub
    pub async fn download_model(&self) -> Result<PathBuf> {
        tracing::info!(
            model_id = MODEL_ID,
            revision = MODEL_REVISION,
            "Downloading model from HuggingFace Hub"
        );

        // Create cache directory
        std::fs::create_dir_all(&self.cache_dir).context("Failed to create cache directory")?;

        let api = Api::new().map_err(|_e| {
            MlError::DownloadFailed("Failed to initialize model download client".to_string())
        })?;

        let repo = api.repo(Repo::with_revision(
            MODEL_ID.to_string(),
            RepoType::Model,
            MODEL_REVISION.to_string(),
        ));

        // Download each required file
        let model_dir = self.cache_dir.join("all-MiniLM-L6-v2");
        std::fs::create_dir_all(&model_dir).context("Failed to create model directory")?;

        for file in MODEL_FILES {
            tracing::info!(file = file.name, "Downloading model file");

            let remote_path = repo.get(file.name).await.map_err(|_e| {
                MlError::DownloadFailed(format!(
                    "Failed to download required model file: {}",
                    file.name
                ))
            })?;

            let target_path = model_dir.join(file.name);
            std::fs::copy(&remote_path, &target_path)
                .with_context(|| format!("Failed to copy {} to cache", file.name))?;

            if let Err(error) = verify_model_file_checksum(&target_path, file.sha256) {
                let _ = std::fs::remove_file(&target_path);
                return Err(error.context(format!(
                    "Downloaded model file failed integrity check: {}",
                    file.name
                )));
            }
        }

        tracing::info!(
            model_dir = %path_label_for_logging(&model_dir),
            "Model downloaded successfully"
        );
        Ok(model_dir)
    }

    /// Load tokenizer from cache
    pub fn load_tokenizer(&self) -> Result<Tokenizer> {
        let tokenizer_path = self.cache_dir.join("all-MiniLM-L6-v2/tokenizer.json");

        if !tokenizer_path.exists() {
            return Err(MlError::ModelNotDownloaded(
                "Tokenizer not found. Call download_model() first.".to_string(),
            )
            .into());
        }

        let expected_sha256 = model_file_sha256("tokenizer.json").ok_or_else(|| {
            MlError::ModelLoadFailed("model checksum manifest is incomplete".to_string())
        })?;
        verify_model_file_checksum(&tokenizer_path, expected_sha256)
            .context("cached tokenizer failed integrity check")?;

        Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| MlError::TokenizationFailed(e.to_string()).into())
    }

    /// Load model weights from cache
    pub fn load_model(&self, device: &Device) -> Result<VarBuilder<'_>> {
        let model_path = self.cache_dir.join("all-MiniLM-L6-v2/model.safetensors");

        if !model_path.exists() {
            return Err(MlError::ModelNotDownloaded(
                "Model weights not found. Call download_model() first.".to_string(),
            )
            .into());
        }

        let expected_sha256 = model_file_sha256("model.safetensors").ok_or_else(|| {
            MlError::ModelLoadFailed("model checksum manifest is incomplete".to_string())
        })?;
        verify_model_file_checksum(&model_path, expected_sha256)
            .context("cached model weights failed integrity check")?;

        let model_data = std::fs::read(&model_path).with_context(|| {
            format!(
                "failed to read model weights from {}",
                path_label_for_logging(&model_path)
            )
        })?;
        let vb = VarBuilder::from_buffered_safetensors(model_data, DType::F32, device)
            .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;

        Ok(vb)
    }

    /// Get device (Metal on macOS, CPU fallback)
    pub fn get_device() -> Result<Device> {
        #[cfg(target_os = "macos")]
        {
            // Try Metal first on macOS
            match Device::new_metal(0) {
                Ok(device) => {
                    tracing::info!("Using Metal acceleration");
                    return Ok(device);
                }
                Err(e) => {
                    tracing::warn!("Metal not available: {}, falling back to CPU", e);
                }
            }
        }

        // Fallback to CPU
        tracing::info!("Using CPU for inference");
        Ok(Device::Cpu)
    }
}

fn model_file_sha256(name: &str) -> Option<&'static str> {
    MODEL_FILES
        .iter()
        .find(|file| file.name == name)
        .map(|file| file.sha256)
}

fn sha256_hex_for_file(path: &Path) -> Result<String> {
    let file = File::open(path).with_context(|| {
        format!(
            "failed to open model file for integrity check: {}",
            path_label_for_logging(path)
        )
    })?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; 64 * 1024];

    loop {
        let bytes_read = reader.read(&mut buffer).with_context(|| {
            format!(
                "failed to read model file for integrity check: {}",
                path_label_for_logging(path)
            )
        })?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

fn verify_model_file_checksum(path: &Path, expected_sha256: &str) -> Result<()> {
    let actual_sha256 = sha256_hex_for_file(path)?;

    if actual_sha256 != expected_sha256 {
        return Err(
            MlError::DownloadFailed("model file integrity check failed".to_string()).into(),
        );
    }

    Ok(())
}

/// Simple BERT-like model for sentence embeddings (all-MiniLM-L6-v2 architecture)
pub struct SentenceTransformer {
    embeddings: candle_nn::Embedding,
    layers: Vec<TransformerLayer>,
}

struct TransformerLayer {
    self_attention: MultiHeadAttention,
    feed_forward: FeedForward,
    ln1: candle_nn::LayerNorm,
    ln2: candle_nn::LayerNorm,
}

struct MultiHeadAttention {
    query: candle_nn::Linear,
    key: candle_nn::Linear,
    value: candle_nn::Linear,
    output: candle_nn::Linear,
    num_heads: usize,
    head_dim: usize,
}

struct FeedForward {
    linear1: candle_nn::Linear,
    linear2: candle_nn::Linear,
}

impl SentenceTransformer {
    /// Load model from VarBuilder
    pub fn load(vb: VarBuilder) -> Result<Self> {
        const HIDDEN_SIZE: usize = 384;
        const NUM_LAYERS: usize = 6;
        const NUM_HEADS: usize = 12;
        const VOCAB_SIZE: usize = 30522;

        // Load embeddings
        let embeddings =
            candle_nn::embedding(VOCAB_SIZE, HIDDEN_SIZE, vb.pp("embeddings.word_embeddings"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;

        // Load transformer layers
        let mut layers = Vec::new();
        for i in 0..NUM_LAYERS {
            let layer_vb = vb.pp(format!("encoder.layer.{}", i));
            layers.push(TransformerLayer::load(layer_vb, HIDDEN_SIZE, NUM_HEADS)?);
        }

        Ok(Self { embeddings, layers })
    }

    /// Forward pass to generate embeddings
    pub fn forward(&self, input_ids: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        // Embedding lookup
        let mut hidden = self
            .embeddings
            .forward(input_ids)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Transformer layers
        for layer in &self.layers {
            hidden = layer
                .forward(&hidden, attention_mask)
                .map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        }

        // Mean pooling
        let pooled = self.mean_pool(&hidden, attention_mask)?;

        Ok(pooled)
    }

    /// Mean pooling over sequence dimension
    fn mean_pool(&self, hidden: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        let mask_expanded = attention_mask
            .unsqueeze(2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .broadcast_as(hidden.shape())
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .to_dtype(DType::F32)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let sum = (hidden * &mask_expanded)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .sum(1)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let count = mask_expanded
            .sum(1)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let pooled = sum
            .broadcast_div(&count)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        Ok(pooled)
    }
}

impl TransformerLayer {
    fn load(vb: VarBuilder, hidden_size: usize, num_heads: usize) -> Result<Self> {
        let head_dim = hidden_size / num_heads;

        let self_attention = MultiHeadAttention {
            query: candle_nn::linear(hidden_size, hidden_size, vb.pp("attention.self.query"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
            key: candle_nn::linear(hidden_size, hidden_size, vb.pp("attention.self.key"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
            value: candle_nn::linear(hidden_size, hidden_size, vb.pp("attention.self.value"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
            output: candle_nn::linear(hidden_size, hidden_size, vb.pp("attention.output.dense"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
            num_heads,
            head_dim,
        };

        let feed_forward = FeedForward {
            linear1: candle_nn::linear(hidden_size, hidden_size * 4, vb.pp("intermediate.dense"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
            linear2: candle_nn::linear(hidden_size * 4, hidden_size, vb.pp("output.dense"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?,
        };

        let ln1 = candle_nn::layer_norm(hidden_size, 1e-12, vb.pp("attention.output.LayerNorm"))
            .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;
        let ln2 = candle_nn::layer_norm(hidden_size, 1e-12, vb.pp("output.LayerNorm"))
            .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;

        Ok(Self {
            self_attention,
            feed_forward,
            ln1,
            ln2,
        })
    }

    fn forward(&self, hidden: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        // Self-attention with residual
        let attn_output = self.self_attention.forward(hidden, attention_mask)?;
        let hidden = (hidden + attn_output).map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let hidden = self
            .ln1
            .forward(&hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Feed-forward with residual
        let ff_output = self.feed_forward.forward(&hidden)?;
        let hidden = (&hidden + ff_output).map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let hidden = self
            .ln2
            .forward(&hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        Ok(hidden)
    }
}

impl MultiHeadAttention {
    fn forward(&self, hidden: &Tensor, _attention_mask: &Tensor) -> Result<Tensor> {
        let (batch_size, seq_len, _hidden_size) = hidden
            .dims3()
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Project to Q, K, V
        let query = self
            .query
            .forward(hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let key = self
            .key
            .forward(hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let value = self
            .value
            .forward(hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Reshape for multi-head attention
        let query = query
            .reshape((batch_size, seq_len, self.num_heads, self.head_dim))
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .transpose(1, 2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let key = key
            .reshape((batch_size, seq_len, self.num_heads, self.head_dim))
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .transpose(1, 2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let value = value
            .reshape((batch_size, seq_len, self.num_heads, self.head_dim))
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .transpose(1, 2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Scaled dot-product attention
        let scale = (self.head_dim as f64).sqrt();
        let key_t = key
            .t()
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;
        let scores = query
            .matmul(&key_t)
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;
        let scores = (scores / scale)
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;

        let attn_weights = candle_nn::ops::softmax_last_dim(&scores)
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;

        let context = attn_weights
            .matmul(&value)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Reshape back
        let context = context
            .transpose(1, 2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .reshape((batch_size, seq_len, self.num_heads * self.head_dim))
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        // Output projection
        self.output
            .forward(&context)
            .map_err(|e| MlError::InferenceFailed(e.to_string()).into())
    }
}

impl FeedForward {
    fn forward(&self, hidden: &Tensor) -> Result<Tensor> {
        let x = self
            .linear1
            .forward(hidden)
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;
        let x = x
            .gelu()
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?;
        self.linear2
            .forward(&x)
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()).into())
    }
}
