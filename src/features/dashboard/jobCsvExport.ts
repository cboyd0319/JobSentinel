/** Exports dashboard jobs with formula-safe legacy and native pay evidence. */

import { downloadTextFile } from "../../shared/browserDownload";
import { parseListedPay } from "../../shared/listedPay";
import type { Job } from "./types";

const SPREADSHEET_FORMULA_PREFIX = /^\s*[=+\-@]/;
const JOB_CSV_HEADERS = [
  "Job Number",
  "Title",
  "Company",
  "Location",
  "Job Link",
  "Source",
  "Match",
  "Remote",
  "Salary Min",
  "Salary Max",
  "Saved Date",
  "Salary Currency",
  "Native Pay Minimum",
  "Native Pay Maximum",
  "Native Pay Currency",
  "Native Pay Period",
  "Native Pay Qualifiers",
  "Native Pay Source Text",
];

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const safeValue = SPREADSHEET_FORMULA_PREFIX.test(value)
    ? `'${value}`
    : value;
  if (
    safeValue.includes(",") ||
    safeValue.includes('"') ||
    safeValue.includes("\n")
  ) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function buildJobsCsv(jobs: Job[]): string {
  const rows = jobs.map((job) => {
    const nativePay = parseListedPay(job.listed_pay);
    return [
      job.id,
      escapeCsv(job.title),
      escapeCsv(job.company),
      escapeCsv(job.location),
      escapeCsv(job.url),
      escapeCsv(job.source),
      job.score != null && Number.isFinite(job.score)
        ? `${Math.round(job.score * 100)}%`
        : "N/A",
      job.remote === true ? "Yes" : job.remote === false ? "No" : "",
      job.salary_min ?? "",
      job.salary_max ?? "",
      new Date(job.created_at).toLocaleDateString("en-US"),
      escapeCsv(job.currency),
      nativePay?.min ?? "",
      nativePay?.max ?? "",
      escapeCsv(nativePay?.currency),
      escapeCsv(nativePay?.period),
      escapeCsv(nativePay?.qualifiers.join(",")),
      escapeCsv(nativePay?.raw_text),
    ];
  });

  return [JOB_CSV_HEADERS.join(","), ...rows.map((row) => row.join(","))].join(
    "\n",
  );
}

export function exportJobsToCsv(jobs: Job[], filename?: string): void {
  const date = new Date().toISOString().split("T")[0];
  downloadTextFile(
    buildJobsCsv(jobs),
    filename || `jobsentinel-export-${date}.csv`,
    "text/csv",
  );
}
