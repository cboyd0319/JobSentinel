//! Credential-aware orchestration for reviewed external-AI requests.

use jobsentinel_ai::{
    send_validated_external_ai_request, validate_external_ai_request, ValidatedExternalAiRequest,
};
use zeroize::Zeroizing;

use crate::{
    config::{ExternalAiConfig, ExternalAiProvider},
    credentials::{CredentialKey, CredentialService},
};

pub use jobsentinel_ai::{ExternalAiCommandRequest, ExternalAiCommandResponse};

/// Validate a reviewed request, retrieve only its selected credential, and send it.
pub async fn send_external_ai_request(
    request: &ExternalAiCommandRequest,
    config: &ExternalAiConfig,
    credentials: &CredentialService,
) -> Result<ExternalAiCommandResponse, String> {
    let validated = validate_external_ai_request(request, config)?;
    let api_key = retrieve_provider_key(&validated, credentials).await?;
    send_validated_external_ai_request(&validated, api_key.as_str()).await
}

async fn retrieve_provider_key(
    request: &ValidatedExternalAiRequest,
    credentials: &CredentialService,
) -> Result<Zeroizing<String>, String> {
    let key = credential_key_for_provider(request.provider())
        .ok_or_else(|| "Choose the outside AI service before sending anything.".to_string())?;
    let value = credentials
        .retrieve(key)
        .await
        .map_err(|_| "Outside AI credential is unavailable.".to_string())?
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Add this provider's API key in Settings first.".to_string())?;

    Ok(Zeroizing::new(value))
}

const fn credential_key_for_provider(provider: ExternalAiProvider) -> Option<CredentialKey> {
    match provider {
        ExternalAiProvider::OpenAi => Some(CredentialKey::ExternalAiOpenAiApiKey),
        ExternalAiProvider::Anthropic => Some(CredentialKey::ExternalAiAnthropicApiKey),
        ExternalAiProvider::GoogleGemini => Some(CredentialKey::ExternalAiGoogleApiKey),
        ExternalAiProvider::GithubCopilot => Some(CredentialKey::ExternalAiGithubCopilotApiKey),
        ExternalAiProvider::Custom => Some(CredentialKey::ExternalAiCustomApiKey),
        ExternalAiProvider::None => None,
    }
}
