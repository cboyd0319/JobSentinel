import { GHOST_SCORE_THRESHOLD } from "./constants";

interface PostingRiskReason {
  category: "stale" | "repost" | "generic" | "missing_details" | "unrealistic" | "company_behavior";
  description: string;
  weight: number;
  severity: "low" | "medium" | "high";
}

const reviewCueReasonCategories = new Set<PostingRiskReason["category"]>([
  "stale",
  "repost",
]);

const LOW_DETAIL_TITLE_PATTERNS = [
  /^\s*(?:various|multiple)\s+(?:positions|roles|openings)\s*$/i,
  /^\s*(?:general|open)\s+(?:application|position|role|opening)\s*$/i,
  /\btalent\s+pool\b/i,
  /\bfuture\s+opportunities?\b/i,
  /^\s*(?:we'?re|we are)\s+hiring\b/i,
  /^\s*(?:now hiring|hiring now|join our team)\s*$/i,
  /\bjoin\s+(?:our|the)\s+team\b/i,
  /^\s*(?:work\s+from\s+home|remote)\s+(?:job|position|role|opportunity|opening)\s*$/i,
  /^\s*(?:entry\s+level|immediate\s+hire)\s+(?:job|position|role|opportunity|opening)\s*$/i,
] as const;

const THIN_DESCRIPTION_PATTERN = /\b(?:apply|hiring|opportunity|position|role|team)\b/i;
const MIN_THIN_DESCRIPTION_LENGTH = 45;

const SCAM_SIGNAL_PATTERNS = [
  /\b(?:cashier'?s\s+check|fake\s+check|deposit\s+(?:the\s+)?check|mobile\s+deposit)\b/i,
  /\b(?:pay|send|wire|transfer)\b.{0,50}\b(?:money|fee|deposit|gift\s+cards?|funds)\b/i,
  /\b(?:pay|send|wire|transfer|receive)\b.{0,50}\b(?:bitcoin|crypto(?:currency)?|zelle|venmo|cash\s*app|paypal)\b/i,
  /\b(?:buy|purchase|get|send)\b.{0,40}\b(?:gift\s+cards?|prepaid\s+cards?|money\s+orders?)\b/i,
  /\b(?:upfront|application|training|equipment)\b.{0,30}\b(?:fee|payment)\b/i,
  /\b(?:social\s+security\s+number|ssn|bank\s+account|direct\s+deposit|passport|date\s+of\s+birth|driver'?s\s+license)\b.{0,80}\b(?:before|interview|start|offer)\b/i,
  /\b(?:before|prior\s+to)\b.{0,40}\b(?:interview|start|offer)\b.{0,60}\b(?:send|provide|share|submit)\b.{0,50}\b(?:social\s+security\s+number|ssn|bank\s+account|direct\s+deposit|passport|date\s+of\s+birth|driver'?s\s+license)\b/i,
  /\b(?:telegram|whats\s*app|whatsapp|signal)\b.{0,60}\b(?:interview|screening|chat|message)\b/i,
  /\b(?:interview|screening|chat|message)\b.{0,60}\b(?:telegram|whats\s*app|whatsapp|signal)\b/i,
] as const;

function parsePostingRiskReasons(reasonsJson: string | null | undefined): PostingRiskReason[] {
  if (!reasonsJson) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(reasonsJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is PostingRiskReason => {
      if (!value || typeof value !== "object") {
        return false;
      }

      const reason = value as Record<string, unknown>;

      return (
        typeof reason.category === "string" &&
        reviewCueReasonCategories.has(reason.category as PostingRiskReason["category"]) &&
        typeof reason.description === "string" &&
        typeof reason.weight === "number" &&
        Number.isFinite(reason.weight) &&
        typeof reason.severity === "string" &&
        ["low", "medium", "high"].includes(reason.severity)
      );
    });
  } catch {
    return [];
  }
}

export function hasPostingEvidenceReviewCue(
  ghostReasons: string | null | undefined,
): boolean {
  return parsePostingRiskReasons(ghostReasons).length > 0;
}

export function hasLowDetailPostingReviewCue(
  title: string,
  description: string | null | undefined,
): boolean {
  const trimmedTitle = title.trim();
  const trimmedDescription = description?.trim() ?? "";
  const hasBroadTitle = LOW_DETAIL_TITLE_PATTERNS.some((pattern) =>
    pattern.test(trimmedTitle)
  );
  const hasMissingDescription = trimmedDescription.length === 0;
  const hasThinDescription =
    trimmedDescription.length > 0 &&
    trimmedDescription.length < MIN_THIN_DESCRIPTION_LENGTH &&
    THIN_DESCRIPTION_PATTERN.test(trimmedDescription);

  return hasBroadTitle || hasMissingDescription || hasThinDescription;
}

export function hasScamPostingReviewCue(
  description: string | null | undefined,
): boolean {
  const text = description?.trim();
  if (!text) return false;

  return SCAM_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasRepeatedSightingReviewCue(
  timesSeen: number | null | undefined,
): boolean {
  return (
    typeof timesSeen === "number" &&
    Number.isFinite(timesSeen) &&
    timesSeen > 1
  );
}

export function hasPostingReviewAlert(
  ghostScore: number | null | undefined,
  ghostReasons: string | null | undefined,
  title?: string,
  description?: string | null,
  timesSeen?: number | null,
): boolean {
  const hasValidScore =
    typeof ghostScore === "number" &&
    Number.isFinite(ghostScore) &&
    ghostScore >= 0 &&
    ghostScore <= 1;

  return (
    (hasValidScore && ghostScore >= GHOST_SCORE_THRESHOLD) ||
    hasPostingEvidenceReviewCue(ghostReasons) ||
    (title !== undefined && hasLowDetailPostingReviewCue(title, description)) ||
    (description !== undefined && hasScamPostingReviewCue(description)) ||
    hasRepeatedSightingReviewCue(timesSeen)
  );
}
