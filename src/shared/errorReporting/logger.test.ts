import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError } from "./logger";

describe("logger", () => {
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
