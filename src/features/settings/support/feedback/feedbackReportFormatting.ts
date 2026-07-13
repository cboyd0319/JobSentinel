import {
  sanitizeContext,
  sanitizeTextForStorage,
} from "../../../../shared/errorReporting/errorReporter";
import type { ConfigSummary, DebugEvent, SystemInfo } from "./feedbackClient";

const MAX_DEBUG_DETAIL_LENGTH = 120;
const DEBUG_DETAIL_LABELS: Record<string, string> = {
  command: "Action",
  event: "App action",
  reason: "Reason",
  source: "Source",
  status: "Status",
  success: "Result",
  type: "Type",
  url: "Link",
};
const DEBUG_EVENT_LABELS: Record<string, string> = {
  AppStarted: "App opened",
  CommandInvoked: "App action",
  ErrorOccurred: "App problem",
  FeatureUsed: "Feature used",
  ScraperRun: "Job source checked",
  ViewNavigated: "Screen changed",
};

function formatDebugLabel(value: string): string {
  return sanitizeTextForStorage(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDebugDetailValue(key: string, value: unknown): string | null {
  if (typeof value === "boolean") {
    if (key === "success") return value ? "succeeded" : "failed";
    return value ? "yes" : "no";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === "string") {
    const sanitized = ["command", "event", "feature", "source", "type"].includes(
      key,
    )
      ? formatDebugLabel(value)
      : sanitizeTextForStorage(value);
    return sanitized.length > MAX_DEBUG_DETAIL_LENGTH
      ? `${sanitized.slice(0, MAX_DEBUG_DETAIL_LENGTH)}...`
      : sanitized;
  }
  if (value === null || typeof value === "undefined") return null;
  return "details summarized";
}

export function formatDebugEventName(event: string): string {
  return DEBUG_EVENT_LABELS[event] ?? formatDebugLabel(event);
}

export function formatDebugEventDetails(
  details: Record<string, unknown> | undefined,
): string {
  const sanitizedDetails = sanitizeContext(details);
  if (!sanitizedDetails) return "";

  return Object.entries(sanitizedDetails)
    .map(([key, value]) => {
      const formattedValue = formatDebugDetailValue(key, value);
      if (!formattedValue) return null;
      const label = DEBUG_DETAIL_LABELS[key] ?? key.replace(/[_-]+/g, " ");
      return `${label}: ${formattedValue}`;
    })
    .filter((line): line is string => Boolean(line))
    .join("; ");
}

export function formatDebugInfo(
  systemInfo: SystemInfo,
  configSummary: ConfigSummary,
  debugEvents: DebugEvent[],
): string {
  const lines = [
    "APP AND DEVICE (common private details hidden)",
    "",
    `App version: ${systemInfo.app_version}`,
    `Device: ${systemInfo.platform}`,
    `OS version: ${systemInfo.os_version}`,
    `System type: ${systemInfo.architecture}`,
    "",
    "JOBSENTINEL SETUP (counts only)",
    "",
    `Job sources turned on: ${configSummary.scrapers_enabled}`,
    `Search words saved: ${configSummary.keywords_count}`,
    `Location preferences: ${formatSetState(configSummary.has_location_prefs)}`,
    `Salary preferences: ${formatSetState(configSummary.has_salary_prefs)}`,
    `Hidden companies: ${formatSetState(configSummary.has_blocked_companies)}`,
    `Preferred companies: ${formatSetState(configSummary.has_preferred_companies)}`,
    `Notifications: ${formatTurnedOnCount(configSummary.notifications_configured)}`,
    `Resume: ${configSummary.has_resume ? "added" : "not added"}`,
    "",
  ];

  if (debugEvents.length > 0) {
    lines.push(
      "RECENT APP ACTIVITY (common private details hidden)",
      "",
      ...debugEvents.map((event) => {
        const detail = formatDebugEventDetails(event.details);
        return `[${event.time}] ${formatDebugEventName(event.event)}${detail ? ` - ${detail}` : ""}`;
      }),
      "",
    );
  }

  return lines.join("\n");
}

function formatSetState(value: boolean): string {
  return value ? "set" : "not set";
}

function formatTurnedOnCount(count: number): string {
  return count === 0 ? "none" : `${count} turned on`;
}
