//! Provider-specific outside-AI HTTP transports.

use jobsentinel_domain::ExternalAiProvider;
use jobsentinel_network::{
    send_external_https_text_with_retry, ExternalHttpRequest, ExternalTextResponse,
};
use serde_json::Value;

const MAX_PROVIDER_RESPONSE_CHARS: usize = 16_000;
const OPENAI_RESPONSES_ENDPOINT: &str = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_ENDPOINT: &str = "https://api.anthropic.com/v1/messages";
const GEMINI_GENERATE_CONTENT_ENDPOINT_PREFIX: &str =
    "https://generativelanguage.googleapis.com/v1beta/models/";
const GEMINI_GENERATE_CONTENT_ENDPOINT_SUFFIX: &str = ":generateContent";
const GITHUB_MODELS_CHAT_COMPLETIONS_ENDPOINT: &str =
    "https://models.github.ai/inference/chat/completions";

#[derive(Debug)]
pub(crate) struct ProviderRequest {
    pub(crate) provider: ExternalAiProvider,
    pub(crate) model: String,
    pub(crate) custom_endpoint: Option<String>,
    pub(crate) prompt: String,
}

pub(crate) async fn send_provider_request(
    request: &ProviderRequest,
    api_key: &str,
) -> Result<String, String> {
    match request.provider {
        ExternalAiProvider::OpenAi => {
            send_openai_request(&request.model, &request.prompt, api_key).await
        }
        ExternalAiProvider::Anthropic => {
            send_anthropic_request(&request.model, &request.prompt, api_key).await
        }
        ExternalAiProvider::GoogleGemini => {
            send_gemini_request(&request.model, &request.prompt, api_key).await
        }
        ExternalAiProvider::GithubCopilot => {
            send_github_models_request(&request.model, &request.prompt, api_key).await
        }
        ExternalAiProvider::Custom => {
            let endpoint = request
                .custom_endpoint
                .as_deref()
                .ok_or_else(|| "Add a custom HTTPS endpoint in Settings first.".to_string())?;
            send_custom_chat_request(endpoint, &request.model, &request.prompt, api_key).await
        }
        ExternalAiProvider::None => {
            Err("Choose the outside AI service before sending anything.".to_string())
        }
    }
}

async fn send_openai_request(model: &str, prompt: &str, api_key: &str) -> Result<String, String> {
    let response = send_provider_http_request(
        ExternalHttpRequest::post(OPENAI_RESPONSES_ENDPOINT)
            .header("authorization", format!("Bearer {api_key}"))
            .json(serde_json::json!({
                "model": model,
                "input": prompt,
            })),
    )
    .await?;
    let value = provider_json(response, "open_ai").await?;
    extract_openai_response_text(&value).ok_or_else(provider_text_error)
}

async fn send_anthropic_request(
    model: &str,
    prompt: &str,
    api_key: &str,
) -> Result<String, String> {
    let response = send_provider_http_request(
        ExternalHttpRequest::post(ANTHROPIC_MESSAGES_ENDPOINT)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(serde_json::json!({
                "model": model,
                "max_tokens": 1024,
                "messages": [{ "role": "user", "content": prompt }],
            })),
    )
    .await?;
    let value = provider_json(response, "anthropic").await?;
    extract_anthropic_response_text(&value).ok_or_else(provider_text_error)
}

async fn send_gemini_request(model: &str, prompt: &str, api_key: &str) -> Result<String, String> {
    let encoded_model = urlencoding::encode(model);
    let endpoint = format!(
        "{GEMINI_GENERATE_CONTENT_ENDPOINT_PREFIX}{encoded_model}{GEMINI_GENERATE_CONTENT_ENDPOINT_SUFFIX}"
    );
    let response = send_provider_http_request(
        ExternalHttpRequest::post(endpoint)
            .query([("key".to_string(), api_key.to_string())])
            .json(serde_json::json!({
                "contents": [{ "parts": [{ "text": prompt }] }],
            })),
    )
    .await?;
    let value = provider_json(response, "google_gemini").await?;
    extract_gemini_response_text(&value).ok_or_else(provider_text_error)
}

async fn send_github_models_request(
    model: &str,
    prompt: &str,
    api_key: &str,
) -> Result<String, String> {
    let response = send_provider_http_request(
        ExternalHttpRequest::post(GITHUB_MODELS_CHAT_COMPLETIONS_ENDPOINT)
            .header("authorization", format!("Bearer {api_key}"))
            .json(chat_completion_body(model, prompt)),
    )
    .await?;
    let value = provider_json(response, "github_copilot").await?;
    extract_chat_response_text(&value).ok_or_else(provider_text_error)
}

async fn send_custom_chat_request(
    endpoint: &str,
    model: &str,
    prompt: &str,
    api_key: &str,
) -> Result<String, String> {
    let response = send_provider_http_request(
        ExternalHttpRequest::post(endpoint)
            .header("authorization", format!("Bearer {api_key}"))
            .json(chat_completion_body(model, prompt)),
    )
    .await?;
    let value = provider_json(response, "custom").await?;
    extract_chat_response_text(&value)
        .or_else(|| extract_openai_response_text(&value))
        .or_else(|| {
            value
                .get("text")
                .and_then(Value::as_str)
                .map(trimmed_response_text)
        })
        .ok_or_else(provider_text_error)
}

fn chat_completion_body(model: &str, prompt: &str) -> Value {
    serde_json::json!({
        "model": model,
        "messages": [{ "role": "user", "content": prompt }],
    })
}

async fn send_provider_http_request(
    request: ExternalHttpRequest,
) -> Result<ExternalTextResponse, String> {
    send_external_https_text_with_retry(request.without_retries())
        .await
        .map_err(|_| "Outside AI provider could not be reached.".to_string())
}

async fn provider_json(response: ExternalTextResponse, provider: &str) -> Result<Value, String> {
    if !(200..300).contains(&response.status) {
        tracing::warn!(
            provider,
            status = response.status,
            "Outside AI provider returned an unsuccessful status"
        );
        return Err(
            "Outside AI provider returned an error. Check provider setup and try again."
                .to_string(),
        );
    }

    serde_json::from_str(&response.body)
        .map_err(|_| "Outside AI provider returned an unreadable response.".to_string())
}

fn provider_text_error() -> String {
    "Outside AI provider returned a response JobSentinel could not read.".to_string()
}

fn trimmed_response_text(text: &str) -> String {
    text.trim()
        .chars()
        .take(MAX_PROVIDER_RESPONSE_CHARS)
        .collect()
}

fn extract_openai_response_text(value: &Value) -> Option<String> {
    value
        .get("output_text")
        .and_then(Value::as_str)
        .map(trimmed_response_text)
        .filter(|text| !text.is_empty())
        .or_else(|| extract_content_array_text(value.get("output")))
}

fn extract_anthropic_response_text(value: &Value) -> Option<String> {
    extract_content_array_text(value.get("content"))
}

fn extract_gemini_response_text(value: &Value) -> Option<String> {
    value
        .get("candidates")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .flat_map(|candidate| {
            candidate
                .pointer("/content/parts")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
        })
        .filter_map(|part| part.get("text").and_then(Value::as_str))
        .map(trimmed_response_text)
        .find(|text| !text.is_empty())
}

fn extract_chat_response_text(value: &Value) -> Option<String> {
    value
        .get("choices")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|choice| choice.pointer("/message/content").and_then(Value::as_str))
        .map(trimmed_response_text)
        .find(|text| !text.is_empty())
}

fn extract_content_array_text(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|item| item.get("text").and_then(Value::as_str))
        .map(trimmed_response_text)
        .find(|text| !text.is_empty())
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn extracts_provider_response_text() {
        let openai = serde_json::json!({ "output_text": " Summary text " });
        let anthropic =
            serde_json::json!({ "content": [{ "type": "text", "text": " Anthropic text " }] });
        let gemini = serde_json::json!({
            "candidates": [{ "content": { "parts": [{ "text": " Gemini text " }] } }]
        });
        let chat = serde_json::json!({ "choices": [{ "message": { "content": " Chat text " } }] });

        assert_eq!(
            extract_openai_response_text(&openai),
            Some("Summary text".to_string())
        );
        assert_eq!(
            extract_anthropic_response_text(&anthropic),
            Some("Anthropic text".to_string())
        );
        assert_eq!(
            extract_gemini_response_text(&gemini),
            Some("Gemini text".to_string())
        );
        assert_eq!(
            extract_chat_response_text(&chat),
            Some("Chat text".to_string())
        );
    }
}
