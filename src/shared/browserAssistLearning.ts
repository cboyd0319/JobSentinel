export const BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY =
  "jobsentinel.browserAssist.learning.enabled.v1";
export const BROWSER_ASSIST_LEARNING_STORAGE_KEY =
  "jobsentinel.browserAssist.learning.signals.v1";

const MAX_LEARNING_SIGNALS = 50;
const MAX_TEXT_LENGTH = 120;

const POSITIVE_ACTIONS = new Set([
  "applied",
  "saved",
  "tracking",
  "interview",
  "follow_up",
  "reminder",
]);
const NEGATIVE_ACTIONS = new Set(["not_interested"]);

export interface BrowserAssistLearningSignal {
  source: "linkedin-workbench" | "browser-import";
  action: string;
  title?: string;
  company?: string;
  recordedAt: string;
}

export interface BrowserAssistLearningSummary {
  totalSignals: number;
  positiveSignals: number;
  negativeSignals: number;
  suggestedTitles: string[];
  suggestedCompanies: string[];
  avoidTitles: string[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readBrowserAssistLearningEnabled(
  storage = browserStorage(),
): boolean {
  if (!storage) return false;
  return storage.getItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY) === "true";
}

export function writeBrowserAssistLearningEnabled(
  enabled: boolean,
  storage = browserStorage(),
) {
  if (!storage) return;

  if (enabled) {
    storage.setItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY, "true");
  } else {
    storage.removeItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY);
  }
}

export function readBrowserAssistLearningSignals(
  storage = browserStorage(),
): BrowserAssistLearningSignal[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBrowserAssistLearningSignal).slice(0, MAX_LEARNING_SIGNALS);
  } catch {
    return [];
  }
}

export function recordBrowserAssistLearningSignal(
  signal: BrowserAssistLearningSignal,
  storage = browserStorage(),
): BrowserAssistLearningSummary {
  const sanitized = sanitizeBrowserAssistLearningSignal(signal);
  const existing = readBrowserAssistLearningSignals(storage);
  const next = [sanitized, ...existing].slice(0, MAX_LEARNING_SIGNALS);
  if (storage) {
    storage.setItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY, JSON.stringify(next));
  }
  return summarizeBrowserAssistLearningSignals(next);
}

export function clearBrowserAssistLearningSignals(storage = browserStorage()) {
  if (storage) {
    storage.removeItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
  }
  return summarizeBrowserAssistLearningSignals([]);
}

export function summarizeBrowserAssistLearningSignals(
  signals: BrowserAssistLearningSignal[],
): BrowserAssistLearningSummary {
  const positive = signals.filter((signal) => POSITIVE_ACTIONS.has(signal.action));
  const negative = signals.filter((signal) => NEGATIVE_ACTIONS.has(signal.action));

  return {
    totalSignals: signals.length,
    positiveSignals: positive.length,
    negativeSignals: negative.length,
    suggestedTitles: topValues(positive.map((signal) => signal.title)),
    suggestedCompanies: topValues(positive.map((signal) => signal.company)),
    avoidTitles: topValues(negative.map((signal) => signal.title)),
  };
}

function sanitizeBrowserAssistLearningSignal(
  signal: BrowserAssistLearningSignal,
): BrowserAssistLearningSignal {
  return {
    source:
      signal.source === "browser-import" ? "browser-import" : "linkedin-workbench",
    action: cleanText(signal.action) || "unknown",
    title: cleanText(signal.title),
    company: cleanText(signal.company),
    recordedAt: cleanText(signal.recordedAt) || new Date().toISOString(),
  };
}

function topValues(values: Array<string | undefined>): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const cleaned = cleanText(value);
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount === leftCount
        ? leftValue.localeCompare(rightValue)
        : rightCount - leftCount,
    )
    .slice(0, 3)
    .map(([value]) => value);
}

function isBrowserAssistLearningSignal(
  value: unknown,
): value is BrowserAssistLearningSignal {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.source === "linkedin-workbench" || record.source === "browser-import") &&
    typeof record.action === "string" &&
    (record.title === undefined || typeof record.title === "string") &&
    (record.company === undefined || typeof record.company === "string") &&
    typeof record.recordedAt === "string"
  );
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? [...cleaned].slice(0, MAX_TEXT_LENGTH).join("") : undefined;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
