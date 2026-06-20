use anyhow::Result;
use candle_core::{IndexOp, Tensor};

pub(super) fn last_token_pool(
    hidden: &Tensor,
    attention_mask_2d: &Tensor,
) -> candle_core::Result<Tensor> {
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

pub(super) fn l2_normalize(tensor: &Tensor) -> candle_core::Result<Tensor> {
    let sum_sq = tensor.sqr()?.sum_keepdim(1)?;
    let eps = Tensor::new(&[1e-12_f32], tensor.device())?
        .to_dtype(sum_sq.dtype())?
        .broadcast_as(sum_sq.shape())?;
    let norm = sum_sq.add(&eps)?.sqrt()?;
    tensor.broadcast_div(&norm)
}

pub(super) fn project_and_normalize(mut vector: Vec<f32>, dimension: usize) -> Result<Vec<f32>> {
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
