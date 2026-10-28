//! Runs canonical BERT inference and masked mean pooling for the governed MiniLM fallback.

use anyhow::Result;
use candle_core::{DType, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config};

pub(crate) struct SentenceTransformer(BertModel);

impl SentenceTransformer {
    pub(crate) fn load(vb: VarBuilder, config: &Config) -> Result<Self> {
        Ok(Self(BertModel::load(vb, config)?))
    }

    pub(crate) fn forward(&self, input_ids: &Tensor, attention_mask: &Tensor) -> Result<Tensor> {
        let hidden = self
            .0
            .forward(input_ids, &input_ids.zeros_like()?, Some(attention_mask))?;
        let mask = attention_mask.to_dtype(DType::F32)?.unsqueeze(2)?;
        let sum = hidden.broadcast_mul(&mask)?.sum(1)?;
        let count = mask.sum(1)?.clamp(1e-9, f64::MAX)?;
        Ok(sum.broadcast_div(&count)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candle_core::Device;

    #[test]
    fn bert_masked_pooling_ignores_padding_and_uses_token_positions() {
        let device = Device::Cpu;
        let vars = candle_nn::VarMap::new();
        let config = Config {
            vocab_size: 10,
            hidden_size: 8,
            num_hidden_layers: 1,
            num_attention_heads: 2,
            intermediate_size: 16,
            max_position_embeddings: 8,
            ..Default::default()
        };
        let model =
            SentenceTransformer::load(VarBuilder::from_varmap(&vars, DType::F32, &device), &config)
                .unwrap();
        let encode = |ids: &[u32], mask: &[u32]| {
            model
                .forward(
                    &Tensor::new(ids, &device).unwrap().unsqueeze(0).unwrap(),
                    &Tensor::new(mask, &device).unwrap().unsqueeze(0).unwrap(),
                )
                .unwrap()
                .to_vec2::<f32>()
                .unwrap()[0]
                .clone()
        };
        let plain = encode(&[1, 2], &[1, 1]);
        let padded = encode(&[1, 2, 8, 9], &[1, 1, 0, 0]);
        assert!(plain.iter().zip(&padded).all(|(a, b)| (a - b).abs() < 1e-5));
        let reversed = encode(&[2, 1], &[1, 1]);
        assert!(plain
            .iter()
            .zip(&reversed)
            .any(|(a, b)| (a - b).abs() > 1e-6));
    }
}
