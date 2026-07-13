import {
  COMMON_SCREENING_PATTERNS,
  LEGACY_SCREENING_PATTERNS,
  PLAIN_SCREENING_PATTERN_ALIASES,
} from "../../shared/applicationScreeningTaxonomy";

export interface ScreeningAnswer {
  id: number;
  questionPattern: string;
  answer: string;
  answerType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Learning fields (added v2.6.4)
  timesUsed?: number;
  timesModified?: number;
  confidenceScore?: number;
  lastUsedAt?: string | null;
}

export interface ScreeningAnswersFormProps {
  onSaved?: () => void;
}

export const COMMON_PATTERNS = COMMON_SCREENING_PATTERNS;

function normalizePatternKey(pattern: string) {
  return pattern.trim().toLowerCase();
}

function getPlainPatternAlias(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  return PLAIN_SCREENING_PATTERN_ALIASES.find((item) =>
    item.patterns.some((alias) => alias.toLowerCase() === normalizedPattern)
  );
}

function looksLikeMatcherPattern(pattern: string) {
  return /(\(\?[a-z-]*\)|\\[dDsSwWbB]|\.\*|\.\+|\[[^\]]+\]|\([^)]*\|[^)]*\)|[|^$]|\{\d+(,\d*)?\})/.test(pattern);
}

// Format relative time (e.g., "2 days ago", "1 week ago")
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getQuestionMatchLabel(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  const common = COMMON_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (common) return common.label;

  const legacy = LEGACY_SCREENING_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (legacy) return legacy.label;

  const plainAlias = getPlainPatternAlias(pattern);
  if (plainAlias) return plainAlias.label;
  return looksLikeMatcherPattern(pattern) ? "Custom screening question" : pattern.trim();
}

export function getEditableQuestionPattern(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  const legacy = LEGACY_SCREENING_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (legacy) return legacy.editablePattern;

  const plainAlias = getPlainPatternAlias(pattern);
  return plainAlias?.editablePattern ?? pattern.trim();
}

export function getPersistedQuestionPattern(currentPattern: string, originalPattern: string | null) {
  const trimmedPattern = currentPattern.trim();
  if (!originalPattern) return trimmedPattern;

  return normalizePatternKey(trimmedPattern) === normalizePatternKey(getEditableQuestionPattern(originalPattern))
    ? originalPattern
    : trimmedPattern;
}

export function answerMatchesCommonPattern(answerPattern: string, commonPattern: (typeof COMMON_PATTERNS)[number]) {
  const normalizedAnswerPattern = normalizePatternKey(answerPattern);
  return (
    normalizedAnswerPattern === commonPattern.pattern.toLowerCase() ||
    getQuestionMatchLabel(answerPattern).toLowerCase() === commonPattern.label.toLowerCase()
  );
}

export function getConfidenceLabel(score?: number) {
  if (score === undefined || score <= 0) return null;
  if (score >= 0.8) return "Usually matches";
  if (score >= 0.5) return "Review before using";
  return "Needs review";
}

export function getModifiedUseLabel(timesModified?: number, timesUsed?: number) {
  if (!timesModified || !timesUsed) return null;
  const ratio = timesModified / timesUsed;
  if (ratio >= 0.5) return "Often edited";
  return "Sometimes edited";
}
