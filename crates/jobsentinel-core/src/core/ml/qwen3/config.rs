use candle_nn::Activation;

#[derive(Debug, Clone, serde::Deserialize)]
pub(super) struct Qwen3Config {
    pub(super) attention_bias: bool,
    pub(super) head_dim: Option<usize>,
    pub(super) hidden_act: Activation,
    pub(super) hidden_size: usize,
    pub(super) intermediate_size: usize,
    pub(super) max_position_embeddings: usize,
    pub(super) num_attention_heads: usize,
    pub(super) num_hidden_layers: usize,
    pub(super) num_key_value_heads: usize,
    pub(super) rms_norm_eps: f64,
    pub(super) rope_theta: f64,
    #[serde(default)]
    pub(super) use_sliding_window: bool,
    pub(super) vocab_size: usize,
}

impl Qwen3Config {
    pub(super) fn head_dim(&self) -> usize {
        self.head_dim
            .unwrap_or(self.hidden_size / self.num_attention_heads)
    }

    pub(super) fn num_kv_groups(&self) -> usize {
        self.num_attention_heads / self.num_key_value_heads
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
pub(super) struct Qwen3LogitScoreConfig {
    pub(super) true_token_id: usize,
    pub(super) false_token_id: usize,
}
