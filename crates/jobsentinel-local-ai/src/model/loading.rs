//! Deserializes tokenizers, weights and config from the exact checksum-verified bytes.

use super::integrity::read_verified_model_file;
use super::ModelManager;
use crate::manifest::ModelSpec;
use crate::MlError;
use anyhow::{Context, Result};
use candle_core::{DType, Device};
use candle_nn::VarBuilder;
use serde::de::DeserializeOwned;
use tokenizers::Tokenizer;

impl ModelManager {
    /// Load tokenizer from cache for the legacy runtime embedding model.
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

        let bytes = read_verified_model_file(&tokenizer_path, tokenizer_file)
            .context("cached tokenizer failed integrity check")?;

        Tokenizer::from_bytes(&bytes).map_err(|e| MlError::TokenizationFailed(e.to_string()).into())
    }

    /// Load model weights from cache for the legacy runtime embedding model.
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

        let model_data = read_verified_model_file(&model_path, weights_file)?;
        VarBuilder::from_buffered_safetensors(model_data, DType::F32, device)
            .map_err(|e| MlError::ModelLoadFailed(e.to_string()).into())
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

        let bytes = read_verified_model_file(&path, file)?;
        serde_json::from_slice(&bytes).map_err(|error| {
            MlError::ModelLoadFailed(format!("failed to parse {file_name}: {error}")).into()
        })
    }
}
