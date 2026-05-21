import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorReporter, withErrorCapture } from "./errorReporting";

/**
 * These tests avoid calling errorReporter.init() because the singleton modifies
 * global handlers (window.onerror, console.error), which can conflict with Vitest
 * worker isolation. Boundary and context tests cover the provider integration.
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

  it("uses sanitized reports in development console logging", () => {
    vi.stubEnv("DEV", true);

    errorReporter.captureCustom(
      "Failed https://user:pass@example.com/jobs/123?token=abc#frag for jane@example.com",
      {
        webhook: "https://hooks.slack.com/services/T000/B000/SECRET",
        resumePath: "/Users/alice/resume.pdf",
      }
    );

    const serializedCalls = JSON.stringify(consoleErrorSpy.mock.calls);

    expect(serializedCalls).toContain("https://example.com/jobs/123");
    expect(serializedCalls).not.toContain("user:pass");
    expect(serializedCalls).not.toContain("token=abc");
    expect(serializedCalls).not.toContain("jane@example.com");
    expect(serializedCalls).not.toContain("/Users/alice");
    expect(serializedCalls).not.toContain("SECRET");
    expect(serializedCalls).not.toContain("originalError");

    vi.unstubAllEnvs();
  });

  it("redacts provider webhook URLs before generic URL sanitization", () => {
    const report = errorReporter.captureCustom(
      [
        "Slack parse failed https://hooks.slack.com/T000/B000/SECRET",
        "Discord failed https://discord.com/api/webhooks/123456789/discord-secret",
        "Teams failed https://outlook.office365.com/webhook/team-secret/IncomingWebhook/channel/connector",
      ].join(" ")
    );

    const stored = errorReporter.getErrors()[0];
    const serialized = JSON.stringify(stored);

    expect(report).toEqual(stored);
    expect(stored.message).toContain("[WEBHOOK_CONFIGURED]");
    expect(serialized).not.toContain("hooks.slack.com/T000");
    expect(serialized).not.toContain("discord-secret");
    expect(serialized).not.toContain("team-secret");
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

  it("exports the configured application version", () => {
    errorReporter.captureCustom("Export test");

    const exported = JSON.parse(errorReporter.export()) as { app_version: string };

    expect(exported.app_version).toBe(__APP_VERSION__);
  });
});
