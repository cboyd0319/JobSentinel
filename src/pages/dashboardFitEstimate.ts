export function formatDashboardFitEstimate(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) {
    return "Not available";
  }

  const percentage = Math.round(score * 100);
  if (score >= 0.9) return `Strong fit (${percentage}%)`;
  if (score >= 0.7) return `Good fit (${percentage}%)`;
  if (score >= 0.5) return `Possible fit (${percentage}%)`;
  return `Needs review (${percentage}%)`;
}
