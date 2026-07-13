import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";

type ResumeMatchingPreference = {
  enabled: boolean;
};

type ApplicationProfilePreview = {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  usWorkAuthorized: boolean;
  requiresSponsorship: boolean;
};

type DashboardPreferences = {
  autoRefresh: {
    enabled: boolean;
    interval_minutes: number;
  };
  salaryFloorUsd: number;
  anyJobSourceEnabled: boolean;
};

type BrowserImportConfig = {
  port: number;
  enabled: boolean;
};

type FeedbackSystemInfo = {
  app_version: string;
  platform: string;
  os_version: string;
  architecture: string;
};

describe("mock core command handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("returns the active Browser Import setup after starting the local receiver", async () => {
    const started = await mockInvoke<BrowserImportConfig>("start_bookmarklet_server", {
      port: 4321,
    });

    expect(started).toEqual({ port: 4321, enabled: true });
    await expect(mockInvoke("get_bookmarklet_config")).resolves.toEqual(started);
  });

  it("returns minimized application profile and dashboard preferences mocks", async () => {
    expect(await mockInvoke<boolean>("has_application_profile")).toBe(true);

    const preview = await mockInvoke<ApplicationProfilePreview>(
      "get_application_profile_preview",
    );
    expect(preview).toMatchObject({
      fullName: expect.any(String),
      email: expect.any(String),
      phone: expect.anything(),
      usWorkAuthorized: expect.any(Boolean),
      requiresSponsorship: expect.any(Boolean),
    });
    expect(Object.keys(preview).sort()).toEqual([
      "email",
      "fullName",
      "githubUrl",
      "linkedinUrl",
      "phone",
      "portfolioUrl",
      "requiresSponsorship",
      "usWorkAuthorized",
      "websiteUrl",
    ]);

    const editProfile = await mockInvoke<Record<string, unknown>>(
      "get_application_profile",
    );
    expect(Object.keys(editProfile).sort()).toEqual([
      "email",
      "fullName",
      "githubUrl",
      "hasResumeFile",
      "linkedinUrl",
      "maxApplicationsPerDay",
      "phone",
      "portfolioUrl",
      "requireManualApproval",
      "requiresSponsorship",
      "resumeFileName",
      "usWorkAuthorized",
      "websiteUrl",
    ]);

    const preferences = await mockInvoke<DashboardPreferences>(
      "get_dashboard_preferences",
    );
    expect(preferences).toEqual({
      autoRefresh: { enabled: true, interval_minutes: 30 },
      salaryFloorUsd: 80000,
      anyJobSourceEnabled: false,
    });
  });

  it("persists resume matching preferences through mock config commands", async () => {
    expect(await mockInvoke<ResumeMatchingPreference>("get_resume_matching_preference")).toEqual({
      enabled: false,
    });

    expect(
      await mockInvoke<ResumeMatchingPreference>("set_resume_matching_enabled", {
        enabled: true,
      }),
    ).toEqual({ enabled: true });

    expect(await mockInvoke<ResumeMatchingPreference>("get_resume_matching_preference")).toEqual({
      enabled: true,
    });
  });

  it("generates feedback reports with the real backend command names", async () => {
    const systemInfo = await mockInvoke<FeedbackSystemInfo>("get_system_info");

    expect(systemInfo).toMatchObject({
      app_version: expect.any(String),
      platform: "mock",
      os_version: "browser",
      architecture: "wasm",
    });
    expect("arch" in systemInfo).toBe(false);

    const report = await mockInvoke<string>("generate_feedback_report", {
      category: "bug",
      description: "Crash after search",
      includeDebugInfo: true,
    });
    expect(report).toContain("JOBSENTINEL SAFE SUPPORT REPORT");
    expect(report).toContain("Report type: Problem Report");
    expect(report).toContain("Crash after search");
    expect(report).toContain("JOBSENTINEL SETUP");

    const sanitized = await mockInvoke<string>("sanitize_feedback_text", {
      content:
        "Crash with token raw-secret-123 and john@example.com; resume=private-file/secret.txt",
    });
    expect(sanitized).toContain("[JOB_SEARCH_DETAIL_REDACTED]");
    expect(sanitized).toContain("[TOKEN]");
    expect(sanitized).toContain("[EMAIL]");
    expect(sanitized).not.toContain("alice");
    expect(sanitized).not.toContain("raw-secret-123");
    expect(sanitized).not.toContain("john@example.com");

    const filename = await mockInvoke<string>("get_feedback_filename");
    expect(filename).toMatch(/^jobsentinel-feedback-\d{4}-\d{2}-\d{2}-\d{4}\.txt$/);

    const savedFile = await mockInvoke<{ fileName: string; revealToken: string } | null>(
      "save_feedback_file",
      {
        content: report,
        suggestedFilename: "../unsafe-name.txt",
      },
    );
    expect(savedFile).toEqual({
      fileName: "unsafe-name.txt",
      revealToken: "mock-feedback:unsafe-name.txt",
    });

    await expect(
      mockInvoke<void>("open_github_issues", { template: "feature" }),
    ).resolves.toBeUndefined();
    await expect(
      mockInvoke<void>("reveal_saved_feedback_file", {
        revealToken: savedFile?.revealToken,
      }),
    ).resolves.toBeUndefined();
  });

  it("redacts sensitive job-search details in mock support reports", async () => {
    const sensitiveText = [
      "Crash while applying to \"Acme Health\" for care manager role after layoff",
      "Salary floor: $125,000 remote minimum",
      "Resume excerpt: Led retention project for oncology team",
      "Private note: laid off last month and urgent search",
      "Screening answer: I need sponsorship next year",
      "Location preference: Denver only",
      "My name is Alice Applicant",
      "Phone: +1 (303) 555-1212",
      "Link: https://example.com/jobs/123?candidate=alice",
    ].join("\n");

    const report = await mockInvoke<string>("generate_feedback_report", {
      category: "bug",
      description: sensitiveText,
      includeDebugInfo: false,
    });
    const sanitized = await mockInvoke<string>("sanitize_feedback_text", {
      content: sensitiveText,
    });
    const combined = `${report}\n${sanitized}`;

    expect(combined).toContain("[JOB_SEARCH_DETAIL_REDACTED]");
    expect(combined).toContain("[PERSON_NAME_REDACTED]");
    expect(combined).toContain("[PHONE]");
    expect(combined).toContain("[URL]");
    expect(combined).not.toContain("Acme Health");
    expect(combined).not.toContain("care manager");
    expect(combined).not.toContain("$125,000");
    expect(combined).not.toContain("oncology team");
    expect(combined).not.toContain("sponsorship next year");
    expect(combined).not.toContain("Denver");
    expect(combined).not.toContain("Alice Applicant");
    expect(combined).not.toContain("303");
    expect(combined).not.toContain("candidate=alice");
  });
});
