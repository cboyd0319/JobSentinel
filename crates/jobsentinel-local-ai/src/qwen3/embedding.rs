use std::path::PathBuf;

use anyhow::{Context, Result};
use candle_core::DType;
use tokenizers::Tokenizer;

use crate::manifest::ModelSpec;
use crate::model::ModelManager;
use crate::qwen3::config::Qwen3Config;
use crate::qwen3::model::Qwen3Model;
use crate::qwen3::pooling::{l2_normalize, last_token_pool, project_and_normalize};
use crate::qwen3::tokenization::{format_embedding_input, tokenize_left_padded};
use crate::qwen3::QWEN3_CANDLE_BACKEND;
use crate::runtime::{EmbeddingBackend, EmbeddingInput, RuntimeCompatibility};
use crate::MlError;

pub struct Qwen3EmbeddingBackend {
    model: Qwen3Model,
    tokenizer: Tokenizer,
    compatibility: RuntimeCompatibility,
    dimension: usize,
    max_tokens: usize,
}

impl Qwen3EmbeddingBackend {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let manager = ModelManager::new(app_data_dir);
        let spec = ModelManager::default_embedding_model_spec()?;
        Self::from_manager(&manager, spec)
    }

    pub(crate) fn from_manager(manager: &ModelManager, spec: ModelSpec) -> Result<Self> {
        if spec.backend != QWEN3_CANDLE_BACKEND {
            anyhow::bail!("Qwen3 backend requires qwen3-candle model lock backend");
        }

        if !manager.is_model_downloaded_for(&spec) {
            return Err(MlError::ModelNotDownloaded(
                "Qwen3 embedding model is not downloaded".to_string(),
            )
            .into());
        }

        let device = ModelManager::get_device()?;
        let tokenizer = manager.load_tokenizer_for_spec(&spec)?;
        let config: Qwen3Config = manager.load_model_json_for_spec(&spec, "config.json")?;
        let native_dimension = spec.native_dimension.ok_or_else(|| {
            MlError::ModelLoadFailed("Qwen3 model lock missing native dimension".to_string())
        })?;
        let dimension = spec.dimension.ok_or_else(|| {
            MlError::ModelLoadFailed("Qwen3 model lock missing embedding dimension".to_string())
        })?;

        if dimension > native_dimension {
            anyhow::bail!("Qwen3 projected dimension exceeds native dimension");
        }

        let vb = manager.load_model_for_spec(&spec, &device)?;
        let model = Qwen3Model::load(config, vb).context("failed to load Qwen3 embedding model")?;
        if model.hidden_size() != native_dimension {
            anyhow::bail!("Qwen3 native dimension does not match the model lock");
        }

        let compatibility =
            RuntimeCompatibility::from_spec(&spec, QWEN3_CANDLE_BACKEND, Some(dimension));
        compatibility.validate_for_model(&spec)?;

        Ok(Self {
            model,
            tokenizer,
            compatibility,
            dimension,
            max_tokens: spec.max_tokens,
        })
    }

    fn embed_inputs(&self, inputs: &[EmbeddingInput]) -> Result<Vec<Vec<f32>>> {
        if inputs.is_empty() {
            return Ok(Vec::new());
        }

        let texts: Vec<String> = inputs.iter().map(format_embedding_input).collect();
        let batch = tokenize_left_padded(
            &self.tokenizer,
            &texts,
            self.max_tokens,
            self.model.device(),
        )?;
        let hidden = self
            .model
            .forward(&batch.input_ids, &batch.attention_mask)
            .context("Qwen3 embedding inference failed")?;
        let pooled = last_token_pool(&hidden, &batch.attention_mask)?;
        let normalized = l2_normalize(&pooled)?;
        let rows = normalized
            .to_dtype(DType::F32)
            .context("failed to convert Qwen3 embeddings to f32")?
            .to_vec2::<f32>()
            .context("failed to read Qwen3 embeddings")?;

        rows.into_iter()
            .map(|row| project_and_normalize(row, self.dimension))
            .collect()
    }
}

impl EmbeddingBackend for Qwen3EmbeddingBackend {
    fn model_id(&self) -> &str {
        &self.compatibility.model_id
    }

    fn dimension(&self) -> usize {
        self.dimension
    }

    fn compatibility(&self) -> &RuntimeCompatibility {
        &self.compatibility
    }

    fn embed_documents(&self, docs: &[EmbeddingInput]) -> Result<Vec<Vec<f32>>> {
        self.embed_inputs(docs)
    }

    fn embed_query(&self, query: &EmbeddingInput) -> Result<Vec<f32>> {
        self.embed_inputs(std::slice::from_ref(query))?
            .into_iter()
            .next()
            .ok_or_else(|| {
                MlError::InferenceFailed("Qwen3 query embedding missing".to_string()).into()
            })
    }
}
