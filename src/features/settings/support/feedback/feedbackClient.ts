import { invoke } from "@tauri-apps/api/core";
import { logError } from "../../../../shared/errorReporting/logger";
import type { SavedFeedbackFile } from "../../../../shared/errorReporting/supportReport";

export type { SavedFeedbackFile } from "../../../../shared/errorReporting/supportReport";

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
  has_blocked_companies: boolean;
  has_preferred_companies: boolean;
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

export function getSystemInfo(): Promise<SystemInfo> {
  return invoke<SystemInfo>("get_system_info");
}

export function getConfigSummary(): Promise<ConfigSummary> {
  return invoke<ConfigSummary>("get_config_summary");
}

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

export async function saveFeedbackReport(
  category: FeedbackCategory,
  description: string,
  includeDebugInfo: boolean,
): Promise<SavedFeedbackFile | null> {
  const content = await invoke<string>("generate_feedback_report", {
    category,
    description,
    includeDebugInfo,
  });
  const suggestedFilename = await invoke<string>("get_feedback_filename");

  return invoke<SavedFeedbackFile | null>("save_feedback_file", {
    content,
    suggestedFilename,
  });
}

export async function openGitHubIssue(
  category: FeedbackCategory,
  description: string,
  debugInfo: string | null,
): Promise<void> {
  const sections = [
    "JOBSENTINEL SAFE SUPPORT REPORT",
    "",
    "WHAT YOU WROTE",
    description.trim(),
  ];
  if (debugInfo) sections.push("", "SAFE APP DETAILS", debugInfo);

  try {
    const content = await invoke<string>("sanitize_feedback_text", {
      content: sections.join("\n"),
    });
    await navigator.clipboard.writeText(content);
  } catch (error) {
    logError("Failed to copy feedback debug info to clipboard:", error);
  }

  await invoke("open_github_issues", { template: category });
}

export function revealSavedFeedbackFile(revealToken: string): Promise<void> {
  return invoke("reveal_saved_feedback_file", { revealToken });
}
