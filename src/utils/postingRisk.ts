import { GHOST_SCORE_THRESHOLD } from "./constants";
import jobPostingRiskTaxonomy from "../../resources/taxonomies/job-posting-risk.json";

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

const LOW_DETAIL_TITLE_PATTERNS =
  jobPostingRiskTaxonomy.vagueTitlePatterns.map(
    (pattern) => new RegExp(pattern, "i"),
  );
const THIN_DESCRIPTION_PATTERN = new RegExp(
  jobPostingRiskTaxonomy.thinDescriptionPattern,
  "i",
);
const MIN_THIN_DESCRIPTION_LENGTH =
  jobPostingRiskTaxonomy.minThinDescriptionLength;
const SCAM_SIGNAL_PATTERNS = jobPostingRiskTaxonomy.scamSignalPatterns.map(
  (pattern) => new RegExp(pattern, "i"),
);

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
