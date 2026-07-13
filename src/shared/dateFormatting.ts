const DATE_NOT_SHOWN = "Date not shown";

function parseDate(date: string): Date | null {
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatRelativeDate(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return DATE_NOT_SHOWN;

  const elapsedMilliseconds = Date.now() - parsed.getTime();
  const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60));
  const elapsedHours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return parsed.toLocaleDateString();
}

export function formatEventDate(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return DATE_NOT_SHOWN;

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatInterviewDate(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return DATE_NOT_SHOWN;

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCompactDateTime(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return DATE_NOT_SHOWN;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getRelativeTimeUntil(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return DATE_NOT_SHOWN;

  const remainingMilliseconds = parsed.getTime() - Date.now();
  const remainingHours = Math.floor(remainingMilliseconds / (1000 * 60 * 60));
  const remainingDays = Math.floor(
    remainingMilliseconds / (1000 * 60 * 60 * 24),
  );

  if (remainingHours < 0) return "Past";
  if (remainingHours < 1) return "< 1 hour";
  if (remainingHours < 24) return `${remainingHours} hours`;
  if (remainingDays === 1) return "Tomorrow";
  return `${remainingDays} days`;
}
