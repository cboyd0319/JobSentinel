use super::integrity::verify_model_file_checksum;
use super::ModelManager;
use crate::manifest::ModelSpec;
use crate::MlError;
use anyhow::{Context, Result};
use candle_core::{DType, Device};
use candle_nn::VarBuilder;
use jobsentinel_security::path_label_for_logging;
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

        verify_model_file_checksum(&tokenizer_path, &tokenizer_file.sha256)
            .context("cached tokenizer failed integrity check")?;

        Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| MlError::TokenizationFailed(e.to_string()).into())
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

        verify_model_file_checksum(&model_path, &weights_file.sha256)
            .context("cached model weights failed integrity check")?;

        let model_data = std::fs::read(&model_path).with_context(|| {
            format!(
                "failed to read model weights from {}",
                path_label_for_logging(&model_path)
            )
        })?;
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
}
