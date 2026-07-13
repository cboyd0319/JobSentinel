export function formatSalaryNumber(salary: number): string {
  return salary >= 1000 ? `$${Math.round(salary / 1000)}k` : `$${salary}`;
}

export function hasMalformedSalaryRangeInput(
  min?: number | null,
  max?: number | null,
): boolean {
  const minProvided = min !== null && min !== undefined;
  const maxProvided = max !== null && max !== undefined;

  if (
    minProvided &&
    (typeof min !== "number" || !Number.isFinite(min) || min < 0)
  ) {
    return true;
  }
  if (
    maxProvided &&
    (typeof max !== "number" || !Number.isFinite(max) || max < 0)
  ) {
    return true;
  }

  const hasMin = typeof min === "number" && Number.isFinite(min) && min > 0;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max > 0;
  return hasMin && hasMax && max < min;
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
): string | null {
  if (hasMalformedSalaryRangeInput(min, max)) return null;

  const hasMin = typeof min === "number" && Number.isFinite(min) && min > 0;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max > 0;

  if (hasMin && hasMax) {
    return `${formatSalaryNumber(min)} - ${formatSalaryNumber(max)}`;
  }
  if (hasMin) return `${formatSalaryNumber(min)}+`;
  if (hasMax) return `Up to ${formatSalaryNumber(max)}`;
  return null;
}

export function truncateJobDescription(
  text: string | null | undefined,
  maxLength = 120,
): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.substring(0, maxLength).trim()}...`;
}
