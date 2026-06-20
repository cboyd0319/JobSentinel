//! Model Management
//!
//! Handles downloading, caching, and loading governed local model artifacts.

use super::manifest::{load_model_manifest, model_lock_hash, ModelFileSpec, ModelSpec};
use super::MlError;
use crate::core::logging::path_label_for_logging;
use anyhow::{Context, Result};
use candle_core::{DType, Device, Module, Tensor};
use candle_nn::VarBuilder;
use chrono::Utc;
use hf_hub::{api::tokio::Api, Repo, RepoType};
use serde::de::DeserializeOwned;
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::{BufReader, Read},
    path::{Path, PathBuf},
};
use tokenizers::Tokenizer;

const MODEL_CACHE_METADATA_FILE: &str = ".jobsentinel-model.json";

/// Model download and loading status
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
    pub is_downloaded: bool,
    pub model_size_bytes: Option<u64>,
    pub model_id: String,
    pub revision: String,
    pub backend: String,
    pub manifest_hash: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelCacheMetadata {
    pub manifest_version: u32,
    pub manifest_hash: String,
    pub model_id: String,
    pub kind: String,
    pub repo: String,
    pub revision: String,
    pub source_url: String,
    pub backend: String,
    pub license: String,
    pub downloaded_at: String,
    pub verified_at: String,
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

    pub(crate) fn runtime_model_spec() -> Result<ModelSpec> {
        let manifest = load_model_manifest()?;
        manifest.legacy_runtime_embedding().cloned().ok_or_else(|| {
            MlError::ModelLoadFailed("runtime model lock entry missing".to_string()).into()
        })
    }

    pub(crate) fn default_embedding_model_spec() -> Result<ModelSpec> {
        let manifest = load_model_manifest()?;
        manifest.default_embedding().cloned().ok_or_else(|| {
            MlError::ModelLoadFailed("default embedding model lock entry missing".to_string())
                .into()
        })
    }

    pub(crate) fn default_reranker_model_spec() -> Result<ModelSpec> {
        let manifest = load_model_manifest()?;
        manifest.default_reranker().cloned().ok_or_else(|| {
            MlError::ModelLoadFailed("default reranker model lock entry missing".to_string()).into()
        })
    }

    pub(crate) fn model_cache_dir(&self, spec: &ModelSpec) -> PathBuf {
        self.cache_dir
            .join(&spec.id)
            .join(&spec.revision)
            .join(model_lock_hash())
    }

    fn model_file_path(&self, spec: &ModelSpec, file: &ModelFileSpec) -> PathBuf {
        self.model_cache_dir(spec).join(&file.path)
    }

    /// Check if model is already downloaded
    pub fn is_model_downloaded(&self) -> bool {
        let Ok(spec) = Self::runtime_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    pub(crate) fn is_model_downloaded_for(&self, spec: &ModelSpec) -> bool {
        let model_dir = self.model_cache_dir(spec);

        if !model_dir.exists() {
            return false;
        }

        let valid = spec.required_files().all(|file| {
            let path = self.model_file_path(spec, file);
            path.exists() && verify_model_file_checksum(&path, &file.sha256).is_ok()
        });
        valid
    }

    pub fn is_default_embedding_downloaded(&self) -> bool {
        let Ok(spec) = Self::default_embedding_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    /// Get model status
    pub fn get_status(&self) -> ModelStatus {
        let spec = Self::runtime_model_spec().unwrap_or_else(|_| fallback_runtime_model_spec());
        let model_path = self.model_cache_dir(&spec);
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
            model_id: spec.id,
            revision: spec.revision,
            backend: spec.backend,
            manifest_hash: model_lock_hash(),
        }
    }

    /// Download model from HuggingFace Hub
    pub async fn download_model(&self) -> Result<PathBuf> {
        let manifest = load_model_manifest()?;
        let spec = manifest.legacy_runtime_embedding().ok_or_else(|| {
            MlError::ModelLoadFailed("runtime model lock entry missing".to_string())
        })?;
        self.download_model_spec(&manifest, spec).await
    }

    pub async fn download_model_by_id(&self, model_id: &str) -> Result<PathBuf> {
        let manifest = load_model_manifest()?;
        let spec = manifest.model(model_id).ok_or_else(|| {
            MlError::ModelLoadFailed("requested model lock entry missing".to_string())
        })?;
        self.download_model_spec(&manifest, spec).await
    }

    async fn download_model_spec(
        &self,
        manifest: &super::manifest::ModelManifest,
        spec: &ModelSpec,
    ) -> Result<PathBuf> {
        tracing::info!(
            model_id = spec.id,
            revision = spec.revision,
            "Downloading model from HuggingFace Hub"
        );

        // Create cache directory
        std::fs::create_dir_all(&self.cache_dir).context("Failed to create cache directory")?;

        let api = Api::new().map_err(|_e| {
            MlError::DownloadFailed("Failed to initialize model download client".to_string())
        })?;

        let repo = api.repo(Repo::with_revision(
            spec.repo.clone(),
            RepoType::Model,
            spec.revision.clone(),
        ));

        // Download each required file
        let model_dir = self.model_cache_dir(spec);
        std::fs::create_dir_all(&model_dir).context("Failed to create model directory")?;

        let downloaded_at = Utc::now().to_rfc3339();
        for file in &spec.files {
            tracing::info!(
                file = file.path,
                required = file.required,
                "Downloading model file"
            );

            let remote_path = match repo.get(&file.path).await {
                Ok(path) => path,
                Err(_error) if !file.required => {
                    tracing::warn!(file = file.path, "Optional model file was not downloaded");
                    continue;
                }
                Err(_error) => {
                    return Err(MlError::DownloadFailed(format!(
                        "Failed to download required model file: {}",
                        file.path
                    ))
                    .into());
                }
            };

            let target_path = self.model_file_path(spec, file);
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent).context("Failed to create model file directory")?;
            }
            std::fs::copy(&remote_path, &target_path)
                .with_context(|| format!("Failed to copy {} to cache", file.path))?;

            if let Err(error) = verify_model_file_checksum(&target_path, &file.sha256) {
                let _ = std::fs::remove_file(&target_path);
                return Err(error.context(format!(
                    "Downloaded model file failed integrity check: {}",
                    file.path
                )));
            }
        }

        self.verify_model_cache(spec)?;
        let verified_at = Utc::now().to_rfc3339();
        self.write_cache_metadata(&model_dir, manifest, spec, downloaded_at, verified_at)?;

        tracing::info!(
            model_dir = %path_label_for_logging(&model_dir),
            "Model downloaded successfully"
        );
        Ok(model_dir)
    }

    /// Load tokenizer from cache
    pub fn load_tokenizer(&self) -> Result<Tokenizer> {
        let spec = Self::runtime_model_spec()?;
        self.load_tokenizer_for_spec(&spec)
    }

    pub(crate) fn load_tokenizer_for_spec(&self, spec: &ModelSpec) -> Result<Tokenizer> {
        let tokenizer_file = spec.file("tokenizer.json").ok_or_else(|| {
            MlError::ModelLoadFailed("model lockfile missing tokenizer.json".to_string())
        })?;
        let tokenizer_path = self.model_file_path(spec, tokenizer_file);

        if !tokenizer_path.exists() {
            return Err(MlError::ModelNotDownloaded(
                "Tokenizer not found. Call download_model() first.".to_string(),
            )
            .into());
        }

        verify_model_file_checksum(&tokenizer_path, &tokenizer_file.sha256)
            .context("cached tokenizer failed integrity check")?;

        Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| MlError::TokenizationFailed(e.to_string()).into())
    }

    /// Load model weights from cache
    pub fn load_model<'a>(&self, device: &'a Device) -> Result<VarBuilder<'a>> {
        let spec = Self::runtime_model_spec()?;
        self.load_model_for_spec(&spec, device)
    }

    pub(crate) fn load_model_for_spec<'a>(
        &self,
        spec: &ModelSpec,
        device: &'a Device,
    ) -> Result<VarBuilder<'a>> {
        let weights_file = spec.file("model.safetensors").ok_or_else(|| {
            MlError::ModelLoadFailed("model lockfile missing model.safetensors".to_string())
        })?;
        let model_path = self.model_file_path(spec, weights_file);

        if !model_path.exists() {
            return Err(MlError::ModelNotDownloaded(
                "Model weights not found. Call download_model() first.".to_string(),
            )
            .into());
        }

        verify_model_file_checksum(&model_path, &weights_file.sha256)
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

    pub(crate) fn load_model_json_for_spec<T: DeserializeOwned>(
        &self,
        spec: &ModelSpec,
        file_name: &str,
    ) -> Result<T> {
        let file = spec.file(file_name).ok_or_else(|| {
            MlError::ModelLoadFailed(format!("model lockfile missing {file_name}"))
        })?;
        let path = self.model_file_path(spec, file);

        if !path.exists() {
            return Err(MlError::ModelNotDownloaded(format!(
                "{file_name} not found. Download the model first."
            ))
            .into());
        }

        verify_model_file_checksum(&path, &file.sha256)
            .context("cached model JSON failed integrity check")?;

        let bytes = std::fs::read(&path).with_context(|| {
            format!(
                "failed to read model JSON from {}",
                path_label_for_logging(&path)
            )
        })?;
        serde_json::from_slice(&bytes).map_err(|error| {
            MlError::ModelLoadFailed(format!("failed to parse {file_name}: {error}")).into()
        })
    }

    fn verify_model_cache(&self, spec: &ModelSpec) -> Result<()> {
        for file in spec.required_files() {
            let path = self.model_file_path(spec, file);
            if !path.exists() {
                return Err(MlError::ModelNotDownloaded(format!(
                    "required model file is missing: {}",
                    file.path
                ))
                .into());
            }
            verify_model_file_checksum(&path, &file.sha256)
                .context("cached model file failed integrity check")?;
        }

        Ok(())
    }

    fn write_cache_metadata(
        &self,
        model_dir: &Path,
        manifest: &super::manifest::ModelManifest,
        spec: &ModelSpec,
        downloaded_at: String,
        verified_at: String,
    ) -> Result<()> {
        let metadata = ModelCacheMetadata {
            manifest_version: manifest.manifest_version,
            manifest_hash: model_lock_hash(),
            model_id: spec.id.clone(),
            kind: format!("{:?}", spec.kind),
            repo: spec.repo.clone(),
            revision: spec.revision.clone(),
            source_url: spec.source_url.clone(),
            backend: spec.backend.clone(),
            license: spec.license.clone(),
            downloaded_at,
            verified_at,
        };
        let metadata_json = serde_json::to_vec_pretty(&metadata)
            .context("failed to serialize model cache metadata")?;
        std::fs::write(model_dir.join(MODEL_CACHE_METADATA_FILE), metadata_json)
            .context("failed to write model cache metadata")?;
        Ok(())
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

fn fallback_runtime_model_spec() -> ModelSpec {
    ModelSpec {
        id: "model-lock-error".to_string(),
        kind: super::manifest::ModelKind::Embedding,
        repo: "unknown".to_string(),
        revision: "0000000000000000000000000000000000000000".to_string(),
        source_url: "unknown".to_string(),
        license: "unknown".to_string(),
        backend: "unavailable".to_string(),
        backend_compatibility: Vec::new(),
        dimension: None,
        native_dimension: None,
        max_tokens: 0,
        tokenizer_family: "unknown".to_string(),
        pooling: "unknown".to_string(),
        normalization: "unknown".to_string(),
        supports_instruction: false,
        notes: None,
        files: Vec::new(),
    }
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
