use crate::core::ml::MlError;
use anyhow::Result;
use candle_core::{DType, Module, Tensor};
use candle_nn::VarBuilder;

/// Simple BERT-like model for sentence embeddings (all-MiniLM-L6-v2 architecture).
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
    /// Load model from VarBuilder.
    pub fn load(vb: VarBuilder) -> Result<Self> {
        const HIDDEN_SIZE: usize = 384;
        const NUM_LAYERS: usize = 6;
        const NUM_HEADS: usize = 12;
        const VOCAB_SIZE: usize = 30522;

        let embeddings =
            candle_nn::embedding(VOCAB_SIZE, HIDDEN_SIZE, vb.pp("embeddings.word_embeddings"))
                .map_err(|e| MlError::ModelLoadFailed(e.to_string()))?;

        let mut layers = Vec::new();
        for i in 0..NUM_LAYERS {
            let layer_vb = vb.pp(format!("encoder.layer.{}", i));
            layers.push(TransformerLayer::load(layer_vb, HIDDEN_SIZE, NUM_HEADS)?);
        }

        Ok(Self { embeddings, layers })
    }

    /// Forward pass to generate embeddings.
    pub fn forward(&self, input_ids: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        let mut hidden = self
            .embeddings
            .forward(input_ids)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        for layer in &self.layers {
            hidden = layer
                .forward(&hidden, attention_mask)
                .map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        }

        self.mean_pool(&hidden, attention_mask)
    }

    fn mean_pool(&self, hidden: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        let mask_expanded = attention_mask
            .unsqueeze(2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .broadcast_as(hidden.shape())
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .to_dtype(DType::F32)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let weighted =
            (hidden * &mask_expanded).map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let sum = weighted
            .sum(1)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let count = mask_expanded
            .sum(1)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        sum.broadcast_div(&count)
            .map_err(|e| MlError::InferenceFailed(e.to_string()).into())
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
        let attn_output = self.self_attention.forward(hidden, attention_mask)?;
        let hidden = (hidden + attn_output).map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        let hidden = self
            .ln1
            .forward(&hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

        let ff_output = self.feed_forward.forward(&hidden)?;
        let hidden = (&hidden + ff_output).map_err(|e| MlError::InferenceFailed(e.to_string()))?;
        self.ln2
            .forward(&hidden)
            .map_err(|e| MlError::InferenceFailed(e.to_string()).into())
    }
}

impl MultiHeadAttention {
    fn forward(&self, hidden: &Tensor, _attention_mask: &Tensor) -> Result<Tensor> {
        let (batch_size, seq_len, _hidden_size) = hidden
            .dims3()
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

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

        let context = context
            .transpose(1, 2)
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?
            .reshape((batch_size, seq_len, self.num_heads * self.head_dim))
            .map_err(|e| MlError::InferenceFailed(e.to_string()))?;

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
