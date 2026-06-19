import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";

describe("mock application platform commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("detects known platform fields through the backend command name", async () => {
    const result = await mockInvoke<{
      platform: string;
      commonFields: string[];
      automationNotes: string | null;
    }>("detect_ats_platform", {
      url: "https://boards.greenhouse.io/example/jobs/123",
    });

    expect(result).toEqual({
      platform: "greenhouse",
      commonFields: ["firstName", "lastName", "email", "phone", "resume", "coverLetter", "linkedin"],
      automationNotes: "greenhouse supports guided form filling. Review before submitting.",
    });
  });

  it("uses platform detection for safe mock form fill attempts", async () => {
    const filled = await mockInvoke<{
      readyForReview: boolean;
      unfilledFields: string[];
      attemptId: number;
      atsPlatform: string;
    }>("fill_application_form", {
      jobUrl: "https://jobs.lever.co/example/123",
      jobHash: "job-123",
    });

    expect(filled).toMatchObject({
      readyForReview: true,
      unfilledFields: [],
      attemptId: 1,
      atsPlatform: "lever",
    });
  });

  it("detects expanded ATS families without trusting query-string mentions", async () => {
    await expect(
      mockInvoke<{ platform: string }>("detect_ats_platform", {
        url: "https://jobs.smartrecruiters.com/Example/123-security-engineer",
      }),
    ).resolves.toMatchObject({ platform: "smartrecruiters" });

    await expect(
      mockInvoke<{ platform: string }>("detect_ats_platform", {
        url: "https://example.com/apply?next=https://jobs.smartrecruiters.com/Example/123",
      }),
    ).resolves.toMatchObject({ platform: "unknown" });
  });

  it("rejects unsafe form fill links before application platform detection", async () => {
    await expect(
      mockInvoke("fill_application_form", {
        jobUrl: "file:///private/resume.pdf",
      }),
    ).rejects.toThrow("This application link is not safe to open");
  });
});
