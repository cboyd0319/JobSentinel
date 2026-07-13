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
  if (score >= 80) return "text-sentinel-600 dark:text-sentinel-300";
  if (score >= 60) return "text-blue-700 dark:text-info";
  if (score >= 40) return "text-alert-700 dark:text-alert-300";
  return "text-danger";
}

/**
 * Get background color class for a score progress bar
 */
export function getScoreBg(score: number): string {
  if (!isValidScorePercent(score)) return "bg-surface-400";
  if (score >= 80) return "bg-sentinel-500";
  if (score >= 60) return "bg-info";
  if (score >= 40) return "bg-alert-500";
  return "bg-danger";
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
