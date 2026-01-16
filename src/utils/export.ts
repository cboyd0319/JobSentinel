/**
 * CSV Export utilities for JobSentinel
 */

interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  score: number;
  created_at: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  remote?: boolean | null;
}

/**
 * Escape CSV cell values (handles commas, quotes, newlines)
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert jobs array to CSV string
 */
export function jobsToCSV(jobs: Job[]): string {
  const headers = [
    "ID",
    "Title",
    "Company",
    "Location",
    "URL",
    "Source",
    "Score",
    "Remote",
    "Salary Min",
    "Salary Max",
    "Created At",
  ];

  const rows = jobs.map((job) => [
    job.id,
    escapeCSV(job.title),
    escapeCSV(job.company),
    escapeCSV(job.location),
    escapeCSV(job.url),
    escapeCSV(job.source),
    Math.round(job.score * 100) + "%",
    job.remote === true ? "Yes" : job.remote === false ? "No" : "",
    job.salary_min ?? "",
    job.salary_max ?? "",
    new Date(job.created_at).toLocaleDateString("en-US"),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/csv"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export jobs to CSV file and trigger download
 */
export function exportJobsToCSV(jobs: Job[], filename?: string): void {
  const csv = jobsToCSV(jobs);
  const date = new Date().toISOString().split("T")[0];
  const finalFilename = filename || `jobsentinel-export-${date}.csv`;
  downloadFile(csv, finalFilename);
}

/**
 * Export config to JSON file
 */
export function exportConfigToJSON<T>(config: T, filename?: string): void {
  // Remove sensitive data before export
  const sanitized = sanitizeConfigForExport(config);
  const json = JSON.stringify(sanitized, null, 2);
  const date = new Date().toISOString().split("T")[0];
  const finalFilename = filename || `jobsentinel-config-${date}.json`;
  downloadFile(json, finalFilename, "application/json");
}

/**
 * Remove sensitive data from config before export
 */
function sanitizeConfigForExport<T>(config: T): T {
  const sanitized = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  // Remove sensitive fields
  if (sanitized.alerts && typeof sanitized.alerts === "object") {
    const alerts = sanitized.alerts as Record<string, unknown>;
    if (alerts.email && typeof alerts.email === "object") {
      const email = alerts.email as Record<string, unknown>;
      email.smtp_password = "";
    }
  }

  if (sanitized.linkedin && typeof sanitized.linkedin === "object") {
    const linkedin = sanitized.linkedin as Record<string, unknown>;
    linkedin.session_cookie = "";
  }

  return sanitized as T;
}

/**
 * Import config from JSON file
 * Returns parsed config or null if cancelled/invalid
 */
export function importConfigFromJSON<T>(): Promise<T | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as T;
        resolve(parsed);
      } catch {
        resolve(null);
      }
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}
