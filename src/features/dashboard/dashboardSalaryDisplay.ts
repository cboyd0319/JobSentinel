/** Adapts shared listed-pay formatting for dashboard comparison rows. */

import { formatJobListedPay, type JobPayInput } from "../../shared/listedPay";

export function formatDashboardListedPay(job: JobPayInput): string {
  return formatJobListedPay(job);
}
