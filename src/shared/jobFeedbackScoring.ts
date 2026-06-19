export const JOB_FEEDBACK_SCORING_STORAGE_KEY =
  "jobsentinel.jobFeedback.scoring.v1";

const MAX_FEEDBACK_SIGNALS = 200;
const MAX_TEXT_LENGTH = 120;
const USEFUL_SCORE_DELTA = 0.05;
const NOT_USEFUL_SCORE_DELTA = -0.12;

export type JobFeedbackVerdict = "useful" | "not_useful";

export interface JobFeedbackIdentity {
  id: number;
  hash?: string;
  url?: string;
}

export interface JobFeedbackSignal {
  jobKey: string;
  verdict: JobFeedbackVerdict;
  title?: string;
  company?: string;
  recordedAt: string;
}

export interface JobFeedbackScoreAdjustment {
  score: number;
  delta: number;
  label: string;
  description: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getJobFeedbackKey(identity: JobFeedbackIdentity): string {
  const cleanHash = cleanText(identity.hash);
  if (cleanHash) return `hash:${cleanHash}`;
  return `id:${identity.id}`;
}

export function readJobFeedbackSignal(
  jobKey: string,
  storage = browserStorage(),
): JobFeedbackSignal | null {
  const signals = readJobFeedbackSignals(storage);
  return signals[jobKey] ?? null;
}

export function writeJobFeedbackSignal(
  signal: JobFeedbackSignal,
  storage = browserStorage(),
): JobFeedbackSignal {
  const sanitized = sanitizeJobFeedbackSignal(signal);
  const signals = readJobFeedbackSignals(storage);
  signals[sanitized.jobKey] = sanitized;
  writeJobFeedbackSignals(signals, storage);
  return sanitized;
}

export function clearJobFeedbackSignal(
  jobKey: string,
  storage = browserStorage(),
) {
  const signals = readJobFeedbackSignals(storage);
  delete signals[jobKey];
  writeJobFeedbackSignals(signals, storage);
}

export function applyJobFeedbackScoreAdjustment(
  score: number,
  feedback: JobFeedbackSignal | null,
): JobFeedbackScoreAdjustment | null {
  if (!feedback || !Number.isFinite(score)) return null;

  if (feedback.verdict === "useful") {
    return {
      score: clampScore(score + USEFUL_SCORE_DELTA),
      delta: USEFUL_SCORE_DELTA,
      label: "Raised by your feedback",
      description:
        "This local fit estimate was raised because you marked this job useful. It does not predict employer intent.",
    };
  }

  return {
    score: clampScore(score + NOT_USEFUL_SCORE_DELTA),
    delta: NOT_USEFUL_SCORE_DELTA,
    label: "Lowered by your feedback",
    description:
      "This local fit estimate was lowered because you marked this job not for me. It does not predict employer intent.",
  };
}

function readJobFeedbackSignals(
  storage = browserStorage(),
): Record<string, JobFeedbackSignal> {
  if (!storage) return {};

  try {
    const raw = storage.getItem(JOB_FEEDBACK_SCORING_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const signals: Record<string, JobFeedbackSignal> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key.length > 0 && isJobFeedbackSignal(value)) {
        signals[key] = value;
      }
    }
    return signals;
  } catch {
    return {};
  }
}

function writeJobFeedbackSignals(
  signals: Record<string, JobFeedbackSignal>,
  storage = browserStorage(),
) {
  if (!storage) return;

  const entries = Object.entries(signals)
    .sort(([, left], [, right]) => right.recordedAt.localeCompare(left.recordedAt))
    .slice(0, MAX_FEEDBACK_SIGNALS);

  if (entries.length === 0) {
    storage.removeItem(JOB_FEEDBACK_SCORING_STORAGE_KEY);
    return;
  }

  storage.setItem(
    JOB_FEEDBACK_SCORING_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(entries)),
  );
}

function sanitizeJobFeedbackSignal(signal: JobFeedbackSignal): JobFeedbackSignal {
  return {
    jobKey: cleanText(signal.jobKey) || "unknown",
    verdict: signal.verdict === "useful" ? "useful" : "not_useful",
    title: cleanText(signal.title),
    company: cleanText(signal.company),
    recordedAt: cleanText(signal.recordedAt) || new Date().toISOString(),
  };
}

function isJobFeedbackSignal(value: unknown): value is JobFeedbackSignal {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.jobKey === "string" &&
    (record.verdict === "useful" || record.verdict === "not_useful") &&
    (record.title === undefined || typeof record.title === "string") &&
    (record.company === undefined || typeof record.company === "string") &&
    typeof record.recordedAt === "string"
  );
}

function clampScore(score: number): number {
  const clamped = Math.min(1, Math.max(0, score));
  return Math.round(clamped * 100) / 100;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? [...cleaned].slice(0, MAX_TEXT_LENGTH).join("") : undefined;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
