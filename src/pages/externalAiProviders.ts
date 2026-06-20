export const EXTERNAL_AI_PROVIDER_ORDER = [
  "open_ai",
  "anthropic",
  "google_gemini",
  "github_copilot",
  "custom",
] as const;

export type EnabledExternalAiProvider =
  (typeof EXTERNAL_AI_PROVIDER_ORDER)[number];

export type ExternalAiProvider = "none" | EnabledExternalAiProvider;

export type ExternalAiCredentialKey =
  | "external_ai_openai_api_key"
  | "external_ai_anthropic_api_key"
  | "external_ai_google_api_key"
  | "external_ai_github_copilot_api_key"
  | "external_ai_custom_api_key";

export interface ExternalAiSettings {
  enabled: boolean;
  provider: ExternalAiProvider;
  model: string;
  custom_endpoint: string;
  provider_order: EnabledExternalAiProvider[];
  enabled_providers: EnabledExternalAiProvider[];
  provider_models: Partial<Record<EnabledExternalAiProvider, string>>;
  require_payload_preview: boolean;
  allow_sensitive_payloads: boolean;
  redaction: {
    enabled: boolean;
  };
  log_requests_locally: boolean;
}

export const DEFAULT_EXTERNAL_AI_CONFIG: ExternalAiSettings = {
  enabled: false,
  provider: "none",
  model: "",
  custom_endpoint: "",
  provider_order: [...EXTERNAL_AI_PROVIDER_ORDER],
  enabled_providers: [],
  provider_models: {},
  require_payload_preview: true,
  allow_sensitive_payloads: false,
  redaction: {
    enabled: true,
  },
  log_requests_locally: true,
};

export const EXTERNAL_AI_PROVIDER_LABELS: Record<
  EnabledExternalAiProvider,
  string
> = {
  open_ai: "OpenAI",
  anthropic: "Anthropic",
  google_gemini: "Google Gemini",
  github_copilot: "GitHub Copilot",
  custom: "Custom provider",
};

export const EXTERNAL_AI_PROVIDER_DESCRIPTIONS: Record<
  EnabledExternalAiProvider,
  string
> = {
  open_ai: "Use an OpenAI API key you provide.",
  anthropic: "Use an Anthropic API key you provide.",
  google_gemini: "Use a Google Gemini API key you provide.",
  github_copilot: "Use a GitHub token or Copilot-compatible key you provide.",
  custom: "Use a compatible HTTPS endpoint and key you provide.",
};

export const EXTERNAL_AI_PROVIDER_CREDENTIAL_KEYS: Record<
  EnabledExternalAiProvider,
  ExternalAiCredentialKey
> = {
  open_ai: "external_ai_openai_api_key",
  anthropic: "external_ai_anthropic_api_key",
  google_gemini: "external_ai_google_api_key",
  github_copilot: "external_ai_github_copilot_api_key",
  custom: "external_ai_custom_api_key",
};

export function isEnabledExternalAiProvider(
  value: unknown,
): value is EnabledExternalAiProvider {
  return EXTERNAL_AI_PROVIDER_ORDER.includes(value as EnabledExternalAiProvider);
}

export function isExternalAiProvider(value: unknown): value is ExternalAiProvider {
  return value === "none" || isEnabledExternalAiProvider(value);
}

export function normalizeExternalAiProviderOrder(
  providers: unknown,
): EnabledExternalAiProvider[] {
  const seen = new Set<EnabledExternalAiProvider>();
  const ordered = Array.isArray(providers)
    ? providers.filter((provider): provider is EnabledExternalAiProvider => {
        if (!isEnabledExternalAiProvider(provider) || seen.has(provider)) {
          return false;
        }
        seen.add(provider);
        return true;
      })
    : [];

  for (const provider of EXTERNAL_AI_PROVIDER_ORDER) {
    if (!seen.has(provider)) ordered.push(provider);
  }

  return ordered;
}

export function normalizeEnabledExternalAiProviders(
  providers: unknown,
): EnabledExternalAiProvider[] {
  if (!Array.isArray(providers)) return [];

  const seen = new Set<EnabledExternalAiProvider>();
  return providers.filter((provider): provider is EnabledExternalAiProvider => {
    if (!isEnabledExternalAiProvider(provider) || seen.has(provider)) {
      return false;
    }
    seen.add(provider);
    return true;
  });
}

export function normalizeExternalAiSettings(
  rawSettings: Partial<ExternalAiSettings> | null | undefined,
): ExternalAiSettings {
  const raw = rawSettings ?? DEFAULT_EXTERNAL_AI_CONFIG;
  const providerOrder = normalizeExternalAiProviderOrder(raw.provider_order);
  const enabledProviders = normalizeEnabledExternalAiProviders(
    raw.enabled_providers?.length
      ? raw.enabled_providers
      : raw.enabled && isEnabledExternalAiProvider(raw.provider)
        ? [raw.provider]
        : [],
  );
  const primaryProvider = enabledProviders[0] ?? "none";
  const providerModels = raw.provider_models ?? {};

  return {
    ...DEFAULT_EXTERNAL_AI_CONFIG,
    ...raw,
    enabled: enabledProviders.length > 0,
    provider: primaryProvider,
    model:
      primaryProvider === "none"
        ? (raw.model ?? "")
        : (providerModels[primaryProvider] ?? raw.model ?? ""),
    provider_order: providerOrder,
    enabled_providers: enabledProviders,
    provider_models: providerModels,
    redaction: {
      ...DEFAULT_EXTERNAL_AI_CONFIG.redaction,
      ...(raw.redaction ?? {}),
    },
  };
}
