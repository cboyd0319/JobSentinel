import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConfigSummary,
  getDebugLog,
  getSystemInfo,
  openGitHubIssue,
  revealSavedFeedbackFile,
  saveFeedbackReport,
} from "./feedbackClient";

const mockInvoke = vi.mocked(invoke);

describe("feedback client", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("generates and saves feedback through registered commands", async () => {
    mockInvoke
      .mockResolvedValueOnce("sanitized report")
      .mockResolvedValueOnce("jobsentinel-feedback.txt")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-feedback.txt",
        revealToken: "feedback-token",
      });

    await expect(
      saveFeedbackReport("bug", "Crash after search", true),
    ).resolves.toEqual({
      fileName: "jobsentinel-feedback.txt",
      revealToken: "feedback-token",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate_feedback_report", {
      category: "bug",
      description: "Crash after search",
      includeDebugInfo: true,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(3, "save_feedback_file", {
      content: "sanitized report",
      suggestedFilename: "jobsentinel-feedback.txt",
    });
  });

  it("loads safe system and configuration summaries", async () => {
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
    mockInvoke
      .mockResolvedValueOnce(systemInfo)
      .mockResolvedValueOnce(configSummary);

    await expect(getSystemInfo()).resolves.toEqual(systemInfo);
    await expect(getConfigSummary()).resolves.toEqual(configSummary);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "get_system_info");
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "get_config_summary");
  });

  it("normalizes debug events returned by the backend", async () => {
    mockInvoke.mockResolvedValueOnce([
      {
        timestamp: "2026-05-19T20:15:00Z",
        event: { type: "CommandInvoked", command: "search_jobs", success: true },
      },
    ]);

    await expect(getDebugLog()).resolves.toEqual([
      {
        time: "2026-05-19T20:15:00Z",
        event: "CommandInvoked",
        details: { command: "search_jobs", success: true },
      },
    ]);
  });

  it("copies backend-redacted issue details before opening GitHub", async () => {
    mockInvoke
      .mockResolvedValueOnce("backend sanitized issue report")
      .mockResolvedValueOnce(undefined);

    await openGitHubIssue(
      "feature",
      "Add filter presets for jane@example.com",
      "debug info",
    );

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "sanitize_feedback_text", {
      content: expect.stringContaining("Add filter presets for jane@example.com"),
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "backend sanitized issue report",
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "open_github_issues", {
      template: "feature",
    });
  });

  it("uses backend redaction for the user's issue narrative", async () => {
    mockInvoke
      .mockResolvedValueOnce("WHAT YOU WROTE\n[JOB_SEARCH_DETAIL_REDACTED]")
      .mockResolvedValueOnce(undefined);

    await openGitHubIssue(
      "bug",
      'Issue while applying to "Acme Health" for care manager role',
      null,
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "WHAT YOU WROTE\n[JOB_SEARCH_DETAIL_REDACTED]",
    );
  });

  it("still opens GitHub when clipboard access fails", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("clipboard denied for private data"),
    );
    mockInvoke
      .mockResolvedValueOnce("safe issue report")
      .mockResolvedValueOnce(undefined);

    await openGitHubIssue("bug", "Crash after search", "debug info");

    expect(mockInvoke).toHaveBeenLastCalledWith("open_github_issues", {
      template: "bug",
    });
  });

  it("reveals a saved feedback file through an opaque token", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await revealSavedFeedbackFile("feedback-token");

    expect(mockInvoke).toHaveBeenCalledWith("reveal_saved_feedback_file", {
      revealToken: "feedback-token",
    });
  });
});
