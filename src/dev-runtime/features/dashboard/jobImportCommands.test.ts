import { beforeEach, describe, expect, it } from "vitest";
import { mockJobs } from "../../mocks/data";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import {
  handleMockJobImportCommand,
  type MockJobImportPreview,
  type MockJobImportResult,
} from "./jobImportCommands";

describe("Dashboard job-import mock commands", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("previews and imports jobs with minimized backend payloads", async () => {
    const url =
      "https://alice:secret@jobs.example.com/careers/care-coordinator?jobId=123&utm_source=newsletter&token=raw-secret#private";
    const canonicalUrl =
      "https://jobs.example.com/careers/care-coordinator?jobId=123";

    const preview = await mockInvoke<MockJobImportPreview>(
      "preview_job_import",
      {
        url,
      },
    );

    expect(preview).toMatchObject({
      title: "Care Coordinator",
      import_id: expect.any(String),
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

    const imported = await mockInvoke<MockJobImportResult>(
      "confirm_job_import",
      {
        importId: preview.import_id,
      },
    );
    expect(imported).toEqual({ jobId: expect.any(Number) });

    const duplicatePreview = await mockInvoke<MockJobImportPreview>(
      "preview_job_import",
      { url },
    );
    expect(duplicatePreview.already_exists).toBe(true);
    await expect(
      mockInvoke<MockJobImportResult>("confirm_job_import", {
        importId: preview.import_id,
      }),
    ).rejects.toThrow("This job preview expired");
  });

  it("rejects unsafe links and removes sensitive URL details", async () => {
    await expect(
      mockInvoke<MockJobImportPreview>("preview_job_import", {
        url: "http://jobs.example.com/careers/care-coordinator",
      }),
    ).rejects.toThrow(
      "Paste an https job posting link from your browser address bar.",
    );
    await expect(
      mockInvoke<MockJobImportPreview>("preview_job_import", {
        url: "http://localhost:3000/jobs/care-coordinator",
      }),
    ).rejects.toThrow("Paste the full job link from your browser address bar.");

    const redirectPreview = await mockInvoke<MockJobImportPreview>(
      "preview_job_import",
      {
        url: "https://jobs.example.com/careers/case-manager?jobId=456&redirect=https%3A%2F%2Fprivate.example%2Fcallback%3Ftoken%3Draw-secret&source=mail",
      },
    );
    expect(redirectPreview.url).toBe(
      "https://jobs.example.com/careers/case-manager?jobId=456",
    );
    expect(redirectPreview.url).not.toContain("raw-secret");
  });

  it("rejects commands owned by another feature", () => {
    const state = {
      jobs: mockJobs.map((job) => ({ ...job })),
      pendingUrlImports: [],
    };

    expect(
      handleMockJobImportCommand("generate_deep_links", undefined, state),
    ).toMatchObject({ handled: false, shouldSave: false, state });
  });
});
