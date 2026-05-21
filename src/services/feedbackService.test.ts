import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDebugInfo,
  getDebugLog,
  openGitHubIssue,
  openGoogleDriveFeedbackFolder,
  revealSavedFeedbackFile,
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
    mockInvoke.mockResolvedValueOnce(undefined);

    await openGitHubIssue("feature", "Add filter presets", "debug info");

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("debug info");
    expect(mockInvoke).toHaveBeenCalledWith("open_github_issues", {
      template: "feature",
    });
  });

  it("continues opening GitHub issues when debug clipboard copy fails", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("clipboard denied for /Users/alice/secrets.txt?token=abc"),
    );
    mockInvoke.mockResolvedValueOnce(undefined);

    await openGitHubIssue("bug", "Crash after search", "debug info");

    expect(mockInvoke).toHaveBeenCalledWith("open_github_issues", {
      template: "bug",
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

  it("formats backend system architecture from get_system_info", () => {
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

    expect(debugInfo).toContain("Architecture: arm64");
    expect(debugInfo).not.toContain("Architecture: undefined");
  });
});
