import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDebugLog,
  openGitHubIssue,
  openGoogleDriveFeedbackFolder,
  revealInFileExplorer,
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
      .mockResolvedValueOnce("/Users/test/jobsentinel-feedback.txt");

    const savedPath = await saveFeedbackReport("bug", "Crash after search", true);

    expect(savedPath).toBe("/Users/test/jobsentinel-feedback.txt");
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

  it("opens Google Drive through the backend drive command", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await openGoogleDriveFeedbackFolder();

    expect(mockInvoke).toHaveBeenCalledWith("open_google_drive");
  });

  it("reveals saved feedback files through the backend reveal command", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await revealInFileExplorer("/Users/test/jobsentinel-feedback.txt");

    expect(mockInvoke).toHaveBeenCalledWith("reveal_file", {
      path: "/Users/test/jobsentinel-feedback.txt",
    });
  });
});
