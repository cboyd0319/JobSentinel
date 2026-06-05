import {
  readStorageValue,
  removeStorageValue,
  writeStorageValue,
} from "./browserStorage";

export interface StoredResumeJobContext {
  timestamp: number;
  description: string;
}

export const RESUME_JOB_CONTEXT_KEY = "jobContext";
export const RESUME_JOB_CONTEXT_TTL_MS = 24 * 60 * 60 * 1_000;

function isStoredResumeJobContext(value: unknown): value is StoredResumeJobContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.description === "string" &&
    candidate.description.trim().length > 0
  );
}

function parseStoredResumeJobContext(
  value: string | null,
  now = Date.now(),
): StoredResumeJobContext | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isStoredResumeJobContext(parsed)) {
      return null;
    }

    if (now - parsed.timestamp >= RESUME_JOB_CONTEXT_TTL_MS) {
      return null;
    }

    return {
      timestamp: parsed.timestamp,
      description: parsed.description.trim(),
    };
  } catch {
    return null;
  }
}

export function readStoredResumeJobContext(
  now = Date.now(),
): StoredResumeJobContext | null {
  const stored = readStorageValue("session", RESUME_JOB_CONTEXT_KEY);
  const context = parseStoredResumeJobContext(stored, now);

  if (stored !== null && context === null) {
    removeStorageValue("session", RESUME_JOB_CONTEXT_KEY);
  }

  return context;
}

export function hasStoredResumeJobContext(now = Date.now()): boolean {
  return readStoredResumeJobContext(now) !== null;
}

export function writeStoredResumeJobContext(
  description: string,
  timestamp = Date.now(),
): boolean {
  const trimmedDescription = description.trim();
  if (!trimmedDescription) {
    return false;
  }

  return writeStorageValue(
    "session",
    RESUME_JOB_CONTEXT_KEY,
    JSON.stringify({
      timestamp,
      description: trimmedDescription,
    }),
  );
}

export function clearStoredResumeJobContext(): boolean {
  return removeStorageValue("session", RESUME_JOB_CONTEXT_KEY);
}
