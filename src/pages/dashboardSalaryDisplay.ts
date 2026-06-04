import { formatSalaryRange } from "../utils/formatUtils";

export function formatDashboardListedPay(
  salaryMin?: number | null,
  salaryMax?: number | null,
): string {
  return formatSalaryRange(salaryMin, salaryMax) ?? "Not listed";
}
