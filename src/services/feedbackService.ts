import { invoke } from "@tauri-apps/api/core";

export type FeedbackCategory = "bug" | "feature" | "question";

export interface SystemInfo {
  app_version: string;
  platform: string;
  os_version: string;
  arch: string;
}

export interface ConfigSummary {
  scrapers_enabled: number;
  keywords_count: number;
  has_location_prefs: boolean;
  has_salary_prefs: boolean;
  has_company_blocklist: boolean;
  has_company_allowlist: boolean;
  notifications_configured: number;
  has_resume: boolean;
}

export interface DebugEvent {
  time: string;
  event: string;
  details?: Record<string, unknown>;
}

export interface FeedbackReport {
  category: FeedbackCategory;
  description: string;
  system_info: SystemInfo;
  config_summary: ConfigSummary;
  debug_events: DebugEvent[];
  timestamp: string;
}

/**
 * Get system information for feedback report.
 * Data is anonymized by the backend before being returned.
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>("get_system_info");
}

/**
 * Get configuration summary for feedback report.
 * Only counts and boolean flags, no actual values.
 */
export async function getConfigSummary(): Promise<ConfigSummary> {
  return await invoke<ConfigSummary>("get_config_summary");
}

/**
 * Get debug log events for feedback report.
 * Events are anonymized by the backend.
 */
export async function getDebugLog(): Promise<DebugEvent[]> {
  return await invoke<DebugEvent[]>("get_debug_log");
}

/**
 * Generate feedback report and save to file.
 * Opens native file save dialog.
 *
 * @returns Path to saved file, or null if cancelled
 */
export async function saveFeedbackReport(
  category: FeedbackCategory,
  description: string,
  includeDebugInfo: boolean
): Promise<string | null> {
  return await invoke<string | null>("save_feedback_report", {
    category,
    description,
    includeDebugInfo,
  });
}

/**
 * Open GitHub Issues with pre-filled template.
 * Copies debug info to clipboard if included.
 */
export async function openGitHubIssue(
  category: FeedbackCategory,
  _description: string,
  debugInfo: string | null
): Promise<void> {
  // Copy debug info to clipboard if included
  if (debugInfo) {
    try {
      await navigator.clipboard.writeText(debugInfo);
    } catch (error) {
      console.error("Failed to copy debug info to clipboard:", error);
      // Non-fatal - user can still open issue
    }
  }

  // Build GitHub issue URL
  const template = category === "bug"
    ? "bug_report.yml"
    : category === "feature"
    ? "feature_request.yml"
    : "question.yml";

  const params = new URLSearchParams({ template });
  const url = `https://github.com/cboyd0319/JobSentinel/issues/new?${params}`;

  // Open in browser via Tauri
  await invoke("open_url", { url });
}

/**
 * Open Google Drive feedback folder.
 */
export async function openGoogleDriveFeedbackFolder(): Promise<void> {
  const url = "https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo";
  await invoke("open_url", { url });
}

/**
 * Reveal saved file in native file explorer.
 */
export async function revealInFileExplorer(path: string): Promise<void> {
  await invoke("reveal_in_file_explorer", { path });
}

/**
 * Format debug info as text for clipboard/preview.
 */
export function formatDebugInfo(
  systemInfo: SystemInfo,
  configSummary: ConfigSummary,
  debugEvents: DebugEvent[]
): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════",
    "SYSTEM INFORMATION (anonymized)",
    "═══════════════════════════════════════════════════════════",
    "",
    `App Version: ${systemInfo.app_version}`,
    `Platform: ${systemInfo.platform}`,
    `OS Version: ${systemInfo.os_version}`,
    `Architecture: ${systemInfo.arch}`,
    "",
    "───────────────────────────────────────────────────────────",
    "CONFIGURATION SUMMARY (anonymized - no actual values)",
    "───────────────────────────────────────────────────────────",
    "",
    `Scrapers enabled: ${configSummary.scrapers_enabled}`,
    `Search keywords configured: ${configSummary.keywords_count}`,
    `Location preferences: ${configSummary.has_location_prefs ? "configured" : "not configured"}`,
    `Salary preferences: ${configSummary.has_salary_prefs ? "configured" : "not configured"}`,
    `Company blocklist: ${configSummary.has_company_blocklist ? "configured" : "not configured"}`,
    `Company allowlist: ${configSummary.has_company_allowlist ? "configured" : "not configured"}`,
    `Notifications: ${configSummary.notifications_configured} configured`,
    `Resume: ${configSummary.has_resume ? "uploaded" : "not uploaded"}`,
    "",
  ];

  if (debugEvents.length > 0) {
    lines.push(
      "───────────────────────────────────────────────────────────",
      "RECENT ACTIVITY LOG (anonymized)",
      "───────────────────────────────────────────────────────────",
      "",
      ...debugEvents.map(event => {
        const details = event.details
          ? ` - ${JSON.stringify(event.details)}`
          : "";
        return `[${event.time}] ${event.event}${details}`;
      }),
      ""
    );
  }

  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}
