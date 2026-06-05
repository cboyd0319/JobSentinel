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

export function hasPostingReviewAlert(
  ghostScore: number | null | undefined,
  ghostReasons: string | null | undefined,
): boolean {
  const hasValidScore =
    typeof ghostScore === "number" &&
    Number.isFinite(ghostScore) &&
    ghostScore >= 0 &&
    ghostScore <= 1;

  return (
    (hasValidScore && ghostScore >= GHOST_SCORE_THRESHOLD) ||
    hasPostingEvidenceReviewCue(ghostReasons)
  );
}
