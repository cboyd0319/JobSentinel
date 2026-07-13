import { beforeEach, describe, expect, it } from "vitest";
import { JobType, RemoteType, SiteCategory } from "../../shared/search-links";
import type { DeepLink, SearchCriteria, SiteInfo } from "../../shared/search-links";
import { mockInvoke, resetMockData } from "../handlers";

type ResumeMatchingPreference = {
  enabled: boolean;
};

type JobImportPreview = {
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  salary: string | null;
  date_posted: string | null;
  valid_through: string | null;
  employment_types: string[];
  remote: boolean;
  missing_fields: string[];
  already_exists: boolean;
};

type ImportedJobResult = {
  jobId: number;
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

const deepLinkCriteria: SearchCriteria = {
  query: "Care Coordinator",
  location: "Denver, CO",
  job_type: JobType.FullTime,
  remote_type: RemoteType.Remote,
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

  it("generates deep links with the real backend command names", async () => {
    const sites = await mockInvoke<SiteInfo[]>("get_supported_sites");

    expect(sites.length).toBeGreaterThanOrEqual(15);
    expect(sites).toContainEqual(
      expect.objectContaining({
        id: "linkedin",
        name: "LinkedIn",
        category: SiteCategory.Professional,
        requires_login: true,
      }),
    );

    const techSites = await mockInvoke<SiteInfo[]>("get_sites_by_category_cmd", {
      category: SiteCategory.Tech,
    });
    expect(techSites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dice", category: SiteCategory.Tech }),
      ]),
    );
    expect(techSites).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stackoverflow" }),
      ]),
    );
    expect(techSites.every((site) => site.category === SiteCategory.Tech)).toBe(true);

    const links = await mockInvoke<DeepLink[]>("generate_deep_links", {
      criteria: deepLinkCriteria,
    });
    expect(links.length).toBe(sites.length);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          site: expect.objectContaining({ id: "indeed" }),
          url: expect.stringContaining("https://www.indeed.com/jobs?q=Care%20Coordinator"),
        }),
      ]),
    );

    const linkedin = await mockInvoke<DeepLink>("generate_deep_link", {
      siteId: "linkedin",
      criteria: deepLinkCriteria,
    });
    expect(linkedin).toMatchObject({
      site: expect.objectContaining({ id: "linkedin", name: "LinkedIn" }),
    });
    expect(linkedin.url).toContain("keywords=Care%20Coordinator");
    expect(linkedin.url).toContain("location=Denver%2C%20CO");
    expect(linkedin.url).toContain("f_JT=F");
    expect(linkedin.url).toContain("f_WT=2");

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "https://www.linkedin.com/jobs/search/?keywords=Care%20Coordinator",
      }),
    ).resolves.toBeUndefined();

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "http://localhost:3000/jobs?query=Care%20Coordinator",
      }),
    ).rejects.toThrow("This job-site link is not safe to open");

    await expect(
      mockInvoke<void>("open_deep_link", {
        url: "http://www.linkedin.com/jobs/search/?keywords=Care%20Coordinator",
      }),
    ).rejects.toThrow("This job-site link is not safe to open");
  });

  it("previews and imports jobs with minimized backend command payloads", async () => {
    const url =
      "https://alice:secret@jobs.example.com/careers/care-coordinator?jobId=123&utm_source=newsletter&token=raw-secret#private";
    const canonicalUrl = "https://jobs.example.com/careers/care-coordinator?jobId=123";

    const preview = await mockInvoke<JobImportPreview>("preview_job_import", { url });

    expect(preview).toMatchObject({
      title: "Care Coordinator",
      company: "jobs.example.com",
      url: canonicalUrl,
      location: "Remote",
      description_preview: expect.stringContaining("Care Coordinator"),
      salary: "$55k-$72k",
      employment_types: ["FULL_TIME"],
      remote: true,
      missing_fields: [],
      already_exists: false,
    });
    expect(preview.date_posted).toEqual(expect.any(String));

    const imported = await mockInvoke<ImportedJobResult>("import_job_from_url", {
      url: preview.url,
    });

    expect(imported).toEqual({ jobId: expect.any(Number) });

    const duplicatePreview = await mockInvoke<JobImportPreview>("preview_job_import", { url });
    expect(duplicatePreview.already_exists).toBe(true);

    await expect(mockInvoke<ImportedJobResult>("import_job_from_url", { url })).rejects.toThrow(
      "This job is already in your saved jobs",
    );

    await expect(
      mockInvoke<JobImportPreview>("preview_job_import", {
        url: "http://jobs.example.com/careers/care-coordinator",
      }),
    ).rejects.toThrow("Paste an https job posting link from your browser address bar.");

    await expect(
      mockInvoke<JobImportPreview>("preview_job_import", {
        url: "http://localhost:3000/jobs/care-coordinator",
      }),
    ).rejects.toThrow("Paste the full job link from your browser address bar.");

    const redirectPreview = await mockInvoke<JobImportPreview>("preview_job_import", {
      url: "https://jobs.example.com/careers/case-manager?jobId=456&redirect=https%3A%2F%2Fprivate.example%2Fcallback%3Ftoken%3Draw-secret&source=mail",
    });

    expect(redirectPreview.url).toBe(
      "https://jobs.example.com/careers/case-manager?jobId=456",
    );
    expect(redirectPreview.url).not.toContain("raw-secret");
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
