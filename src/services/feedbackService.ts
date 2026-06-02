import { invoke } from "@tauri-apps/api/core";
import { logError } from "../utils/errorUtils";
import {
  errorReporter,
  sanitizeContext,
  sanitizeTextForStorage,
  type ErrorReport,
} from "../utils/errorReporting";

export type FeedbackCategory = "bug" | "feature" | "question";

export interface SystemInfo {
  app_version: string;
  platform: string;
  os_version: string;
  architecture: string;
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

interface RawDebugEvent {
  timestamp: string;
  event: Record<string, unknown> & { type?: string };
}

export interface FeedbackReport {
  category: FeedbackCategory;
  description: string;
  system_info: SystemInfo;
  config_summary: ConfigSummary;
  debug_events: DebugEvent[];
  timestamp: string;
}

export interface SavedFeedbackFile {
  fileName: string;
  revealToken: string;
}

export interface DebugReportCopyResult {
  content: string;
  copied: boolean;
  errorCount: number;
}

const DEBUG_REPORT_DESCRIPTION =
  "User generated a safe support report from JobSentinel.";
const MAX_FRONTEND_ERRORS_IN_REPORT = 20;
const MAX_DEBUG_DETAIL_LENGTH = 120;

const DEBUG_DETAIL_LABELS: Record<string, string> = {
  command: "Action",
  event: "App action",
  reason: "Reason",
  source: "Source",
  status: "Status",
  success: "Result",
  type: "Type",
};

const DEBUG_EVENT_LABELS: Record<string, string> = {
  AppStarted: "App opened",
  CommandInvoked: "App action",
  ErrorOccurred: "App problem",
  FeatureUsed: "Feature used",
  ScraperRun: "Job source checked",
  ViewNavigated: "Screen changed",
};

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
  const events = await invoke<RawDebugEvent[]>("get_debug_log_events");
  return events.map(({ timestamp, event }) => {
    const { type, ...details } = event;
    return {
      time: timestamp,
      event: typeof type === "string" ? type : "UnknownEvent",
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  });
}

/**
 * Generate feedback report and save to file.
 * Opens native file save dialog.
 *
 * @returns Saved file metadata, or null if cancelled
 */
export async function saveFeedbackReport(
  category: FeedbackCategory,
  description: string,
  includeDebugInfo: boolean
): Promise<SavedFeedbackFile | null> {
  const content = await invoke<string>("generate_feedback_report", {
    category,
    description,
    includeDebugInfo,
  });
  const suggestedFilename = await invoke<string>("get_feedback_filename");

  return await invoke<SavedFeedbackFile | null>("save_feedback_file", {
    content,
    suggestedFilename,
  });
}

function formatFrontendErrorLog(errors: ErrorReport[]): string {
  const lines = [
    "RECENT APP PROBLEMS (private details removed)",
    "Removed before sharing: local file paths, links, sign-in tokens, cookies, connection links, email addresses, salary floors, resume text, private notes, and application history.",
    "",
  ];

  if (errors.length === 0) {
    lines.push("No recent app problems.", "");
    return lines.join("\n");
  }

  for (const error of errors.slice(0, MAX_FRONTEND_ERRORS_IN_REPORT)) {
    lines.push(
      `- Time: ${sanitizeTextForStorage(error.timestamp)}`,
      `  Problem type: ${sanitizeTextForStorage(error.type)}`,
      `  Message: ${sanitizeTextForStorage(error.message)}`,
    );

    if (error.stack) {
      lines.push(`  Support-only details: ${sanitizeTextForStorage(error.stack)}`);
    }

    if (error.componentStack) {
      lines.push(
        `  Screen details: ${sanitizeTextForStorage(error.componentStack)}`
      );
    }

    if (error.context && Object.keys(error.context).length > 0) {
      const context = sanitizeContext(error.context);
      lines.push(
        `  Extra safe details: ${sanitizeTextForStorage(JSON.stringify(context, null, 2))}`
      );
    }

    lines.push("");
  }

  if (errors.length > MAX_FRONTEND_ERRORS_IN_REPORT) {
    lines.push(
      `${errors.length - MAX_FRONTEND_ERRORS_IN_REPORT} older app problems left out.`,
      ""
    );
  }

  return lines.join("\n");
}

function formatDebugDetailValue(key: string, value: unknown): string | null {
  if (typeof value === "boolean") {
    if (key === "success") {
      return value ? "succeeded" : "failed";
    }
    return value ? "yes" : "no";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === "string") {
    const sanitized =
      key === "command" ||
      key === "event" ||
      key === "feature" ||
      key === "source" ||
      key === "type"
        ? formatDebugLabel(value)
        : sanitizeTextForStorage(value);
    return sanitized.length > MAX_DEBUG_DETAIL_LENGTH
      ? `${sanitized.slice(0, MAX_DEBUG_DETAIL_LENGTH)}...`
      : sanitized;
  }

  if (value === null || typeof value === "undefined") {
    return null;
  }

  return "details summarized";
}

function formatDebugDetailLabel(key: string): string {
  return DEBUG_DETAIL_LABELS[key] ?? key.replace(/[_-]+/g, " ");
}

export function formatDebugEventName(event: string): string {
  return DEBUG_EVENT_LABELS[event] ?? formatDebugLabel(event);
}

function formatDebugLabel(value: string): string {
  return sanitizeTextForStorage(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDebugEventDetails(
  details: Record<string, unknown> | undefined
): string {
  const sanitizedDetails = sanitizeContext(details);

  if (!sanitizedDetails) {
    return "";
  }

  return Object.entries(sanitizedDetails)
    .map(([key, value]) => {
      const formattedValue = formatDebugDetailValue(key, value);
      if (!formattedValue) {
        return null;
      }

      return `${formatDebugDetailLabel(key)}: ${formattedValue}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("; ");
}

export async function buildSanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors()
): Promise<string> {
  const backendReport = await invoke<string>("generate_feedback_report", {
    category: "bug",
    description: DEBUG_REPORT_DESCRIPTION,
    includeDebugInfo: true,
  });
  const content = `${backendReport}\n\n${formatFrontendErrorLog(errors)}`;

  return await invoke<string>("sanitize_feedback_text", { content });
}

export async function copySanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors()
): Promise<DebugReportCopyResult> {
  const content = await buildSanitizedDebugReport(errors);
  await navigator.clipboard.writeText(content);

  return {
    content,
    copied: true,
    errorCount: errors.length,
  };
}

export async function saveSanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors()
): Promise<SavedFeedbackFile | null> {
  const content = await buildSanitizedDebugReport(errors);
  const suggestedFilename = await invoke<string>("get_feedback_filename");

  return await invoke<SavedFeedbackFile | null>("save_feedback_file", {
    content,
    suggestedFilename,
  });
}

/**
 * Open GitHub Issues with pre-filled template.
 * Copies debug info to clipboard if included.
 */
export async function openGitHubIssue(
  category: FeedbackCategory,
  description: string,
  debugInfo: string | null
): Promise<void> {
  const clipboardSections = [
    "JOBSENTINEL SAFE SUPPORT REPORT",
    "",
    "WHAT YOU WROTE",
    description.trim(),
  ];

  if (debugInfo) {
    clipboardSections.push("", "SUPPORT DETAILS", debugInfo);
  }

  try {
    const clipboardContent = await invoke<string>("sanitize_feedback_text", {
      content: clipboardSections.join("\n"),
    });
    await navigator.clipboard.writeText(clipboardContent);
  } catch (error) {
    logError("Failed to copy feedback debug info to clipboard:", error);
    // Non-fatal - user can still open issue
  }

  await invoke("open_github_issues", { template: category });
}

/**
 * Open Google Drive feedback folder.
 */
export async function openGoogleDriveFeedbackFolder(): Promise<void> {
  await invoke("open_google_drive");
}

/**
 * Reveal saved feedback file in native file explorer.
 */
export async function revealSavedFeedbackFile(revealToken: string): Promise<void> {
  await invoke("reveal_saved_feedback_file", { revealToken });
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
    "APP AND DEVICE (private details removed)",
    "═══════════════════════════════════════════════════════════",
    "",
    `App version: ${systemInfo.app_version}`,
    `Device: ${systemInfo.platform}`,
    `OS version: ${systemInfo.os_version}`,
    `System type: ${systemInfo.architecture}`,
    "",
    "───────────────────────────────────────────────────────────",
    "JOBSENTINEL SETUP (counts only)",
    "───────────────────────────────────────────────────────────",
    "",
    `Job sources turned on: ${configSummary.scrapers_enabled}`,
    `Search words saved: ${configSummary.keywords_count}`,
    `Location preferences: ${formatSetState(configSummary.has_location_prefs)}`,
    `Salary preferences: ${formatSetState(configSummary.has_salary_prefs)}`,
    `Hidden companies: ${formatSetState(configSummary.has_company_blocklist)}`,
    `Favorite companies: ${formatSetState(configSummary.has_company_allowlist)}`,
    `Notifications: ${formatTurnedOnCount(configSummary.notifications_configured)}`,
    `Resume: ${configSummary.has_resume ? "added" : "not added"}`,
    "",
  ];

  if (debugEvents.length > 0) {
    lines.push(
      "───────────────────────────────────────────────────────────",
      "RECENT APP ACTIVITY (private details removed)",
      "───────────────────────────────────────────────────────────",
      "",
      ...debugEvents.map(event => {
        const formattedDetails = formatDebugEventDetails(event.details);
        const details = formattedDetails ? ` - ${formattedDetails}` : "";
        return `[${event.time}] ${formatDebugEventName(event.event)}${details}`;
      }),
      ""
    );
  }

  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

function formatSetState(value: boolean): string {
  return value ? "set" : "not set";
}

function formatTurnedOnCount(count: number): string {
  return count === 0 ? "none" : `${count} turned on`;
}
