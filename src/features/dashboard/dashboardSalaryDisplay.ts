import { formatSalaryRange } from "./jobDisplayFormatting";

export function formatDashboardListedPay(
  salaryMin?: number | null,
  salaryMax?: number | null,
): string {
  return formatSalaryRange(salaryMin, salaryMax) ?? "Not listed";
}
