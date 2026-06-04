/**
 * Score utilities for resume readability analysis.
 * Provides consistent color coding and plain evidence labels.
 */

/**
 * Convert a backend score fraction (0-1) to a display percentage (0-100).
 */
export function scoreFractionToPercent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

/**
 * Validate a display score percentage from local resume analysis.
 */
export function isValidScorePercent(score: unknown): score is number {
  return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
}

/**
 * Get a safe numeric score for bars and progress rings.
 */
export function getScoreProgressPercent(score: number): number {
  return isValidScorePercent(score) ? score : 0;
}

/**
 * Get plain display text for a numeric score.
 */
export function getScoreDisplayValue(score: number): string {
  return isValidScorePercent(score) ? String(Math.round(score)) : "--";
}

/**
 * Get text color class for a score value
 */
export function getScoreColor(score: number): string {
  if (!isValidScorePercent(score)) return "text-surface-500 dark:text-surface-400";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get background color class for a score progress bar
 */
export function getScoreBg(score: number): string {
  if (!isValidScorePercent(score)) return "bg-surface-400";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Get plain evidence label for a score value.
 */
export function getScoreLabel(score: number): string {
  if (!isValidScorePercent(score)) return "Score not shown";
  if (score >= 90) return "Strong evidence";
  if (score >= 80) return "Clear evidence";
  if (score >= 70) return "Some evidence";
  if (score >= 60) return "Mixed evidence";
  if (score >= 40) return "Needs review";
  return "Low evidence";
}
