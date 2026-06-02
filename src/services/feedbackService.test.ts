import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  copySanitizedDebugReport,
  formatDebugEventDetails,
  formatDebugInfo,
  getDebugLog,
  openGitHubIssue,
  openGoogleDriveFeedbackFolder,
  revealSavedFeedbackFile,
  saveSanitizedDebugReport,
  saveFeedbackReport,
} from "./feedbackService";

const mockInvoke = vi.mocked(invoke);

describe("feedbackService", () => {
  beforeEach(() => {
    mockInvoke.mockReset();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("generates and saves feedback reports through registered backend commands", async () => {
    mockInvoke
      .mockResolvedValueOnce("sanitized report")
      .mockResolvedValueOnce("jobsentinel-feedback.txt")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-feedback.txt",
        revealToken: "feedback-token",
      });

    const savedFile = await saveFeedbackReport("bug", "Crash after search", true);

    expect(savedFile).toEqual({
      fileName: "jobsentinel-feedback.txt",
      revealToken: "feedback-token",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate_feedback_report", {
      category: "bug",
      description: "Crash after search",
      includeDebugInfo: true,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "get_feedback_filename");
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "save_feedback_file", {
      content: "sanitized report",
      suggestedFilename: "jobsentinel-feedback.txt",
    });
  });

  it("loads debug log events through the registered backend command", async () => {
    mockInvoke.mockResolvedValueOnce([
      {
        timestamp: "2026-05-19T20:15:00Z",
        event: {
          type: "CommandInvoked",
          command: "search_jobs",
          success: true,
        },
      },
    ]);

    const events = await getDebugLog();

    expect(mockInvoke).toHaveBeenCalledWith("get_debug_log_events");
    expect(events).toEqual([
      {
        time: "2026-05-19T20:15:00Z",
        event: "CommandInvoked",
        details: {
          command: "search_jobs",
          success: true,
        },
      },
    ]);
  });

  it("opens GitHub issues through the backend issue command", async () => {
    mockInvoke
      .mockResolvedValueOnce("backend sanitized issue report")
      .mockResolvedValueOnce(undefined);

    await openGitHubIssue(
      "feature",
      "Add filter presets for jane@example.com and +1 (303) 555-1212",
      "debug info",
    );

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "sanitize_feedback_text", {
      content: [
        "JOBSENTINEL SAFE SUPPORT REPORT",
        "",
        "WHAT YOU WROTE",
        "Add filter presets for jane@example.com and +1 (303) 555-1212",
        "",
        "SUPPORT DETAILS",
        "debug info",
      ].join("\n"),
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("backend sanitized issue report");
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "open_github_issues", {
      template: "feature",
    });
  });

  it("uses backend redaction for GitHub issue narrative text", async () => {
    mockInvoke
      .mockResolvedValueOnce("WHAT YOU WROTE\n[JOB_SEARCH_DETAIL_REDACTED]")
      .mockResolvedValueOnce(undefined);

    await openGitHubIssue(
      "bug",
      'Issue while applying to "Acme Health" for care manager role after layoff',
      null,
    );

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "sanitize_feedback_text", {
      content: expect.stringContaining('Issue while applying to "Acme Health"'),
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "WHAT YOU WROTE\n[JOB_SEARCH_DETAIL_REDACTED]",
    );
  });

  it("continues opening GitHub issues when debug clipboard copy fails", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("clipboard denied for /Users/alice/secrets.txt?token=abc"),
    );
    mockInvoke.mockResolvedValueOnce("safe issue report").mockResolvedValueOnce(undefined);

    await openGitHubIssue("bug", "Crash after search", "debug info");

    expect(mockInvoke).toHaveBeenLastCalledWith("open_github_issues", {
      template: "bug",
    });
  });

  it("copies a backend-sanitized debug report for GitHub issues", async () => {
    mockInvoke
      .mockResolvedValueOnce("base report from backend")
      .mockResolvedValueOnce("final sanitized report");

    const result = await copySanitizedDebugReport([
      {
        id: "err-1",
        timestamp: "2026-05-28T10:15:00.000Z",
        message: "Failed at /Users/alice/secret.txt with token=abc123",
        stack: "Error: Failed\n    at run (/Users/alice/app.ts:1:1?token=abc123)",
        type: "api",
        url: "http://localhost/?token=abc123",
        userAgent: "test-agent",
      },
    ]);

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate_feedback_report", {
      category: "bug",
      description:
        "User generated a safe support report from JobSentinel.",
      includeDebugInfo: true,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("RECENT APP PROBLEMS"),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining(
        "Removed before sharing: local file paths, links, sign-in tokens, cookies, connection links, email addresses, salary floors, resume text, private notes, and application history.",
      ),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("Support-only details:"),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.not.stringContaining("webhook URLs"),
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "final sanitized report"
    );
    expect(result).toEqual({
      content: "final sanitized report",
      copied: true,
      errorCount: 1,
    });
  });

  it("saves a backend-sanitized debug report for GitHub issue attachments", async () => {
    mockInvoke
      .mockResolvedValueOnce("base report from backend")
      .mockResolvedValueOnce("final sanitized report")
      .mockResolvedValueOnce("jobsentinel-debug-report.txt")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-debug-report.txt",
        revealToken: "feedback-token",
      });

    const result = await saveSanitizedDebugReport([
      {
        id: "err-1",
        timestamp: "2026-05-28T10:15:00.000Z",
        message: "Failed at /Users/alice/secret.txt with token=abc123",
        type: "api",
        url: "http://localhost/?token=abc123",
        userAgent: "test-agent",
      },
    ]);

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate_feedback_report", {
      category: "bug",
      description:
        "User generated a safe support report from JobSentinel.",
      includeDebugInfo: true,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("RECENT APP PROBLEMS"),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "get_feedback_filename");
    expect(mockInvoke).toHaveBeenNthCalledWith(4, "save_feedback_file", {
      content: "final sanitized report",
      suggestedFilename: "jobsentinel-debug-report.txt",
    });
    expect(result).toEqual({
      fileName: "jobsentinel-debug-report.txt",
      revealToken: "feedback-token",
    });
  });

  it("opens Google Drive through the backend drive command", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await openGoogleDriveFeedbackFolder();

    expect(mockInvoke).toHaveBeenCalledWith("open_google_drive");
  });

  it("reveals saved feedback files through the backend reveal command", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await revealSavedFeedbackFile("feedback-token");

    expect(mockInvoke).toHaveBeenCalledWith("reveal_saved_feedback_file", {
      revealToken: "feedback-token",
    });
  });

  it("formats backend system type from get_system_info", () => {
    const debugInfo = formatDebugInfo(
      {
        app_version: "test-version",
        platform: "macos",
        os_version: "macOS 15.5",
        architecture: "arm64",
      },
      {
        scrapers_enabled: 3,
        keywords_count: 4,
        has_location_prefs: true,
        has_salary_prefs: false,
        has_company_blocklist: false,
        has_company_allowlist: true,
        notifications_configured: 2,
        has_resume: true,
      },
      [],
    );

    expect(debugInfo).toContain("System type: arm64");
    expect(debugInfo).toContain("Job sources turned on: 3");
    expect(debugInfo).toContain("Search words saved: 4");
    expect(debugInfo).toContain("Hidden companies: not set");
    expect(debugInfo).toContain("Favorite companies: set");
    expect(debugInfo).toContain("Notifications: 2 turned on");
    expect(debugInfo).toContain("Resume: added");
    expect(debugInfo).not.toContain("System type: undefined");
    expect(debugInfo).not.toContain("Architecture");
    expect(debugInfo).not.toContain("Scrapers enabled");
    expect(debugInfo).not.toContain("Company blocklist");
    expect(debugInfo).not.toContain("Company allowlist");
    expect(debugInfo).not.toContain("configured");
  });

  it("formats debug event details without JSON or private values", () => {
    const details = formatDebugEventDetails({
      command: "search_jobs",
      success: true,
      url: "https://example.com/jobs?token=abc123",
      owner_email: "candidate@example.com",
      nested: { token: "secret" },
    });

    expect(details).toContain("Action: search jobs");
    expect(details).toContain("Result: succeeded");
    expect(details).toContain("url: https://example.com/jobs");
    expect(details).toContain("owner email: [EMAIL]");
    expect(details).toContain("nested: details summarized");
    expect(details).not.toContain("{");
    expect(details).not.toContain("candidate@example.com");
    expect(details).not.toContain("token=abc123");
  });

  it("uses readable debug event details in formatted reports", () => {
    const debugInfo = formatDebugInfo(
      {
        app_version: "test-version",
        platform: "macos",
        os_version: "macOS 15.5",
        architecture: "arm64",
      },
      {
        scrapers_enabled: 3,
        keywords_count: 4,
        has_location_prefs: true,
        has_salary_prefs: false,
        has_company_blocklist: false,
        has_company_allowlist: true,
        notifications_configured: 2,
        has_resume: true,
      },
      [
        {
          time: "2026-05-29T12:00:00Z",
          event: "CommandInvoked",
          details: {
            command: "search_jobs",
            success: false,
          },
        },
      ],
    );

    expect(debugInfo).toContain(
      "[2026-05-29T12:00:00Z] App action - Action: search jobs; Result: failed"
    );
    expect(debugInfo).not.toContain("CommandInvoked");
    expect(debugInfo).not.toContain('{"command"');
  });
});
