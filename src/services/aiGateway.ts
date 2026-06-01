export const FEATURE_PRIVACY_LABELS = [
  "Local only",
  "External AI optional",
  "External AI required",
  "Sensitive",
  "Public-data only",
] as const;

export type FeaturePrivacyLabel = (typeof FEATURE_PRIVACY_LABELS)[number];

export type ExternalAiProvider = "none" | "openai" | "custom";

export type ExternalAiDataCategory =
  | "job_posting"
  | "public_metadata"
  | "resume"
  | "salary_floor"
  | "private_notes"
  | "application_history"
  | "career_goals"
  | "location_preferences"
  | "full_database";

export interface ExternalAiSettings {
  enabled: boolean;
  provider: ExternalAiProvider;
  requirePayloadPreview: boolean;
  allowSensitivePayloads: boolean;
  redaction: {
    enabled: boolean;
  };
  logRequestsLocally: boolean;
}

export const DEFAULT_EXTERNAL_AI_SETTINGS: ExternalAiSettings = {
  enabled: false,
  provider: "none",
  requirePayloadPreview: true,
  allowSensitivePayloads: false,
  redaction: {
    enabled: true,
  },
  logRequestsLocally: true,
};

export interface ExternalAiRequest {
  feature: string;
  labels: FeaturePrivacyLabel[];
  dataCategories: ExternalAiDataCategory[];
  payload: Record<string, unknown>;
  previewShown: boolean;
  userApproved: boolean;
  explicitlyIncludedSensitiveData?: boolean;
}

export interface PreparedExternalAiRequest {
  feature: string;
  provider: Exclude<ExternalAiProvider, "none">;
  labels: FeaturePrivacyLabel[];
  dataCategories: ExternalAiDataCategory[];
  payload: Record<string, unknown>;
}

export interface ExternalAiResponse {
  text: string;
  raw?: unknown;
}

export interface ExternalAiRequestLog {
  feature: string;
  provider: Exclude<ExternalAiProvider, "none">;
  timestamp: string;
  labels: FeaturePrivacyLabel[];
  dataCategories: ExternalAiDataCategory[];
}

export interface ExternalAiTransport {
  send(request: PreparedExternalAiRequest): Promise<ExternalAiResponse>;
}

export interface ExternalAiGateway {
  send(request: ExternalAiRequest): Promise<ExternalAiResponse>;
}

export type ExternalAiRequestLogger = (
  entry: ExternalAiRequestLog,
) => void | Promise<void>;

export type ExternalAiGatewayErrorCode =
  | "external_ai_disabled"
  | "provider_not_selected"
  | "transport_missing"
  | "payload_preview_required"
  | "user_approval_required"
  | "full_database_blocked"
  | "sensitive_payload_blocked"
  | "public_data_only_violation";

export class ExternalAiGatewayError extends Error {
  constructor(
    public readonly code: ExternalAiGatewayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExternalAiGatewayError";
  }
}

const sensitiveDataCategories = new Set<ExternalAiDataCategory>([
  "resume",
  "salary_floor",
  "private_notes",
  "application_history",
  "career_goals",
  "location_preferences",
]);

const sensitivePayloadKeys = new Set([
  "applicationHistory",
  "application_history",
  "careerGoals",
  "career_goals",
  "database",
  "fullDatabase",
  "full_database",
  "localDatabase",
  "notes",
  "privateNotes",
  "private_notes",
  "resume",
  "resumeText",
  "resume_text",
  "salaryFloor",
  "salary_floor",
]);

function collectPayloadKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPayloadKeys(item, keys);
    }
    return keys;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    keys.add(key);
    collectPayloadKeys(nestedValue, keys);
  }

  return keys;
}

function hasSensitivePayloadKeys(payload: Record<string, unknown>): boolean {
  return [...collectPayloadKeys(payload)].some((key) => sensitivePayloadKeys.has(key));
}

function hasSensitiveData(request: ExternalAiRequest): boolean {
  return (
    request.labels.includes("Sensitive") ||
    request.dataCategories.some((category) => sensitiveDataCategories.has(category)) ||
    hasSensitivePayloadKeys(request.payload)
  );
}

function validateRequest(
  settings: ExternalAiSettings,
  provider: ExternalAiProvider,
  request: ExternalAiRequest,
  transport?: ExternalAiTransport,
): asserts provider is Exclude<ExternalAiProvider, "none"> {
  if (!settings.enabled) {
    throw new ExternalAiGatewayError(
      "external_ai_disabled",
      "External AI is disabled by default. Enable it before sending data.",
    );
  }

  if (provider === "none") {
    throw new ExternalAiGatewayError(
      "provider_not_selected",
      "External AI provider must be selected before sending data.",
    );
  }

  if (!transport) {
    throw new ExternalAiGatewayError(
      "transport_missing",
      "External AI sending is not set up.",
    );
  }

  if (settings.requirePayloadPreview && !request.previewShown) {
    throw new ExternalAiGatewayError(
      "payload_preview_required",
      "Payload preview is required before any external AI request.",
    );
  }

  if (!request.userApproved) {
    throw new ExternalAiGatewayError(
      "user_approval_required",
      "User approval is required before any external AI request.",
    );
  }

  if (request.dataCategories.includes("full_database")) {
    throw new ExternalAiGatewayError(
      "full_database_blocked",
      "Full database payloads must never be sent to external AI providers.",
    );
  }

  if (request.labels.includes("Public-data only") && hasSensitivePayloadKeys(request.payload)) {
    throw new ExternalAiGatewayError(
      "public_data_only_violation",
      "Public-data-only AI requests cannot include private user data.",
    );
  }

  if (
    hasSensitiveData(request) &&
    (!settings.allowSensitivePayloads || !request.explicitlyIncludedSensitiveData)
  ) {
    throw new ExternalAiGatewayError(
      "sensitive_payload_blocked",
      "Sensitive data requires explicit user selection and sensitive-payload opt-in.",
    );
  }
}

export function createExternalAiGateway(
  settings: ExternalAiSettings = DEFAULT_EXTERNAL_AI_SETTINGS,
  transport?: ExternalAiTransport,
  logRequest: ExternalAiRequestLogger = () => undefined,
): ExternalAiGateway {
  return {
    async send(request: ExternalAiRequest): Promise<ExternalAiResponse> {
      const provider = settings.provider;
      validateRequest(settings, provider, request, transport);
      if (!transport) {
        throw new ExternalAiGatewayError(
          "transport_missing",
          "External AI sending is not set up.",
        );
      }

      const preparedRequest: PreparedExternalAiRequest = {
        feature: request.feature,
        provider,
        labels: request.labels,
        dataCategories: request.dataCategories,
        payload: request.payload,
      };

      const response = await transport.send(preparedRequest);

      if (settings.logRequestsLocally) {
        await logRequest({
          feature: request.feature,
          provider,
          timestamp: new Date().toISOString(),
          labels: request.labels,
          dataCategories: request.dataCategories,
        });
      }

      return response;
    },
  };
}
