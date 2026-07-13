import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  copySanitizedDebugReport,
  saveSanitizedDebugReport,
} from "./supportReport";

const mockInvoke = vi.mocked(invoke);

describe("safe support reports", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("copies a backend-sanitized report without private error details", async () => {
    mockInvoke
      .mockResolvedValueOnce("base report from backend")
      .mockResolvedValueOnce("final sanitized report");

    const result = await copySanitizedDebugReport([
      {
        id: "err-1",
        timestamp: "2026-05-28T10:15:00.000Z",
        message: "Failed at resume=private-file/secret.txt with token=abc123",
        stack: "Error: Failed at private path",
        type: "api",
        url: "http://localhost/?token=abc123",
        userAgent: "test-agent",
      },
    ]);

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "generate_feedback_report", {
      category: "bug",
      description: "User generated a safe support report from JobSentinel.",
      includeDebugInfo: true,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("RECENT APP PROBLEMS"),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("Review before sharing."),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.not.stringContaining("Support-only details:"),
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "final sanitized report",
    );
    expect(result).toEqual({
      content: "final sanitized report",
      copied: true,
      errorCount: 1,
    });
  });

  it("saves only the backend-sanitized report", async () => {
    mockInvoke
      .mockResolvedValueOnce("base report from backend")
      .mockResolvedValueOnce("final sanitized report")
      .mockResolvedValueOnce("jobsentinel-support-report.txt")
      .mockResolvedValueOnce({
        fileName: "jobsentinel-support-report.txt",
        revealToken: "feedback-token",
      });

    const result = await saveSanitizedDebugReport([]);

    expect(mockInvoke).toHaveBeenNthCalledWith(2, "sanitize_feedback_text", {
      content: expect.stringContaining("No recent app problems."),
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(4, "save_feedback_file", {
      content: "final sanitized report",
      suggestedFilename: "jobsentinel-support-report.txt",
    });
    expect(result).toEqual({
      fileName: "jobsentinel-support-report.txt",
      revealToken: "feedback-token",
    });
  });
});
