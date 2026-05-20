import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorReporter, withErrorCapture } from "./errorReporting";

/**
 * Note: Full test suite for errorReporting is disabled due to worker isolation issues.
 *
 * The errorReporter singleton modifies global handlers (window.onerror, console.error)
 * which conflicts with Vitest's worker isolation strategy and causes crashes.
 *
 * These tests should be run in a separate process or with different isolation settings.
 * The errorReporting module is tested implicitly through:
 * - ErrorBoundary.test.tsx (mock-based tests)
 * - ErrorReportingContext.test.tsx (integration tests)
 * - E2E tests that verify error handling
 */

describe("errorReporting", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.clear();
    errorReporter.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    errorReporter.clear();
    window.localStorage.clear();
    consoleErrorSpy.mockRestore();
  });

  it("module exports correctly", async () => {
    expect(errorReporter).toBeDefined();
    expect(withErrorCapture).toBeDefined();
    expect(typeof errorReporter.captureCustom).toBe("function");
    expect(typeof errorReporter.captureApiError).toBe("function");
    expect(typeof errorReporter.captureReactError).toBe("function");
    expect(typeof withErrorCapture).toBe("function");
  });

  it("withErrorCapture wraps async functions", async () => {
    const fn = vi.fn().mockResolvedValue("result");
    const wrapped = withErrorCapture(fn);

    const result = await wrapped("arg");

    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledWith("arg");
  });

  it("sanitizes stored error reports before local persistence", () => {
    window.history.pushState(
      {},
      "",
      "/settings?token=secret123&email=john@example.com#private"
    );

    const report = errorReporter.captureCustom(
      "Failed https://user:pass@example.com/jobs/123?token=abc#frag for john@example.com in /Users/alice/resume.pdf",
      {
        apiToken: "secret123",
        retryUrl: "https://example.com/apply?session=abc#frag",
        nested: {
          webhook: "https://hooks.slack.com/services/T000/B000/SECRET",
          cookie: "li_at=AQEDA123",
        },
      }
    );

    const stored = errorReporter.getErrors()[0];
    const serialized = JSON.stringify(stored);

    expect(report).toEqual(stored);
    expect(stored.message).toContain("https://example.com/jobs/123");
    expect(stored.url).toContain("/settings");
    expect(stored.url).not.toContain("token=secret123");
    expect(serialized).not.toContain("john@example.com");
    expect(serialized).not.toContain("/Users/alice");
    expect(serialized).not.toContain("secret123");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("li_at=AQEDA123");
    expect(serialized).not.toContain("session=abc");
    expect(stored.context?.apiToken).toBe("[REDACTED]");
    expect((stored.context?.nested as Record<string, unknown>).webhook).toBe("[REDACTED]");
  });

  it("sanitizes captured async arguments when wrapped functions fail", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Failed token ghp_secret"));
    const wrapped = withErrorCapture(fn);

    await expect(
      wrapped({
        password: "hunter2",
        jobUrl: "https://example.com/job?candidate=jane@example.com&token=abc#frag",
      })
    ).rejects.toThrow("Failed token ghp_secret");

    const stored = errorReporter.getErrors()[0];
    const serialized = JSON.stringify(stored);

    expect(stored.message).toBe("Failed [TOKEN]");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("token=abc");
    expect(serialized).toContain("https://example.com/job");
  });
});
