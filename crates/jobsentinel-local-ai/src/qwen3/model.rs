use candle_core::{DType, Device, IndexOp, Module, Tensor, D};
use candle_nn::{linear_b, linear_no_bias, Embedding, Linear, VarBuilder};

use crate::qwen3::config::Qwen3Config;

pub(super) struct Qwen3Model {
    embed_tokens: Embedding,
    layers: Vec<Qwen3Layer>,
    norm: Qwen3RmsNorm,
    rotary: Qwen3RotaryEmbedding,
    config: Qwen3Config,
    device: Device,
}

impl Qwen3Model {
    pub(super) fn load(config: Qwen3Config, vb: VarBuilder) -> candle_core::Result<Self> {
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

    pub(super) fn hidden_size(&self) -> usize {
        self.config.hidden_size
    }

    pub(super) fn device(&self) -> &Device {
        &self.device
    }

    pub(super) fn token_embedding(&self, token_id: usize) -> candle_core::Result<Tensor> {
        if token_id >= self.config.vocab_size {
            candle_core::bail!("Qwen3 token id is outside the model vocabulary");
        }
        self.embed_tokens.embeddings().i(token_id)
    }

    pub(super) fn forward(
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
    activation: candle_nn::Activation,
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
