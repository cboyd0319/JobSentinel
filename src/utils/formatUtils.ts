/**
 * Formatting utilities for dates, salaries, and other common display values.
 * Centralizes formatting logic to ensure consistency across the app.
 */

/**
 * Format a date string as a relative time (e.g., "2h ago", "3d ago")
 * Falls back to localized date for older dates.
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format a date for display in interview/event context
 */
export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date with time for detailed displays
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a salary number to a compact display (e.g., $120k)
 */
export function formatSalaryNumber(salary: number): string {
  if (salary >= 1000) {
    return `$${Math.round(salary / 1000)}k`;
  }
  return `$${salary}`;
}

/**
 * Format a salary range for display
 */
export function formatSalaryRange(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;

  if (min && max) {
    return `${formatSalaryNumber(min)} - ${formatSalaryNumber(max)}`;
  }
  if (min) {
    return `${formatSalaryNumber(min)}+`;
  }
  if (max) {
    return `Up to ${formatSalaryNumber(max)}`;
  }
  return null;
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength = 120): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + "...";
}

/**
 * Format a number with commas (e.g., 1234 -> "1,234")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a percentage (e.g., 0.75 -> "75%")
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
