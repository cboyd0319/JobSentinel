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
 * Get text color class for a score value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get background color class for a score progress bar
 */
export function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Get plain evidence label for a score value.
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Strong evidence";
  if (score >= 80) return "Clear evidence";
  if (score >= 70) return "Some evidence";
  if (score >= 60) return "Mixed evidence";
  if (score >= 40) return "Needs review";
  return "Low evidence";
}
