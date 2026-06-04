const DATE_NOT_SHOWN = "Date not shown";

export function formatDashboardPostedDate(dateValue: string): string {
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) {
    return DATE_NOT_SHOWN;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
