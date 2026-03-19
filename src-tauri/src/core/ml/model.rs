//! Model Management
//!
//! Handles downloading, caching, and loading of the sentence embedding model.

use super::MlError;
use anyhow::{Context, Result};
use candle_core::{DType, Device, Module, Tensor};
use candle_nn::VarBuilder;
use hf_hub::{api::tokio::Api, Repo, RepoType};
use std::path::{Path, PathBuf};
use tokenizers::Tokenizer;

/// Model identifier on HuggingFace Hub
const MODEL_ID: &str = "sentence-transformers/all-MiniLM-L6-v2";
const MODEL_REVISION: &str = "main";

/// Required files for the model
const MODEL_FILES: &[&str] = &["config.json", "tokenizer.json", "model.safetensors"];

/// Model download and loading status
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
    pub is_downloaded: bool,
    pub model_path: PathBuf,
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

        // Verify all required files exist
        MODEL_FILES.iter().all(|file| model_dir.join(file).exists())
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
            model_path,
            model_size_bytes,
        }
    }

    /// Download model from HuggingFace Hub
    pub async fn download_model(&self) -> Result<PathBuf> {
        tracing::info!("Downloading model {} from HuggingFace Hub", MODEL_ID);

        // Create cache directory
        std::fs::create_dir_all(&self.cache_dir).context("Failed to create cache directory")?;

        let api = Api::new().map_err(|e| MlError::DownloadFailed(e.to_string()))?;

        let repo = api.repo(Repo::new(MODEL_ID.to_string(), RepoType::Model));

        // Download each required file
        let model_dir = self.cache_dir.join("all-MiniLM-L6-v2");
        std::fs::create_dir_all(&model_dir).context("Failed to create model directory")?;

        for file in MODEL_FILES {
            tracing::info!("Downloading {}", file);

            let remote_path = repo.get(file).await.map_err(|e| {
                MlError::DownloadFailed(format!("Failed to download {}: {}", file, e))
            })?;

            let target_path = model_dir.join(file);
            std::fs::copy(&remote_path, &target_path)
                .with_context(|| format!("Failed to copy {} to cache", file))?;
        }

        tracing::info!("Model downloaded successfully to {:?}", model_dir);
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

        Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| MlError::TokenizationFailed(e.to_string()).into())
    }

    /// Load model weights from cache
    pub fn load_model(&self, device: &Device) -> Result<VarBuilder> {
        let model_path = self.cache_dir.join("all-MiniLM-L6-v2/model.safetensors");

        if !model_path.exists() {
            return Err(MlError::ModelNotDownloaded(
                "Model weights not found. Call download_model() first.".to_string(),
            )
            .into());
        }

        // SAFETY: Memory-mapping the safetensors file is unsafe because:
        // 1. The mapped memory must not be modified by another process while in use
        // 2. The file must not be truncated or deleted while mapped
        // 3. The safetensors format includes validation headers that candle checks
        // Mitigations: The model file is in our app data dir, only we write to it,
        // and we verify existence above. The file is read-only mapped.
        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[model_path], DType::F32, device)
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?
        };

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

/// Simple BERT-like model for sentence embeddings (all-MiniLM-L6-v2 architecture)
pub struct SentenceTransformer {
    embeddings: candle_nn::Embedding,
    layers: Vec<TransformerLayer>,
    pooler: candle_nn::Linear,
    device: Device,
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
    pub fn load(vb: VarBuilder, device: Device) -> Result<Self> {
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

        // Load pooler
        let pooler = candle_nn::linear(HIDDEN_SIZE, HIDDEN_SIZE, vb.pp("pooler.dense"))
            .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;

        Ok(Self {
            embeddings,
            layers,
            pooler,
            device,
        })
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
            .map_err(|e: candle_core::Error| MlError::InferenceFailed(e.to_string()))?
            / scale;

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
