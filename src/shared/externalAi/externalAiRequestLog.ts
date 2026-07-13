import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "../browserStorage";
import {
  FEATURE_PRIVACY_LABELS,
  type ExternalAiDataCategory,
  type ExternalAiProvider,
  type ExternalAiRequestLog,
  type FeaturePrivacyLabel,
} from "./externalAiTypes";

export const EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY =
  "jobsentinel:external-ai:request-log:v1";

const MAX_EXTERNAL_AI_REQUEST_LOG_ENTRIES = 50;

const externalAiLogProviders: ReadonlySet<ExternalAiProvider> = new Set([
  "open_ai",
  "anthropic",
  "google_gemini",
  "github_copilot",
  "custom",
]);

const externalAiDataCategories: ReadonlySet<ExternalAiDataCategory> = new Set([
  "job_posting",
  "public_metadata",
  "resume",
  "salary_floor",
  "private_notes",
  "application_history",
  "career_goals",
  "location_preferences",
  "full_database",
]);

const featurePrivacyLabels: ReadonlySet<FeaturePrivacyLabel> = new Set([
  ...FEATURE_PRIVACY_LABELS,
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeStringArray<T extends string>(
  value: unknown,
  allowedValues: ReadonlySet<T>,
): T[] | null {
  if (!Array.isArray(value)) return null;

  const normalized: T[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowedValues.has(item as T)) {
      return null;
    }
    normalized.push(item as T);
  }

  return normalized;
}

export function normalizeExternalAiRequestLogEntry(
  value: unknown,
): ExternalAiRequestLog | null {
  if (!isPlainObject(value)) return null;

  const { feature, provider, timestamp, labels, dataCategories } = value;
  if (
    typeof feature !== "string" ||
    !feature.trim() ||
    typeof provider !== "string" ||
    !externalAiLogProviders.has(provider as ExternalAiProvider) ||
    provider === "none" ||
    !isValidTimestamp(timestamp)
  ) {
    return null;
  }

  const normalizedLabels = normalizeStringArray(labels, featurePrivacyLabels);
  const normalizedDataCategories = normalizeStringArray(
    dataCategories,
    externalAiDataCategories,
  );
  if (!normalizedLabels || !normalizedDataCategories) return null;

  return {
    feature,
    provider: provider as Exclude<ExternalAiProvider, "none">,
    timestamp,
    labels: normalizedLabels,
    dataCategories: normalizedDataCategories,
  };
}

export function readExternalAiRequestLog(): ExternalAiRequestLog[] {
  const raw = readStorageValue("local", EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeExternalAiRequestLogEntry)
      .filter((entry): entry is ExternalAiRequestLog => Boolean(entry))
      .slice(0, MAX_EXTERNAL_AI_REQUEST_LOG_ENTRIES);
  } catch {
    return [];
  }
}

export function appendExternalAiRequestLog(
  entry: ExternalAiRequestLog,
): boolean {
  const normalizedEntry = normalizeExternalAiRequestLogEntry(entry);
  if (!normalizedEntry) return false;

  const nextEntries = [
    normalizedEntry,
    ...readExternalAiRequestLog(),
  ].slice(0, MAX_EXTERNAL_AI_REQUEST_LOG_ENTRIES);

  return writeStorageValue(
    "local",
    EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY,
    JSON.stringify(nextEntries),
  );
}

export function clearExternalAiRequestLog(): boolean {
  return removeStorageValue("local", EXTERNAL_AI_REQUEST_LOG_STORAGE_KEY);
}
