//! Optional external-AI configuration.
//!
//! Credentials for these providers are stored through `CredentialService`, not
//! serialized in app configuration.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum ExternalAiProvider {
    None,
    #[serde(alias = "openai")]
    OpenAi,
    Anthropic,
    GoogleGemini,
    GithubCopilot,
    Custom,
}

impl Default for ExternalAiProvider {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExternalAiRedactionConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
}

impl Default for ExternalAiRedactionConfig {
    fn default() -> Self {
        Self { enabled: true }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExternalAiConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub provider: ExternalAiProvider,
    #[serde(default = "super::defaults::default_external_ai_model")]
    pub model: String,
    #[serde(default)]
    pub custom_endpoint: String,
    #[serde(default = "default_provider_order")]
    pub provider_order: Vec<ExternalAiProvider>,
    #[serde(default)]
    pub enabled_providers: Vec<ExternalAiProvider>,
    #[serde(default)]
    pub provider_models: BTreeMap<ExternalAiProvider, String>,
    #[serde(default = "default_true")]
    pub require_payload_preview: bool,
    #[serde(default)]
    pub allow_sensitive_payloads: bool,
    #[serde(default)]
    pub redaction: ExternalAiRedactionConfig,
    #[serde(default = "default_true")]
    pub log_requests_locally: bool,
}

impl Default for ExternalAiConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            provider: ExternalAiProvider::None,
            model: super::defaults::default_external_ai_model(),
            custom_endpoint: String::new(),
            provider_order: default_provider_order(),
            enabled_providers: Vec::new(),
            provider_models: BTreeMap::new(),
            require_payload_preview: true,
            allow_sensitive_payloads: false,
            redaction: ExternalAiRedactionConfig::default(),
            log_requests_locally: true,
        }
    }
}

fn default_provider_order() -> Vec<ExternalAiProvider> {
    vec![
        ExternalAiProvider::OpenAi,
        ExternalAiProvider::Anthropic,
        ExternalAiProvider::GoogleGemini,
        ExternalAiProvider::GithubCopilot,
        ExternalAiProvider::Custom,
    ]
}

const fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_external_ai_keeps_local_only_state() {
        let config = ExternalAiConfig::default();

        assert!(!config.enabled);
        assert_eq!(config.provider, ExternalAiProvider::None);
        assert!(config.enabled_providers.is_empty());
        assert_eq!(
            config.provider_order,
            vec![
                ExternalAiProvider::OpenAi,
                ExternalAiProvider::Anthropic,
                ExternalAiProvider::GoogleGemini,
                ExternalAiProvider::GithubCopilot,
                ExternalAiProvider::Custom,
            ]
        );
        assert!(config.require_payload_preview);
        assert!(config.redaction.enabled);
    }

    #[test]
    fn provider_models_serialize_with_stable_provider_names() {
        let mut config = ExternalAiConfig::default();
        config.provider_models.insert(
            ExternalAiProvider::GoogleGemini,
            "gemini-user-selected".to_string(),
        );

        let value = serde_json::to_value(config).expect("config should serialize");

        assert_eq!(
            value.pointer("/provider_models/google_gemini"),
            Some(&serde_json::json!("gemini-user-selected"))
        );
    }

    #[test]
    fn provider_accepts_legacy_openai_spelling() {
        let provider: ExternalAiProvider =
            serde_json::from_str("\"openai\"").expect("legacy spelling should deserialize");

        assert_eq!(provider, ExternalAiProvider::OpenAi);
    }
}
