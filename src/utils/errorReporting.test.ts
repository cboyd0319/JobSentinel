import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  errorReporter,
  parseStoredErrorReports,
  sanitizeConsoleArgsForLogging,
  sanitizeTextForStorage,
  sanitizeStorageWarningError,
  withErrorCapture,
} from "./errorReporting";

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
      "Failed https://user:pass@example.com/jobs/123?token=abc#frag for john@example.com in resume=private-file/resume.pdf",
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
    expect(serialized).not.toContain("resume=private-file");
    expect(serialized).not.toContain("secret123");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("li_at=AQEDA123");
    expect(serialized).not.toContain("session=abc");
    expect(stored.context?.apiToken).toBe("[REDACTED]");
    expect((stored.context?.nested as Record<string, unknown>).webhook).toBe("[REDACTED]");
  });

  it("redacts sensitive job-search context keys and labeled text", () => {
    const report = errorReporter.captureCustom(
      [
        "salary floor: $85000",
        "screening answer: I need flexibility for medical appointments",
        "private notes: do not mention current employer",
      ].join(" | "),
      {
        salaryFloor: 85000,
        resumeText: "Full resume body",
        privateNotes: "Layoff timing and private context",
        applicationHistory: ["Quiet Search Inc."],
        screeningAnswer: "I need remote work",
        locationPreference: "Only near home",
        nested: {
          careerGoals: "Move into healthcare operations",
        },
      },
    );

    const serialized = JSON.stringify(report);

    expect(serialized).toContain("salary floor: [REDACTED]");
    expect(serialized).toContain("screening answer: [REDACTED]");
    expect(serialized).toContain("private notes: [REDACTED]");
    expect(report.context?.salaryFloor).toBe("[REDACTED]");
    expect(report.context?.resumeText).toBe("[REDACTED]");
    expect(report.context?.privateNotes).toBe("[REDACTED]");
    expect(report.context?.applicationHistory).toBe("[REDACTED]");
    expect(report.context?.screeningAnswer).toBe("[REDACTED]");
    expect(report.context?.locationPreference).toBe("[REDACTED]");
    expect((report.context?.nested as Record<string, unknown>).careerGoals).toBe("[REDACTED]");
    expect(serialized).not.toContain("85000");
    expect(serialized).not.toContain("Full resume body");
    expect(serialized).not.toContain("Layoff timing");
    expect(serialized).not.toContain("Quiet Search Inc.");
    expect(serialized).not.toContain("medical appointments");
  });

  it("redacts phone numbers and known person-name fields", () => {
    const report = errorReporter.captureCustom(
      [
        "Phone: +1 (303) 555-1212",
        "backup 720-555-9911",
        "Full name: Chad Boyd",
        "My name is Chad Boyd",
        "Company name is CareBridge Health",
      ].join(" | "),
      {
        fullName: "Chad Boyd",
        phone: "+1 (303) 555-1212",
        companyName: "CareBridge Health",
      },
    );

    const serialized = JSON.stringify(report);

    expect(serialized).toContain("Phone: [PHONE]");
    expect(serialized).toContain("backup [PHONE]");
    expect(serialized).toContain("Full name: [REDACTED]");
    expect(serialized).toContain("My name [REDACTED]");
    expect(serialized).toContain("Company name is CareBridge Health");
    expect(report.context?.fullName).toBe("[REDACTED]");
    expect(report.context?.phone).toBe("[REDACTED]");
    expect(report.context?.companyName).toBe("CareBridge Health");
    expect(serialized).not.toContain("+1 (303) 555-1212");
    expect(serialized).not.toContain("720-555-9911");
    expect(serialized).not.toMatch(/\(303\)|720-555/);
    expect(serialized).not.toContain("Chad Boyd");
  });

  it("redacts non-home local paths before local persistence", () => {
    const sanitized = sanitizeTextForStorage(
      [
        "/private/var/folders/zz/abc123/T/jobsentinel/config.json",
        "/var/folders/aa/bb/T/resume-name.pdf",
        "/tmp/jobsentinel/private-resume.docx",
        "/run/user/1000/jobsentinel/jobs.db",
      ].join(" "),
    );

    expect(sanitized).toContain("/[LOCAL_PATH]");
    expect(sanitized).not.toContain("/private/var");
    expect(sanitized).not.toContain("/var/folders");
    expect(sanitized).not.toContain("/tmp/jobsentinel");
    expect(sanitized).not.toContain("/run/user/1000");
    expect(sanitized).not.toContain("resume-name.pdf");
  });

  it("uses sanitized reports in development console logging", () => {
    vi.stubEnv("DEV", true);

    errorReporter.captureCustom(
      "Failed https://user:pass@example.com/jobs/123?token=abc#frag for jane@example.com",
      {
        webhook: "https://hooks.slack.com/services/T000/B000/SECRET",
        resumePath: "resume=private-file/resume.pdf",
      }
    );

    const serializedCalls = JSON.stringify(consoleErrorSpy.mock.calls);

    expect(serializedCalls).toContain("https://example.com/jobs/123");
    expect(serializedCalls).not.toContain("user:pass");
    expect(serializedCalls).not.toContain("token=abc");
    expect(serializedCalls).not.toContain("jane@example.com");
    expect(serializedCalls).not.toContain("resume=private-file");
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

  it("sanitizes storage warning errors before console output", () => {
    const error = new Error(
      "Failed for jane@example.com with token=abc at https://example.com/apply?token=secret#frag and resume=private-file/resume.pdf"
    );
    error.stack = [
      error.message,
      "at readStorage (resume=private-file/project/src/utils/errorReporting.ts:1:1)",
    ].join("\n");

    const serialized = JSON.stringify(sanitizeStorageWarningError(error));

    expect(serialized).toContain("https://example.com/apply");
    expect(serialized).toContain("resume=[REDACTED]");
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("resume=private-file");
    expect(serialized).not.toContain("token=abc");
    expect(serialized).not.toContain("token=secret");
  });

  it("sanitizes console arguments before forwarding", () => {
    const error = new Error(
      "Failed for jane@example.com with token=abc at https://example.com/apply?token=secret#frag and resume=private-file/resume.pdf"
    );
    error.stack = [
      error.message,
      "at readStorage (resume=private-file/project/src/utils/errorReporting.ts:1:1)",
    ].join("\n");

    const sanitized = sanitizeConsoleArgsForLogging([
      error,
      "webhook https://hooks.slack.com/services/T000/B000/SECRET",
      {
        password: "hunter2",
        url: "https://example.com/apply?token=secret#frag",
      },
    ]);
    const serialized = JSON.stringify(sanitized);

    expect(serialized).toContain("https://example.com/apply");
    expect(serialized).toContain("resume=[REDACTED]");
    expect(serialized).toContain("[WEBHOOK_CONFIGURED]");
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("resume=private-file");
    expect(serialized).not.toContain("token=abc");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("hunter2");
  });

  it("filters malformed stored reports while preserving valid entries", () => {
    const stored = JSON.stringify([
      null,
      {
        id: "valid",
        timestamp: new Date().toISOString(),
        message: "Failed for jane@example.com with token=abc",
        type: "custom",
        context: {
          webhook: "https://hooks.slack.com/services/T000/B000/SECRET",
        },
        url: "https://example.com/settings?token=secret#private",
        userAgent: "Vitest",
      },
      {
        id: "bad",
        timestamp: new Date().toISOString(),
        message: { text: "not a string" },
        type: "custom",
        url: "https://example.com",
        userAgent: "Vitest",
      },
    ]);

    const reports = parseStoredErrorReports(stored);

    expect(reports).toHaveLength(1);
    expect(reports[0]?.id).toBe("valid");
    const serialized = JSON.stringify(reports[0]);
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("token=abc");
    expect(serialized).not.toContain("SECRET");
  });

  it("ignores non-array stored error payloads", () => {
    expect(parseStoredErrorReports(JSON.stringify({ id: "not-array" }))).toEqual([]);
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

  it("sanitizes detailed local report export before writing JSON", () => {
    errorReporter.captureCustom(
      [
        "Failed for candidate@example.com",
        "token=abc123",
        "resume=private-file;",
        "salary floor: $92000",
        "private notes: active search",
      ].join(" "),
      {
        resumeText: "Full resume body",
        salaryFloor: 92000,
        privateNotes: "Active search and family details",
        retryUrl: "https://example.com/apply?token=secret#frag",
      },
    );

    const exported = errorReporter.export();

    expect(exported).toContain("[EMAIL]");
    expect(exported).toContain("[TOKEN]");
    expect(exported).toContain("resume=[REDACTED]");
    expect(exported).toContain("salary floor: [REDACTED]");
    expect(exported).toContain('"privateNotes": "[REDACTED]"');
    expect(exported).not.toContain("candidate@example.com");
    expect(exported).not.toContain("abc123");
    expect(exported).not.toContain("resume=private-file");
    expect(exported).not.toContain("92000");
    expect(exported).not.toContain("Full resume body");
    expect(exported).not.toContain("Active search");
    expect(exported).not.toContain("token=secret");
  });
});
