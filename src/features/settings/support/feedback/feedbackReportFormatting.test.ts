import { describe, expect, it } from "vitest";
import {
  formatDebugEventDetails,
  formatDebugInfo,
} from "./feedbackReportFormatting";

const systemInfo = {
  app_version: "test-version",
  platform: "macos",
  os_version: "macOS 26",
  architecture: "arm64",
};
const configSummary = {
  scrapers_enabled: 3,
  keywords_count: 4,
  has_location_prefs: true,
  has_salary_prefs: false,
  has_blocked_companies: false,
  has_preferred_companies: true,
  notifications_configured: 2,
  has_resume: true,
};

describe("feedback report formatting", () => {
  it("uses readable setup labels", () => {
    const debugInfo = formatDebugInfo(systemInfo, configSummary, []);

    expect(debugInfo).toContain("System type: arm64");
    expect(debugInfo).toContain("Job sources turned on: 3");
    expect(debugInfo).toContain("Search words saved: 4");
    expect(debugInfo).toContain("Hidden companies: not set");
    expect(debugInfo).toContain("Preferred companies: set");
    expect(debugInfo).toContain("Notifications: 2 turned on");
    expect(debugInfo).not.toContain("Architecture");
    expect(debugInfo).not.toContain("configured");
  });

  it("formats debug details without JSON or private values", () => {
    const details = formatDebugEventDetails({
      command: "search_jobs",
      event: "user_action",
      success: true,
      url: "https://example.com/jobs?token=abc123",
      owner_email: "candidate@example.com",
      nested: { token: "secret" },
    });

    expect(details).toContain("Action: search jobs");
    expect(details).toContain("App action: user action");
    expect(details).toContain("Result: succeeded");
    expect(details).toContain("Link: https://example.com/jobs");
    expect(details).toContain("owner email: [EMAIL]");
    expect(details).toContain("nested: details summarized");
    expect(details).not.toContain("candidate@example.com");
    expect(details).not.toContain("token=abc123");
  });

  it("uses readable event names in formatted reports", () => {
    const debugInfo = formatDebugInfo(systemInfo, configSummary, [
      {
        time: "2026-05-29T12:00:00Z",
        event: "CommandInvoked",
        details: { command: "search_jobs", success: false },
      },
    ]);

    expect(debugInfo).toContain(
      "[2026-05-29T12:00:00Z] App action - Action: search jobs; Result: failed",
    );
    expect(debugInfo).not.toContain("CommandInvoked");
    expect(debugInfo).not.toContain('{"command"');
  });
});
