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
  redactedPayload?: Record<string, unknown>;
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
  | "redacted_payload_required"
  | "unclassified_payload_key"
  | "job_posting_prompt_injection_blocked"
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

const classifiedPayloadKeysByCategory: Record<ExternalAiDataCategory, Set<string>> = {
  job_posting: new Set([
    "benefits",
    "company",
    "compensation",
    "department",
    "description",
    "employmentType",
    "jobDescription",
    "jobType",
    "location",
    "qualifications",
    "requirements",
    "responsibilities",
    "role",
    "salaryRange",
    "sourceUrl",
    "title",
  ]),
  public_metadata: new Set([
    "ats",
    "atsProvider",
    "companyUrl",
    "externalId",
    "firstSeenAt",
    "isOfficialSource",
    "jobId",
    "lastSeenAt",
    "metadata",
    "postedAt",
    "postingUrl",
    "source",
    "sourceUrl",
    "url",
    "verifiedOnCompanySite",
  ]),
  resume: new Set(["resume", "resumeText", "resume_text"]),
  salary_floor: new Set(["salaryFloor", "salary_floor"]),
  private_notes: new Set(["notes", "privateNotes", "private_notes"]),
  application_history: new Set(["applicationHistory", "application_history"]),
  career_goals: new Set(["careerGoals", "career_goals"]),
  location_preferences: new Set(["locationPreferences", "location_preferences"]),
  full_database: new Set([
    "database",
    "fullDatabase",
    "full_database",
    "localDatabase",
  ]),
};

const jobPostingPromptTextKeys = new Set([
  "benefits",
  "compensation",
  "description",
  "jobDescription",
  "qualifications",
  "requirements",
  "responsibilities",
]);

const promptLikeJobPostingPhrases = [
  "ignore previous instructions",
  "ignore all previous instructions",
  "ignroe previous instructions",
  "ignore previous instructons",
  "ignore prevous instructions",
  "disregard previous instructions",
  "disregard previous instructons",
  "override instructions",
  "system prompt",
  "developer message",
  "prompt injection",
  "ignore the job description",
  "do not follow the job description",
  "instruction to recruiter software",
  "for ai screeners",
];

const zeroWidthCharacters = new Set([
  "\u200B",
  "\u200C",
  "\u200D",
  "\u2060",
  "\uFEFF",
]);

const hiddenMarkupPatterns = [
  /<!--[\s\S]*?-->/i,
  /<meta\b[^>]*(?:keywords|description|content)\b/i,
  /style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0)/i,
  /\\(?:color|textcolor)\s*\{\s*(?:white|transparent|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))\s*\}/i,
];

const base64LikePattern = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;
const hexLikePattern = /\b(?:0x)?[0-9a-fA-F]{32,}\b/g;

function collectClassifiedPayloadKeys(): Set<string> {
  const keys = new Set<string>();

  for (const category of Object.keys(
    classifiedPayloadKeysByCategory,
  ) as ExternalAiDataCategory[]) {
    for (const key of classifiedPayloadKeysByCategory[category]) {
      keys.add(key);
    }
  }

  return keys;
}

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

function findUnclassifiedPayloadKey(
  payload: Record<string, unknown>,
): string | undefined {
  const classifiedKeys = collectClassifiedPayloadKeys();

  return [...collectPayloadKeys(payload)].find((key) => !classifiedKeys.has(key));
}

function textHasPromptLikeJobPostingContent(text: string, decodeDepth = 0): boolean {
  if (text.split("").some((char) => zeroWidthCharacters.has(char))) {
    return true;
  }

  if (hiddenMarkupPatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const lower = text.toLowerCase();
  if (promptLikeJobPostingPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  if (decodeDepth > 0) {
    return false;
  }

  return decodedCandidateText(text).some((decoded) =>
    textHasPromptLikeJobPostingContent(decoded, decodeDepth + 1),
  );
}

function decodedCandidateText(text: string): string[] {
  const decoded: string[] = [];

  for (const match of text.matchAll(base64LikePattern)) {
    const value = decodeBase64Text(match[0]);
    if (value) {
      decoded.push(value);
    }
  }

  for (const match of text.matchAll(hexLikePattern)) {
    const value = decodeHexText(match[0]);
    if (value) {
      decoded.push(value);
    }
  }

  return decoded;
}

function decodeBase64Text(value: string): string | undefined {
  try {
    const decoded = atob(value);
    return mostlyPrintable(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function decodeHexText(value: string): string | undefined {
  const normalized = value.replace(/^0x/i, "");
  if (normalized.length % 2 !== 0) {
    return undefined;
  }

  const chars: string[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    chars.push(String.fromCharCode(Number.parseInt(normalized.slice(index, index + 2), 16)));
  }

  const decoded = chars.join("");
  return mostlyPrintable(decoded) ? decoded : undefined;
}

function mostlyPrintable(value: string): boolean {
  if (value.length < 8) {
    return false;
  }

  const printable = [...value].filter((char) => /[\t\n\r -~]/.test(char)).length;
  return printable / value.length >= 0.85;
}

function valueHasPromptLikeJobPostingContent(value: unknown): boolean {
  if (typeof value === "string") {
    return textHasPromptLikeJobPostingContent(value);
  }

  if (Array.isArray(value)) {
    return value.some(valueHasPromptLikeJobPostingContent);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).some(valueHasPromptLikeJobPostingContent);
}

function hasPromptLikeJobPostingContent(payload: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(payload)) {
    if (
      jobPostingPromptTextKeys.has(key) &&
      valueHasPromptLikeJobPostingContent(value)
    ) {
      return true;
    }

    if (
      value &&
      typeof value === "object" &&
      hasPromptLikeJobPostingContent(value as Record<string, unknown>)
    ) {
      return true;
    }
  }

  return false;
}

function getOutgoingPayload(
  settings: ExternalAiSettings,
  request: ExternalAiRequest,
): Record<string, unknown> {
  if (!settings.redaction.enabled) {
    return request.payload;
  }

  if (!request.redactedPayload) {
    throw new ExternalAiGatewayError(
      "redacted_payload_required",
      "Review the details that would be sent before using outside AI.",
    );
  }

  return request.redactedPayload;
}

function hasSensitiveData(
  request: ExternalAiRequest,
  outgoingPayload: Record<string, unknown>,
): boolean {
  return (
    request.labels.includes("Sensitive") ||
    request.dataCategories.some((category) => sensitiveDataCategories.has(category)) ||
    hasSensitivePayloadKeys(outgoingPayload)
  );
}

function validateRequest(
  settings: ExternalAiSettings,
  provider: ExternalAiProvider,
  request: ExternalAiRequest,
  transport?: ExternalAiTransport,
): Record<string, unknown> {
  if (!settings.enabled) {
    throw new ExternalAiGatewayError(
      "external_ai_disabled",
      "Outside AI is off. Turn it on only after reviewing what will be sent.",
    );
  }

  if (provider === "none") {
    throw new ExternalAiGatewayError(
      "provider_not_selected",
      "Choose the outside AI service before sending anything.",
    );
  }

  if (!transport) {
    throw new ExternalAiGatewayError(
      "transport_missing",
      "Outside AI sending is not set up.",
    );
  }

  if (settings.requirePayloadPreview && !request.previewShown) {
    throw new ExternalAiGatewayError(
      "payload_preview_required",
      "Review the details that would be sent before continuing.",
    );
  }

  if (!request.userApproved) {
    throw new ExternalAiGatewayError(
      "user_approval_required",
      "Approve sending these details before continuing.",
    );
  }

  if (request.dataCategories.includes("full_database")) {
    throw new ExternalAiGatewayError(
      "full_database_blocked",
      "JobSentinel will not send all saved job data to outside AI.",
    );
  }

  const outgoingPayload = getOutgoingPayload(settings, request);
  const unclassifiedRawKey = findUnclassifiedPayloadKey(request.payload);
  const unclassifiedOutgoingKey = findUnclassifiedPayloadKey(outgoingPayload);
  const unclassifiedKey = unclassifiedRawKey ?? unclassifiedOutgoingKey;

  if (unclassifiedKey) {
    throw new ExternalAiGatewayError(
      "unclassified_payload_key",
      "Outside AI details include something JobSentinel has not reviewed for sharing.",
    );
  }

  if (
    request.dataCategories.includes("job_posting") &&
    hasPromptLikeJobPostingContent(outgoingPayload)
  ) {
    throw new ExternalAiGatewayError(
      "job_posting_prompt_injection_blocked",
      "The job posting includes instructions aimed at AI tools. Keep this review local or remove those instructions before sending.",
    );
  }

  if (request.labels.includes("Public-data only") && hasSensitivePayloadKeys(outgoingPayload)) {
    throw new ExternalAiGatewayError(
      "public_data_only_violation",
      "JobSentinel can send only public job-posting details here.",
    );
  }

  if (
    hasSensitiveData(request, outgoingPayload) &&
    (!settings.allowSensitivePayloads || !request.explicitlyIncludedSensitiveData)
  ) {
    throw new ExternalAiGatewayError(
      "sensitive_payload_blocked",
      "Private details stay local unless you choose exactly what to send and turn on sharing for private details.",
    );
  }

  return outgoingPayload;
}

export function createExternalAiGateway(
  settings: ExternalAiSettings = DEFAULT_EXTERNAL_AI_SETTINGS,
  transport?: ExternalAiTransport,
  logRequest: ExternalAiRequestLogger = () => undefined,
): ExternalAiGateway {
  return {
    async send(request: ExternalAiRequest): Promise<ExternalAiResponse> {
      const provider = settings.provider;
      const outgoingPayload = validateRequest(settings, provider, request, transport);
      if (provider === "none") {
        throw new ExternalAiGatewayError(
          "provider_not_selected",
          "Choose the outside AI service before sending anything.",
        );
      }
      if (!transport) {
        throw new ExternalAiGatewayError(
          "transport_missing",
          "Outside AI sending is not set up.",
        );
      }

      const preparedRequest: PreparedExternalAiRequest = {
        feature: request.feature,
        provider,
        labels: request.labels,
        dataCategories: request.dataCategories,
        payload: outgoingPayload,
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
