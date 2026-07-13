import { safeInvoke } from "../tauri/commandClient";
import { createExternalAiGateway } from "./internal/aiGateway";
import { appendExternalAiRequestLog } from "./externalAiRequestLog";
import type {
  ExternalAiGateway,
  ExternalAiProvider,
  ExternalAiResponse,
  ExternalAiSettings,
  ExternalAiTransport,
  PreparedExternalAiRequest,
} from "./externalAiTypes";

const ENABLED_PROVIDERS = [
  "open_ai",
  "anthropic",
  "google_gemini",
  "github_copilot",
  "custom",
] as const;

type EnabledExternalAiProvider = (typeof ENABLED_PROVIDERS)[number];

export interface ExternalAiRuntimeConfig {
  enabled: boolean;
  provider: ExternalAiProvider;
  require_payload_preview: boolean;
  allow_sensitive_payloads: boolean;
  redaction: {
    enabled: boolean;
  };
  log_requests_locally: boolean;
}

interface ConfigEnvelope {
  external_ai?: unknown;
}

interface RawExternalAiConfig {
  enabled?: unknown;
  provider?: unknown;
  enabled_providers?: unknown;
  require_payload_preview?: unknown;
  allow_sensitive_payloads?: unknown;
  redaction?: unknown;
  log_requests_locally?: unknown;
}

const PROVIDER_LABELS: Record<EnabledExternalAiProvider, string> = {
  open_ai: "OpenAI",
  anthropic: "Anthropic",
  google_gemini: "Google Gemini",
  github_copilot: "GitHub Copilot",
  custom: "Custom provider",
};

function isEnabledProvider(value: unknown): value is EnabledExternalAiProvider {
  return ENABLED_PROVIDERS.includes(value as EnabledExternalAiProvider);
}

function normalizeProvider(value: unknown): ExternalAiProvider {
  if (value === "none") return "none";
  return isEnabledProvider(value) ? value : "none";
}

function normalizeEnabledProviders(value: unknown): EnabledExternalAiProvider[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<EnabledExternalAiProvider>();
  return value.filter((provider): provider is EnabledExternalAiProvider => {
    if (!isEnabledProvider(provider) || seen.has(provider)) return false;
    seen.add(provider);
    return true;
  });
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function providerLabel(provider: ExternalAiProvider): string {
  return provider === "none" ? "Outside AI" : PROVIDER_LABELS[provider];
}

export function normalizeExternalAiRuntimeConfig(
  rawConfig: unknown,
): ExternalAiRuntimeConfig {
  const raw = readObject(rawConfig) as RawExternalAiConfig;
  const configuredProvider = normalizeProvider(raw.provider);
  const enabledProviders = normalizeEnabledProviders(
    raw.enabled_providers,
  );
  const legacyEnabledProviders =
    enabledProviders.length > 0
      ? enabledProviders
      : raw.enabled === true && configuredProvider !== "none"
        ? [configuredProvider]
        : [];
  const provider = legacyEnabledProviders[0] ?? "none";
  const redaction = readObject(raw.redaction);

  return {
    enabled: raw.enabled === true && provider !== "none",
    provider,
    require_payload_preview: raw.require_payload_preview !== false,
    allow_sensitive_payloads: raw.allow_sensitive_payloads === true,
    redaction: {
      enabled: redaction.enabled !== false,
    },
    log_requests_locally: raw.log_requests_locally !== false,
  };
}

export async function loadExternalAiRuntimeConfig(): Promise<ExternalAiRuntimeConfig> {
  const config = await safeInvoke<ConfigEnvelope>(
    "get_config",
    {},
    { logContext: "Load outside AI settings", silent: true },
  );
  return normalizeExternalAiRuntimeConfig(config.external_ai);
}

export function toGatewaySettings(
  config: ExternalAiRuntimeConfig,
): ExternalAiSettings {
  return {
    enabled: config.enabled,
    provider: config.provider,
    requirePayloadPreview: config.require_payload_preview,
    allowSensitivePayloads: config.allow_sensitive_payloads,
    redaction: {
      enabled: config.redaction.enabled,
    },
    logRequestsLocally: config.log_requests_locally,
  };
}

function createBackendTransport(): ExternalAiTransport {
  return {
    async send(
      request: PreparedExternalAiRequest,
    ): Promise<ExternalAiResponse> {
      return await safeInvoke<ExternalAiResponse>(
        "send_external_ai_request",
        { request },
        { logContext: "Send reviewed outside AI request" },
      );
    },
  };
}

export function createBackendExternalAiGateway(
  config: ExternalAiRuntimeConfig,
): ExternalAiGateway {
  return createExternalAiGateway(
    toGatewaySettings(config),
    createBackendTransport(),
    (entry) => {
      appendExternalAiRequestLog(entry);
    },
  );
}
