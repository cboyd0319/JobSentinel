import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getErrorMessage, logError } from "./errorUtils";

describe("errorUtils", () => {
  describe("getErrorMessage", () => {
    it("returns generic safe copy for unknown Error instances", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error)).toContain("JobSentinel ran into a problem");
      expect(getErrorMessage(error)).toContain("safe support report");
    });

    it("returns generic safe copy for string errors", () => {
      expect(getErrorMessage("Direct string error")).toContain("JobSentinel ran into a problem");
    });

    it("returns generic safe copy for object message properties", () => {
      const error = { message: "Object error message" };
      expect(getErrorMessage(error)).toContain("JobSentinel ran into a problem");
    });

    it("returns safe copy for object with non-string message property", () => {
      const error = { message: 123 };
      expect(getErrorMessage(error)).toContain("JobSentinel ran into a problem");
    });

    it("returns default message for null", () => {
      expect(getErrorMessage(null)).toContain("JobSentinel ran into a problem");
    });

    it("returns default message for undefined", () => {
      expect(getErrorMessage(undefined)).toContain("JobSentinel ran into a problem");
    });

    it("returns default message for number", () => {
      expect(getErrorMessage(42)).toContain("JobSentinel ran into a problem");
    });

    it("returns default message for empty object", () => {
      expect(getErrorMessage({})).toContain("JobSentinel ran into a problem");
    });

    it("returns default message for array", () => {
      expect(getErrorMessage([1, 2, 3])).toContain("JobSentinel ran into a problem");
    });

    it("keeps useful known categories without exposing raw sensitive details", () => {
      const message = getErrorMessage(
        new Error("network timeout with token=abc123 at resume=private-file")
      );

      expect(message).toContain("connect");
      expect(message).toContain("internet connection");
      expect(message).not.toContain("abc123");
      expect(message).not.toContain("resume=private-file");
    });

    it("does not display raw paths, emails, or tokens from unknown errors", () => {
      const message = getErrorMessage({
        message: "token=abc123 for private@example.test at resume=private-file",
      });

      expect(message).toContain("JobSentinel ran into a problem");
      expect(message).not.toContain("abc123");
      expect(message).not.toContain("private@example.test");
      expect(message).not.toContain("resume=private-file");
    });
  });

  describe("logError", () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
      console.error = vi.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    it("logs error with context message in dev mode", () => {
      vi.stubEnv("DEV", true);

      const error = new Error("Test error");
      logError("Context:", error);

      expect(console.error).toHaveBeenCalledWith("Context:", expect.objectContaining({
        name: "Error",
        message: "Test error",
      }));

      vi.unstubAllEnvs();
    });

    it("logs string errors", () => {
      vi.stubEnv("DEV", true);

      logError("Failed to load:", "Connection refused");

      expect(console.error).toHaveBeenCalledWith("Failed to load:", "Connection refused");

      vi.unstubAllEnvs();
    });

    it("redacts sensitive error details before logging", () => {
      vi.stubEnv("DEV", true);

      logError(
        "Failed for private@example.test",
        new Error(
          "token=abc123 https://hooks.slack.com/services/T000/B000/secret resume=private-file"
        )
      );

      const loggedOutput = vi.mocked(console.error).mock.calls
        .flat()
        .map((value) => JSON.stringify(value))
        .join("\n");

      expect(loggedOutput).not.toContain("private@example.test");
      expect(loggedOutput).not.toContain("abc123");
      expect(loggedOutput).not.toContain("hooks.slack.com/services");
      expect(loggedOutput).not.toContain("resume=private-file");
      expect(loggedOutput).toContain("[EMAIL]");
      expect(loggedOutput).toContain("[TOKEN]");

      vi.unstubAllEnvs();
    });
  });
});
