import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildJobsCsv, exportJobsToCsv } from "./jobCsvExport";

const downloadTextFile = vi.hoisted(() => vi.fn());
vi.mock("../../shared/browserDownload", () => ({ downloadTextFile }));

const baseJob = {
  id: 1,
  title: "Customer Support Coordinator",
  company: "Community Care",
  location: "Chicago, IL",
  url: "https://example.com/job/1",
  source: "linkedin",
  score: 0.85,
  created_at: "2024-01-15T10:00:00Z",
  remote: true,
  salary_min: 55000,
  salary_max: 72000,
};

describe("job CSV export", () => {
  beforeEach(() => {
    downloadTextFile.mockReset();
  });

  it("includes the expected columns and job values", () => {
    const csv = buildJobsCsv([baseJob]);

    expect(csv).toContain("Job Number,Title,Company");
    expect(csv).toContain("Location,Job Link,Source");
    expect(csv).toContain("Match,Remote,Salary Min,Salary Max,Saved Date");
    expect(csv).toContain("Customer Support Coordinator");
    expect(csv).toContain("85%,Yes,55000,72000");
  });

  it("escapes commas, quotes, and newlines", () => {
    const csv = buildJobsCsv([
      {
        ...baseJob,
        title: 'Coordinator, "Senior"',
        company: "Community\nCare",
      },
    ]);

    expect(csv).toContain('"Coordinator, ""Senior"""');
    expect(csv).toContain('"Community\nCare"');
  });

  it("neutralizes spreadsheet formulas in untrusted job fields", () => {
    const csv = buildJobsCsv([
      {
        ...baseJob,
        title: "=cmd",
        company: "+SUM(1)",
        location: " @lookup",
        source: "-remote",
      },
    ]);

    expect(csv).toContain(",'=cmd,");
    expect(csv).toContain(",'+SUM(1),");
    expect(csv).toContain(",' @lookup,");
    expect(csv).toContain(",'-remote,");
  });

  it("handles unknown values and non-finite scores", () => {
    const csv = buildJobsCsv([
      {
        ...baseJob,
        location: null,
        score: Number.NaN,
        remote: null,
        salary_min: null,
        salary_max: null,
      },
    ]);

    expect(csv).toContain("N/A");
    expect(csv).not.toContain("NaN%");
  });

  it("downloads CSV with a provided or dated filename", () => {
    exportJobsToCsv([baseJob], "selected-jobs.csv");
    expect(downloadTextFile).toHaveBeenLastCalledWith(
      expect.stringContaining("Customer Support Coordinator"),
      "selected-jobs.csv",
      "text/csv",
    );

    exportJobsToCsv([baseJob]);
    expect(downloadTextFile.mock.calls[1]?.[1]).toMatch(
      /^jobsentinel-export-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});
