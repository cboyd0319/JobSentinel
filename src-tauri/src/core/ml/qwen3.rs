//! Qwen3 text embedding backend.
//!
//! This module intentionally uses JobSentinel's model lock and verified cache
//! instead of delegating model resolution or downloads to a convenience
//! library.

use super::manifest::ModelSpec;
use super::model::ModelManager;
use super::runtime::{EmbeddingBackend, EmbeddingInput, EmbeddingInputKind, RuntimeCompatibility};
use super::MlError;
use anyhow::{Context, Result};
use candle_core::{DType, Device, IndexOp, Module, Tensor, D};
use candle_nn::{linear_b, linear_no_bias, Activation, Embedding, Linear, VarBuilder};
use std::path::PathBuf;
use tokenizers::Tokenizer;

const QWEN3_CANDLE_BACKEND: &str = "qwen3-candle";
const DEFAULT_PAD_TOKEN_ID: u32 = 0;

#[derive(Debug, Clone, serde::Deserialize)]
struct Qwen3Config {
    attention_bias: bool,
    head_dim: Option<usize>,
    hidden_act: Activation,
    hidden_size: usize,
    intermediate_size: usize,
    max_position_embeddings: usize,
    num_attention_heads: usize,
    num_hidden_layers: usize,
    num_key_value_heads: usize,
    rms_norm_eps: f64,
    rope_theta: f64,
    #[serde(default)]
    use_sliding_window: bool,
    vocab_size: usize,
}

impl Qwen3Config {
    fn head_dim(&self) -> usize {
        self.head_dim
            .unwrap_or(self.hidden_size / self.num_attention_heads)
    }

    fn num_kv_groups(&self) -> usize {
        self.num_attention_heads / self.num_key_value_heads
    }
}

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

struct TokenBatch {
    input_ids: Tensor,
    attention_mask: Tensor,
}

fn tokenize_left_padded(
    tokenizer: &Tokenizer,
    texts: &[String],
    max_tokens: usize,
    device: &Device,
) -> Result<TokenBatch> {
    if max_tokens == 0 {
        anyhow::bail!("Qwen3 max token limit must be positive");
    }

    let mut token_rows = Vec::with_capacity(texts.len());
    let mut mask_rows = Vec::with_capacity(texts.len());
    let mut seq_len = 1;

    for text in texts {
        let encoding = tokenizer
            .encode(text.as_str(), true)
            .map_err(|error| MlError::TokenizationFailed(error.to_string()))?;
        let mut ids = encoding.get_ids().to_vec();
        let mut mask = encoding.get_attention_mask().to_vec();

        if ids.is_empty() {
            ids.push(DEFAULT_PAD_TOKEN_ID);
            mask.push(1);
        }

        ids.truncate(max_tokens);
        mask.truncate(max_tokens);
        seq_len = seq_len.max(ids.len());
        token_rows.push(ids);
        mask_rows.push(mask);
    }

    let batch_size = token_rows.len();
    let mut input_ids = Vec::with_capacity(batch_size * seq_len);
    let mut attention_mask = Vec::with_capacity(batch_size * seq_len);

    for (ids, mask) in token_rows.iter().zip(mask_rows.iter()) {
        let pad = seq_len.saturating_sub(ids.len());
        input_ids.extend(std::iter::repeat_n(DEFAULT_PAD_TOKEN_ID, pad));
        attention_mask.extend(std::iter::repeat_n(0.0_f32, pad));
        input_ids.extend(ids.iter().copied());
        attention_mask.extend(mask.iter().map(|&value| value as f32));
    }

    let input_ids = Tensor::from_vec(input_ids, (batch_size, seq_len), device)
        .map_err(|error| MlError::InferenceFailed(error.to_string()))?;
    let attention_mask = Tensor::from_vec(attention_mask, (batch_size, seq_len), device)
        .map_err(|error| MlError::InferenceFailed(error.to_string()))?;

    Ok(TokenBatch {
        input_ids,
        attention_mask,
    })
}

fn format_embedding_input(input: &EmbeddingInput) -> String {
    let instruction = input.instruction.as_deref().map(str::trim).unwrap_or("");
    if instruction.is_empty() {
        return input.text.clone();
    }

    match input.input_kind {
        EmbeddingInputKind::Query | EmbeddingInputKind::Requirement => {
            format!("Instruct: {instruction}\nQuery: {}", input.text)
        }
        EmbeddingInputKind::Summary
        | EmbeddingInputKind::Document
        | EmbeddingInputKind::ResumeChunk
        | EmbeddingInputKind::JobChunk => input.text.clone(),
    }
}

fn project_and_normalize(mut vector: Vec<f32>, dimension: usize) -> Result<Vec<f32>> {
    if vector.len() < dimension {
        anyhow::bail!("Qwen3 embedding is shorter than the requested output dimension");
    }

    vector.truncate(dimension);
    let norm = vector.iter().map(|value| value * value).sum::<f32>().sqrt();
    if norm == 0.0 {
        return Ok(vector);
    }

    for value in &mut vector {
        *value /= norm;
    }
    Ok(vector)
}

fn build_attention_mask_4d(attention_mask_2d: &Tensor) -> candle_core::Result<Tensor> {
    let (batch_size, seq_len) = attention_mask_2d.dims2()?;
    let device = attention_mask_2d.device();
    let mask_value = -1e4_f32;

    let mut causal_data = vec![0.0_f32; seq_len * seq_len];
    for row in 0..seq_len {
        for column in (row + 1)..seq_len {
            causal_data[row * seq_len + column] = mask_value;
        }
    }

    let causal = Tensor::from_vec(causal_data, (1, 1, seq_len, seq_len), device)?;
    let expanded = attention_mask_2d
        .unsqueeze(1)?
        .unsqueeze(2)?
        .expand((batch_size, 1, seq_len, seq_len))?;
    let inverted = Tensor::ones_like(&expanded)?.sub(&expanded)?;
    let mask_value = Tensor::new(&[mask_value], device)?;
    let pad_mask = inverted.broadcast_mul(&mask_value)?;
    causal
        .broadcast_as((batch_size, 1, seq_len, seq_len))?
        .add(&pad_mask)
}

fn last_token_pool(hidden: &Tensor, attention_mask_2d: &Tensor) -> candle_core::Result<Tensor> {
    let (batch_size, seq_len, _) = hidden.dims3()?;
    let masks = attention_mask_2d.to_vec2::<f32>()?;
    let mut rows = Vec::with_capacity(batch_size);

    for (batch_index, mask) in masks.iter().enumerate() {
        let last_index = mask
            .iter()
            .rposition(|value| *value > 0.0)
            .unwrap_or(seq_len - 1);
        rows.push(hidden.i((batch_index, last_index))?);
    }

    let row_refs: Vec<&Tensor> = rows.iter().collect();
    Tensor::stack(&row_refs, 0)
}

fn l2_normalize(tensor: &Tensor) -> candle_core::Result<Tensor> {
    let sum_sq = tensor.sqr()?.sum_keepdim(1)?;
    let eps = Tensor::new(&[1e-12_f32], tensor.device())?
        .to_dtype(sum_sq.dtype())?
        .broadcast_as(sum_sq.shape())?;
    let norm = sum_sq.add(&eps)?.sqrt()?;
    tensor.broadcast_div(&norm)
}

struct Qwen3Model {
    embed_tokens: Embedding,
    layers: Vec<Qwen3Layer>,
    norm: Qwen3RmsNorm,
    rotary: Qwen3RotaryEmbedding,
    config: Qwen3Config,
    device: Device,
}

impl Qwen3Model {
    fn load(config: Qwen3Config, vb: VarBuilder) -> candle_core::Result<Self> {
        if config.use_sliding_window {
            candle_core::bail!("Qwen3 sliding-window attention is not supported");
        }

        let embed_tokens =
            candle_nn::embedding(config.vocab_size, config.hidden_size, vb.pp("embed_tokens"))?;
        let rotary = Qwen3RotaryEmbedding::new(vb.dtype(), &config, vb.device())?;
        let mut layers = Vec::with_capacity(config.num_hidden_layers);
        for index in 0..config.num_hidden_layers {
            layers.push(Qwen3Layer::load(&config, vb.pp(format!("layers.{index}")))?);
        }
        let norm = Qwen3RmsNorm::load(config.hidden_size, config.rms_norm_eps, vb.pp("norm"))?;

        Ok(Self {
            embed_tokens,
            layers,
            norm,
            rotary,
            config,
            device: vb.device().clone(),
        })
    }

    fn hidden_size(&self) -> usize {
        self.config.hidden_size
    }

    fn device(&self) -> &Device {
        &self.device
    }

    fn forward(
        &self,
        input_ids: &Tensor,
        attention_mask_2d: &Tensor,
    ) -> candle_core::Result<Tensor> {
        let attention_mask = build_attention_mask_4d(attention_mask_2d)?;
        let mut hidden = self.embed_tokens.forward(input_ids)?;
        for layer in &self.layers {
            hidden = layer.forward(&hidden, &attention_mask, &self.rotary)?;
        }
        self.norm.forward(&hidden)
    }
}

struct Qwen3Layer {
    attention: Qwen3Attention,
    mlp: Qwen3Mlp,
    input_norm: Qwen3RmsNorm,
    post_attention_norm: Qwen3RmsNorm,
}

impl Qwen3Layer {
    fn load(config: &Qwen3Config, vb: VarBuilder) -> candle_core::Result<Self> {
        Ok(Self {
            attention: Qwen3Attention::load(config, vb.pp("self_attn"))?,
            mlp: Qwen3Mlp::load(config, vb.pp("mlp"))?,
            input_norm: Qwen3RmsNorm::load(
                config.hidden_size,
                config.rms_norm_eps,
                vb.pp("input_layernorm"),
            )?,
            post_attention_norm: Qwen3RmsNorm::load(
                config.hidden_size,
                config.rms_norm_eps,
                vb.pp("post_attention_layernorm"),
            )?,
        })
    }

    fn forward(
        &self,
        hidden: &Tensor,
        attention_mask: &Tensor,
        rotary: &Qwen3RotaryEmbedding,
    ) -> candle_core::Result<Tensor> {
        let attention_input = self.input_norm.forward(hidden)?;
        let attention_output = self
            .attention
            .forward(&attention_input, attention_mask, rotary)?;
        let hidden = hidden.add(&attention_output)?;
        let mlp_input = self.post_attention_norm.forward(&hidden)?;
        hidden.add(&self.mlp.forward(&mlp_input)?)
    }
}

struct Qwen3Attention {
    q_proj: Linear,
    k_proj: Linear,
    v_proj: Linear,
    o_proj: Linear,
    q_norm: Qwen3RmsNorm,
    k_norm: Qwen3RmsNorm,
    num_heads: usize,
    num_kv_heads: usize,
    num_kv_groups: usize,
    head_dim: usize,
}

impl Qwen3Attention {
    fn load(config: &Qwen3Config, vb: VarBuilder) -> candle_core::Result<Self> {
        let head_dim = config.head_dim();
        Ok(Self {
            q_proj: linear_b(
                config.hidden_size,
                config.num_attention_heads * head_dim,
                config.attention_bias,
                vb.pp("q_proj"),
            )?,
            k_proj: linear_b(
                config.hidden_size,
                config.num_key_value_heads * head_dim,
                config.attention_bias,
                vb.pp("k_proj"),
            )?,
            v_proj: linear_b(
                config.hidden_size,
                config.num_key_value_heads * head_dim,
                config.attention_bias,
                vb.pp("v_proj"),
            )?,
            o_proj: linear_b(
                config.num_attention_heads * head_dim,
                config.hidden_size,
                config.attention_bias,
                vb.pp("o_proj"),
            )?,
            q_norm: Qwen3RmsNorm::load(head_dim, config.rms_norm_eps, vb.pp("q_norm"))?,
            k_norm: Qwen3RmsNorm::load(head_dim, config.rms_norm_eps, vb.pp("k_norm"))?,
            num_heads: config.num_attention_heads,
            num_kv_heads: config.num_key_value_heads,
            num_kv_groups: config.num_kv_groups(),
            head_dim,
        })
    }

    fn forward(
        &self,
        hidden: &Tensor,
        attention_mask: &Tensor,
        rotary: &Qwen3RotaryEmbedding,
    ) -> candle_core::Result<Tensor> {
        let (batch, seq_len, _) = hidden.dims3()?;
        let query = self
            .q_proj
            .forward(hidden)?
            .reshape((batch, seq_len, self.num_heads, self.head_dim))?
            .transpose(1, 2)?;
        let key = self
            .k_proj
            .forward(hidden)?
            .reshape((batch, seq_len, self.num_kv_heads, self.head_dim))?
            .transpose(1, 2)?;
        let value = self
            .v_proj
            .forward(hidden)?
            .reshape((batch, seq_len, self.num_kv_heads, self.head_dim))?
            .transpose(1, 2)?;

        let query = self.q_norm.forward(&query)?;
        let key = self.k_norm.forward(&key)?;
        let (query, key) = rotary.apply(&query, &key)?;
        let key = repeat_kv(key, self.num_kv_groups)?.contiguous()?;
        let value = repeat_kv(value, self.num_kv_groups)?.contiguous()?;

        let scores = query.matmul(&key.transpose(2, 3)?)?;
        let scores = (scores / (self.head_dim as f64).sqrt())?;
        let scores = scores.broadcast_add(attention_mask)?;
        let weights = candle_nn::ops::softmax_last_dim(&scores)?;
        let context = weights.matmul(&value)?;
        let context =
            context
                .transpose(1, 2)?
                .reshape((batch, seq_len, self.num_heads * self.head_dim))?;
        self.o_proj.forward(&context)
    }
}

struct Qwen3Mlp {
    gate_proj: Linear,
    up_proj: Linear,
    down_proj: Linear,
    activation: Activation,
}

impl Qwen3Mlp {
    fn load(config: &Qwen3Config, vb: VarBuilder) -> candle_core::Result<Self> {
        Ok(Self {
            gate_proj: linear_no_bias(
                config.hidden_size,
                config.intermediate_size,
                vb.pp("gate_proj"),
            )?,
            up_proj: linear_no_bias(
                config.hidden_size,
                config.intermediate_size,
                vb.pp("up_proj"),
            )?,
            down_proj: linear_no_bias(
                config.intermediate_size,
                config.hidden_size,
                vb.pp("down_proj"),
            )?,
            activation: config.hidden_act,
        })
    }

    fn forward(&self, hidden: &Tensor) -> candle_core::Result<Tensor> {
        let gate = hidden.apply(&self.gate_proj)?.apply(&self.activation)?;
        let up = hidden.apply(&self.up_proj)?;
        gate.mul(&up)?.apply(&self.down_proj)
    }
}

struct Qwen3RmsNorm {
    weight: Tensor,
    eps: f64,
}

impl Qwen3RmsNorm {
    fn load(size: usize, eps: f64, vb: VarBuilder) -> candle_core::Result<Self> {
        Ok(Self {
            weight: vb.get(size, "weight")?,
            eps,
        })
    }

    fn forward(&self, tensor: &Tensor) -> candle_core::Result<Tensor> {
        let variance = tensor.sqr()?.mean_keepdim(D::Minus1)?;
        let normalized = tensor.broadcast_div(&(variance + self.eps)?.sqrt()?)?;
        normalized.broadcast_mul(&self.weight)
    }
}

struct Qwen3RotaryEmbedding {
    sin: Tensor,
    cos: Tensor,
}

impl Qwen3RotaryEmbedding {
    fn new(dtype: DType, config: &Qwen3Config, device: &Device) -> candle_core::Result<Self> {
        let head_dim = config.head_dim();
        let max_seq_len = config.max_position_embeddings;
        let inv_freq: Vec<f32> = (0..head_dim)
            .step_by(2)
            .map(|index| 1.0 / config.rope_theta.powf(index as f64 / head_dim as f64) as f32)
            .collect();
        let inv_freq_len = inv_freq.len();
        let inv_freq =
            Tensor::from_vec(inv_freq, (1, inv_freq_len), device)?.to_dtype(DType::F32)?;
        let positions = Tensor::arange(0_u32, max_seq_len as u32, device)?
            .to_dtype(DType::F32)?
            .reshape((max_seq_len, 1))?;
        let freqs = positions.matmul(&inv_freq)?;
        Ok(Self {
            sin: freqs.sin()?.to_dtype(dtype)?,
            cos: freqs.cos()?.to_dtype(dtype)?,
        })
    }

    fn apply(&self, query: &Tensor, key: &Tensor) -> candle_core::Result<(Tensor, Tensor)> {
        let (_, _, seq_len, _) = query.dims4()?;
        let cos = self.cos.narrow(0, 0, seq_len)?;
        let sin = self.sin.narrow(0, 0, seq_len)?;
        let query = candle_nn::rotary_emb::rope(&query.contiguous()?, &cos, &sin)?;
        let key = candle_nn::rotary_emb::rope(&key.contiguous()?, &cos, &sin)?;
        Ok((query, key))
    }
}

fn repeat_kv(tensor: Tensor, groups: usize) -> candle_core::Result<Tensor> {
    if groups == 1 {
        return Ok(tensor);
    }

    let (batch, heads, seq_len, head_dim) = tensor.dims4()?;
    tensor
        .unsqueeze(2)?
        .expand((batch, heads, groups, seq_len, head_dim))?
        .reshape((batch, heads * groups, seq_len, head_dim))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn embedding_input(kind: EmbeddingInputKind, instruction: Option<&str>) -> EmbeddingInput {
        EmbeddingInput {
            text: "Built customer help content for a complex product.".to_string(),
            instruction: instruction.map(ToString::to_string),
            input_kind: kind,
        }
    }

    #[test]
    fn query_formatting_uses_instruction_prompt() {
        let input = embedding_input(
            EmbeddingInputKind::Requirement,
            Some("Retrieve concrete resume evidence."),
        );
        let formatted = format_embedding_input(&input);

        assert!(formatted.starts_with("Instruct: Retrieve concrete resume evidence."));
        assert!(formatted.contains("\nQuery: Built customer help content"));
    }

    #[test]
    fn document_formatting_does_not_over_prompt() {
        let input = embedding_input(
            EmbeddingInputKind::ResumeChunk,
            Some("Retrieve concrete resume evidence."),
        );

        assert_eq!(
            format_embedding_input(&input),
            "Built customer help content for a complex product."
        );
    }

    #[test]
    fn projection_truncates_and_renormalizes() {
        let projected = project_and_normalize(vec![3.0, 4.0, 12.0], 2).unwrap();
        let norm = projected
            .iter()
            .map(|value| value * value)
            .sum::<f32>()
            .sqrt();

        assert_eq!(projected.len(), 2);
        assert!((norm - 1.0).abs() < 1e-6);
        assert!((projected[0] - 0.6).abs() < 1e-6);
        assert!((projected[1] - 0.8).abs() < 1e-6);
    }

    #[test]
    #[ignore]
    fn qwen3_backend_embeds_with_pinned_downloaded_model() {
        let temp_dir;
        let app_data_dir = if let Some(path) = std::env::var_os("JOBSENTINEL_QWEN3_TEST_CACHE") {
            PathBuf::from(path)
        } else {
            temp_dir = tempfile::tempdir().expect("tempdir should be created");
            temp_dir.path().to_path_buf()
        };

        let manager = ModelManager::new(app_data_dir);
        let spec =
            ModelManager::default_embedding_model_spec().expect("default embedding should exist");
        if !manager.is_model_downloaded_for(&spec) {
            let runtime = tokio::runtime::Runtime::new().expect("tokio runtime should start");
            runtime
                .block_on(manager.download_model_by_id(&spec.id))
                .unwrap_or_else(|error| {
                    panic!("Qwen3 model should download and verify: {error:#?}")
                });
        }

        let backend =
            Qwen3EmbeddingBackend::from_manager(&manager, spec).expect("backend should load");
        let vector = backend
            .embed_query(&EmbeddingInput {
                text: "Experience writing clear help content for customers.".to_string(),
                instruction: Some("Retrieve concrete professional evidence.".to_string()),
                input_kind: EmbeddingInputKind::Requirement,
            })
            .expect("query should embed");
        let norm = vector.iter().map(|value| value * value).sum::<f32>().sqrt();

        assert_eq!(backend.model_id(), "qwen3-embedding-0.6b");
        assert_eq!(backend.dimension(), 768);
        assert_eq!(vector.len(), 768);
        assert!((norm - 1.0).abs() < 1e-4);
    }
}
