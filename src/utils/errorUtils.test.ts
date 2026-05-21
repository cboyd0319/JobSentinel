import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getErrorMessage, logError } from "./errorUtils";

describe("errorUtils", () => {
  describe("getErrorMessage", () => {
    it("extracts message from Error instance", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("returns string errors directly", () => {
      expect(getErrorMessage("Direct string error")).toBe("Direct string error");
    });

    it("extracts message from object with message property", () => {
      const error = { message: "Object error message" };
      expect(getErrorMessage(error)).toBe("Object error message");
    });

    it("handles object with non-string message property", () => {
      const error = { message: 123 };
      expect(getErrorMessage(error)).toBe("123");
    });

    it("returns default message for null", () => {
      expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    });

    it("returns default message for undefined", () => {
      expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
    });

    it("returns default message for number", () => {
      expect(getErrorMessage(42)).toBe("An unexpected error occurred");
    });

    it("returns default message for empty object", () => {
      expect(getErrorMessage({})).toBe("An unexpected error occurred");
    });

    it("returns default message for array", () => {
      expect(getErrorMessage([1, 2, 3])).toBe("An unexpected error occurred");
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
        "Failed for alice@example.com",
        new Error(
          "token=abc123 https://hooks.slack.com/services/T000/B000/secret /Users/alice/private.txt"
        )
      );

      const loggedOutput = vi.mocked(console.error).mock.calls
        .flat()
        .map((value) => JSON.stringify(value))
        .join("\n");

      expect(loggedOutput).not.toContain("alice@example.com");
      expect(loggedOutput).not.toContain("abc123");
      expect(loggedOutput).not.toContain("hooks.slack.com/services");
      expect(loggedOutput).not.toContain("/Users/alice");
      expect(loggedOutput).toContain("[EMAIL]");
      expect(loggedOutput).toContain("[TOKEN]");

      vi.unstubAllEnvs();
    });
  });
});
